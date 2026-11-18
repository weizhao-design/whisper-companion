import { t, L, setLang, getLang } from './i18n.js?v=28';
import { CHARACTERS, GIFTS, CARES, getChar, nowDoing, isBusy } from './data.js?v=28';
import { getState, update, subscribe, stageOf, stageProgress, newId, audioCache, resetAll, save } from './store.js?v=28';
import { portrait, userAvatar, USER_AVATARS, escapeHtml as esc } from './avatar.js?v=28';
import { demoReply, replyLangFor, proactiveLine } from './demo-ai.js?v=28';
import { claudeReply } from './claude.js?v=28';
import { Recorder, speak, stopSpeaking, estDur, sttSupported } from './voice.js?v=28';
import { COLD_OPEN } from './coldopen.js?v=28';

const app = document.getElementById('app');
const S = () => getState();
const $ = (sel, root = document) => root.querySelector(sel);
const icon = (id, cls = '') => `<svg class="${cls}"><use href="#${id}"/></svg>`;
const sleep = ms => new Promise(r => setTimeout(r, ms));

// ---------- transient UI state (not persisted) ----------
const ui = { inputMode: 'voice', panel: null, typing: {}, speakingId: null, discoverTag: null, charSeg: 'mine', chatSearch: { q: '', f: 'all' }, toyStep: 0, lastRoute: '' };
const face = {}; // charId -> state

// ---------- theme & language ----------
const mq = matchMedia('(prefers-color-scheme: dark)');
function applyTheme() {
  let th = S().settings.theme;
  if (th === 'system') th = mq.matches ? 'night' : 'day';
  document.documentElement.dataset.theme = th;
}
mq.addEventListener?.('change', () => { applyTheme(); });

// ---------- helpers ----------
function fmtTime(ts) {
  const d = new Date(ts), n = new Date();
  const hm = d.toLocaleTimeString(getLang() === 'zh' ? 'zh-CN' : 'en-US', { hour: '2-digit', minute: '2-digit' });
  if (d.toDateString() === n.toDateString()) return hm;
  const y = new Date(n); y.setDate(n.getDate() - 1);
  if (d.toDateString() === y.toDateString()) return t('yesterday');
  return `${d.getMonth() + 1}/${d.getDate()}`;
}
function fmtStamp(ts) {
  const d = new Date(ts), n = new Date();
  const hm = d.toLocaleTimeString(getLang() === 'zh' ? 'zh-CN' : 'en-US', { hour: '2-digit', minute: '2-digit' });
  if (d.toDateString() === n.toDateString()) return hm;
  return `${fmtTime(ts)} ${hm}`;
}
function preview(m) {
  if (!m) return '';
  // his voice notes that already show their text preview that text, so the chat list reads like a story hook
  if (m.type === 'voice') return m.from === 'him' && m.showText && m.text ? `${t('voiceTag')} ${m.text}` : `${t('voiceTag')} ${m.dur || 1}″`;
  if (m.type === 'image') return t('photo');
  if (m.type === 'gift' || m.type === 'care') return `${t('giftTag')} ${L(m.giftName)}`;
  if (m.type === 'avatar') return t('youChangedAvatar');
  return m.text || '';
}
function toast(msg, ms = 1800) {
  const el = document.createElement('div'); el.className = 'toast'; el.textContent = msg;
  app.appendChild(el); setTimeout(() => el.remove(), ms);
}
function sheet(html, bind) {
  const scrim = document.createElement('div'); scrim.className = 'scrim';
  scrim.innerHTML = `<div class="sheet" role="dialog">${html}</div>`;
  scrim.addEventListener('click', e => { if (e.target === scrim) scrim.remove(); });
  app.appendChild(scrim);
  bind?.(scrim.firstElementChild, () => scrim.remove());
  return scrim;
}
function confirmSheet(text) {
  return new Promise(res => {
    sheet(`<h3>${esc(text)}</h3><div class="row2"><button class="btn" data-x="0">${t('cancel')}</button><button class="btn p" data-x="1">${t('done')}</button></div>`,
      (el, close) => el.addEventListener('click', e => { const b = e.target.closest('[data-x]'); if (b) { close(); res(b.dataset.x === '1'); } }));
  });
}
function charAv(c, state = 'static') { return `<span class="av" data-face="${c.id}">${portrait(c.look, { state })}</span>`; }
function meAv() { return `<span class="av">${userAvatar(S())}</span>`; }
function hl(text, q) {
  const s = esc(text); if (!q) return s;
  const i = s.toLowerCase().indexOf(esc(q).toLowerCase()); if (i < 0) return s;
  const start = Math.max(0, i - 14);
  return (start ? '…' : '') + s.slice(start, i) + '<mark>' + s.slice(i, i + esc(q).length) + '</mark>' + s.slice(i + esc(q).length);
}
async function readImage(file, max = 960, square = false) {
  const url = URL.createObjectURL(file);
  const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url; });
  let sw = img.naturalWidth, sh = img.naturalHeight, sx = 0, sy = 0;
  if (square) { const m = Math.min(sw, sh); sx = (sw - m) / 2; sy = (sh - m) / 2; sw = sh = m; }
  const scale = Math.min(1, max / Math.max(sw, sh));
  const c = document.createElement('canvas'); c.width = Math.round(sw * scale); c.height = Math.round(sh * scale);
  c.getContext('2d').drawImage(img, sx, sy, sw, sh, 0, 0, c.width, c.height);
  URL.revokeObjectURL(url);
  return c.toDataURL('image/jpeg', 0.82);
}
function setFace(charId, st) {
  face[charId] = st;
  document.querySelectorAll(`[data-face="${charId}"][data-live] .pt`).forEach(el => {
    el.classList.remove('st-static', 'st-idle', 'st-listen', 'st-think', 'st-speak');
    el.classList.add(`st-${st}`);
  });
  const lab = document.querySelector(`[data-face-label="${charId}"]`);
  if (lab) lab.textContent = t({ idle: 'stIdle', listen: 'stListen', think: 'stThink', speak: 'stSpeak' }[st]);
}
const navBar = active => `<nav class="nav">
  ${[['chats', 'n-chat', 'tabChats'], ['chars', 'n-chars', 'tabChars'], ['toy', 'n-toy', 'tabToy'], ['me', 'n-me', 'tabMe']].map(([r, ic, k]) => {
    let badge = '';
    if (r === 'chats') { const u = Object.values(S().chars).reduce((a, c) => a + (c.owned ? c.unread : 0), 0); if (u) badge = `<span class="bdg">${u > 99 ? '99+' : u}</span>`; }
    return `<button class="${active === r ? 'on' : ''}" data-go="#/${r}" aria-label="${t(k)}">${icon(ic)}${t(k)}${badge}</button>`;
  }).join('')}</nav>`;
const header = (title, { back, right = '', sub = '' } = {}) => `<header class="hdr">
  ${back ? `<button class="hb" data-act="back" aria-label="${t('back')}">${icon('i-back')}</button>` : '<span></span>'}
  <h1>${title}${sub ? `<small id="hdr-sub">${sub}</small>` : ''}</h1>${right || '<span></span>'}</header>`;

// ---------- router ----------
function route() {
  const raw = location.hash.slice(1) || '/chats';
  const [path, qs] = raw.split('?');
  const parts = path.split('/').filter(Boolean);
  return { parts, q: new URLSearchParams(qs || '') };
}
function go(hash) { location.hash = hash; }
window.addEventListener('hashchange', () => render(true));

function render(isNav) {
  setLang(S().settings.lang);
  applyTheme();
  stopIfLeftChat();
  if (!S().onboarded) { app.innerHTML = screenOnboard(); bindOnboard(); return; }
  const { parts, q } = route();
  const [a, b, c] = parts;
  let html;
  if (a === 'chat' && b && getChar(b)) html = c === 'info' ? screenChatInfo(b) : c === 'search' ? screenChatSearch(b) : screenChat(b, q.get('hl'));
  else if (a === 'char' && b && getChar(b)) html = screenCharProfile(b);
  else if (a === 'chars') html = screenChars();
  else if (a === 'toy') html = screenToy();
  else if (a === 'me') html = b ? screenMeSub(b) : screenMe();
  else html = screenChats();
  const prevScroll = !isNav ? $('.body', app)?.scrollTop : 0;
  app.innerHTML = `<div class="screen ${isNav && parts.length > 1 ? 'push' : ''}">${html}</div>`;
  if (!isNav && prevScroll) { const bd = $('.body', app); if (bd) bd.scrollTop = prevScroll; }
  afterRender(parts, q);
}
let lastChatId = null;
function stopIfLeftChat() {
  const { parts } = route();
  const cur = parts[0] === 'chat' ? parts[1] : null;
  if (lastChatId && cur !== lastChatId) stopSpeaking();
  lastChatId = cur;
}

// global click delegation
app.addEventListener('click', e => {
  const g = e.target.closest('[data-go]'); if (g) { go(g.dataset.go); return; }
  const a = e.target.closest('[data-act]'); if (a && ACT[a.dataset.act]) ACT[a.dataset.act](a, e);
});
const ACT = {
  back: () => history.length > 1 ? history.back() : go('#/chats'),
};

