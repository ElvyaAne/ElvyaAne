// Draws range.svg: one peak per solved LeetCode problem, as tall as it was hard.
// Run by .github/workflows/range.yml once a day. Falls back to the last known numbers if LeetCode can't be reached.
const fs = require('fs');
const path = require('path');

const USER = 'Elvya';
const OUT = path.join(__dirname, 'range.svg');
const LAST = path.join(__dirname, 'last-stats.json');
const F = JSON.parse(fs.readFileSync(path.join(__dirname, 'fonts.json'), 'utf8'));

async function fetchStats() {
  const query = `query($u:String!){allQuestionsCount{difficulty count}
    matchedUser(username:$u){submitStatsGlobal{acSubmissionNum{difficulty count}}}}`;
  const r = await fetch('https://leetcode.com/graphql', {
    method: 'POST',
    headers: { 'content-type': 'application/json', referer: `https://leetcode.com/u/${USER}/`, 'user-agent': 'Mozilla/5.0' },
    body: JSON.stringify({ query, variables: { u: USER } }),
  });
  if (!r.ok) throw new Error('LeetCode answered ' + r.status);
  const { data } = await r.json();
  const ac = Object.fromEntries(data.matchedUser.submitStatsGlobal.acSubmissionNum.map(x => [x.difficulty, x.count]));
  const all = data.allQuestionsCount.find(x => x.difficulty === 'All');
  return { easy: ac.Easy, medium: ac.Medium, hard: ac.Hard, all: all ? all.count : null };
}

