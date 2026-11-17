// Hold-to-talk recording (MediaRecorder) + live speech-to-text (Web Speech API),
// and his voice via speechSynthesis.

const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
export const sttSupported = !!SR;

export class Recorder {
  constructor(lang) { this.lang = lang; this.transcript = ''; this.chunks = []; }
  async start() {
    this.t0 = Date.now();
    this.transcript = '';
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
    } catch (e) { this.denied = true; throw e; }
    // released before the microphone was ready: shut it straight away
    if (this.stopped) { this.stream.getTracks().forEach(t => t.stop()); return; }
    try {
      const type = ['audio/webm;codecs=opus', 'audio/mp4', 'audio/webm'].find(t => window.MediaRecorder && MediaRecorder.isTypeSupported?.(t));
      this.mr = new MediaRecorder(this.stream, type ? { mimeType: type } : undefined);
      this.mr.ondataavailable = e => e.data.size && this.chunks.push(e.data);
      this.mr.start();
    } catch (e) { this.mr = null; }
    if (SR) {
      try {
        this.sr = new SR();
        this.sr.lang = this.lang === 'en' ? 'en-US' : 'zh-CN';
        this.sr.interimResults = true;
        this.sr.continuous = true;
        let finalText = '';
        this.sr.onresult = ev => {
          let interim = '';
          for (let i = ev.resultIndex; i < ev.results.length; i++) {
            const r = ev.results[i];
            if (r.isFinal) finalText += r[0].transcript; else interim += r[0].transcript;
          }
          this.transcript = (finalText + interim).trim();
          this.onpartial?.(this.transcript);
        };
        this.sr.onerror = () => {};
        this.sr.start();
      } catch (e) { this.sr = null; }
    }
  }
  /** @returns {Promise<{dur:number, url:string|null, transcript:string}>} */
  stop() {
    this.stopped = true;
    const dur = Math.max(1, Math.round((Date.now() - this.t0) / 1000));
    return new Promise(resolve => {
      const finish = () => {
        // give recognition a moment to deliver its final result
        setTimeout(() => {
          try { this.sr?.stop(); } catch (e) {}
          this.stream?.getTracks().forEach(t => t.stop());
          const url = this.chunks.length ? URL.createObjectURL(new Blob(this.chunks, { type: this.chunks[0].type || 'audio/webm' })) : null;
          resolve({ dur, url, transcript: this.transcript });
        }, SR ? 450 : 0);
      };
      if (this.mr && this.mr.state !== 'inactive') { this.mr.onstop = finish; try { this.mr.stop(); } catch (e) { finish(); } }
      else finish();
    });
  }
  cancel() {
    this.stopped = true;
    try { this.sr?.abort(); } catch (e) {}
    try { this.mr?.stop(); } catch (e) {}
    this.stream?.getTracks().forEach(t => t.stop());
  }
}

let voicesCache = [];
function loadVoices() { voicesCache = window.speechSynthesis?.getVoices() || []; }
if ('speechSynthesis' in window) { loadVoices(); speechSynthesis.onvoiceschanged = loadVoices; }

const MALE_HINTS = /(male|yunxi|yunjian|yunyang|kangkang|daniel|alex|fred|aaron|arthur|tom|rishi|guy|davis|eric|liam|ryan|nathan)/i;
function pickVoice(lang) {
  const want = lang === 'en' ? /^en/i : /^zh|cmn/i;
  const list = voicesCache.filter(v => want.test(v.lang));
  return list.find(v => MALE_HINTS.test(v.name)) || list.find(v => /CN|TW|US|GB/i.test(v.lang)) || list[0] || null;
}

export const ttsSupported = 'speechSynthesis' in window;
export function speak(text, lang, voiceOpts = {}, onstart, onend) {
  if (!ttsSupported || !text) { onend?.(); return; }
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = lang === 'en' ? 'en-US' : 'zh-CN';
  const v = pickVoice(lang); if (v) u.voice = v;
  u.pitch = voiceOpts.pitch ?? 0.85;
  u.rate = voiceOpts.rate ?? 1;
  u.onstart = () => onstart?.();
  u.onend = () => onend?.();
  u.onerror = () => onend?.();
  speechSynthesis.speak(u);
}
export function stopSpeaking() { try { speechSynthesis.cancel(); } catch (e) {} }
/** Rough spoken duration in seconds, for the voice bubble label. */
export function estDur(text, lang) { return Math.max(1, Math.round(lang === 'en' ? text.split(/\s+/).length / 2.6 : text.length / 4.2)); }
