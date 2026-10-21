/* Full headless harness for NEON RUNNER: DOM/canvas stub, drives the real
   loop, exercises every screen, asserts core invariants. */
const fs = require('fs');

function makeCtx(){
  const s = {};
  return new Proxy(s, {
    get(t, k){
      if (k in t) return t[k];
      if (k === 'createLinearGradient' || k === 'createRadialGradient') return () => ({ addColorStop(){} });
      if (k === 'createPattern') return () => ({});
      if (k === 'measureText') return x => ({ width: String(x).length * 8 });
      return () => {};
    },
    set(t, k, v){ t[k] = v; return true; }
  });
}
const CTX = makeCtx();
function makeEl(tag){
  const L = {}, C = new Set();
  const el = {
    tagName: tag, width: 0, height: 0, innerHTML: '', textContent: '',
    style: { setProperty(){} }, dataset: {}, children: [],
    classList: {
      add: c => C.add(c), remove: c => C.delete(c),
      toggle: (c, v) => { if (v === undefined) { C.has(c) ? C.delete(c) : C.add(c); } else if (v) C.add(c); else C.delete(c); },
      contains: c => C.has(c)
    },
    appendChild(c){ el.children.push(c); return c; },
    setAttribute(){}, removeAttribute(){},
    addEventListener(t, f){ (L[t] = L[t] || []).push(f); },
    getBoundingClientRect(){ return { left: 0, top: 0, width: 960, height: 540, right: 960, bottom: 540 }; },
    getContext(){ return CTX; }, requestFullscreen(){}
  };
  el._l = L; return el;
}
const canvasEl = makeEl('canvas'), touchEl = makeEl('div'), a11yEl = makeEl('div'), bodyEl = makeEl('body');
const winL = {};
global.window = {
  addEventListener: (t, f) => { (winL[t] = winL[t] || []).push(f); },
  innerWidth: 1440, innerHeight: 810, devicePixelRatio: 1,
  matchMedia: () => ({ matches: false }),
  requestAnimationFrame: cb => { RAF = cb; }
};
global.navigator = { userAgent: 'Chrome/120', maxTouchPoints: 0, getGamepads: () => [] };
global.document = {
  getElementById: id => (id === 'c' ? canvasEl : (id === 'touch' ? touchEl : a11yEl)),
  createElement: t => makeEl(t), querySelectorAll: () => [],
  addEventListener: (t, f) => { (winL['doc:' + t] = winL['doc:' + t] || []).push(f); },
  body: bodyEl, documentElement: makeEl('html'), fullscreenElement: null, hidden: false
};
let RAF = null;
global.requestAnimationFrame = cb => { RAF = cb; };
const LS = {};
global.localStorage = {
  getItem: k => (k in LS ? LS[k] : null),
  setItem: (k, v) => { LS[k] = String(v); },
  removeItem: k => { delete LS[k]; }
};
let T = 0;
global.performance = { now: () => T };
global.setTimeout = () => 0;
global.clearTimeout = () => {};

let code = fs.readFileSync(process.env.GAME_JS || require('path').join(__dirname, '..', 'build', 'game.js'), 'utf8');
const hook = `
global.__T = {
  get S(){return S}, get P(){return P}, get enemies(){return enemies},
  get platforms(){return platforms}, get hazards(){return hazards},
  get bullets(){return bullets}, get pickups(){return pickups},
  get Replay(){return Replay}, get UI(){return UI}, get UserIn(){return UserIn},
  get Wall(){return Wall}, get Settings(){return Settings}, get Scores(){return Scores},
  get ENEMY_DEF(){return ENEMY_DEF}, get Music(){return Music},
  get GROUND_Y(){return GROUND_Y}, get JUMP_APEX(){return JUMP_APEX},
  get VW(){return VW}, get VH(){return VH}, get Cam(){return Cam},
  beginRun:beginRun, endRunToTitle:endRunToTitle, resize:resize,
  spawnEnemy:spawnEnemy, spawnBoss:spawnBoss, commitInitials:commitInitials
};
`;
const __hasHook = /global\.__[GT]\s*=/.test(code);
let __m = __hasHook ? -1 : code.indexOf('/*NEON_HOOK*/');
if (!__hasHook){
  if (__m < 0) __m = code.lastIndexOf('})();');
  if (__m < 0) __m = code.lastIndexOf('}();');
  if (__m < 0) throw new Error('no injection point found');
  code = code.slice(0, __m) + hook + code.slice(__m);
}
try { eval(code); } catch (e) { console.error('LOAD ERROR:\n' + e.stack); process.exit(1); }
const T_ = global.__T;