// ======================= ONBOARDING =======================
function screenOnboard() {
  const s = S();
  return `<div class="body"><div class="onb" style="padding-top:calc(var(--sat) + 40px)">
    <div class="big" style="width:132px">${appIconSvg()}</div>
    <h2>${t('welcome')} · ${t('appName')}</h2><p>${t('welcomeSub')}</p>
    <div class="seg" style="align-self:stretch;margin:4px 0">
      <button class="${s.settings.lang === 'zh' ? 'on' : ''}" data-lang="zh">中文</button><button class="${s.settings.lang === 'en' ? 'on' : ''}" data-lang="en">English</button></div>
    <div class="card" style="align-self:stretch;text-align:left">
      <label style="font-size:13px;color:var(--muted)">${t('whatName')}</label>
      <input id="ob-name" type="text" maxlength="12" placeholder="${t('namePh')}" value="${esc(s.profile.name)}" style="width:100%;margin-top:6px;border:1px solid var(--line);border-radius:10px;padding:10px;background:var(--bg);outline:0">
      <label style="display:flex;gap:8px;align-items:flex-start;margin-top:12px;font-size:12.5px;color:var(--muted);text-align:left"><input id="ob-age" type="checkbox" style="margin-top:3px;accent-color:var(--acc)">${t('ageGate')}</label>
    </div>
    <button class="btn p block" id="ob-start" disabled style="opacity:.5">${t('start')}</button>
  </div></div>`;
}
function bindOnboard() {
  app.querySelectorAll('[data-lang]').forEach(b => b.onclick = () => { update(s => { s.settings.lang = b.dataset.lang; s.profile.name = $('#ob-name').value.trim(); }); });
  const age = $('#ob-age'), btn = $('#ob-start');
  age.onchange = () => { btn.disabled = !age.checked; btn.style.opacity = age.checked ? 1 : .5; };
  btn.onclick = () => {
    const name = $('#ob-name').value.trim();
    update(s => {
      s.onboarded = true; s.profile.name = name;
      const lang = s.settings.lang; const now = Date.now();
      CHARACTERS.filter(c => s.chars[c.id].owned).forEach((c, i) => {
        const co = COLD_OPEN[c.id];
        if (co) {
          // cold open: he starts in the middle of something; quick replies take it from there
          const lines = co.first[lang]; const t0 = now - co.minutesAgo * 60000;
          lines.forEach((text, j) => s.messages[c.id].push(co.voice && j === 0
            ? { id: newId(), from: 'him', type: 'voice', text, transcript: text, dur: estDur(text, lang), lang, showText: true, ts: t0 + j * 20000 }
            : { id: newId(), from: 'him', type: 'text', text, lang, ts: t0 + j * 20000 }));
          s.chars[c.id].unread = lines.length;
          s.chars[c.id].script = { at: 'root' };
          s.chars[c.id].coldOpened = true;
          return;
        }
        const text = c.opener[lang];
        s.messages[c.id].push({ id: newId(), from: 'him', type: 'voice', text, transcript: text, dur: estDur(text, lang), lang, showText: true, ts: now - (i ? 40 : 130) * 60000 });
        s.chars[c.id].unread = 1;
      });
    });
    go('#/chats'); render(true);
  };
}
function appIconSvg() {
  return `<svg viewBox="0 0 100 100" style="border-radius:22.37%;display:block"><defs><linearGradient id="aig" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2E2240"/><stop offset="1" stop-color="#141017"/></linearGradient></defs>
  <rect width="100" height="100" fill="url(#aig)"/><g transform="translate(5 -4) rotate(6 70 28)"><path d="M82 18C74 14 60 15 56 22C52 29 57 37 66 38L70 38L74 43L74 37C82 35 88 24 82 18Z" fill="#E9C887"/></g>
  <g transform="translate(-4 8) rotate(-8 50 50) scale(.92)"><path d="M29 29C43 22 70 22 79 34C87 46 79 62 62 64C54 65 47 64 41 63L29 75L32 61C21 56 17 37 29 29Z" fill="#FFF0E6"/>
  <circle cx="38" cy="45" r="3.4" fill="#C2416A" fill-opacity=".42"/><circle cx="49" cy="45" r="3.4" fill="#C2416A" fill-opacity=".7"/>
  <path d="M0 5C-7 0-7.5-6-3.5-7C-1.5-7.4 0-6 0-4.5C0-6 1.5-7.4 3.5-7C7.5-6 7 0 0 5Z" transform="translate(62 44.5) scale(.82)" fill="#C2416A"/></g></svg>`;
}

// ======================= CHATS =======================
function ownedChars() { return CHARACTERS.filter(c => S().chars[c.id].owned); }
function screenChats() {
  const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone;
  const showBanner = !standalone && !S().settings.installHidden && !document.body.classList.contains('device');
  return `${header(t('tabChats'))}
  <div class="body">
    <label class="searchbar">${icon('i-search')}<input id="q" type="search" placeholder="${t('search')}" autocomplete="off"></label>
    ${showBanner ? `<div class="banner">📱 ${t('install')}<button data-act="hideInstall" aria-label="${t('close')}">✕</button></div>` : ''}
    <div id="chatlist">${chatList()}</div>
  </div>${navBar('chats')}`;
}
ACT.hideInstall = () => update(s => { s.settings.installHidden = true; });
function chatList() {
  const s = S();
  const items = ownedChars().map(c => ({ c, cs: s.chars[c.id], last: s.messages[c.id].at(-1) }))
    .sort((x, y) => (y.cs.pinned - x.cs.pinned) || ((y.last?.ts || 0) - (x.last?.ts || 0)));
  if (!items.length) return `<div class="empty">${t('noChats')}</div>`;
  return `<div class="list">${items.map(({ c, cs, last }) => {
    const sub = ui.typing[c.id] ? `<span style="color:var(--acc)">${t('typing')}</span>` : `<span>${esc(preview(last))}</span>`;
    return `<button class="row ${cs.pinned ? 'pin' : ''}" data-go="#/chat/${c.id}">${charAv(c)}
      <div class="t"><div class="n">${esc(L(c.name))}<i>${last ? fmtTime(last.ts) : ''}</i></div>
      <div class="m">${sub}${cs.unread ? `<span class="bdg">${cs.unread}</span>` : ''}</div></div></button>`;
  }).join('')}</div>`;
}
function searchResults(q) {
  const s = S(); const ql = q.toLowerCase();
  const chars = CHARACTERS.filter(c => s.chars[c.id].owned && (c.name.zh.includes(q) || c.name.en.toLowerCase().includes(ql)));
  const groups = ownedChars().map(c => ({ c, hits: s.messages[c.id].filter(m => (m.text || m.transcript || m.caption || '').toLowerCase().includes(ql)) })).filter(g => g.hits.length);
  if (!chars.length && !groups.length) return `<div class="empty">${t('noResults')}</div>`;
  return `${chars.length ? `<div class="sec-t">${t('chars')}</div><div class="list">${chars.map(c => `<button class="row" data-go="#/chat/${c.id}">${charAv(c)}<div class="t"><div class="n">${hl(L(c.name), q)}</div></div></button>`).join('')}</div>` : ''}
  ${groups.length ? `<div class="sec-t">${t('records')}</div><div class="list">${groups.map(({ c, hits }) => hits.slice(-5).reverse().map(m =>
    `<button class="row" data-go="#/chat/${c.id}?hl=${m.id}">${charAv(c)}<div class="t"><div class="n">${esc(L(c.name))}<i>${fmtTime(m.ts)}</i></div><div class="m"><span>${hl(m.text || m.transcript || m.caption || '', q)}</span></div></div></button>`).join('')).join('')}</div>` : ''}`;
}

// ======================= CHAT =======================
function screenChat(id, hlId) {
  const c = getChar(id);
  const sub = ui.typing[id] ? t('typing') : ui.speakingId && ui.speakingChar === id ? t('speaking') : L(nowDoing(c));
  return `${header(esc(L(c.name)), { back: true, sub, right: `<button class="hb" data-go="#/chat/${id}/info" aria-label="${t('chatInfo')}">${icon('i-more')}</button>` })}
  <div class="chat body" id="chat">${chatMessages(id, hlId)}</div>
  ${composer()}`;
}
function chatMessages(id, hlId) {
  const s = S(); const c = getChar(id); const list = s.messages[id];
  let out = ''; let prev = 0;
  for (const m of list) {
    if (m.ts - prev > 10 * 60000) out += `<div class="date">${fmtStamp(m.ts)}</div>`;
    prev = m.ts;
    out += renderMsg(m, c, m.id === hlId);
  }
  if (ui.typing[id]) out += `<div class="msg him">${charAv(c)}<div class="col"><div class="bub typing-b"><i></i><i></i><i></i></div></div></div>`;
  return out || `<div class="empty">${esc(c.catchphrase[getLang()])}</div>`;
}
function wave(n) { return `<span class="wave">${[8, 14, 10, 16, 9].slice(0, n).map(h => `<i style="height:${h}px"></i>`).join('')}</span>`; }
function renderMsg(m, c, isHl) {
  if (m.from === 'sys' && m.kind === 'memNote') return `<button class="sys note" data-go="#/chat/${c.id}/info">${esc(m.text)} ›</button>`;
  if (m.from === 'sys') return `<div class="sys">${esc(m.text)}</div>`;
  if (m.type === 'avatar') return `<div class="sys">${t('youChangedAvatar')}</div>`;
  const mine = m.from === 'me';
  const av = mine ? meAv() : charAv(c);
  let body = '';
  if (m.type === 'voice') {
    const w = Math.min(190, 60 + (m.dur || 1) * 9);
    const playing = ui.speakingId === m.id ? 'playing' : '';
    body = `<button class="vb ${playing}" style="min-width:${w}px" data-act="play" data-id="${m.id}">${mine ? '' : ''}${wave(4)}<span>${m.dur || 1}″</span>${!mine && !m.heard ? '<span class="unread"></span>' : ''}</button>`;
    const showTr = mine ? m.open : (m.showText || m.open);
    if (showTr) body += `<div class="tr">${esc(m.transcript || (mine ? t('noStt') : m.text))}</div>`;
    if (!showTr) body += `<button class="tlink" data-act="tr" data-id="${m.id}">${t('voiceToText')}</button>`;
    else if (m.open) body += `<button class="tlink" data-act="tr" data-id="${m.id}">${t('hideText')}</button>`;
  } else if (m.type === 'image') {
    body = m.img ? `<span class="pic"><img src="${m.img}" alt=""></span>` : `<span class="pic lost">${t('photo')}</span>`;
  } else if (m.type === 'gift' || m.type === 'care') {
    body = `<div class="giftcard"><b>${m.giftIcon}</b>${esc(t(m.type === 'gift' ? 'giftSent' : 'careSent', { g: L(m.giftName) }))}</div>`;
  } else {
    const quote = m.quoteAvatar ? `<div class="quote"><span class="qav">${userAvatar(S())}</span>${t('yourNewPhoto')}</div>` : '';
    body = `<div class="bub">${quote}${esc(m.text)}</div>`;
  }
  const toy = m.fromToy ? `<span class="from-toy">♥ ${t('fromToy')}</span>` : '';
  return `<div class="msg ${mine ? 'me' : 'him'} ${isHl ? 'hl' : ''}" id="msg-${m.id}">${av}<div class="col">${body}${toy}</div></div>`;
}
function composer() {
  const voice = ui.inputMode === 'voice';
  const panel = ui.panel === 'plus' ? `<div class="plus">
      <button data-act="album"><span>🖼️</span>${t('album')}</button><button data-act="camera"><span>📷</span>${t('camera')}</button>
      <button data-act="panel" data-p="care"><span>☕</span>${t('care')}</button><button data-act="panel" data-p="gift"><span>🎁</span>${t('gift')}</button></div>`
    : ui.panel === 'care' || ui.panel === 'gift' ? `<div class="picker"><div class="pt-t">${t(ui.panel)}<button data-act="panel" data-p="plus">‹</button></div>
      ${(ui.panel === 'gift' ? GIFTS : CARES).map(g => `<button data-act="giveItem" data-kind="${ui.panel}" data-id="${g.id}"><b>${g.icon}</b>${esc(L(g.name))}</button>`).join('')}</div>` : '';
  return `${quickReplies()}<div class="composer">
    <button class="cb" data-act="toggleInput" aria-label="${voice ? 'keyboard' : 'voice'}">${icon(voice ? 'i-kbd' : 'i-mic')}</button>
    ${voice ? `<button class="hold" id="hold">${t('holdTalk')}</button>` : `<textarea id="txt" rows="1" placeholder="${t('inputPh')}">${esc(ui.draft || '')}</textarea>`}
    ${!voice ? `<button class="send" data-act="sendText">${getLang() === 'zh' ? '发送' : 'Send'}</button>` : ''}
    <button class="cb" data-act="panel" data-p="plus" aria-label="more">${icon('i-plus')}</button>
  </div>${panel}`;
}
// ---------- cold-open quick replies (js/coldopen.js) ----------
/** The active script (cold open or a story beat) for this chat, or null. */
function activeScript(id, cs = S().chars[id]) {
  const co = COLD_OPEN[id]; if (!co || !cs || !cs.script) return null;
  if (cs.script.beat) { const beat = (co.beats || []).find(b => b.id === cs.script.beat); return beat ? { co, beat, nodes: beat.nodes } : null; }
  return { co, beat: null, nodes: co.nodes };
}
function quickReplies() {
  const id = currentChat(); if (!id || ui.typing[id]) return '';
  const sc = activeScript(id); if (!sc) return '';
  const chips = sc.nodes[S().chars[id].script.at] || []; const lang = getLang();
  return chips.length ? `<div class="qr">${chips.map((ch, i) => `<button data-act="qr" data-i="${i}">${esc(ch.label[lang] || ch.label.zh)}</button>`).join('')}</div>` : '';
}
ACT.qr = el => {
  const id = currentChat(); if (!id || ui.typing[id]) return;
  const sc = activeScript(id); if (!sc) return;
  const chip = (sc.nodes[S().chars[id].script.at] || [])[+el.dataset.i]; if (chip) playScript(id, sc, chip);
};
async function playScript(id, sc, chip) {
  const lang = getLang(); const { co, beat } = sc;
  if (busy[id]) await busy[id];
  let done; busy[id] = new Promise(r => done = r);
  try {
    update(s => {
      s.messages[id].push({ id: newId(), from: 'me', type: 'text', text: chip.label[lang], lang, ts: Date.now() });
      s.chars[id].script = chip.next ? { ...s.chars[id].script, at: chip.next } : null;
    });
    ui.typing[id] = true; setFace(id, 'think'); rerenderComposer(); onChange();
    await sleep(750 + Math.random() * 600);
    const night = (h => h >= 21 || h < 5)(new Date().getHours());
    const texts = chip.reply ? chip.reply[lang] : (co.closing ? co.closing[night ? 'night' : 'day'][lang] : []);
    const out = await pushHim(id, texts, lang);
    update(st => { const cs2 = st.chars[id]; cs2.affinity = Math.min(affinityCap(id, cs2), cs2.affinity + 3); cs2.sync = Math.min(100, cs2.sync + 1); });
    if (beat) finishBeatChip(id, beat, chip, lang);
    else if (!chip.next) finishScript(id, lang);
    ui.typing[id] = false; setFace(id, 'idle'); onChange(); rerenderComposer();
    if (S().settings.autoplay && currentChat() === id && !S().toy.muted) playHim(id, out.filter(m => m.type === 'voice'));
  } finally { done(); busy[id] = null; }
}

