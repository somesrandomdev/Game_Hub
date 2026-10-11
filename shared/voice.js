// Voice chat. Every pair of players in it gets a direct WebRTC audio link (a mesh,
// fine for a table of up to 10); the server only relays the setup messages.
// Browsers only give out the microphone on https or localhost, so on a plain LAN
// address (http://192.168.x.x) you can listen but not talk.

const ICE = [{ urls: ['stun:stun.l.google.com:19302', 'stun:stun.cloudflare.com:3478'] }];
const SPEAK_LEVEL = 0.035;   // RMS above this counts as talking
const SPEAK_HOLD_MS = 350;   // keep the ring lit through short pauses

// send(action, extra): fire an API action. onChange(): voice state changed (redraw
// buttons). onSpeaking(id, bool): someone (me included) started/stopped talking.
// notify(key): show a translated message.
export function createVoice({ send, onChange, onSpeaking, notify }) {
  const peers = new Map(); // member id -> { pc, offerer, audio, queued: [] }
  const meters = new Map(); // member id -> { analyser, buf, lastLoud, on }
  let on = false;
  let muted = false;
  let stream = null;   // our microphone, null when listening only
  let myId = null;
  let members = [];
  let ctx = null;
  let meterTimer = 0;

  const supported = () => typeof RTCPeerConnection === 'function';
  const canTalk = () => Boolean(window.isSecureContext && navigator.mediaDevices?.getUserMedia);
  const signal = (target, data) => send('signal', { target, data });
  const report = () => send('voice', { on, muted: muted || !stream });

  async function join() {
    if (on) return;
    if (!supported()) { notify('voice.unsupported'); return; }
    if (canTalk()) {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
      } catch {
        stream = null;
        notify('voice.noMic');
      }
    } else notify('voice.needHttps');
    on = true;
    muted = false;
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
    } catch { ctx = null; }
    if (stream) meter(myId, stream);
    meterTimer = setInterval(tick, 100);
    report();
    sync(members, myId);
    onChange();
  }

  // quiet: we're leaving the room anyway, so don't tell the server
  function leave(quiet = false) {
    if (!on) return;
    on = false;
    for (const id of [...peers.keys()]) drop(id, true);
    stream?.getTracks().forEach(tr => tr.stop());
    stream = null;
    clearInterval(meterTimer);
    for (const id of [...meters.keys()]) unmeter(id);
    ctx?.close().catch(() => {});
    ctx = null;
    if (!quiet) report();
    onChange();
  }

  function toggleMute() {
    if (!on) return join();
    if (!stream) { notify(canTalk() ? 'voice.noMic' : 'voice.needHttps'); return; }
    muted = !muted;
    for (const tr of stream.getAudioTracks()) tr.enabled = !muted;
    report();
    onChange();
  }

  // Called with every room state: open links to everyone in voice, close the rest.
  // For each pair, the lower id makes the offer, so both sides never offer at once.
  function sync(list, me) {
    members = list || [];
    myId = me;
    if (!on) return;
    const wanted = new Set(members.filter(m => m.voice && m.connected && !m.isBot && m.id !== me).map(m => m.id));
    for (const id of [...peers.keys()]) if (!wanted.has(id)) drop(id, false);
    for (const id of wanted) if (!peers.has(id) && me < id) connect(id, true);
  }

  function connect(id, offerer) {
    const pc = new RTCPeerConnection({ iceServers: ICE });
    const peer = { pc, offerer, audio: null, queued: [] };
    peers.set(id, peer);
    if (stream) for (const tr of stream.getTracks()) pc.addTrack(tr, stream);
    else if (offerer) pc.addTransceiver('audio', { direction: 'recvonly' });
    pc.onicecandidate = e => { if (e.candidate) signal(id, { candidate: e.candidate.toJSON() }); };
    pc.ontrack = e => {
      const remote = e.streams[0] || new MediaStream([e.track]);
      if (!peer.audio) {
        peer.audio = new Audio();
        peer.audio.autoplay = true;
      }
      peer.audio.srcObject = remote;
      peer.audio.play().catch(() => {});
      meter(id, remote);
    };
    pc.onconnectionstatechange = () => {
      if (pc.connectionState !== 'failed' || peers.get(id) !== peer) return;
      // start over: tell the other side, then the offerer dials again
      drop(id, true);
      setTimeout(() => sync(members, myId), 1000);
    };
    if (offerer) {
      pc.createOffer()
        .then(offer => pc.setLocalDescription(offer))
        .then(() => signal(id, { sdp: pc.localDescription.toJSON() }))
        .catch(() => drop(id, true));
    }
    return peer;
  }

  function drop(id, tell) {
    const peer = peers.get(id);
    if (!peer) return;
    peers.delete(id);
    peer.pc.onconnectionstatechange = null;
    peer.pc.close();
    if (peer.audio) { peer.audio.srcObject = null; peer.audio = null; }
    unmeter(id);
    if (tell) signal(id, { bye: true });
  }

  async function onSignal(from, data) {
    if (!on || !data) return;
    if (data.bye) {
      drop(from, false);
      setTimeout(() => sync(members, myId), 500);
      return;
    }
    if (data.sdp?.type === 'offer') {
      // a fresh offer replaces whatever link we had (the other side started over)
      if (peers.has(from)) drop(from, false);
      const peer = connect(from, false);
      try {
        await peer.pc.setRemoteDescription(data.sdp);
        await flush(peer);
        await peer.pc.setLocalDescription(await peer.pc.createAnswer());
        signal(from, { sdp: peer.pc.localDescription.toJSON() });
      } catch { drop(from, true); }
      return;
    }
    const peer = peers.get(from);
    if (!peer) return;
    if (data.sdp?.type === 'answer') {
      if (peer.pc.signalingState !== 'have-local-offer') return;
      try {
        await peer.pc.setRemoteDescription(data.sdp);
        await flush(peer);
      } catch { drop(from, true); }
    } else if (data.candidate) {
      if (peer.pc.remoteDescription) peer.pc.addIceCandidate(data.candidate).catch(() => {});
      else peer.queued.push(data.candidate);
    }
  }

  async function flush(peer) {
    for (const c of peer.queued.splice(0)) await peer.pc.addIceCandidate(c).catch(() => {});
  }

  // ---------- who's talking ----------

  function meter(id, src) {
    if (!ctx || id == null) return;
    unmeter(id);
    try {
      const source = ctx.createMediaStreamSource(src);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      source.connect(analyser);
      meters.set(id, { source, analyser, buf: new Float32Array(analyser.fftSize), lastLoud: 0, on: false });
    } catch { /* some browsers can't analyse remote streams */ }
  }

  function unmeter(id) {
    const m = meters.get(id);
    if (!m) return;
    m.source.disconnect();
    meters.delete(id);
    if (m.on) onSpeaking(id, false);
  }

  function tick() {
    if (ctx?.state === 'suspended') ctx.resume().catch(() => {});
    const now = performance.now();
    for (const [id, m] of meters) {
      m.analyser.getFloatTimeDomainData(m.buf);
      let sum = 0;
      for (const v of m.buf) sum += v * v;
      const loud = Math.sqrt(sum / m.buf.length) > SPEAK_LEVEL && !(id === myId && muted);
      if (loud) m.lastLoud = now;
      const speaking = now - m.lastLoud < SPEAK_HOLD_MS;
      if (speaking !== m.on) {
        m.on = speaking;
        onSpeaking(id, speaking);
      }
    }
  }

  return {
    join,
    leave,
    toggleMute,
    sync,
    onSignal,
    get on() { return on; },
    get muted() { return muted || (on && !stream); },
    get canTalk() { return Boolean(stream); },
    isSpeaking: id => Boolean(meters.get(id)?.on),
  };
}