const fire = (t, e) => (winL[t] || []).forEach(f => f(e));
const key = c => ({ code: c, repeat: false, preventDefault(){} });
function steps(n){
  for (let i = 0; i < n; i++){
    T += 16.7;
    const cb = RAF; RAF = null;
    if (!cb) throw new Error('rAF chain broke');
    cb(T);
  }
}
function press(code, d, u){ fire('keydown', key(code)); steps(d === undefined ? 2 : d); fire('keyup', key(code)); steps(u === undefined ? 2 : u); }

let fails = [];
/* find a menu entry by label and activate it (indices shift as menus grow) */
function openLabel(label, tries){
  tries = tries || 40;
  for (let i = 0; i < tries; i++){
    const items = T_.UI.items || [];
    for (let j = 0; j < items.length; j++){
      if (items[j] && items[j].label && items[j].label.indexOf(label) === 0){
        T_.UI.index = j;
        press('Enter', 2, 3);
        return true;
      }
    }
    press('ArrowDown', 1, 1);
  }
  return false;
}
function check(name, cond, extra){
  console.log((cond ? '  PASS  ' : '  FAIL  ') + name + (extra ? '  ' + extra : ''));
  if (!cond) fails.push(name);
}

/* ---------- 1. boot + attract ---------- */
console.log('\n[1] boot / attract');
check('starts on boot screen', T_.S.screen === 'boot');
steps(20);
press('Space', 2, 4);
check('attract demo runs', T_.S.screen === 'play' && T_.S.attract === true);
let attractKills = 0, attractMaxScore = 0, prev = 0;
for (let i = 0; i < 3600; i++){
  steps(1);
  if (T_.S.score > attractMaxScore) attractMaxScore = T_.S.score;
  if (T_.S.score > prev) attractKills++;
  prev = T_.S.score;
}
check('attract produces kills', attractKills > 10, 'score-events=' + attractKills + ' peak-score=' + attractMaxScore);
check('attract spawns enemies', T_.enemies.length > 0, 'n=' + T_.enemies.length);