// ---------- story beats after the cold open (js/coldopen.js → beats) ----------
const dayStart = ts => { const d = new Date(ts); d.setHours(0, 0, 0, 0); return d.getTime(); };
const dayKey = ts => new Date(ts).toDateString();
/** Day 1 is the day you met. */
function storyDay(cs) { return Math.round((dayStart(Date.now()) - dayStart(cs.metAt || Date.now())) / 864e5) + 1; }
/** Before he has said it (or within a week of you deflecting) he does not slide into "Mutual" on his own. */
function affinityCap(id, cs) {
  const co = COLD_OPEN[id]; if (!co?.beats || !cs.coldOpened || !co.beats.some(b => b.id === 'confess')) return 100;
  const cf = cs.beats?.confess;
  if (cf?.choice === 'accept') return 100;
  if (cf?.choice === 'deflect' && Date.now() > (cs.holdUntil || 0)) return 100;
  return 79;
}
/** Raise affinity to at least `target` inside an update; note a stage change without his stage event line (the beat is the event). */
function raiseTo(st, id, target) {
  const cs = st.chars[id]; const before = stageOf(cs.affinity);
  cs.affinity = Math.max(cs.affinity, Math.min(target, 100));
  const after = stageOf(cs.affinity);
  if (after > before) {
    addMoment(cs, 'mStage', after);
    st.messages[id].push({ id: newId(), from: 'sys', type: 'text', text: t('stageUp', { s: t('stage' + after) }), ts: Date.now() + 1 });
  }
}
function finishBeatChip(id, beat, chip, lang) {
  update(st => {
    const cs = st.chars[id]; cs.script = null;
    const rec = ((cs.beats ||= {})[beat.id] ||= { ts: Date.now() });
    if (chip.choice) rec.choice = chip.choice;
    if (chip.effect) rec.choice = chip.effect;
    if (chip.memory) cs.memories.push({ id: newId(), kind: 'beat', beat: beat.id, text: chip.memory[lang] || chip.memory.zh, ts: Date.now() });
    if (chip.aff) raiseTo(st, id, chip.aff);
    if (chip.effect === 'accept') raiseTo(st, id, 80);
    if (chip.effect === 'deflect') {
      cs.holdUntil = Date.now() + 7 * 864e5;
      st.messages[id].push({ id: newId(), from: 'sys', type: 'text', text: t('holdStage', { s: t('stage' + stageOf(cs.affinity)) }), ts: Date.now() + 1 });
    }
  });
}
/** When the user opens his chat on a new day, the next due beat arrives as his "you're back" line. */
async function maybeBeat(id) {
  const co = COLD_OPEN[id]; const cs = S().chars[id];
  if (!co?.beats || !cs?.owned || !cs.coldOpened || cs.script || ui.typing[id] || busy[id]) return;
  if (cs.lastBeatDay === dayKey(Date.now())) return;
  const beat = co.beats.find(b => !cs.beats?.[b.id]);
  if (!beat || storyDay(cs) < beat.day) return;
  const lang = getLang(); const choice = beat.after ? (cs.beats?.[beat.after]?.choice === 'go' ? 'go' : 'maybe') : null;
  let done; busy[id] = new Promise(r => done = r);
  try {
    update(st => {
      const c2 = st.chars[id]; (c2.beats ||= {})[beat.id] = { ts: Date.now() }; c2.lastBeatDay = dayKey(Date.now());
      if (beat.recalled) st.messages[id].push({ id: newId(), from: 'sys', type: 'text', text: t('recalled', { n: L(getChar(id).name) }), ts: Date.now() });
    });
    ui.typing[id] = true; setFace(id, 'think'); onChange();
    await sleep(1100 + Math.random() * 600);
    const lines = (beat.firstBy ? beat.firstBy[choice] : beat.first)[lang];
    const out = await pushHim(id, lines, lang);
    update(st => { st.chars[id].script = { beat: beat.id, at: beat.nodes.root ? 'root' : choice }; });
    ui.typing[id] = false; setFace(id, 'idle'); onChange(); rerenderComposer();
    if (S().settings.autoplay && currentChat() === id && !S().toy.muted) playHim(id, out.filter(m => m.type === 'voice'));
  } finally { done(); busy[id] = null; }
}
/** His scripted lines, one by one, in his usual reply mode. */
async function pushHim(id, texts, lang) {
  const mode = S().chars[id].replyMode; const out = [];
  for (let i = 0; i < texts.length; i++) {
    if (i) { ui.typing[id] = true; onChange(); await sleep(Math.min(2200, 500 + texts[i].length * 40)); }
    const text = texts[i];
    const m = mode === 'text'
      ? { id: newId(), from: 'him', type: 'text', text, lang, ts: Date.now() }
      : { id: newId(), from: 'him', type: 'voice', text, transcript: text, dur: estDur(text, lang), lang, showText: mode === 'voicetext', ts: Date.now() };
    out.push(m); ui.typing[id] = i < texts.length - 1;
    update(st => { st.messages[id].push(m); if (currentChat() !== id) st.chars[id].unread++; });
  }
  return out;
}
/** End of the cold open: save the branch-neutral first shared memory and show a note that links to it. */
function finishScript(id, lang = getLang()) {
  const co = COLD_OPEN[id]; if (!co) return;
  update(st => {
    const cs = st.chars[id]; cs.script = null;
    if (cs.memories.some(m => m.kind === 'first')) return;
    cs.memories.unshift({ id: newId(), kind: 'first', text: co.memory[lang] || co.memory.zh, ts: Date.now() });
    st.messages[id].push({ id: newId(), from: 'sys', kind: 'memNote', type: 'text', text: t('memNote', { n: co.who[lang] || co.who.zh, m: co.note[lang] || co.note.zh }), ts: Date.now() + 2 });
  });
}

function refreshChat(id, { scroll = true } = {}) {
  const box = $('#chat'); if (!box) return;
  const nearBottom = box.scrollHeight - box.scrollTop - box.clientHeight < 140;
  box.innerHTML = chatMessages(id);
  if (scroll || nearBottom) box.scrollTop = box.scrollHeight;
  const sub = $('#hdr-sub'); const c = getChar(id);
  if (sub) sub.textContent = ui.typing[id] ? t('typing') : ui.speakingChar === id && ui.speakingId ? t('speaking') : L(nowDoing(c));
}
function currentChat() { const { parts } = route(); return parts[0] === 'chat' && !parts[2] ? parts[1] : null; }

