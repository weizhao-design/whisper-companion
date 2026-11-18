// Offline "demo" reply engine: intent matching + per-character lines.
import { L, isZh } from './i18n.js?v=33';
import { nowDoing, isBusy } from './data.js?v=33';
import { stageOf } from './store.js?v=33';

const RX = {
  love: /(喜欢你|爱你|我喜欢你|i love you|love you|i like you|like you a lot)/i,
  miss: /(想你|想见你|好想|miss you|missing you)/i,
  morning: /(早安|早上好|早啊|^早[!！。~～]*$|good morning|^morning)/i,
  night: /(晚安|去睡|睡了|要睡|早点睡|快睡|睡吧|good ?night|going to bed|go to sleep|get some sleep|gn\b)/i,
  sad: /(难过|伤心|不开心|想哭|哭了|委屈|烦死|心情不好|好烦|sad|upset|cry|bad day|depressed|lonely|孤单)/i,
  tired: /(累|好困|疲惫|加班|没睡|睡不着|失眠|压力|can'?t sleep|insomnia|tired|exhausted|worn out|sleepy|rough day|long day|stressed)/i,
  doing: /(在干嘛|在做什么|干什么呢|在忙|忙吗|你呢在|what are you doing|wyd|what r u doing|busy\??$)/i,
  food: /(吃饭|饿了|吃了|早饭|午饭|晚饭|外卖|宵夜|eat|food|hungry|lunch|dinner|breakfast)/i,
  thanks: /(谢谢|多谢|thank)/i,
  compliment: /(好帅|好看|真帅|可爱|厉害|温柔|handsome|cute|cool|amazing|you're sweet|so kind)/i,
  greet: /^(hi|hello|hey|yo|嗨|你好|在吗|在嘛|哈喽|hello there)/i,
};
const ACK_RX = /^(好|好的|好吧|嗯|嗯嗯|行|知道了|收到|ok|okay|k|fine|sure|alright|got it)[!！。.~～]*$/i;
const NAME_RX = /(?:我叫|叫我)([一-鿿A-Za-z]{1,8})|(?:my name is|call me|i'm called)\s+([A-Za-z][A-Za-z\- ]{0,15})/i;
const LIKE_RX = /我(?:很|最|超|也)?喜欢(?!你)([^，。！？,.!?\s]{1,12})|\bi (?:really |also )?(?:like|love|enjoy) (?!you\b)([a-z][a-z \-]{1,24})/i;

/** Topics from the player's boundaries text ("不聊身材、不聊前任" -> 身材, 前任). */
export function boundaryWords(text) {
  return String(text || '')
    .replace(/不要聊|不想聊|别聊|不聊|不要提|别提|不要|no comments on( my)?|don['’]t talk about|don['’]t mention|no talk(ing)? about|\bno\b/gi, ' ')
    .split(/[，,、；;。.\s\/|]+/).map(w => w.trim()).filter(w => w.length >= 2);
}

export function replyLangFor(text, settings) {
  if (settings.replyLang === 'zh') return 'zh';
  if (settings.replyLang === 'en') return 'en';
  const z = isZh(text);
  return z === null ? settings.lang : (z ? 'zh' : 'en');
}

function pick(arr, stage) {
  if (!arr || !arr.length) return '';
  if (arr.length <= 2) return arr[Math.floor(Math.random() * arr.length)];
  const pool = arr.slice(0, Math.min(arr.length, stage + 2));
  return Math.random() < 0.6 ? pool[pool.length - 1] : pool[Math.floor(Math.random() * pool.length)];
}

function fill(s, ctx) {
  return s.replaceAll('{me}', ctx.me).replaceAll('{like}', ctx.like || '').replaceAll('{gift}', ctx.gift || '')
    .replaceAll('{now}', ctx.now);
}

/**
 * @returns {{ texts: string[], lang: string, affinity: number, learned: {name?:string, like?:string} }}
 */
export function demoReply({ char, cs, state, msg }) {
  const text = (msg.type === 'voice' ? (msg.transcript || '') : (msg.text || '')).trim();
  const lang = msg.forceLang || replyLangFor(text || '', state.settings);
  const stage = stageOf(cs.affinity);
  const lines = char.lines;
  const likeMem = cs.memories.filter(m => m.kind === 'like');
  const lastLike = likeMem.length ? likeMem[likeMem.length - 1].value : '';
  const nowTxt = L(nowDoing(char)) ;
  const name = cs.callMe || state.profile.name || (lang === 'zh' ? '你' : 'you');
  // From "something more" on, he sometimes uses his own nickname for you instead of your name.
  const usePet = stage >= 2 && char.pet && Math.random() < 0.3;
  const ctx = {
    me: usePet ? char.pet[lang] : name,
    like: lastLike,
    gift: msg.giftName ? (msg.giftName[lang] || msg.giftName.zh) : '',
    now: lang === 'zh' ? nowDoing(char).zh : capitalize(nowDoing(char).en),
  };
  void nowTxt;
  // lines he said recently are skipped, so he never repeats himself back to back
  // compare without the name / nickname, so "晚安，小林" and "晚安，核桃二号" count as the same line
  const strip = t => [name, char.pet?.zh, char.pet?.en].filter(Boolean).reduce((a, w) => a.replaceAll(w, ''), String(t || ''));
  const recent = new Set((state.messages?.[char.id] || []).filter(m => m.from === 'him').slice(-6).map(m => strip(m.text)));
  const say = (intent) => {
    // drop lines he said recently before picking; fall back to the full set only if nothing is left
    const all = lines[intent][lang];
    const fresh = all.filter(t => !recent.has(strip(fill(t, ctx))));
    const pool = all.slice(0, Math.min(all.length, stage + 2)).filter(t => fresh.includes(t));
    const line = fill(pick(pool.length ? pool : (fresh.length ? fresh : all), stage), ctx);
    recent.add(strip(line)); return line;
  };
  const now = Date.now();
  const nudgedLately = cs.lastNudge && now - cs.lastNudge < 3 * 3600e3;
  const out = []; const learned = {}; let affinity = 2;

  if (msg.type === 'image') { out.push(say('photo')); affinity = 4; }
  else if (msg.type === 'avatar') { out.push(say('avatar')); affinity = 3; }
  else if (msg.type === 'gift') { out.push(say('gift')); affinity = 6; }
  else if (msg.type === 'care') { out.push(say('care')); affinity = 4; }
  else if (msg.type === 'voice' && !text) { out.push(say('voice')); affinity = 4; }
  else if (ACK_RX.test(text) && cs.lastNudge && now - cs.lastNudge < 20 * 60e3) {
    out.push(say('night')); affinity = 1;
  }
  else if (lines.boundary && boundaryWords(state.profile.boundaries).some(w => text.toLowerCase().includes(w.toLowerCase()))) {
    out.push(say('boundary')); affinity = 1;
  }
  else {
    const nm = text.match(NAME_RX);
    if (nm) {
      learned.name = (nm[1] || nm[2] || '').trim();
      ctx.me = learned.name;
      out.push(fill(pick(lines.name[lang], stage), ctx));
    }
    const lk = !nm && text.match(LIKE_RX);
    if (lk) {
      learned.like = (lk[1] || lk[2] || '').trim();
      ctx.like = learned.like;
      out.push(fill(pick(lines.like[lang], stage), ctx));
    }
    {
      const hits = Object.keys(RX).filter(k => RX[k].test(text) && !(k === 'love' && lk));
      for (const k of hits.slice(0, 2 - out.length)) out.push(say(k));
      if (hits.includes('love')) affinity = 5;
      if (hits.includes('miss') || hits.includes('sad')) affinity = 3;
    }
    if (!out.length) {
      if (lastLike && Math.random() < 0.18) out.push(fill(pick(lines.remember[lang], stage), ctx));
      else out.push(say('fallback'));
    }
    if (msg.type === 'voice') { affinity += 2; if (Math.random() < 0.4) out.push(say('voice')); }
  }
  // Busy slot (meeting, shift, gig, class): one line about being busy, then a single short reply.
  const busy = isBusy(char);
  // (line 3 of his busy lines is the "I'm free now" one, kept for the message he sends after the slot)
  if (busy && lines.busy) out.splice(0, out.length, fill(pick(lines.busy[lang].filter((_, i) => i !== 2), stage), ctx), ...out.slice(0, 1));
  // Between 1 and 5 am he tells you to go to sleep, in his own words.
  const h = new Date().getHours();
  let nudged = false;
  if (!busy && h >= 1 && h < 5 && !nudgedLately && !RX.night.test(text) && out.length < 3) { out.push(say('night')); nudged = true; }
  return { texts: out.filter(Boolean), lang, affinity, learned, busy, nudged };
}

function capitalize(s) { return s ? s[0].toUpperCase() + s.slice(1) : s; }

/**
 * A message he sends first, or null. Never between 1 and 7 am.
 * Right after a busy slot: "meeting's over"; in the morning: good morning; otherwise his own opener.
 */
export function proactiveLine({ char, cs, state, date = new Date() }) {
  const h = date.getHours();
  if (h >= 1 && h < 7) return null;
  const lang = state.settings.lang === 'en' ? 'en' : 'zh';
  const stage = stageOf(cs.affinity);
  const L = char.lines;
  const ctx = { me: cs.callMe || state.profile.name || (lang === 'zh' ? '你' : 'you'), like: '', gift: '', now: lang === 'zh' ? nowDoing(char, date).zh : capitalize(nowDoing(char, date).en) };
  const justFree = char.schedule.some(([a, b, , busy]) => busy && h >= b && h < b + 2);
  let text;
  if (justFree && L.busy) text = L.busy[lang][2];
  else if (h >= 7 && h < 10 && L.morning) text = pick(L.morning[lang], stage);
  else if (L.ping) text = pick(L.ping[lang], stage);
  return text ? { text: fill(text, ctx), lang } : null;
}