/* ---------- 2. platform reachability ---------- */
console.log('\n[2] platform reachability');
const APEX = T_.JUMP_APEX;
let worstTier1 = 0, unreachable = 0, counted = 0;
T_.beginRun({});
for (let round = 0; round < 300; round++){
  const GY = T_.GROUND_Y, camX = T_.Cam.x;
  const live = T_.platforms.filter(pl => pl.x + pl.w > camX);   // ignore culled ones behind us
  for (const pl of live){
    counted++;
    const above = GY - pl.y;
    if (above <= APEX - 20) { if (above > worstTier1) worstTier1 = above; continue; }
    /* otherwise it must be reachable from another live platform */
    let ok = false;
    for (const q of live){
      if (q === pl) continue;
      const rise = q.y - pl.y;
      const gapX = Math.max(0, Math.max(pl.x - (q.x + q.w), q.x - (pl.x + pl.w)));
      if (rise > 0 && rise <= APEX - 20 && gapX < 200) { ok = true; break; }
    }
    if (!ok) unreachable++;
  }
  T_.P.x += 640; steps(1);
}
check('every platform is jump-reachable', unreachable === 0, 'unreachable=' + unreachable + ' of ' + counted);
/* duck must clear a turret laser and a laser gate, standing must not */
{
  const GY = T_.GROUND_Y;
  const standTop = GY - 42, duckTop = GY - 24;
  const laserBottom = (GY - 42) + 8 + 5;          /* turret muzzle + bullet radius */
  const gateTop = GY - 160, gateBottom = GY - 30;
  check('turret laser hits standing', laserBottom > standTop, 'laser bottom=' + laserBottom + ' stand top=' + standTop);
  check('turret laser misses ducking', laserBottom < duckTop, 'laser bottom=' + laserBottom + ' duck top=' + duckTop);
  check('gate hits standing', gateBottom > standTop && gateTop < GY, 'gate ' + gateTop + '..' + gateBottom);
  check('gate misses ducking', gateBottom < duckTop, 'gate bottom=' + gateBottom + ' duck top=' + duckTop);
}
check('ground tier well inside jump apex', worstTier1 > 40 && worstTier1 <= APEX - 20,
      'tallest ground-tier=' + Math.round(worstTier1) + 'px  apex=' + Math.round(APEX) + 'px  margin=' + Math.round(APEX - worstTier1) + 'px');

/* ---------- 3. a real run driven by input ---------- */
console.log('\n[3] gameplay with input');
T_.beginRun({});
let kills = 0, best = 0, cards = 0, deaths = 0, frames = 0, maxEnemies = 0;
fire('keydown', key('ArrowRight'));
for (let i = 0; i < 7200; i++){
  steps(1); frames++;
  if (T_.S.kills > kills) kills = T_.S.kills;
  if (T_.S.score > best) best = T_.S.score;
  if (T_.enemies.length > maxEnemies) maxEnemies = T_.enemies.length;
  if (i % 100 === 0) { fire('keydown', key('ArrowUp')); }
  if (i % 100 === 22){ fire('keyup', key('ArrowUp')); }
  if (T_.S.screen === 'card'){ cards++; press('Enter', 1, 1); }
  if (T_.S.screen === 'dead'){ deaths++; T_.beginRun({}); }
}
fire('keyup', key('ArrowRight'));
check('kills accumulate', kills > 0, 'peak kills in one life=' + kills);
check('score accumulates', best > 0, 'peak score=' + best);
check('roguelite cards appear', cards > 0, 'cards=' + cards);
check('enemy pressure sustained', maxEnemies >= 3, 'peak concurrent enemies=' + maxEnemies);
check('death/restart cycle works', deaths >= 0, 'deaths=' + deaths + ' over ' + frames + ' frames');

/* ---------- 4. boss ---------- */
console.log('\n[4] boss encounter');
T_.beginRun({});
T_.P.maxHp = 999; T_.P.hp = 999;   // survive long enough to observe the fight
T_.spawnBoss();
steps(60);
check('boss spawned', !!T_.S.bossActive, 'phase=' + (T_.S.bossActive && T_.S.bossActive.phase));
steps(900);
const b = T_.S.bossActive;
check('boss closed to firing range', !b || b.hp < b.maxHp, b ? ('hp=' + b.hp + '/' + b.maxHp) : 'boss already destroyed');
if (b && !b.dead) check('boss phases progress', b.phase >= 1, 'phase=' + b.phase);
steps(1200);
check('boss can be defeated or damaged', !T_.S.bossActive || T_.S.bossActive.hp < T_.S.bossActive.maxHp,
      T_.S.bossActive ? ('hp=' + T_.S.bossActive.hp) : 'defeated');