ACT.toggleInput = () => { ui.inputMode = ui.inputMode === 'voice' ? 'text' : 'voice'; rerenderComposer(true); };
ACT.panel = el => { const p = el.dataset.p; ui.panel = ui.panel === p ? null : p; rerenderComposer(); };
ACT.album = () => $('#f-album').click();
ACT.camera = () => $('#f-camera').click();
function rerenderComposer(focus) {
  const id = currentChat(); if (!id) return;
  const scr = $('.screen', app);
  scr.querySelectorAll('.qr, .composer, .plus, .picker').forEach(n => n.remove());
  scr.insertAdjacentHTML('beforeend', composer());
  bindComposer(id);
  if (focus && ui.inputMode === 'text') $('#txt')?.focus();
  const box = $('#chat'); if (box) box.scrollTop = box.scrollHeight;
}
ACT.sendText = () => {
  const id = currentChat(); const ta = $('#txt'); if (!id || !ta) return;
  const text = ta.value.trim(); if (!text) return;
  ta.value = ''; ui.draft = ''; autoGrow(ta);
  sendUser(id, { type: 'text', text });
};
ACT.tr = el => {
  update(s => { for (const list of Object.values(s.messages)) { const m = list.find(x => x.id === el.dataset.id); if (m) { if (m.from === 'him' && m.showText) { m.showText = false; m.open = false; } else m.open = !m.open; } } });
};
ACT.play = el => {
  const id = currentChat(); const s = S();
  const m = s.messages[id]?.find(x => x.id === el.dataset.id); if (!m) return;
  if (ui.speakingId === m.id) { stopSpeaking(); ui.speakingId = null; setFace(id, 'idle'); refreshChat(id, { scroll: false }); return; }
  if (m.from === 'me') {
    const url = audioCache.get(m.id);
    if (url) { const a = new Audio(url); el.classList.add('playing'); a.onended = () => el.classList.remove('playing'); a.play().catch(() => el.classList.remove('playing')); }
    else toast(m.transcript || t('voiceOnly'));
    return;
  }
  playHim(id, [m]);
};
ACT.giveItem = el => {
  const id = currentChat(); const kind = el.dataset.kind;
  const item = (kind === 'gift' ? GIFTS : CARES).find(g => g.id === el.dataset.id);
  ui.panel = null; rerenderComposer();
  sendUser(id, { type: kind, giftName: item.name, giftIcon: item.icon });
};
function autoGrow(ta) { ta.style.height = 'auto'; ta.style.height = Math.min(110, ta.scrollHeight) + 'px'; }

function bindComposer(id) {
  const ta = $('#txt');
  if (ta) {
    autoGrow(ta);
    ta.addEventListener('input', () => { ui.draft = ta.value; autoGrow(ta); });
    ta.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); ACT.sendText(); } });
  }
  const hold = $('#hold'); if (hold) bindHold(hold, id, { fromChat: true });
}

// ---------- hold to talk (used by chat and by the toy page) ----------
function bindHold(btn, id, { fromChat }) {
  let rec = null, zone = 'send', sx = 0, sy = 0, ov = null, active = false;
  const setZone = z => {
    zone = z; if (!ov) return;
    ov.classList.toggle('cancel', z === 'cancel');
    ov.querySelector('[data-z=cancel]').classList.toggle('on', z === 'cancel');
    ov.querySelector('[data-z=text]').classList.toggle('on', z === 'text');
    btn.textContent = z === 'cancel' ? t('releaseCancel') : z === 'text' ? t('releaseText') : t('releaseSend');
  };
  btn.addEventListener('contextmenu', e => e.preventDefault());
  btn.addEventListener('pointerdown', async e => {
    e.preventDefault(); if (active) return; active = true;
    btn.setPointerCapture?.(e.pointerId); sx = e.clientX; sy = e.clientY; zone = 'send';
    stopSpeaking();
    const lang = S().settings.replyLang === 'en' ? 'en' : S().settings.replyLang === 'zh' ? 'zh' : S().settings.lang;
    rec = new Recorder(lang);
    btn.classList.add('rec'); btn.textContent = t('releaseSend');
    ov = document.createElement('div'); ov.className = 'rec-ov';
    ov.innerHTML = `<div class="live" id="live">${sttSupported ? '' : t('noStt')}</div>
      <div class="bubble">${[10, 18, 12, 22, 9, 16, 11].map((h, i) => `<i style="height:${h}px;animation-delay:${i * .07}s"></i>`).join('')}</div>
      <div class="zones"><span data-z="cancel">${icon('i-x')}</span><span data-z="text">${icon('i-text')}</span></div><p>${t('recHint')}</p>`;
    app.appendChild(ov);
    setFace(id, 'listen');
    rec.onpartial = txt => { const l = $('#live'); if (l) l.textContent = txt; };
    try { await rec.start(); } catch (err) { cleanup(); toast(t('micDenied')); }
  });
  btn.addEventListener('pointermove', e => {
    if (!active) return;
    const dx = e.clientX - sx, dy = e.clientY - sy;
    setZone(dy < -70 ? 'cancel' : dx > 70 ? 'text' : 'send');
  });
  const end = async () => {
    if (!active || !rec) return;
    const r = rec; const z = zone; const elapsed = Date.now() - (r.t0 || Date.now());
    cleanup();
    if (z === 'cancel' || r.denied) { r.cancel(); setFace(id, 'idle'); return; }
    if (elapsed < 600) { r.cancel(); setFace(id, 'idle'); toast(t('tooShort')); return; }
    const res = await r.stop();
    if (z === 'text') {
      setFace(id, 'idle');
      ui.inputMode = 'text'; ui.draft = res.transcript || ''; rerenderComposer(true);
      return;
    }
    const msgId = newId(); if (res.url) audioCache.set(msgId, res.url);
    sendUser(id, { id: msgId, type: 'voice', dur: res.dur, transcript: res.transcript, fromToy: !fromChat }, { toy: !fromChat });
  };
  const cleanup = () => { active = false; btn.classList.remove('rec'); btn.textContent = fromChat ? t('holdTalk') : '♥ ' + t('holdTalk'); ov?.remove(); ov = null; rec = rec && null; };
  btn.addEventListener('pointerup', end);
  btn.addEventListener('pointercancel', () => { if (active) { rec?.cancel(); cleanup(); setFace(id, 'idle'); } });
}

// ---------- sending & replying ----------
function addMoment(cs, key, arg) { if (!cs.moments.some(m => m.key === key && m.arg === arg)) cs.moments.unshift({ key, arg, ts: Date.now() }); }
function sendUser(id, partial, { toy = false } = {}) {
  const lang = replyLangFor(partial.text || partial.transcript || '', S().settings);
  const msg = { id: partial.id || newId(), from: 'me', ts: Date.now(), lang, ...partial };
  // typing your own reply instead of a quick reply ends the cold open (or a beat) after his answer;
  // a "sticky" beat (the confession) keeps its chips until you pick one
  const sc = activeScript(id);
  const scripted = !!sc && !sc.beat?.sticky;
  update(s => {
    s.messages[id].push(msg);
    const cs = s.chars[id];
    if (scripted) cs.script = null;
    if (msg.type === 'voice') addMoment(cs, 'mFirstVoice');
    if (msg.type === 'image') addMoment(cs, 'mFirstPhoto');
    if (msg.type === 'gift') addMoment(cs, 'mFirstGift');
  });
  if (scripted) rerenderComposer();
  respond(id, msg, { toy }).then(() => { if (scripted && !sc.beat) finishScript(id); });
}
const busy = {};
async function respond(id, trigger, { toy = false, avatarImage = null } = {}) {
  if (busy[id]) { await busy[id]; }
  let done; busy[id] = new Promise(r => done = r);
  try {
    const s = S(); const c = getChar(id); const cs = s.chars[id];
    ui.typing[id] = true; setFace(id, 'think'); onChange();
    // in a meeting / on shift he takes noticeably longer to answer
    await sleep(isBusy(c) ? 2600 + Math.random() * 1600 : 650 + Math.random() * 700);
    const demo = demoReply({ char: c, cs, state: s, msg: trigger });
    let texts = demo.texts; const lang = demo.lang;
    if (s.settings.aiMode === 'claude' && s.settings.apiKey) {
      try {
        const r = await claudeReply({ char: c, cs, state: s, history: s.messages[id], lang, avatarImage });
        texts = r.refused ? [t('refused')] : (r.texts.length ? r.texts : texts);
      } catch (e) { toast(t('errApi', { e: e.message }), 3200); }
    }
    // learning (both modes)
    update(st => {
      const cs2 = st.chars[id];
      if (demo.learned.name) { if (!cs2.callMe) cs2.callMe = demo.learned.name; if (!st.profile.name) st.profile.name = demo.learned.name; cs2.memories.push({ id: newId(), kind: 'name', text: (lang === 'zh' ? '名字是 ' : 'Name: ') + demo.learned.name, ts: Date.now() }); }
      if (demo.nudged) cs2.lastNudge = Date.now();
      if (demo.learned.like) cs2.memories.push({ id: newId(), kind: 'like', value: demo.learned.like, text: (lang === 'zh' ? '喜欢' : 'Likes ') + demo.learned.like, ts: Date.now() });
    });
    const mode = cs.replyMode;
    const out = [];
    for (let i = 0; i < texts.length; i++) {
      if (i) { ui.typing[id] = true; onChange(); await sleep(Math.min(2200, 500 + texts[i].length * 40)); }
      const text = texts[i];
      const m = mode === 'text'
        ? { id: newId(), from: 'him', type: 'text', text, lang, ts: Date.now() }
        : { id: newId(), from: 'him', type: 'voice', text, transcript: text, dur: estDur(text, lang), lang, showText: mode === 'voicetext', ts: Date.now() };
      if (trigger.type === 'avatar' && i === 0) { m.type = 'text'; m.quoteAvatar = true; delete m.transcript; }
      if (toy) m.fromToy = true;
      out.push(m);
      ui.typing[id] = i < texts.length - 1;
      update(st => {
        st.messages[id].push(m);
        if (currentChat() !== id) st.chars[id].unread++;
      });
    }
    ui.typing[id] = false;
    // relationship
    update(st => {
      const cs2 = st.chars[id]; const before = stageOf(cs2.affinity);
      cs2.affinity = Math.min(Math.max(affinityCap(id, cs2), cs2.affinity), cs2.affinity + demo.affinity);
      cs2.sync = Math.min(100, cs2.sync + 1);
      cs2.mood = trigger.type === 'gift' || /爱|喜欢|love|like/i.test(trigger.text || '') ? 'happy' : (Date.now() - (st.messages[id].at(-3)?.ts || 0) > 864e5 ? 'miss' : 'calm');
      const after = stageOf(cs2.affinity);
      if (after > before) {
        addMoment(cs2, 'mStage', after);
        st.messages[id].push({ id: newId(), from: 'sys', type: 'text', text: t('stageUp', { s: t('stage' + after) }), ts: Date.now() });
        // each new stage comes with one line of his own, not just a number going up
        const ev = c.events && c.events[after];
        if (ev) { st.messages[id].push({ id: newId(), from: 'him', type: 'text', text: ev[lang] || ev.zh, lang, stageEvent: after, ts: Date.now() + 1 }); if (currentChat() !== id) st.chars[id].unread++; }
      }
    });
    setFace(id, 'idle');
    const shouldSpeak = (toy || (S().settings.autoplay && currentChat() === id)) && !S().toy.muted;
    if (shouldSpeak) playHim(id, out.filter(m => m.type === 'voice' || toy));
  } finally { done(); busy[id] = null; }
}
async function playHim(id, msgs) {
  const c = getChar(id);
  for (const m of msgs) {
    ui.speakingId = m.id; ui.speakingChar = id; setFace(id, 'speak');
    update(s => { const mm = s.messages[id].find(x => x.id === m.id); if (mm) mm.heard = true; });
    await new Promise(res => speak(m.text, m.lang || getLang(), { ...c.voice, id: c.id }, null, res));
    if (ui.speakingId !== m.id) return; // interrupted
  }
  ui.speakingId = null; setFace(id, 'idle'); onChange();
}

