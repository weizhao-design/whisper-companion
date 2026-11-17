// App state, persisted to localStorage on this device only.
import { CHARACTERS } from './data.js?v=22';

const KEY = 'whisper.v1';
export const STAGES = [0, 25, 50, 80, 101];

function seed() {
  const now = Date.now();
  const s = {
    v: 1,
    onboarded: false,
    settings: { lang: (navigator.language || '').toLowerCase().startsWith('zh') ? 'zh' : 'en', theme: 'system', replyLang: 'follow', autoplay: true, aiMode: 'demo', apiKey: '', letSeeAvatar: true, avatarAsked: false },
    profile: { name: '', avatar: null, birthday: '', likes: '', boundaries: '' },
    chars: {},
    messages: {},
    toy: { connected: false, charId: 'wenxu', muted: false, playWhere: 'both', volume: 80, quiet: true, idleFace: 'smile', dim: true, brightness: 70, name: '' },
    avatarPending: [],
    face: { charId: 'wenxu', state: 'idle' },
  };
  for (const c of CHARACTERS) { s.chars[c.id] = charSeed(c, now); s.messages[c.id] = []; }
  s.toy.charId = 'wenxu';
  return s;
}

// Starting relationship for each character: Wen Xu is the one on the toy,
// so he starts furthest along.
const PRESET = {
  wenxu: { aff: 62, sync: 70, days: 30, pinned: true, moments: [['mStage', 2, 5], ['mFirstGift', null, 12], ['mFirstVoice', null, 24], ['mMet', null, 30]] },
  chengshuo: { aff: 34, sync: 40, days: 12, moments: [['mStage', 1, 3], ['mMet', null, 12]] },
};
function charSeed(c, now) {
  const p = PRESET[c.id] || { aff: 5, sync: 10, days: 0, moments: [] };
  return {
    owned: c.owned, affinity: c.owned ? p.aff : 5, mood: 'calm', sync: c.owned ? p.sync : 10,
    metAt: c.owned ? now - p.days * 864e5 : null,
    callMe: '', replyMode: 'voicetext', memories: [],
    moments: c.owned ? p.moments.map(([key, arg, d]) => ({ key, ...(arg != null ? { arg } : {}), ts: now - d * 864e5 })) : [],
    unread: 0, pinned: !!p.pinned, lastAvatarDay: '',
  };
}

let state;
try { state = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { state = null; }
if (!state || state.v !== 1) state = seed();
// Someone who opened an earlier build may have characters that no longer exist: drop them
// and move the toy / pin to a character that does.
for (const id of Object.keys(state.chars)) {
  if (CHARACTERS.some(c => c.id === id)) continue;
  delete state.chars[id]; delete state.messages[id];
}
if (!CHARACTERS.some(c => c.id === state.toy.charId)) state.toy.charId = 'wenxu';
if (!CHARACTERS.some(c => c.id === state.face.charId)) state.face.charId = state.toy.charId;
if (!Object.values(state.chars).some(cs => cs.pinned) && state.chars.wenxu) state.chars.wenxu.pinned = true;
// Characters added after someone first opened the app show up too.
for (const c of CHARACTERS) {
  if (state.chars[c.id]) continue;
  const now = Date.now();
  state.chars[c.id] = charSeed(c, now);
  state.messages[c.id] = [];
  if (state.onboarded && c.owned) {
    const lang = state.settings.lang;
    const text = c.opener[lang];
    state.messages[c.id].push({ id: 'm' + now.toString(36) + c.id, from: 'him', type: 'voice', text, transcript: text, dur: Math.max(1, Math.round(lang === 'en' ? text.split(/\s+/).length / 2.6 : text.length / 4.2)), lang, showText: true, ts: now });
    state.chars[c.id].unread = 1;
  }
  // a newly added pinned character takes the top spot and the toy
  if (state.chars[c.id].pinned) {
    for (const id of Object.keys(state.chars)) if (id !== c.id) state.chars[id].pinned = false;
    if (!state.toy.connected) state.toy.charId = c.id;
  }
}

// write the cleaned-up state back once, so old data does not linger in storage
persist();

const subs = new Set();
export function getState() { return state; }
export function subscribe(fn) { subs.add(fn); return () => subs.delete(fn); }
export function emit() { subs.forEach(fn => { try { fn(state); } catch (e) { console.error(e); } }); }

let saveTimer = null;
export function save() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(persist, 120);
}
function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch (e) {
    // Out of space: drop the oldest stored photos and try again.
    const imgs = [];
    for (const list of Object.values(state.messages)) for (const m of list) if (m.img) imgs.push(m);
    imgs.sort((a, b) => a.ts - b.ts).slice(0, Math.ceil(imgs.length / 2)).forEach(m => { m.img = null; m.imgDropped = true; });
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e2) { console.warn('storage full', e2); }
  }
}
export function update(fn) { fn(state); save(); emit(); }
export function resetAll() { try { localStorage.removeItem(KEY); } catch (e) {} state = seed(); emit(); }

export function stageOf(aff) { let i = 0; while (i < 3 && aff >= STAGES[i + 1]) i++; return i; }
export function stageProgress(aff) {
  const i = stageOf(aff); if (i >= 3) return 100;
  return Math.round(((aff - STAGES[i]) / (STAGES[i + 1] - STAGES[i])) * 100);
}

let idc = Date.now();
export function newId() { return 'm' + (++idc).toString(36); }

/** In-memory only: recorded audio for this session (not persisted). */
export const audioCache = new Map();
