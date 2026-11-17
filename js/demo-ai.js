// Offline "demo" reply engine: intent matching + per-character lines.
import { L, isZh } from './i18n.js?v=20';
import { nowDoing, isBusy } from './data.js?v=20';
import { stageOf } from './store.js?v=20';

const RX = {
  love: /(喜欢你|爱你|我喜欢你|i love you|love you|i like you|like you a lot)/i,
  miss: /(想你|想见你|好想|miss you|missing you)/i,
  morning: /(早安|早上好|早啊|^早[!！。~～]*$|good morning|^morning)/i,
  night: /(晚安|去睡|睡了|要睡|good ?night|going to bed|go to sleep|gn\b)/i,
  sad: /(难过|伤心|不开心|想哭|哭了|委屈|烦死|心情不好|好烦|sad|upset|cry|bad day|depressed|lonely|孤单)/i,
  tired: /(累|好困|疲惫|加班|没睡|压力|tired|exhausted|worn out|sleepy|rough day|long day|stressed)/i,
  doing: /(在干嘛|在做什么|干什么呢|在忙|忙吗|你呢在|what are you doing|wyd|what r u doing|busy\??$)/i,
  food: /(吃饭|饿了|吃了|早饭|午饭|晚饭|外卖|宵夜|eat|food|hungry|lunch|dinner|breakfast)/i,
  thanks: /(谢谢|多谢|thank)/i,
  compliment: /(好帅|好看|真帅|可爱|厉害|温柔|handsome|cute|cool|amazing|you're sweet|so kind)/i,
  greet: /^(hi|hello|hey|yo|嗨|你好|在吗|在嘛|哈喽|hello there)/i,
};
const NAME_RX = /(?:我叫|叫我)([一-鿿A-Za-z]{1,8})|(?:my name is|call me|i'm called)\s+([A-Za-z][A-Za-z\- ]{0,15})/i;
const LIKE_RX = /我(?:很|最|超|也)?喜欢(?!你)([^，。！？,.!?\s]{1,12})|\bi (?:really |also )?(?:like|love|enjoy) (?!you\b)([a-z][a-z \-]{1,24})/i;

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
  const say = (intent) => fill(pick(lines[intent][lang], stage), ctx);
  const out = []; const learned = {}; let affinity = 2;

  if (msg.type === 'image') { out.push(say('photo')); affinity = 4; }
  else if (msg.type === 'avatar') { out.push(say('avatar')); affinity = 3; }
  else if (msg.type === 'gift') { out.push(say('gift')); affinity = 6; }
  else if (msg.type === 'care') { out.push(say('care')); affinity = 4; }
  else if (msg.type === 'voice' && !text) { out.push(say('voice')); affinity = 4; }
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
  if (busy && lines.busy) out.splice(0, out.length, say('busy'), ...out.slice(0, 1));
  // Between 1 and 5 am he tells you to go to sleep, in his own words.
  const h = new Date().getHours();
  if (!busy && h >= 1 && h < 5 && !RX.night.test(text) && out.length < 3) out.push(say('night'));
  return { texts: out.filter(Boolean), lang, affinity, learned, busy };
}

function capitalize(s) { return s ? s[0].toUpperCase() + s.slice(1) : s; }