// file inputs (photos)
for (const sel of ['#f-album', '#f-camera']) {
  document.querySelector(sel).addEventListener('change', async e => {
    const f = e.target.files?.[0]; e.target.value = ''; if (!f) return;
    const id = currentChat(); if (!id) return;
    const img = await readImage(f, 960);
    ui.panel = null; rerenderComposer();
    sendUser(id, { type: 'image', img });
  });
}

// ======================= CHAT INFO & SEARCH =======================
function screenChatInfo(id) {
  const c = getChar(id); const cs = S().chars[id]; const st = stageOf(cs.affinity);
  const days = Math.max(1, Math.ceil((Date.now() - (cs.metAt || Date.now())) / 864e5));
  return `${header(t('chatInfo'), { back: true })}<div class="body">
    <button class="row" data-go="#/char/${id}" style="background:var(--card)">${charAv(c)}<div class="t"><div class="n">${esc(L(c.name))}</div><div class="m"><span>${esc(L(c.tagline))}</span></div></div><span style="color:var(--muted)">›</span></button>
    <div class="group"><button class="cell" data-go="#/chat/${id}/search">${t('findChat')}<span class="v">›</span></button></div>
    <div class="pad" style="padding-top:12px">
      <div class="card"><h3>${t('relation')}<i>${t('daysKnown', { n: days })}</i></h3>
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px"><span class="stage">${t('stage' + st)}</span>${st < 3 ? `<span style="font-size:12px;color:var(--muted)">${t('nextStage', { s: t('stage' + (st + 1)), n: 100 - stageProgress(cs.affinity) })}</span>` : ''}</div>
        <div class="prog"><i style="width:${stageProgress(cs.affinity)}%"></i></div>
        <div class="stats"><div>${t('mood')}<b>${t({ happy: 'moodHappy', calm: 'moodCalm', miss: 'moodMiss' }[cs.mood] || 'moodCalm')}</b></div><div>${t('sync')}<b>${cs.sync}</b></div><div>${t('closeness')}<b>${cs.affinity}</b></div></div>
      </div>
      <div class="card"><h3>${t('memories')}<i>${cs.memories.length}</i></h3><p class="hint">${t('memHint')}</p>${cs.memories.length ? cs.memories.map(m => `<div class="mem"><input class="memin" data-id="${m.id}" value="${esc(m.text)}" maxlength="60" aria-label="${t('memories')}"><button data-act="delMem" data-id="${m.id}" aria-label="delete">×</button></div>`).join('') : `<div style="font-size:13px;color:var(--muted)">${t('noMemories')}</div>`}</div>
      <div class="card"><h3>${t('hcTitle')}<i>${(cs.headcanon || []).length}</i></h3><p class="hint">${t('hcHint')}</p>${(cs.headcanon || []).map(h => `<div class="mem"><input class="hcin" data-id="${h.id}" value="${esc(h.text)}" maxlength="80" aria-label="${t('hcTitle')}"><button data-act="delHc" data-id="${h.id}" aria-label="delete">×</button></div>`).join('')}<div class="mem add"><input id="hcnew" maxlength="80" placeholder="${t('hcPh')}" aria-label="${t('hcPh')}"><button class="addbtn" data-act="addHc">${t('hcAdd')}</button></div></div>
      <button class="card cardlink" data-go="#/me/profile"><h3>${t('profileShared')}<i>›</i></h3><p class="hint" style="margin:0">${t('profileHint')}</p></button>
    </div>
    <div class="group">
      <label class="cell">${t('callMe')}<input type="text" id="callme" maxlength="12" value="${esc(cs.callMe)}" placeholder="${esc(S().profile.name || '')}"></label>
    </div>
    <div class="group"><div class="gt">${t('replyMode')}</div>
      ${[['voicetext', 'modeVoiceText'], ['text', 'modeText'], ['voice', 'modeVoice']].map(([v, k]) => `<button class="cell" data-act="replyMode" data-v="${v}">${t(k)}<span class="chk">${cs.replyMode === v ? '✓' : ''}</span></button>`).join('')}
    </div>
    ${COLD_OPEN[id]?.beats && cs.coldOpened ? `<div class="group"><div class="gt">${t('demoTitle')}</div><button class="cell" data-act="demoSkip">${t('demoSkip')}<span class="v">${t('dayN', { n: storyDay(cs) })} ›</span></button></div>` : ''}
    <div class="group"><button class="cell" data-act="pinChat">${getLang() === 'zh' ? '置顶聊天' : 'Pin chat'}<span class="tg ${cs.pinned ? 'on' : ''}"></span></button></div>
    <div class="group"><button class="cell danger" data-act="clearChat">${t('clearChat')}</button><button class="cell danger" data-act="resetRel">${t('resetRel')}</button></div>
    <div style="height:30px"></div></div>`;
}
const routeId = () => route().parts[1];
// demo only: pretend you met one day earlier, so the next story beat is due when you go back to the chat
ACT.demoSkip = () => {
  const id = routeId(); let n = 0;
  update(s => { const cs = s.chars[id]; cs.metAt = (cs.metAt || Date.now()) - 864e5; cs.lastBeatDay = null; if (cs.holdUntil) cs.holdUntil -= 864e5; n = storyDay(cs); });
  toast(t('demoSkipped', { n }));
};
ACT.delMem = el =>update(s => { const cs = s.chars[routeId()]; cs.memories = cs.memories.filter(m => m.id !== el.dataset.id); });
ACT.addHc = () => { const inp = $('#hcnew'); const v = inp && inp.value.trim(); if (!v) return; update(s => { const cs = s.chars[routeId()]; (cs.headcanon ||= []).push({ id: newId(), text: v, ts: Date.now() }); }); };
ACT.delHc = el => update(s => { const cs = s.chars[routeId()]; cs.headcanon = (cs.headcanon || []).filter(h => h.id !== el.dataset.id); });
ACT.toggleProactive = () => update(s => { s.settings.proactive = s.settings.proactive === false; });
ACT.replyMode = el => update(s => { s.chars[routeId()].replyMode = el.dataset.v; });
ACT.pinChat = () => update(s => { const cs = s.chars[routeId()]; cs.pinned = !cs.pinned; });
ACT.clearChat = async () => { if (await confirmSheet(t('confirmClear'))) update(s => { s.messages[routeId()] = []; }); };
ACT.resetRel = async () => { if (await confirmSheet(t('confirmReset'))) update(s => { const cs = s.chars[routeId()]; cs.affinity = 0; cs.sync = 0; cs.moments = cs.moments.filter(m => m.key === 'mMet');
  // the story beats start over from day 1 too
  if (cs.coldOpened) { cs.beats = {}; cs.holdUntil = 0; cs.lastBeatDay = null; cs.metAt = Date.now(); if (cs.script?.beat) cs.script = null; } }); };

function screenChatSearch(id) {
  const f = ui.chatSearch.f;
  return `${header(t('findChat'), { back: true })}<div class="body">
    <label class="searchbar">${icon('i-search')}<input id="cq" type="search" value="${esc(ui.chatSearch.q)}" placeholder="${t('search')}" autocomplete="off"></label>
    <div class="chips">${[['all', 'allTags'], ['image', 'photo'], ['voice', 'voiceTag']].map(([v, k]) => `<button class="chip ${f === v ? 'on' : ''}" data-act="csf" data-v="${v}">${t(k).replace(/[\[\]]/g, '')}</button>`).join('')}</div>
    <div id="csr">${chatSearchResults(id)}</div></div>`;
}
function chatSearchResults(id) {
  const { q, f } = ui.chatSearch; const ql = q.toLowerCase(); const c = getChar(id);
  let list = S().messages[id].filter(m => m.from !== 'sys');
  if (f !== 'all') list = list.filter(m => m.type === f);
  if (q) list = list.filter(m => (m.text || m.transcript || '').toLowerCase().includes(ql));
  if (!q && f === 'all') return '';
  if (!list.length) return `<div class="empty">${t('noResults')}</div>`;
  if (f === 'image') return `<div class="grid2" style="grid-template-columns:repeat(3,1fr);gap:4px;padding:0 4px">${list.reverse().map(m => `<button data-go="#/chat/${id}?hl=${m.id}" style="aspect-ratio:1;overflow:hidden">${m.img ? `<img src="${m.img}" style="width:100%;height:100%;object-fit:cover">` : ''}</button>`).join('')}</div>`;
  return `<div class="list">${list.reverse().map(m => `<button class="row" data-go="#/chat/${id}?hl=${m.id}">${m.from === 'me' ? meAv() : charAv(c)}<div class="t"><div class="n">${m.from === 'me' ? t('you') : esc(L(c.name))}<i>${fmtTime(m.ts)}</i></div><div class="m"><span>${hl(m.text || m.transcript || preview(m), q)}</span></div></div></button>`).join('')}</div>`;
}
ACT.csf = el => { ui.chatSearch.f = el.dataset.v; render(); };

