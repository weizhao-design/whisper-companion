// Hand-drawn style character portraits as inline SVG.
// The same drawing doubles as the toy's round-screen face: CSS classes on the
// root (st-idle / st-listen / st-think / st-speak / st-static) decide which
// eye, brow and mouth layers show and how they animate (see app.css).

let uid = 0;

const HAIR_BACK = {
  side: '<ellipse cx="50" cy="42" rx="21.5" ry="22"/>',
  soft: '<ellipse cx="50" cy="43" rx="22" ry="22.5"/>',
  messy: '<ellipse cx="50" cy="42" rx="22" ry="22"/>',
  curly: '<ellipse cx="50" cy="42" rx="23" ry="22.5"/>',
  long: '<path d="M27 44C25 27 36 19.5 50 19.5C64 19.5 75 27 73 44L76 84C69 89 31 89 24 84Z"/>',
  bob: '<path d="M28 44C27 28 37 21 50 21C63 21 73 28 72 44L73.5 66C66 70.5 34 70.5 26.5 66Z"/>',
  bun: '<ellipse cx="50" cy="43" rx="22" ry="22.5"/><circle cx="50" cy="18.5" r="7.5"/>',
};
const HAIR_FRONT = {
  side: 'M30 47C29 30 38 22.5 51 22.5C63 22.5 71 31 70 45C66 38 60 34.5 54 34C47 38 39 42 32 48Z',
  soft: 'M30 47C28 31 38 23 50 23C62 23 72 31 70 47C67 41 63 38.5 58 39.5C55 36.5 51 36.5 48 38.5C44 36.5 39 38.5 36 41.5C33.5 43.5 31.5 45 30 47Z',
  messy: 'M29 48C27 30 37 21 50 21C63 21 73 30 71 48L68 41L64.5 45.5L61 38L56.5 43.5L52 36L48 42.5L43.5 37L40 44L35.5 39L32.5 46Z',
  curly: 'M30 46C28 32 38 25 50 25C62 25 72 32 70 46C66 40.5 60 38.5 50 38.5C40 38.5 34 40.5 30 46Z',
  long: 'M30 47C29 30.5 38.5 23 50 23C62 23 71 30.5 70 47C68 40 62 35.5 55 35C51 39 43 42.5 36.5 43.5C33.5 44.5 31.5 45.8 30 47Z',
  bob: 'M30.5 45C30 30 39 23.5 50 23.5C61 23.5 70 30 69.5 45C64 41.5 36 41.5 30.5 45Z',
  bun: 'M30 46C29 31 38.5 23.5 50 23.5C61.5 23.5 71 31 70 46C66 41 58 38 50 39C42 38 34 41 30 46Z',
};

/** Ready-made avatars for the user, drawn in the same style as the characters. */
export const USER_AVATARS = [
  { hair: '#3A2A2F', style: 'long', skin: '#F7DFD0', cloth: '#F3C5D2', bg: ['#FFE0E8', '#F29AB2'] },
  { hair: '#5A3A2E', style: 'bob', skin: '#F6DCCB', cloth: '#FFFFFF', bg: ['#FBE6CF', '#E9A86F'] },
  { hair: '#2B2238', style: 'bun', skin: '#F4D9C6', cloth: '#6B5A8A', bg: ['#DCD2EA', '#8E7AB0'] },
  { hair: '#6B4A35', style: 'soft', skin: '#F8E3D2', cloth: '#9AB0CF', bg: ['#DCE8F4', '#7F9CC2'] },
  { hair: '#8A5A3B', style: 'curly', skin: '#EFD2BE', cloth: '#F3D7A0', bg: ['#E6EFD8', '#9DB884'] },
  { hair: '#1F1A24', style: 'side', skin: '#F2D8C6', cloth: '#2E2836', bg: ['#4A3A5E', '#1E1826'], glasses: true },
];
const CURLS = '<circle cx="33.5" cy="33" r="6.2"/><circle cx="41" cy="27" r="6.6"/><circle cx="50.5" cy="24.5" r="6.8"/><circle cx="60" cy="27" r="6.6"/><circle cx="67" cy="33" r="6.2"/>';

/**
 * @param {object} look  character.look
 * @param {object} opts  { state: 'static'|'idle'|'listen'|'think'|'speak', round: bool }
 */