// same layout as the range on elvya's website
function mkR() { let s = 20261017; return () => { s |= 0; s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const MED = new Set([30, 31, 44, 46, 50, 53, 56, 58, 61]), HARD = 9;
function kindsFor(E, M, H) {
  const want = { easy: E, medium: M, hard: H }, got = { easy: 0, medium: 0, hard: 0 }, out = [];
  for (let i = 0; i < 62; i++) { const k = i === HARD ? 'hard' : MED.has(i) ? 'medium' : 'easy'; if (got[k] < want[k]) { out.push(k); got[k]++; } }
  const left = () => (want.easy - got.easy) + (want.medium - got.medium) + (want.hard - got.hard);
  while (left() > 0) for (const k of ['easy', 'easy', 'easy', 'medium', 'easy', 'hard']) if (got[k] < want[k]) { out.push(k); got[k]++; }
  return out;
}

function draw(st) {
  const W = 1200, H = 300, X0 = 330, XW = 840, BASE = 262, R = mkR();
  const kinds = kindsFor(st.easy, st.medium, st.hard), n = Math.max(2, kinds.length), sq = Math.max(.4, Math.min(1, 62 / n));
  const peaks = kinds.map((kind, i) => {
    const h = kind === 'hard' ? 190 : kind === 'medium' ? 80 + R() * 38 : 20 + R() * 36;
    return { kind, x: X0 + 10 + i * ((XW - 20) / (n - 1)) + (R() - .5) * 5 * sq, h, w: (kind === 'hard' ? 13 : kind === 'medium' ? 10 : 7) * sq };
  });
  const ridge = (x, sc = 1) => { let m = 8 + 5 * Math.sin(x / 45) + 3 * Math.sin(x / 14); for (const p of peaks) { const d = (x - p.x) / p.w; if (Math.abs(d) < 4) m = Math.max(m, p.h * sc * Math.exp(-d * d / 2)); } return BASE - m; };
  const pathOf = (sc, dx) => { let d = `M${X0} ${H}L${X0} ${ridge(X0, sc).toFixed(1)}`; for (let x = X0 + 2; x <= X0 + XW; x += 2) d += `L${x} ${ridge(x - dx, sc).toFixed(1)}`; return d + `L${X0 + XW} ${H}Z`; };
  const col = { easy: '#efeaff', medium: '#9bd9ff', hard: '#ffc4ea' };
  const dots = peaks.map(p => {
    const y = BASE - p.h - 6;
    const flag = p.kind === 'hard' ? `<line x1="${p.x.toFixed(1)}" y1="${y}" x2="${p.x.toFixed(1)}" y2="${y - 22}" stroke="#ffc4ea" stroke-width="1.3"/><path d="M${p.x.toFixed(1)} ${y - 22}l13 4.5-13 4.5z" fill="#ffc4ea"/>` : '';
    return `${flag}<circle cx="${p.x.toFixed(1)}" cy="${y.toFixed(1)}" r="${p.kind === 'easy' ? 2 : 2.8}" fill="${col[p.kind]}"/>`;
  }).join('');
  const total = st.easy + st.medium + st.hard;
  const front = pathOf(1, 0), line = front.replace(/^M[\d.]+ [\d.]+L/, 'M').replace(/L[\d.]+ [\d.]+Z$/, '');
  let rs = 5; const rnd = () => (rs = (rs * 16807) % 2147483647) / 2147483647;
  const stars = Array.from({ length: 40 }, () => `<circle class="tw" cx="${(rnd() * W).toFixed(0)}" cy="${(rnd() * 150).toFixed(0)}" r="${(.5 + rnd()).toFixed(1)}" fill="#efeaff" opacity="${(.3 + rnd() * .5).toFixed(2)}"/>`).join('');
  const updated = new Date().toLocaleDateString('en-CA', { month: 'short', day: 'numeric', timeZone: 'America/Toronto' });
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="${total} LeetCode problems solved: ${st.easy} easy, ${st.medium} medium, ${st.hard} hard">
<defs><style>@font-face{font-family:L;font-style:italic;src:url(data:font/woff;base64,${F.lora}) format('woff')}
@font-face{font-family:P;src:url(data:font/woff;base64,${F.pop}) format('woff')}@font-face{font-family:PM;src:url(data:font/woff;base64,${F.popm}) format('woff')}
.l{font-family:L,Georgia,serif;font-style:italic}.p{font-family:P,'Segoe UI',sans-serif}.pm{font-family:PM,'Segoe UI',sans-serif}
.tw{animation:tw 3.2s ease-in-out infinite}.tw:nth-of-type(3n){animation-duration:4.4s}@keyframes tw{50%{opacity:.2}}
.climb{offset-path:path('${line}');offset-rotate:0deg;animation:climb 14s linear infinite}@keyframes climb{0%{offset-distance:0%}100%{offset-distance:100%}}
@media (prefers-reduced-motion:reduce){*{animation:none!important}}</style>
<linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#171345"/><stop offset="1" stop-color="#2a2072"/></linearGradient>
<linearGradient id="r1" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#c9b8ff" stop-opacity=".5"/><stop offset="1" stop-color="#5a4fb8" stop-opacity=".05"/></linearGradient>
<linearGradient id="r2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3a2f96"/><stop offset=".75" stop-color="#211a5e"/><stop offset="1" stop-color="#2a2072"/></linearGradient>
<clipPath id="f"><rect width="${W}" height="${H}" rx="20"/></clipPath></defs>
<g clip-path="url(#f)"><rect width="${W}" height="${H}" fill="url(#bg)"/>${stars}
<path d="${pathOf(.62, -8)}" fill="url(#r1)"/><path d="${front}" fill="url(#r2)"/><path d="${line}" fill="none" stroke="#c9b8ff" stroke-opacity=".6" stroke-width="1.1"/>
${dots}
<g class="climb"><g transform="translate(-5 -20) scale(.5)" fill="#efeaff"><circle cx="10" cy="6.2" r="4.3"/><path d="M13.4 3.6c2.6.2 4 2.4 3.4 5.6-.4 2-1.6 3.2-2.4 4.4-.3-1.8-.4-3.4-1.4-4.8z"/><path d="M5.4 12.2c1.4-1.2 7.8-1.2 9.2 0l1.8 15.4H3.6z"/><rect x="6" y="27" width="2.6" height="12.4" rx="1.2"/><rect x="11.4" y="27" width="2.6" height="12.4" rx="1.2"/></g></g>
<text x="40" y="58" class="pm" font-size="11" letter-spacing="3" fill="#9bd9ff">THE RANGE · LEETCODE</text>
<text x="38" y="128" class="l" font-size="78" fill="#efeaff">${total}</text>
<text x="40" y="158" class="p" font-size="14" fill="#c9c2ea">peaks, and climbing</text>
<text x="40" y="202" class="pm" font-size="13" fill="#efeaff">${st.easy}<tspan fill="#8f86c9" font-size="10.5" letter-spacing="1.5"> EASY</tspan>   <tspan fill="#9bd9ff">${st.medium}</tspan><tspan fill="#8f86c9" font-size="10.5" letter-spacing="1.5"> MED</tspan>   <tspan fill="#ffc4ea">${st.hard}</tspan><tspan fill="#8f86c9" font-size="10.5" letter-spacing="1.5"> HARD</tspan></text>
<text x="40" y="250" class="pm" font-size="10" letter-spacing="2" fill="#8f86c9">UPDATED ${updated.toUpperCase()}</text>
</g><rect x=".5" y=".5" width="${W - 1}" height="${H - 1}" rx="19.5" fill="none" stroke="#c9b8ff" stroke-opacity=".22"/></svg>`;
}

(async () => {
  let st;
  try { st = await fetchStats(); fs.writeFileSync(LAST, JSON.stringify(st, null, 2) + '\n'); }
  catch (e) {
    console.log('Using last known numbers:', e.message);
    st = JSON.parse(fs.readFileSync(LAST, 'utf8'));
  }
  fs.writeFileSync(OUT, draw(st));
  console.log(`range.svg: ${st.easy}/${st.medium}/${st.hard}`);
})();