// ======================= CHARACTERS =======================
function screenChars() {
  const seg = ui.charSeg;
  return `${header(t('tabChars'))}<div class="body">
    <div class="seg"><button class="${seg === 'mine' ? 'on' : ''}" data-act="seg" data-v="mine">${t('myChars')}</button><button class="${seg === 'discover' ? 'on' : ''}" data-act="seg" data-v="discover">${t('discover')}</button></div>
    ${seg === 'mine' ? mineList() : discoverGrid()}</div>${navBar('chars')}`;
}
ACT.seg = el => { ui.charSeg = el.dataset.v; render(); };
function mineList() {
  const s = S();
  const list = ownedChars().sort((a, b) => (b.id === s.toy.charId && s.toy.connected) - (a.id === s.toy.charId && s.toy.connected));
  if (!list.length) return `<div class="empty">${t('noChats')}</div>`;
  return `<div class="pad" style="padding-top:0">${list.map(c => {
    const cs = s.chars[c.id]; const st = stageOf(cs.affinity);
    return `<button class="cc" data-go="#/char/${c.id}">${charAv(c)}<div class="info"><div class="nm">${esc(L(c.name))}<i>${esc(L(c.role))}</i></div>
      <span class="stage" style="width:max-content">${t('stage' + st)}</span><div class="prog"><i style="width:${stageProgress(cs.affinity)}%"></i></div>
      <div class="now">${esc(t('nowDoing', { s: L(nowDoing(c)) }))}</div></div>${s.toy.connected && s.toy.charId === c.id ? '<span class="heart">♥</span>' : ''}</button>`;
  }).join('')}</div>`;
}
function discoverGrid() {
  const s = S(); const lang = getLang();
  const allTags = [...new Set(CHARACTERS.flatMap(c => c.tags[lang]))];
  const tag = ui.discoverTag;
  const list = CHARACTERS.filter(c => !tag || c.tags[lang].includes(tag));
  return `<div class="chips"><button class="chip ${!tag ? 'on' : ''}" data-act="dtag" data-v="">${t('allTags')}</button>${allTags.map(x => `<button class="chip ${tag === x ? 'on' : ''}" data-act="dtag" data-v="${esc(x)}">${esc(x)}</button>`).join('')}</div>
  <div class="grid2">${list.map(c => {
    const owned = s.chars[c.id].owned;
    return `<div class="gc"><button class="cover" data-go="#/char/${c.id}" aria-label="${esc(L(c.name))}">${portrait(c.look)}</button><div class="gi"><b>${esc(L(c.name))}</b><small>${esc(L(c.tagline))}</small>
      <div class="tags">${c.tags[lang].map(x => `<span>${esc(x)}</span>`).join('')}${c.fan ? `<span class="fanlabel">${t('fanLabel')}</span>` : ''}</div>
      <div class="gbtn"><button data-act="listen" data-id="${c.id}">▶ ${t('listen')}</button>${owned ? `<button data-go="#/chat/${c.id}">${t('added')}</button>` : `<button class="p" data-act="addChar" data-id="${c.id}">${t('add')}</button>`}</div></div></div>`;
  }).join('')}</div>`;
}
ACT.dtag = el => { ui.discoverTag = el.dataset.v || null; render(); };
ACT.listen = el => { const c = getChar(el.dataset.id); setFace(c.id, 'speak'); speak(c.sample[getLang()], getLang(), { ...c.voice, id: c.id }, null, () => setFace(c.id, 'idle')); };
ACT.addChar = el => {
  const id = el.dataset.id; const c = getChar(id); const lang = getLang();
  update(s => {
    const cs = s.chars[id]; cs.owned = true; cs.metAt = Date.now(); cs.affinity = 5; cs.moments = [{ key: 'mMet', ts: Date.now() }];
    const text = c.opener[lang];
    s.messages[id].push({ id: newId(), from: 'him', type: 'voice', text, transcript: text, dur: estDur(text, lang), lang, showText: true, ts: Date.now() });
  });
  go(`#/chat/${id}`);
  setTimeout(() => { const m = S().messages[id].at(-1); if (S().settings.autoplay) playHim(id, [m]); }, 400);
};

function screenCharProfile(id) {
  const c = getChar(id); const s = S(); const cs = s.chars[id]; const st = stageOf(cs.affinity); const lang = getLang();
  const days = Math.max(1, Math.ceil((Date.now() - (cs.metAt || Date.now())) / 864e5));
  const onToy = s.toy.connected && s.toy.charId === id;
  return `<div class="body">
    <div class="hero"><div class="art" data-face="${id}" data-live>${portrait(c.look, { state: face[id] || 'idle' })}</div>
      <button class="hb" data-act="back" aria-label="${t('back')}">‹</button>
      <div class="ht"><h2>${esc(L(c.name))}<small>${esc(lang === 'zh' ? c.name.en : c.name.zh)}</small></h2><p>${esc(L(c.tagline))}</p><div class="tags">${c.tags[lang].map(x => `<span>${esc(x)}</span>`).join('')}${c.fan ? `<span class="fanlabel">${t('fanLabel')}</span>` : ''}</div></div></div>
    <div class="acts">${cs.owned
      ? `<button class="btn p" data-go="#/chat/${id}">${t('sendMsg')}</button><button class="btn" data-act="listen" data-id="${id}">▶ ${t('listenHim')}</button><button class="btn" data-act="putOnToy" data-id="${id}">${onToy ? t('onToy') + ' ♥' : t('putOnToy')}</button>`
      : `<button class="btn p" data-act="addChar" data-id="${id}">${t('add')}</button><button class="btn" data-act="listen" data-id="${id}">▶ ${t('listenHim')}</button>`}</div>
    <div class="pad" style="padding-top:8px">
      ${cs.owned ? `<div class="card"><h3>${t('relation')}<i>${t('daysKnown', { n: days })}</i></h3>
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px"><span class="stage">${t('stage' + st)}</span>${st < 3 ? `<span style="font-size:12px;color:var(--muted)">${t('nextStage', { s: t('stage' + (st + 1)), n: 100 - stageProgress(cs.affinity) })}</span>` : ''}</div>
        <div class="prog"><i style="width:${stageProgress(cs.affinity)}%"></i></div>
        <div class="stats"><div>${t('mood')}<b>${t({ happy: 'moodHappy', calm: 'moodCalm', miss: 'moodMiss' }[cs.mood] || 'moodCalm')}</b></div><div>${t('sync')}<b>${cs.sync}</b></div><div>${t('closeness')}<b>${cs.affinity}</b></div></div></div>
      <div class="card"><h3>${t('moments')}<i data-go="#/chat/${id}/info" style="cursor:pointer">${t('viewAllMem')} ›</i></h3><div class="tlist">${cs.moments.slice(0, 5).map(m => `<div>${esc(t(m.key, { s: t('stage' + (m.arg ?? 0)) }))}<i>${new Date(m.ts).getMonth() + 1}.${new Date(m.ts).getDate()}</i></div>`).join('')}</div></div>` : ''}
      <div class="card"><h3>${t('hisLooks')}<i>${t('looksSub')}</i></h3><div class="faces">
        ${[['idle', 'looksIdle'], ['listen', 'looksListen'], ['think', 'looksThink'], ['speak', 'looksSpeak']].map(([st2, k]) => `<button data-act="previewFace" data-id="${id}" data-st="${st2}"><span class="fc">${portrait(c.look, { state: st2, round: true })}</span>${t(k)}</button>`).join('')}</div></div>
      <div class="card"><h3>${t('about')}</h3><p style="margin:0 0 10px;font-size:14px">${esc(L(c.bio))}</p>
        <dl class="kv"><dt>${t('birthday')}</dt><dd>${esc(L(c.birthday))}</dd><dt>${t('likes')}</dt><dd>${esc(L(c.likes))}</dd><dt>${t('catchphrase')}</dt><dd>“${esc(L(c.catchphrase))}”</dd></dl></div>
      ${cs.owned ? `<div class="card" data-go="#/chat/${id}/info" style="cursor:pointer"><h3>${t('meAtHim')}<i>›</i></h3><dl class="kv"><dt>${t('callMe')}</dt><dd>${esc(cs.callMe || s.profile.name || '—')}</dd><dt>${t('replyMode')}</dt><dd>${t({ voicetext: 'modeVoiceText', text: 'modeText', voice: 'modeVoice' }[cs.replyMode])}</dd></dl></div>` : ''}
    </div></div>`;
}
ACT.previewFace = el => {
  const id = el.dataset.id; const st = el.dataset.st;
  setFace(id, st);
  if (st === 'speak') { const c = getChar(id); speak(c.sample[getLang()], getLang(), { ...c.voice, id: c.id }, null, () => setFace(id, 'idle')); }
  else setTimeout(() => { if (face[id] === st) setFace(id, 'idle'); }, 3500);
};
ACT.putOnToy = el => {
  const id = el.dataset.id;
  if (!S().toy.connected) { update(s => { s.toy.charId = id; }); go('#/toy'); return; }
  update(s => { s.toy.charId = id; }); toast(`♥ ${L(getChar(id).name)} · ${t('onToy')}`);
};