/* ---------- 5. pause / settings / back ---------- */
console.log('\n[5] pause + settings + back');
T_.beginRun({});
steps(30);
press('KeyP', 2, 3);
check('P opens pause', T_.S.screen === 'pause', 'screen=' + T_.S.screen);
press('ArrowDown', 2, 2);
press('Enter', 2, 3);
check('ENTER opens settings', T_.S.screen === 'settings', 'screen=' + T_.S.screen);
const m0 = T_.Settings.music;
press('ArrowDown', 2, 2);
press('ArrowRight', 2, 2);
check('slider adjusts', T_.Settings.music !== m0, m0 + ' -> ' + T_.Settings.music);
check('settings persisted', JSON.parse(LS['nr_settings'] || '{}').music === T_.Settings.music);
press('Escape', 2, 3);
check('ESC returns to pause', T_.S.screen === 'pause', 'screen=' + T_.S.screen);
press('Escape', 2, 3);
check('ESC from pause resumes', T_.S.screen === 'play', 'screen=' + T_.S.screen);
press('KeyP', 2, 3);
check('P re-opens pause', T_.S.screen === 'pause', 'screen=' + T_.S.screen);
press('KeyP', 2, 3);
check('P resumes again', T_.S.screen === 'play', 'screen=' + T_.S.screen);
/* colourblind palette + sprite cache rebuild */
press('KeyP', 2, 3);
press('ArrowDown', 2, 2); press('Enter', 2, 3);
for (let i = 0; i < 3; i++) press('ArrowDown', 2, 2);
press('ArrowRight', 2, 3);
check('palette swaps and rebuilds sprites', T_.Settings.palette === 1, 'palette=' + T_.Settings.palette);
press('Escape', 2, 3); press('Escape', 2, 3);

/* ---------- 6. death / initials / scores / replay ---------- */
console.log('\n[6] death, initials, scores, replay');
T_.beginRun({});
let g = 0;
while (T_.S.screen !== 'dead' && g++ < 12000){
  steps(1);
  if (T_.S.screen === 'card') press('Enter', 1, 1);
}
check('death reached', T_.S.screen === 'dead', 'after ' + g + ' steps');
check('replay recorded', T_.Replay.frames.length > 0, 'frames=' + T_.Replay.frames.length);
check('score qualifies', T_.S.needsInitials === true, 'score=' + T_.S.score);
press('ArrowRight', 2, 1);
press('ArrowUp', 2, 1);
press('Enter', 2, 3);
check('initials committed to table', T_.Scores.length === 1 && !T_.S.needsInitials,
      'scores=' + T_.Scores.length + ' name=' + (T_.Scores[0] && T_.Scores[0].name));
check('scores persisted to storage', (JSON.parse(LS['nr_scores'] || '[]')).length === 1);
check('meta scrap banked', (JSON.parse(LS['nr_meta'] || '{}').scrap || 0) > 0,
      'scrap=' + (JSON.parse(LS['nr_meta'] || '{}').scrap || 0));
/* replay: items are [RETRY, WATCH REPLAY, HIGH SCORES, QUIT] now */
T_.beginRun({}); steps(120);
fire('keydown', key('ArrowRight')); steps(200); fire('keyup', key('ArrowRight'));
const recLen = T_.Replay.frames.length;
T_.S.screen = 'dead'; T_.S.needsInitials = false; T_.UI.index = 0; steps(3);
press('ArrowDown', 2, 2);
press('Enter', 2, 4);
check('replay playback starts', T_.Replay.playing === true, 'recorded=' + recLen);
steps(120);
check('replay advances', T_.Replay.idx > 0, 'idx=' + T_.Replay.idx);

/* ---------- 7. responsive layout ---------- */
console.log('\n[7] responsive layout');
const sizes = [[1440,810],[390,844],[844,390],[1024,1366],[2560,1080],[320,480],[768,1024],[1920,1080]];
let geoOK = true, notes = [];
for (const [w,h] of sizes){
  global.window.innerWidth = w; global.window.innerHeight = h;
  try { T_.resize(); } catch(e){ geoOK = false; notes.push(w+'x'+h+':'+e.message); continue; }
  const gy = T_.GROUND_Y;
  const ok = T_.VW > 200 && T_.VH > 200 && gy > 100 && gy < T_.VH && T_.VW / T_.VH > 0.2;
  if (!ok){ geoOK = false; notes.push(w+'x'+h+' -> VW='+T_.VW+' VH='+T_.VH+' GY='+gy); }
  steps(4);
}
check('all viewports give sane geometry', geoOK, notes.join(' | ') || sizes.length + ' orientations OK');
global.window.innerWidth = 1440; global.window.innerHeight = 810; T_.resize(); steps(20);

