// Flat phone mock-up (iPhone 15 Pro screen size) for desktop and portfolio embeds.
// On a real phone (narrow screen) the app runs full-screen with no frame.
//   ?frame=1  always show the frame     ?frame=0  never show it
//   ?embed=1  transparent page background (for an <iframe> in a portfolio)
const params = new URLSearchParams(location.search);
const W = 413, H = 872; // device outer size in CSS px (393 × 852 screen + 10 px bezel)
const device = document.getElementById('device');

function wantFrame() {
  if (params.get('frame') === '1') return true;
  if (params.get('frame') === '0') return false;
  return innerWidth >= 560;
}

function fit() {
  const on = wantFrame();
  document.body.classList.toggle('device', on);
  document.body.classList.toggle('embed', params.get('embed') === '1');
  // Inside an iframe, a color-scheme that differs from the host page makes the
  // browser paint an opaque backdrop; 'normal' keeps the frame see-through.
  if (params.get('embed') === '1') document.documentElement.style.colorScheme = 'normal';
  if (!on) { device.style.transform = ''; device.style.margin = ''; return; }
  const pad = 28;
  let s = Math.min(1, (innerHeight - pad * 2) / H, (innerWidth - pad * 2) / W);
  s = Math.max(s, 0.6); // below this the page scrolls instead of shrinking further
  device.style.transform = `scale(${s})`;
  // shrink the layout box to the scaled size so page scrolling matches what you see
  device.style.margin = `${(H * s - H) / 2 + pad}px ${(W * s - W) / 2}px`;
}

function clock() {
  const el = document.getElementById('sb-time'); if (!el) return;
  const d = new Date();
  const zh = (document.documentElement.lang || '').startsWith('zh');
  el.textContent = zh
    ? `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`
    : `${d.getHours() % 12 || 12}:${String(d.getMinutes()).padStart(2, '0')}`;
}

async function battery() {
  const bar = document.getElementById('sb-batt'); if (!bar) return;
  let level = 0.82;
  try { if (navigator.getBattery) { const b = await navigator.getBattery(); level = b.level; b.onlevelchange = () => setLvl(b.level); } } catch (e) {}
  setLvl(level);
  function setLvl(l) { bar.setAttribute('width', Math.max(2, 19.6 * l).toFixed(1)); bar.style.fill = l <= 0.2 ? '#E5484D' : 'currentColor'; }
}

fit(); clock(); battery();
addEventListener('resize', fit);
setInterval(clock, 15000);
new MutationObserver(clock).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });

// Pages without a header (e.g. a character profile) scroll under the status
// bar; give the bar a frosted backing once content slides beneath it.
document.addEventListener('scroll', e => {
  const el = e.target;
  if (!(el instanceof Element) || !el.closest('#app')) return;
  const noHeader = !document.querySelector('#app .hdr');
  document.body.classList.toggle('sb-solid', noHeader && el.scrollTop > 30);
}, true);
addEventListener('hashchange', () => document.body.classList.remove('sb-solid'));