// ======================= TOY =======================
function screenToy() {
  const s = S();
  if (!s.toy.connected) return `${header(t('toyTitle'))}<div class="body">${toyOnboard()}</div>${navBar('toy')}`;
  const c = getChar(s.toy.charId); const cs = s.chars[c.id]; const st = face[c.id] || 'idle';
  return `${header(t('toyTitle'))}<div class="body"><div class="pad" style="padding-top:0">
    <div class="mirror"><div class="ring ${s.toy.dim && (new Date().getHours() >= 22 || new Date().getHours() < 7) ? 'dim' : ''}"><div class="scr" data-face="${c.id}" data-live>${portrait(c.look, { state: st, round: true })}</div></div>
      <div class="st"><b>● ${t('online2')}</b> · ${t('homeWifi')} · <span data-face-label="${c.id}">${t({ idle: 'stIdle', listen: 'stListen', think: 'stThink', speak: 'stSpeak' }[st])}</span></div></div>
    <button class="hold" id="toyhold" style="height:52px;border-radius:16px;font-size:16px">♥ ${t('holdTalk')}</button>
    <div class="card"><div class="curr">${charAv(c)}<div class="t"><b>${esc(L(c.name))}</b><small>${t('stage' + stageOf(cs.affinity))} · ${t('onToy')}</small></div><button data-act="pickToyChar">${t('change')}</button></div></div>
    <div class="card"><div class="quick">
      <button data-act="toyHi"><span>☺</span>${t('sayHi')}</button><button data-go="#/chat/${c.id}"><span>☕</span>${t('care')}</button>
      <button data-go="#/chat/${c.id}"><span>🎁</span>${t('gift')}</button><button data-act="toyMute"><span>${s.toy.muted ? '🔈' : '🔇'}</span>${s.toy.muted ? t('unmute') : t('mute')}</button></div></div>
    </div>
    <div class="group"><div class="gt">${t('sound')}</div>
      <div class="cell">${t('playWhere')}<select id="t-play" style="border:0;background:none;color:var(--muted);text-align:right">${[['both', 'playBoth'], ['toy', 'playToy'], ['phone', 'playPhone']].map(([v, k]) => `<option value="${v}" ${s.toy.playWhere === v ? 'selected' : ''}>${t(k)}</option>`).join('')}</select></div>
      <label class="cell">${t('volume')}<input type="range" id="t-vol" min="0" max="100" value="${s.toy.volume}"></label>
      <button class="cell" data-act="toyTog" data-k="quiet">${t('quiet')} <span class="v">23:00–08:00 <span class="tg ${s.toy.quiet ? 'on' : ''}"></span></span></button></div>
    <div class="group"><div class="gt">${t('screen')}</div>
      <div class="cell">${t('idleFace')}<select id="t-face" style="border:0;background:none;color:var(--muted)">${[['smile', 'faceSmile'], ['soft', 'faceSoft'], ['brow', 'faceBrow']].map(([v, k]) => `<option value="${v}" ${s.toy.idleFace === v ? 'selected' : ''}>${t(k)}</option>`).join('')}</select></div>
      <label class="cell">${t('brightness')}<input type="range" id="t-bri" min="10" max="100" value="${s.toy.brightness}"></label>
      <button class="cell" data-act="toyTog" data-k="dim">${t('dimNight')}<span class="tg ${s.toy.dim ? 'on' : ''}"></span></button></div>
    <div class="group"><div class="gt">${t('device')}</div>
      <div class="cell">${t('deviceName')}<span class="v">${getLang() === 'zh' ? '桌上的心' : 'Heart on my desk'}</span></div>
      <div class="cell">${t('firmware')}<span class="v">2026.08 (demo)</span></div>
      <button class="cell" data-act="toyRestart">${t('restart')}<span class="v">›</span></button>
      <button class="cell danger" data-act="toyUnbind">${t('unbind')}</button></div>
    <div style="height:24px"></div></div>${navBar('toy')}`;
}
function toyOnboard() {
  const step = ui.toyStep;
  const steps = ['toyStep1', 'toyStep2', 'toyStep3', 'toyStep4'];
  return `<div class="onb"><div class="big">${toyHeartSvg()}</div><h2>${t('toyHeroTitle')}</h2><p>${t('toyHeroSub')}</p>
    <div class="steps">${steps.map((k, i) => `<div class="${i < step ? 'done' : i === step && step ? 'cur' : ''}"><b>${i < step ? '✓' : i + 1}</b>${t(k)}</div>`).join('')}</div>
    <button class="btn p block" data-act="toyConnect" ${step ? 'disabled' : ''}>${step ? t('connecting') : t('startConnect')}</button><p style="font-size:12px">${t('noToy')}</p></div>`;
}
function toyHeartSvg() {
  // A soft, rounded heart: the same geometry as the nav icon, with a thick
  // round-joined stroke in the fill colour so every corner (and the tip) is rounded.
  return `<svg viewBox="0 0 24 24" style="overflow:visible;filter:drop-shadow(0 6px 14px rgba(184,56,95,.35))"><defs>
    <linearGradient id="thg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F29AAE"/><stop offset="1" stop-color="#C2416A"/></linearGradient></defs>
  <path d="M12 19.2L5.2 12.6A4.6 4.6 0 1 1 12 6.6a4.6 4.6 0 1 1 6.8 6z" fill="url(#thg)" stroke="url(#thg)" stroke-width="3.6" stroke-linejoin="round"/>
  <ellipse cx="7.6" cy="8.3" rx="2.3" ry="1.3" fill="#fff" opacity=".35" transform="rotate(-35 7.6 8.3)"/></svg>`;
}
ACT.toyConnect = async () => {
  for (let i = 1; i <= 3; i++) { ui.toyStep = i; render(); await sleep(800); }
  pickToyChar(true);
};
function pickToyChar(finishing) {
  sheet(`<h3>${t('pickChar')}</h3><div class="list" style="border-radius:14px;overflow:hidden">${ownedChars().map(c => `<button class="row" data-id="${c.id}">${charAv(c)}<div class="t"><div class="n">${esc(L(c.name))}</div><div class="m"><span>${esc(L(c.tagline))}</span></div></div></button>`).join('')}</div>`,
    (el, close) => el.addEventListener('click', e => {
      const b = e.target.closest('[data-id]'); if (!b) return; close();
      ui.toyStep = 0;
      update(s => { s.toy.charId = b.dataset.id; s.toy.connected = true; });
      if (finishing) setTimeout(() => ACT.toyHi(), 500);
    }));
}
ACT.pickToyChar = () => pickToyChar(false);
ACT.toyHi = () => {
  const s = S(); const c = getChar(s.toy.charId); if (s.toy.muted) { setFace(c.id, 'speak'); setTimeout(() => setFace(c.id, 'idle'), 1600); return; }
  setFace(c.id, 'speak'); speak(c.sample[getLang()], getLang(), { ...c.voice, id: c.id }, null, () => setFace(c.id, 'idle'));
};
ACT.toyMute = () => update(s => { s.toy.muted = !s.toy.muted; if (s.toy.muted) stopSpeaking(); });
ACT.toyTog = el => update(s => { s.toy[el.dataset.k] = !s.toy[el.dataset.k]; });
ACT.toyRestart = () => { const id = S().toy.charId; setFace(id, 'think'); toast('↻'); setTimeout(() => setFace(id, 'idle'), 1600); };
ACT.toyUnbind = async () => { if (await confirmSheet(t('confirmUnbind'))) update(s => { s.toy.connected = false; }); };

// ======================= ME =======================
function screenMe() {
  const s = S();
  return `${header(t('meTitle'))}<div class="body">
    <div class="me-head"><button class="bigav" data-act="pickAvatar" aria-label="${t('changeAvatar')}">${userAvatar(s)}</button>
      <span class="me-name"><b>${esc(s.profile.name || (getLang() === 'zh' ? '我' : 'Me'))}</b><button class="pill" data-act="pickAvatar">${t('changeAvatar')}</button></span></div>
    <div class="group"><button class="cell" data-act="toggleSee">${t('letSee')}<span class="tg ${s.settings.letSeeAvatar ? 'on' : ''}"></span></button>
      <button class="cell" data-go="#/me/profile">${t('profile')}<span class="v">›</span></button></div>
    <div class="group"><button class="cell" data-go="#/me/lang">${t('language')}<span class="v acc">${s.settings.lang === 'zh' ? '中文' : 'English'} ›</span></button>
      <button class="cell" data-go="#/me/appearance">${t('appearance')}<span class="v">${t({ system: 'followSys', day: 'day', night: 'night' }[s.settings.theme])} ›</span></button>
      <button class="cell" data-go="#/me/voice">${t('voice')}<span class="v">›</span></button>
      <button class="cell" data-go="#/me/ai">${t('aiConn')}<span class="v">${s.settings.aiMode === 'claude' && s.settings.apiKey ? 'Claude' : (getLang() === 'zh' ? '演示' : 'Demo')} ›</span></button></div>
    <div class="group"><button class="cell" data-go="#/me/privacy">${t('privacy')}<span class="v">›</span></button>
      <button class="cell" data-go="#/me/about">${t('aboutApp')}<span class="v">›</span></button></div>
    <div style="height:24px"></div></div>${navBar('me')}`;
}
// Change avatar: a sheet with ready-made illustrated avatars, plus photo options.
ACT.pickAvatar = () => {
  const s = S(); const cur = s.profile.avatar ? -1 : (s.profile.avatarPreset ?? 0);
  sheet(`<h3>${t('changeAvatar')}</h3><p>${t('pickPreset')}</p>
    <div class="av-grid">${USER_AVATARS.map((look, i) => `<button class="av-opt ${i === cur ? 'on' : ''}" data-preset="${i}" aria-label="${i + 1}">${portrait(look)}</button>`).join('')}</div>
    <div class="row2"><button class="btn" data-src="album">🖼️ ${t('fromAlbum')}</button><button class="btn" data-src="camera">📷 ${t('takePhoto')}</button></div>`,
    (el, close) => el.addEventListener('click', ev => {
      const p = ev.target.closest('[data-preset]'); const src = ev.target.closest('[data-src]');
      if (p) { close(); if (+p.dataset.preset !== cur) { update(st => { st.profile.avatar = null; st.profile.avatarPreset = +p.dataset.preset; }); avatarChanged(); } }
      if (src) { close(); $(src.dataset.src === 'camera' ? '#f-avatar-cam' : '#f-avatar').click(); }
    }));
};
ACT.toggleSee = () => update(s => { s.settings.letSeeAvatar = !s.settings.letSeeAvatar; if (!s.settings.letSeeAvatar) s.avatarPending = []; });
for (const sel of ['#f-avatar', '#f-avatar-cam']) document.querySelector(sel)?.addEventListener('change', async e => {
  const f = e.target.files?.[0]; e.target.value = ''; if (!f) return;
  const img = await readImage(f, 420, true);
  update(s => { s.profile.avatar = img; });
  avatarChanged();
});
function avatarChanged() {
  const after = () => queueAvatarReactions();
  if (!S().settings.avatarAsked) {
    sheet(`<div style="display:flex;justify-content:center"><span class="av" style="width:84px;height:84px;border-radius:50%">${userAvatar(S())}</span></div><h3>${t('seeAvatarAsk')}</h3><p>${t('seeAvatarSub')}</p>
      <div class="row2"><button class="btn" data-x="0">${t('no')}</button><button class="btn p" data-x="1">${t('yes')}</button></div>`,
      (el, close) => el.addEventListener('click', ev => { const b = ev.target.closest('[data-x]'); if (!b) return; close(); update(s => { s.settings.avatarAsked = true; s.settings.letSeeAvatar = b.dataset.x === '1'; }); after(); }));
  } else after();
}
function queueAvatarReactions() {
  const s = S(); if (!s.settings.letSeeAvatar) return;
  const today = new Date().toDateString();
  const recent = ownedChars().map(c => ({ c, last: s.messages[c.id].filter(m => m.from === 'me').at(-1)?.ts || 0 }))
    .filter(x => s.chars[x.c.id].lastAvatarDay !== today).sort((a, b) => b.last - a.last).slice(0, 2).map(x => x.c.id);
  update(st => { st.avatarPending = recent; st.avatarTs = Date.now(); });
}
function maybeAvatarReaction(id) {
  const s = S(); if (!s.avatarPending?.includes(id)) return;
  update(st => {
    st.avatarPending = st.avatarPending.filter(x => x !== id);
    st.chars[id].lastAvatarDay = new Date().toDateString();
    st.messages[id].push({ id: newId(), from: 'me', type: 'avatar', ts: Date.now() });
  });
  const trig = S().messages[id].at(-1);
  setTimeout(() => respond(id, trig, { avatarImage: S().profile.avatar }), 500);
}