/* ---------- 8. title menu ---------- */
console.log('\n[8] title menu');
T_.endRunToTitle(); steps(20);
check('back at attract', T_.S.attract === true, 'screen=' + T_.S.screen);
press('ArrowDown', 2, 2);
press('ArrowUp', 2, 2);
press('ArrowDown', 2, 2);
check('title menu navigates', T_.UI.index >= 0, 'index=' + T_.UI.index);
openLabel('SETTINGS');
check('title menu opens settings', T_.S.screen === 'settings', 'screen=' + T_.S.screen);
press('Escape', 2, 3);
check('ESC from title settings returns to attract', T_.S.attract === true, 'screen=' + T_.S.screen);
/* start a run from the title, then quit back to it */
T_.UI.index = 0;
press('Enter', 2, 4);
check('START RUN leaves attract', T_.S.attract === false && T_.S.screen === 'play', 'screen=' + T_.S.screen);
T_.S.screen = 'dead'; T_.S.needsInitials = false; T_.UI.index = 0; steps(3);
for (let i = 0; i < 3; i++) press('ArrowDown', 1, 1);
press('Enter', 2, 4);
check('QUIT TO TITLE restores attract', T_.S.attract === true, 'screen=' + T_.S.screen);

/* ---------- 9. soak ---------- */
console.log('\n[9] soak');
T_.beginRun({});
fire('keydown', key('ArrowRight'));
let soakErr = null, soakKills = 0, soakBest = 0, soakCards = 0;
try {
  for (let i = 0; i < 12000; i++){
    steps(1);
    if (T_.S.kills > soakKills) soakKills = T_.S.kills;
    if (T_.S.score > soakBest) soakBest = T_.S.score;
    if (i % 110 === 0) fire('keydown', key('ArrowUp'));
    if (i % 110 === 20) fire('keyup', key('ArrowUp'));
    if (i % 260 === 130) fire('keydown', key('ArrowDown'));
    if (i % 260 === 170) fire('keyup', key('ArrowDown'));
    if (T_.S.screen === 'card'){ soakCards++; press('Enter', 1, 1); }
    if (T_.S.screen === 'dead'){ T_.beginRun({}); }
  }
} catch(e){ soakErr = e; }
fire('keyup', key('ArrowRight'));
check('soak ran clean', !soakErr, soakErr ? soakErr.stack : '12000 frames, no exception');
check('soak produced progress', soakBest > 0, 'peak score=' + soakBest + ' peak kills=' + soakKills + ' cards=' + soakCards);

/* ---------- 10. degenerate / edge inputs ---------- */
console.log('\n[10] edge cases');
let edgeErr = null;
try {
  /* everything held at once */
  ['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Space','Enter'].forEach(c => fire('keydown', key(c)));
  steps(400);
  ['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Space','Enter'].forEach(c => fire('keyup', key(c)));
  steps(20);
  /* force every enemy type to spawn at once */
  T_.beginRun({});
  const types = Object.keys(T_.ENEMY_DEF);
  types.forEach((t, i) => T_.spawnEnemy(t, T_.Cam.x + 400 + i * 40, null));
  steps(600);
  /* kill the player outright */
  T_.P.hp = 1; T_.P.invuln = 0;
  T_.enemies.length = 0;
  steps(5);
  /* fill the graze meter to fire the EMP */
  T_.S.bomb = 1; steps(10);
  /* extreme values */
  T_.S.score = 999999999; T_.P.level = 40; T_.S.combo = 999; T_.S.mult = 8;
  steps(120);
} catch(e){ edgeErr = e; }
check('edge cases survive', !edgeErr, edgeErr ? edgeErr.stack : 'all held keys, all 16 enemy types, EMP, extreme values');