export function portrait(look, opts = {}) {
  if (look.img) return imagePortrait(look, opts);
  const id = 'pv' + (++uid);
  const state = opts.state || 'static';
  const [b1, b2] = look.bg;
  const ink = '#2A1F2E';
  const glasses = look.glasses
    ? `<g fill="none" stroke="${ink}" stroke-width="1.3" opacity=".85"><circle cx="42.5" cy="51" r="5"/><circle cx="57.5" cy="51" r="5"/><path d="M47.5 51h5M37.5 50l-4-1.2M62.5 50l4-1.2"/></g>` : '';
  const earring = look.earring ? `<circle cx="32.6" cy="55" r="1.4" fill="#E9C887"/>` : '';
  return `<svg class="pt st-${state}" viewBox="0 0 100 100" preserveAspectRatio="xMidYMin slice" aria-hidden="true">
  <defs><linearGradient id="${id}g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${b1}"/><stop offset="1" stop-color="${b2}"/></linearGradient></defs>
  <rect width="100" height="100" fill="url(#${id}g)"/>
  <path d="M15 104C17 85 31 76.5 50 76.5C69 76.5 83 85 85 104Z" fill="${look.cloth}"/>
  <path d="M43 76.5L50 86L57 76.5" fill="none" stroke="${ink}" stroke-width="1" opacity=".25"/>
  <path d="M43.5 60h13v16c0 3.5-13 3.5-13 0z" fill="${look.skin}"/><path d="M43.5 66c4 2.5 9 2.5 13 0v-6h-13z" fill="#000" opacity=".07"/>
  <g fill="${look.hair}">${HAIR_BACK[look.style] || HAIR_BACK.side}</g>
  <ellipse cx="33.2" cy="51" rx="2.6" ry="3.6" fill="${look.skin}"/><ellipse cx="66.8" cy="51" rx="2.6" ry="3.6" fill="${look.skin}"/>
  <ellipse cx="50" cy="49" rx="17" ry="20" fill="${look.skin}"/>
  <g fill="${look.hair}"><path d="${HAIR_FRONT[look.style] || HAIR_FRONT.side}"/>${look.style === 'curly' ? CURLS : ''}</g>
  <g class="br" fill="none" stroke="${ink}" stroke-width="1.5" stroke-linecap="round" opacity=".8"><path d="M38.5 44.5q4-2 7.5-.6"/><path d="M54 43.9q3.5-1.4 7.5.6"/></g>
  <g class="eo"><ellipse cx="42.5" cy="51.5" rx="2.3" ry="2.9" fill="${ink}"/><ellipse cx="57.5" cy="51.5" rx="2.3" ry="2.9" fill="${ink}"/><circle cx="43.3" cy="50.4" r=".8" fill="#fff"/><circle cx="58.3" cy="50.4" r=".8" fill="#fff"/></g>
  <g class="ec" fill="none" stroke="${ink}" stroke-width="1.6" stroke-linecap="round"><path d="M39.5 52q3-3 6 0"/><path d="M54.5 52q3-3 6 0"/></g>
  <g class="eh"><path d="M40 51.2a2.5 2.2 0 0 0 5 0z" fill="${ink}"/><path d="M55 51.2a2.5 2.2 0 0 0 5 0z" fill="${ink}"/><path d="M39.6 51.1h5.8M54.6 51.1h5.8" stroke="${ink}" stroke-width="1.3" stroke-linecap="round"/></g>
  <ellipse cx="38" cy="58" rx="3.4" ry="1.7" fill="#F27F9D" opacity=".45"/><ellipse cx="62" cy="58" rx="3.4" ry="1.7" fill="#F27F9D" opacity=".45"/>
  <path class="ms" d="M46 60.5q4 3.2 8 0" fill="none" stroke="${ink}" stroke-width="1.5" stroke-linecap="round"/>
  <path class="mn" d="M46.5 61.2h7" fill="none" stroke="${ink}" stroke-width="1.5" stroke-linecap="round"/>
  <ellipse class="mo" cx="50" cy="61.4" rx="2.6" ry="2.2" fill="#7A3443"/>
  ${glasses}${earring}
</svg>`;
}

/**
 * Frame-by-frame portrait (image-based characters): one base frame plus
 * small eye / mouth patches laid over it, the same way the toy firmware does it.
 * Patch boxes come from the firmware export (480 px canvas): eyes 155,150 185×85,
 * mouth 155,238 205×102. The source frames are round, so in square slots the
 * image is zoomed until the circle's black corners are out of view.
 */
function imagePortrait(look, opts = {}) {
  const state = opts.state || 'static';
  const p = look.img;
  // Patch boxes on a 480 px canvas [x, y, w]; each character's art can sit
  // differently, so tools/import_char_art.py writes these into data.js.
  const box = ([x, y, w]) => `left:${(x / 4.8).toFixed(2)}%;top:${(y / 4.8).toFixed(2)}%;width:${(w / 4.8).toFixed(2)}%`;
  const eye = box(look.eyeBox || [155, 150, 185]);
  const mouth = box(look.mouthBox || [155, 238, 205]);
  return `<div class="pt pti st-${state}${opts.round ? ' round' : ''}" aria-hidden="true"><div class="pti-in">
    <img class="pi-b" src="${p}base.jpg" alt="" draggable="false">
    <img class="pi-p pi-ec" src="${p}eye4.jpg" style="${eye}" alt="">
    <img class="pi-p pi-eh" src="${p}eye2.jpg" style="${eye}" alt="">
    <img class="pi-p pi-el" src="${p}eyeL2.jpg" style="${eye}" alt="">
    <img class="pi-p pi-mn" src="${p}mouth4.jpg" style="${mouth}" alt="">
    <img class="pi-t pi-t0" src="${p}talk0.jpg" alt=""><img class="pi-t pi-t2" src="${p}talk2.jpg" alt="">
  </div></div>`;
}

/** The user's own avatar: their photo, or one of the ready-made illustrated avatars. */
export function userAvatar(state) {
  if (state.profile.avatar) return `<img src="${state.profile.avatar}" alt="">`;
  const look = USER_AVATARS[state.profile.avatarPreset ?? 0] || USER_AVATARS[0];
  return portrait(look);
}

export function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