function screenMeSub(which) {
  const s = S(); const set = s.settings;
  const opt = (act, v, label, on) => `<button class="cell" data-act="${act}" data-v="${v}">${label}<span class="chk">${on ? '✓' : ''}</span></button>`;
  if (which === 'lang') return `${header(t('language'), { back: true })}<div class="body">
    <div class="group"><div class="gt">${t('appLang')}</div>${opt('setLang', 'zh', '中文', set.lang === 'zh')}${opt('setLang', 'en', 'English', set.lang === 'en')}</div>
    <div class="group"><div class="gt">${t('replyLang')}</div>${opt('setReply', 'follow', t('followMsg'), set.replyLang === 'follow')}${opt('setReply', 'zh', t('alwaysZh'), set.replyLang === 'zh')}${opt('setReply', 'en', t('alwaysEn'), set.replyLang === 'en')}</div>
    <p class="note">${t('langNote')}</p></div>`;
  if (which === 'appearance') return `${header(t('appearance'), { back: true })}<div class="body"><div class="group">
    ${opt('setTheme', 'system', t('followSys'), set.theme === 'system')}${opt('setTheme', 'day', t('day') + ' · 🌸', set.theme === 'day')}${opt('setTheme', 'night', t('night') + ' · 🌙', set.theme === 'night')}</div></div>`;
  if (which === 'voice') return `${header(t('voice'), { back: true })}<div class="body"><div class="group">
    <button class="cell" data-act="toggleAuto">${t('autoplay')}<span class="tg ${set.autoplay ? 'on' : ''}"></span></button>
    <button class="cell" data-act="voiceTest">${t('voiceTest')}<span class="v">▶</span></button>
    <a class="cell" href="voices.html" style="text-decoration:none;color:inherit">${t('charVoices')}<span class="v">›</span></a></div>
    <p class="note">${sttSupported ? '' : t('noStt')}</p></div>`;
  if (which === 'ai') return `${header(t('aiConn'), { back: true })}<div class="body">
    <div class="group"><div class="gt">${t('aiMode')}</div>${opt('setAi', 'demo', t('aiDemo'), set.aiMode === 'demo')}${opt('setAi', 'claude', t('aiClaude'), set.aiMode === 'claude')}</div>
    ${set.aiMode === 'claude' ? `<div class="group"><label class="cell col">${t('apiKey')}<input type="password" id="apikey" value="${esc(set.apiKey)}" placeholder="sk-ant-…" autocomplete="off" style="text-align:left;border:1px solid var(--line);border-radius:10px;padding:9px;background:var(--bg)"></label></div>
      <p class="note">${t('apiKeyNote')}</p><p class="note">Model: claude-opus-5-5</p>` : ''}</div>`;
  if (which === 'profile') return `${header(t('profile'), { back: true })}<div class="body"><div class="group">
    <label class="cell">${t('nickname')}<input type="text" data-pf="name" maxlength="12" value="${esc(s.profile.name)}"></label>
    <label class="cell">${t('bday')}<input type="date" data-pf="birthday" value="${esc(s.profile.birthday)}"></label>
    <label class="cell">${t('myLikes')}<input type="text" data-pf="likes" maxlength="40" value="${esc(s.profile.likes)}"></label>
    <label class="cell col">${t('boundaries')}<textarea data-pf="boundaries" placeholder="${t('boundariesPh')}">${esc(s.profile.boundaries)}</textarea></label></div></div>`;
  if (which === 'privacy') return `${header(t('privacy'), { back: true })}<div class="body">
    <div class="group">${ownedChars().map(c => `<button class="cell" data-go="#/chat/${c.id}/info">${t('memories')} · ${esc(L(c.name))}<span class="v">${s.chars[c.id].memories.length} ›</span></button>`).join('')}</div>
    <div class="group"><button class="cell" data-act="toggleProactive">${t('proactive')}<span class="tg ${s.settings.proactive === false ? '' : 'on'}"></span></button></div>
    <p class="note" style="padding:0 18px">${t('proactiveNote')}</p>
    <div class="group"><button class="cell danger" data-act="clearAll">${t('clearData')}</button></div></div>`;
  if (which === 'about') return `${header(t('aboutApp'), { back: true })}<div class="body"><div class="onb"><div class="big">${appIconSvg()}</div><h2>${t('appName')}</h2><p style="text-align:left">${t('aboutText')}</p><p style="font-size:12px">v0.1 · demo</p></div></div>`;
  return screenMe();
}
ACT.setLang = el => update(s => { s.settings.lang = el.dataset.v; });
ACT.setReply = el => update(s => { s.settings.replyLang = el.dataset.v; });
ACT.setTheme = el => update(s => { s.settings.theme = el.dataset.v; });
ACT.setAi = el => update(s => { s.settings.aiMode = el.dataset.v; });
ACT.toggleAuto = () => update(s => { s.settings.autoplay = !s.settings.autoplay; });
ACT.voiceTest = () => speak(getLang() === 'zh' ? '你好，这是系统声音。' : 'Hi, this is the system voice.', getLang(), { pitch: .85 });
ACT.clearAll = async () => { if (await confirmSheet(t('confirmClearData'))) { resetAll(); go('#/chats'); render(true); } };

// ======================= after render bindings =======================
function afterRender(parts, q) {
  const [a, b, c] = parts;
  if (a === 'chats' || !a) {
    const qi = $('#q'); if (qi) qi.addEventListener('input', () => { $('#chatlist').innerHTML = qi.value.trim() ? searchResults(qi.value.trim()) : chatList(); });
  }
  if (a === 'chat' && b && !c) {
    update(s => { s.chars[b].unread = 0; });
    const box = $('#chat');
    const hlId = q.get('hl');
    if (hlId) { const el = $('#msg-' + hlId); if (el) { el.scrollIntoView({ block: 'center' }); setTimeout(() => el.classList.remove('hl'), 2200); } }
    else box.scrollTop = box.scrollHeight;
    bindComposer(b);
    maybeAvatarReaction(b);
    maybeBeat(b);
  }
  if (a === 'chat' && c === 'info') {
    const cm = $('#callme'); if (cm) cm.addEventListener('change', () => update(s => { s.chars[b].callMe = cm.value.trim(); }));
    // correct a memory in place; a corrected "likes" memory also updates what he brings up later
    app.querySelectorAll('.memin').forEach(inp => inp.addEventListener('change', () => update(s => {
      const m = s.chars[b].memories.find(x => x.id === inp.dataset.id); const v = inp.value.trim(); if (!m || !v) return;
      m.text = v; if (m.kind === 'like') m.value = v.replace(/^(喜欢|Likes\s*)/i, '').trim() || m.value;
    })));
    app.querySelectorAll('.hcin').forEach(inp => inp.addEventListener('change', () => update(s => {
      const h = (s.chars[b].headcanon || []).find(x => x.id === inp.dataset.id); const v = inp.value.trim(); if (h && v) h.text = v;
    })));
    $('#hcnew')?.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); ACT.addHc(); } });
  }
  if (a === 'chat' && c === 'search') { const cq = $('#cq'); if (cq) { cq.addEventListener('input', () => { ui.chatSearch.q = cq.value.trim(); $('#csr').innerHTML = chatSearchResults(b); }); } }
  if (a === 'toy') {
    const th = $('#toyhold'); if (th) bindHold(th, S().toy.charId, { fromChat: false });
    $('#t-play')?.addEventListener('change', e => update(s => { s.toy.playWhere = e.target.value; }));
    $('#t-face')?.addEventListener('change', e => update(s => { s.toy.idleFace = e.target.value; }));
    $('#t-vol')?.addEventListener('change', e => update(s => { s.toy.volume = +e.target.value; }));
    $('#t-bri')?.addEventListener('change', e => update(s => { s.toy.brightness = +e.target.value; }));
  }
  if (a === 'me' && b === 'profile') app.querySelectorAll('[data-pf]').forEach(inp => inp.addEventListener('change', () => update(s => { s.profile[inp.dataset.pf] = inp.value.trim(); })));
  if (a === 'me' && b === 'ai') { const k = $('#apikey'); if (k) k.addEventListener('change', () => update(s => { s.settings.apiKey = k.value.trim(); })); }
}

// ---------- re-render on state change ----------
let pending = false;
function onChange() {
  if (pending) return; pending = true;
  requestAnimationFrame(() => {
    pending = false;
    const id = currentChat();
    if (id) { refreshChat(id, { scroll: false }); return; }
    const { parts } = route();
    if (parts[0] === 'chats' || !parts[0]) { const qi = $('#q'); if (qi && qi.value.trim()) return; const cl = $('#chatlist'); if (cl) { cl.innerHTML = chatList(); const nb = $('.nav'); if (nb) nb.outerHTML = navBar('chats'); return; } }
    if (document.activeElement && /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) return;
    if (app.querySelector('.scrim')) return;
    render();
  });
}
subscribe(onChange);

// keep "his status" fresh and scroll new messages into view
let lastCount = 0;
subscribe(() => {
  const id = currentChat(); if (!id) return;
  const n = S().messages[id].length;
  if (n !== lastCount) { lastCount = n; requestAnimationFrame(() => { const box = $('#chat'); if (box) box.scrollTop = box.scrollHeight; }); }
});

// ---------- host page preferences (portfolio embed) ----------
// ?lang=zh|en&theme=light|dark set the app's language and theme; a host page on
// the same origin can change them live with postMessage({ type: 'wz-prefs', lang, theme })
// (the portfolio's older { type: 'wh-lang', lang } message is understood too).
function applyHostPrefs({ lang, theme }) {
  const L2 = lang === 'en' || lang === 'zh' ? lang : null;
  const T2 = theme === 'light' || theme === 'day' ? 'day' : theme === 'dark' || theme === 'night' ? 'night' : null;
  if (!L2 && !T2) return;
  const s = S().settings;
  if ((L2 && L2 !== s.lang) || (T2 && T2 !== s.theme)) {
    update(st => { if (L2) st.settings.lang = L2; if (T2) st.settings.theme = T2; });
    return true;
  }
  return false;
}
{
  const qp = new URLSearchParams(location.search);
  applyHostPrefs({ lang: qp.get('lang'), theme: qp.get('theme') });
}
window.addEventListener('message', e => {
  if (e.origin !== location.origin || !e.data || typeof e.data !== 'object') return;
  // a partial refresh wouldn't re-apply the theme or every label, so redraw the whole screen
  if ((e.data.type === 'wz-prefs' || e.data.type === 'wh-lang') && applyHostPrefs(e.data)) render();
});

// ---------- he messages first ----------
// The character on the toy writes first if you haven't talked for 3 hours: at most twice a day,
// never between 1 and 7 am, and it can be switched off in Me > Privacy.
function maybeProactive() {
  const s = S(); if (!s.onboarded || s.settings.proactive === false) return;
  const id = s.toy.charId; const c = getChar(id); const cs = s.chars[id]; if (!c || !cs || !cs.owned) return;
  const list = s.messages[id] || []; const last = list.length ? list[list.length - 1].ts : 0;
  if (Date.now() - last < 3 * 3600e3) return;
  const day = new Date().toDateString(); const n = cs.proactive && cs.proactive.day === day ? cs.proactive.n : 0;
  if (n >= 2) return;
  const line = proactiveLine({ char: c, cs, state: s }); if (!line) return;
  update(st => {
    st.messages[id].push({ id: newId(), from: 'him', type: 'text', text: line.text, lang: line.lang, proactive: true, ts: Date.now() });
    if (currentChat() !== id) st.chars[id].unread++;
    st.chars[id].proactive = { day, n: n + 1 };
  });
}
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') setTimeout(maybeProactive, 1500); });

// ---------- boot ----------
if (!location.hash) history.replaceState(null, '', '#/chats');
render(true);
setTimeout(maybeProactive, 2500);
if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
window.addEventListener('beforeunload', save);