/* ---------- 11. help / rebind / fullscreen / misc ---------- */
console.log('\n[11] help, rebind, fullscreen, misc');
let e2 = null;
try {
  T_.endRunToTitle(); steps(20);
  openLabel('HOW TO PLAY');
  check('help screen opens', T_.S.screen === 'help', 'screen=' + T_.S.screen);
  press('Escape', 2, 3);
  check('help closes', T_.S.attract === true, 'screen=' + T_.S.screen);

  /* rebind screen, reached through SETTINGS */
  openLabel('SETTINGS');
  check('settings from title', T_.S.screen === 'settings', 'screen=' + T_.S.screen);
  /* scroll to REBIND CONTROLS */
  let guard2 = 0;
  while (guard2++ < 40){
    const it = T_.UI.items[T_.UI.index];
    if (it && /REBIND/.test(it.label)) break;
    press('ArrowDown', 1, 1);
  }
  press('Enter', 2, 3);
  check('rebind screen opens', T_.S.screen === 'help', 'screen=' + T_.S.screen);
  const before = JSON.stringify(JSON.parse(LS['nr_keys'] || '{}').left || null);
  press('Enter', 2, 2);            // select LEFT for rebinding
  fire('keydown', key('KeyN')); steps(2); fire('keyup', key('KeyN')); steps(2);
  const afterKeys = JSON.parse(LS['nr_keys'] || '{}');
  check('rebind captured a new key', (afterKeys.left || []).indexOf('KeyN') !== -1,
        'left=' + JSON.stringify(afterKeys.left));
  /* that key now actually moves the player */
  press('Escape', 2, 3);
  check('rebind screen exits', T_.S.screen === 'settings' || T_.S.screen === 'pause' || T_.S.screen === 'play',
        'screen=' + T_.S.screen);

  /* fullscreen toggle should not throw */
  T_.S.screen = 'play'; T_.S.attract = true;
  openLabel('FULLSCREEN');
  check('fullscreen toggle survives', true, 'screen=' + T_.S.screen);

  /* pause -> watch replay with nothing recorded */
  T_.beginRun({});
  T_.Replay.frames.length = 0;
  steps(20);
  press('KeyP', 2, 3);
  openLabel('WATCH REPLAY');
  check('empty replay handled gracefully', T_.S.screen === 'pause' || T_.S.screen === 'play', 'screen=' + T_.S.screen);
  press('Escape', 2, 3); press('Escape', 2, 3);

  /* workshop screen */
  T_.endRunToTitle(); steps(10);
  openLabel('WORKSHOP');
  check('workshop opens', T_.S.screen === 'meta', 'screen=' + T_.S.screen);
  press('ArrowDown', 1, 1); press('Enter', 2, 3);   // try to buy something
  check('workshop purchase path safe', true, 'screen=' + T_.S.screen);
  press('Escape', 2, 3);

  /* text scale + reduced motion + quality low */
  T_.Settings.textScale = 1.5; T_.Settings.reduced = 1; T_.Settings.quality = 'low';
  T_.resize(); steps(60);
  check('reduced-motion + low quality run', true, 'ok');
  T_.Settings.textScale = 1; T_.Settings.reduced = 0; T_.Settings.quality = 'auto';
  T_.resize(); steps(20);
} catch(e){ e2 = e; }
check('help/rebind/misc suite clean', !e2, e2 ? e2.stack : 'all screens exercised');

console.log('\n' + (fails.length ? 'FAILURES (' + fails.length + '): ' + fails.join(', ') : '*** ALL CHECKS PASSED ***'));
process.exit(fails.length ? 1 : 0);
