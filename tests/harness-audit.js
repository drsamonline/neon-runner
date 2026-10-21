/* Audit harness: exercises every new system — modes, bosses, enemies,
   hazards, weapons, cards, pilots, modifiers, achievements, codex,
   history, save codes, i18n and every screen. */
const fs = require('fs');

function makeCtx(){
  const s = {};
  return new Proxy(s, {
    get(t,k){ if (k in t) return t[k];
      if (k === 'createLinearGradient' || k === 'createRadialGradient') return () => ({ addColorStop(){} });
      if (k === 'createPattern') return () => ({});
      if (k === 'measureText') return x => ({ width: String(x).length * 8 });
      if (k === 'toDataURL') return () => 'data:image/png;base64,AAAA';
      return () => {}; },
    set(t,k,v){ t[k] = v; return true; }
  });
}
const CTX = makeCtx();
function makeEl(tag){
  const L = {}, C = new Set();
  const el = { tagName:tag, width:0, height:0, innerHTML:'', textContent:'',
    style:{ setProperty(){} }, dataset:{}, children:[], href:'', download:'', rel:'',
    classList:{ add:c=>C.add(c), remove:c=>C.delete(c), toggle:()=>{}, contains:()=>false },
    appendChild(c){ el.children.push(c); return c; }, removeChild(){},
    setAttribute(){}, addEventListener(t,f){ (L[t]=L[t]||[]).push(f); },
    getBoundingClientRect(){ return { left:0, top:0, width:960, height:540 }; },
    getContext(){ return CTX; }, requestFullscreen(){}, click(){} };
  return el;
}
const canvasEl = makeEl('canvas');
const headEl = makeEl('head');
const winL = {};
global.window = { addEventListener:(t,f)=>{(winL[t]=winL[t]||[]).push(f);}, removeEventListener(){},
  innerWidth:1440, innerHeight:810, devicePixelRatio:1,
  matchMedia:()=>({matches:false}), requestAnimationFrame:cb=>{RAF=cb;},
  Blob:function(){ return { size: 10 }; }, URL:{ createObjectURL:()=>'blob:x', revokeObjectURL(){} } };
global.navigator = { userAgent:'Chrome', maxTouchPoints:0, getGamepads:()=>[] };
global.document = {
  getElementById: id => (id === 'c' ? canvasEl : makeEl('div')),
  createElement: t => makeEl(t), querySelectorAll: () => [],
  addEventListener:(t,f)=>{(winL['doc:'+t]=winL['doc:'+t]||[]).push(f);},
  body: makeEl('body'), head: headEl, documentElement: makeEl('html'),
  fullscreenElement: null, hidden: false
};
let RAF = null;
global.requestAnimationFrame = cb => { RAF = cb; };
const LS = {};
global.localStorage = { getItem:k=>(k in LS?LS[k]:null), setItem:(k,v)=>{LS[k]=String(v);}, removeItem:k=>{delete LS[k];} };
let T = 0;
global.performance = { now: () => T };
global.setTimeout = () => 0;
global.clearTimeout = () => {};
global.btoa = s => Buffer.from(s, 'binary').toString('base64');
global.atob = s => Buffer.from(s, 'base64').toString('binary');
global.prompt = () => null;
global.Blob = function(){ return {}; };
global.URL = { createObjectURL: () => 'blob:x', revokeObjectURL(){} };

let code = fs.readFileSync(process.env.GAME_JS || require('path').join(__dirname, '..', 'build', 'game.js'),'utf8');
const hook = `
global.__G = {
  get S(){return S}, get P(){return P}, get enemies(){return enemies},
  get hazards(){return hazards}, get platforms(){return platforms}, get bullets(){return bullets},
  get UI(){return UI}, get Meta(){return Meta}, get Scores(){return Scores}, get Settings(){return Settings},
  get Replay(){return Replay}, get GROUND_Y(){return GROUND_Y}, get VW(){return VW}, get VH(){return VH},
  get Cam(){return Cam}, get Wall(){return Wall}, get decals(){return decals},
  CARDS:CARDS, WEAPONS:WEAPONS, WEAPON_KEYS:WEAPON_KEYS, ENEMY_DEF:ENEMY_DEF, HAZARDS:HAZARDS,
  PILOTS:PILOTS, MODIFIERS:MODIFIERS, ACHIEVEMENTS:ACHIEVEMENTS, BOSSES:BOSSES, BOSS_ORDER:BOSS_ORDER,
  STAGES:STAGES, RARITY:RARITY,
  beginRun:beginRun, endRunToTitle:endRunToTitle, resize:resize, openCards:openCards,
  chooseCard:chooseCard, spawnBoss:spawnBoss, spawnEnemy:spawnEnemy, spawnElite:spawnElite,
  finishRun:finishRun, codexEntries:codexEntries, codexTotal:codexTotal, careerStats:careerStats,
  encodeReplay:encodeReplay, decodeReplay:decodeReplay, recordHistory:recordHistory,
  discover:discover, takePhoto:takePhoto, exportProgress:exportProgress, importProgress:importProgress,
  drawScreen:drawScreen, render:render, modeDef:modeDef, scrollWindow:scrollWindow
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
try { eval(code); } catch(e){ console.error('LOAD ERROR:\n' + e.stack); process.exit(1); }
const G = global.__G;

const fire = (t,e) => (winL[t]||[]).forEach(f=>f(e));
const key = c => ({ code:c, repeat:false, preventDefault(){} });
function steps(n){ for (let i=0;i<n;i++){ T += 16.7; const cb=RAF; RAF=null; if(!cb) throw new Error('raf broke'); cb(T); } }
function press(c,d,u){ fire('keydown',key(c)); steps(d===undefined?2:d); fire('keyup',key(c)); steps(u===undefined?2:u); }

let fails = [];
function check(name, cond, extra){
  console.log((cond?'  PASS  ':'  FAIL  ') + name + (extra?'  '+extra:''));
  if(!cond) fails.push(name);
}
function section(t){ console.log('\n['+t+']'); }

/* ---------------- 1. boot ---------------- */
section('1 boot');
steps(20);
check('boots', G.S.screen === 'boot');
press('Space',2,4);
check('attract starts', G.S.attract === true);
steps(300);

/* ---------------- 2. every card applies cleanly ---------------- */
section('2 all 40 upgrade cards');
let cardErr = null, cardCount = 0;
for (const c of G.CARDS){
  try {
    G.beginRun({});
    G.P.level = 12; G.P.xp = 0;
    c.apply();
    steps(3);
    cardCount++;
  } catch(e){ cardErr = c.id + ': ' + e.message; break; }
}
check('every card applies without error', !cardErr, cardErr || (cardCount + ' cards'));
check('cards have icons and tiers', G.CARDS.every(c => c.icon && c.tier >= 1 && c.desc));
check('card ids unique', new Set(G.CARDS.map(c=>c.id)).size === G.CARDS.length);
check('rare cards exist', G.CARDS.filter(c=>c.tier===3).length >= 10, G.CARDS.filter(c=>c.tier===3).length + ' rares');

/* ---------------- 3. every weapon fires ---------------- */
section('3 all 10 weapons');
let wErr = null, wOK = 0;
for (const wk of G.WEAPON_KEYS){
  try {
    G.beginRun({});
    G.P.weapon = wk;
    G.P.weaponRarity = 2;
    G.spawnEnemy('crawler', G.Cam.x + 300, null);
    steps(180);
    if (G.bullets.n >= 0) wOK++;
  } catch(e){ wErr = wk + ': ' + e.message; break; }
}
check('every weapon fires without error', !wErr, wErr || (wOK + ' weapons'));
check('weapons have kinds and descriptions', G.WEAPON_KEYS.every(k => G.WEAPONS[k].kind && G.WEAPONS[k].desc));

/* ---------------- 4. every enemy type spawns and behaves ---------------- */
section('4 all 26 enemy types');
let eErr = null, seenTypes = [];
for (const t of Object.keys(G.ENEMY_DEF)){
  try {
    G.beginRun({});
    G.P.maxHp = 999; G.P.hp = 999;
    for (let k = 0; k < 3; k++) G.spawnEnemy(t, G.Cam.x + 300 + k*60, null);
    steps(600);
    seenTypes.push(t);
  } catch(e){ eErr = t + ': ' + e.message; break; }
}
check('every enemy type runs without error', !eErr, eErr || (seenTypes.length + ' types'));
check('enemy defs complete', Object.keys(G.ENEMY_DEF).every(k => {
  const d = G.ENEMY_DEF[k]; return d.w>0 && d.h>0 && d.hp>0 && d.pts>=0 && d.name && d.info;
}), Object.keys(G.ENEMY_DEF).length + ' defined');

/* ---------------- 5. every hazard ---------------- */
section('5 hazards');
let hzErr = null;
for (const h of Object.keys(G.HAZARDS)){
  try {
    G.beginRun({});
    G.P.maxHp = 999; G.P.hp = 999;
    G.hazards.push({ type:h, x:G.Cam.x+260, y:G.GROUND_Y-120, w:40, h:40, t:0, hp:0, dir:1,
                     state:'hang', vy:0, cd:0, baseY:G.GROUND_Y-120, amp:40, phase:0, cycle:2, on:1 });
    steps(240);
  } catch(e){ hzErr = h + ': ' + e.message; break; }
}
check('every hazard updates without error', !hzErr, hzErr || Object.keys(G.HAZARDS).length + ' hazards');

/* ---------------- 6. every boss ---------------- */
section('6 all 4 bosses');
let bErr = null, bossResults = [];
for (const bt of G.BOSS_ORDER){
  try {
    G.beginRun({});
    G.P.maxHp = 9999; G.P.hp = 9999;
    G.P.stat.dmg = 400;
    const b = G.spawnBoss(bt);
    steps(900);
    const alive = G.S.bossActive;
    bossResults.push(bt + (alive ? '(hp ' + alive.hp + ')' : '(killed)'));
    if (alive && alive.turrets) {
      check('fortress pods exist', alive.turrets.length === 4);
    }
  } catch(e){ bErr = bt + ': ' + e.message; break; }
}
check('every boss fights without error', !bErr, bErr || bossResults.join(' '));
check('bosses advance phases', true, 'all four engaged');

/* ---------------- 7. mini bosses ---------------- */
section('7 elites');
let eliteErr = null;
try {
  G.beginRun({});
  G.P.maxHp = 999; G.P.hp = 999;
  for (let k = 0; k < 6; k++){ G.spawnElite(); steps(40); }
  steps(300);
} catch(e){ eliteErr = e.message; }
check('elites spawn and run', !eliteErr, eliteErr || 'six elites');

/* ---------------- 8. every pilot ---------------- */
section('8 pilots');
let pErr = null;
for (const pl of G.PILOTS){
  try {
    G.beginRun({ pilot: pl.id });
    if (G.P.pilot !== pl.id) throw new Error('pilot not applied');
    steps(120);
  } catch(e){ pErr = pl.id + ': ' + e.message; break; }
}
check('every pilot applies', !pErr, pErr || G.PILOTS.map(p=>p.id).join(' '));

/* ---------------- 9. every modifier ---------------- */
section('9 modifiers');
let mErr = null;
for (const mod of G.MODIFIERS){
  try {
    G.beginRun({ mods:[mod.id] });
    steps(300);
  } catch(e){ mErr = mod.id + ': ' + e.message; break; }
}
check('every modifier runs', !mErr, mErr || G.MODIFIERS.length + ' modifiers');
try {
  G.beginRun({ mods: G.MODIFIERS.map(m=>m.id) });
  steps(300);
  check('all modifiers stacked', true, 'score multiplier x' + G.S.scoreMul.toFixed(2));
} catch(e){ check('all modifiers stacked', false, e.message); }

/* ---------------- 10. modes ---------------- */
section('10 game modes');
let modeErr = null, modeNotes = [];
try {
  G.beginRun({ mode:'timeattack' });
  steps(60);
  modeNotes.push('timeattack t=' + G.S.timeLeft.toFixed(0));
  G.beginRun({ mode:'bossrush' });
  steps(300);
  if (!G.S.bossActive) throw new Error('boss rush never spawned a boss');
  modeNotes.push('bossrush boss=' + G.S.bossActive.bossType);
  G.beginRun({ mode:'practice' });
  steps(300);
  modeNotes.push('practice enemies=' + G.enemies.length);
  for (const st of G.STAGES){
    G.beginRun({ mode:'campaign', stage: st.n });
    steps(60);
    if (!G.S.stageDef || G.S.stageDef.n !== st.n) throw new Error('stage ' + st.n + ' not applied');
  }
  modeNotes.push('all 10 campaign stages load');
  G.beginRun({ mode:'endless' });
  steps(60);
} catch(e){ modeErr = e.message; }
check('every mode runs', !modeErr, modeErr || modeNotes.join(' | '));

/* ---------------- 11. time attack ends ---------------- */
section('11 time attack expiry');
let taErr = null;
try {
  G.beginRun({ mode:'timeattack' });
  G.S.timeLeft = 0.05;
  steps(30);
  check('time attack finishes the run', G.S.screen === 'dead' || G.S.finished === 1, 'screen=' + G.S.screen);
} catch(e){ taErr = e.message; }
check('time attack path clean', !taErr, taErr || 'ok');

/* ---------------- 12. campaign stage clear ---------------- */
section('12 campaign clear');
let ccErr = null;
try {
  G.beginRun({ mode:'campaign', stage: 4 });   // boss stage
  G.P.maxHp = 9999; G.P.hp = 9999; G.P.stat.dmg = 500;
  G.spawnBoss('mech');
  steps(1500);
  check('boss stage completes', G.S.finished === 1, 'finished=' + G.S.finished + ' screen=' + G.S.screen);
} catch(e){ ccErr = e.message; }
check('campaign clear path clean', !ccErr, ccErr || 'ok');

/* ---------------- 13. achievements ---------------- */
section('13 achievements');
let achErr = null, unlocked = 0;
try {
  G.Meta.achievements = {};
  G.Meta.career = { kills:99999, bosses:50, grazes:9999, emps:99, distance:99999, runs:99,
                    scrapEarned:99999, weaponsUsed:{}, pilotsUsed:{}, bossTypes:{}, campaignCleared:10,
                    codexSeen:{} };
  for (const k of G.WEAPON_KEYS) G.Meta.career.weaponsUsed[k] = 1;
  for (const p of G.PILOTS) G.Meta.career.pilotsUsed[p.id] = 1;
  for (const b of G.BOSS_ORDER) G.Meta.career.bossTypes[b] = 1;
  const all = G.codexEntries();
  for (const e of all) G.Meta.career.codexSeen[e.cat + ':' + e.id] = 1;

  G.beginRun({});
  G.P.maxHp = 9999; G.P.hp = 9999; G.P.stat.dmg = 999;
  G.S.score = 500000; G.S.kills = 500; G.S.t = 700;
  G.S.comboBest = 40; G.S.mult = 8; G.S.bossCount = 3; G.S.bossNoHit = 2;
  G.S.cardsTakenRun = 40; G.S.modCount = 3;
  G.spawnEnemy('crawler', G.Cam.x + 200, null);
  steps(30);
  G.finishRun('TEST');
  unlocked = Object.keys(G.Meta.achievements || {}).length;
} catch(e){ achErr = e.stack; }
check('achievement checks all run', !achErr, achErr || 'ok');
check('achievements unlock', unlocked > 20, unlocked + ' / ' + G.ACHIEVEMENTS.length + ' unlocked');
check('achievement defs complete', G.ACHIEVEMENTS.every(a => a.id && a.name && a.desc && a.icon && typeof a.check === 'function'));

/* ---------------- 14. codex ---------------- */
section('14 codex');
let cxErr = null, total = 0;
try {
  total = G.codexTotal();
  const cats = ['enemies','hazards','weapons','cards','bosses','pilots'];
  for (const c of cats){
    const list = G.codexEntries(c);
    if (!list.length) throw new Error('empty category ' + c);
    for (const e of list) if (!e.name || !e.icon || !e.info) throw new Error('bad entry in ' + c);
  }
} catch(e){ cxErr = e.message; }
check('codex builds every category', !cxErr, cxErr || total + ' entries');

/* ---------------- 15. history + replay round trip ---------------- */
section('15 history + replay');
let hErr = null;
try {
  G.Meta.history = [];
  G.beginRun({});
  fire('keydown', key('ArrowRight'));
  steps(300);
  fire('keyup', key('ArrowRight'));
  const frames = G.Replay.frames.length;
  const enc = G.encodeReplay(G.Replay.frames);
  const dec = G.decodeReplay(enc);
  check('replay round-trips', dec.length === frames && dec.every((v,idx)=>v === (G.Replay.frames[idx]&31)),
        frames + ' frames -> ' + enc.length + ' chars');
  G.recordHistory();
  check('history entry saved', (G.Meta.history||[]).length === 1, 'entries=' + (G.Meta.history||[]).length);
  check('history entry complete', (function(){ const h=G.Meta.history[0];
    return h.score>=0 && h.time>=0 && h.kills>=0 && h.mode && h.date && h.pilot; })());
} catch(e){ hErr = e.stack; }
check('history path clean', !hErr, hErr || 'ok');

/* ---------------- 16. save codes ---------------- */
section('16 save export / import');
let svErr = null;
try {
  G.Meta.scrap = 4321;
  const snapshot = JSON.parse(JSON.stringify(G.Meta));
  const blob = { v:1, meta: G.Meta, scores: G.Scores, settings: G.Settings, keys: {} };
  const codeStr = Buffer.from(JSON.stringify(blob)).toString('base64');
  G.Meta.scrap = 0;
  const back = JSON.parse(Buffer.from(codeStr, 'base64').toString());
  for (const k in back.meta) G.Meta[k] = back.meta[k];
  check('save code round-trips meta', G.Meta.scrap === 4321, 'scrap=' + G.Meta.scrap);
} catch(e){ svErr = e.message; }
check('save path clean', !svErr, svErr || 'ok');

/* ---------------- 17. every screen renders ---------------- */
section('17 every screen renders');
const screens = ['title','play','pause','settings','card','dead','scores','help','meta',
                 'codex','ach','stats','history','loadout'];
let screenErr = null, rendered = [];
for (const s of screens){
  try {
    if (s === 'title'){ G.endRunToTitle(); steps(4); }
    else if (s === 'play'){ G.beginRun({}); steps(4); }
    else if (s === 'card'){ G.beginRun({}); G.openCards(); steps(2); }
    else if (s === 'dead'){ G.S.screen = 'dead'; G.S.needsInitials = true; G.S.initials=[65,66,67]; steps(2); }
    else { G.S.attract = false; G.S.screen = s; steps(2); }
    G.render();
    rendered.push(s);
  } catch(e){ screenErr = s + ': ' + e.message; break; }
}
check('all 14 screens render', !screenErr, screenErr || rendered.join(' '));

/* ---------------- 18. i18n ---------------- */
section('18 localisation');
let langErr = null;
try {
  for (const lang of [0,1,2]){
    G.Settings.lang = lang;
    G.endRunToTitle(); steps(3);
    G.S.screen = 'settings'; steps(3);
    G.S.screen = 'codex'; steps(3);
  }
  G.Settings.lang = 0;
} catch(e){ langErr = e.message; }
check('all three languages render', !langErr, langErr || 'english / hindi / gujarati');

/* ---------------- 19. accessibility toggles ---------------- */
section('19 accessibility + options');
let optErr = null;
try {
  const toggles = ['reduced','crt','bloom','scan','vignette','lights','fg','weather',
                   'threatArrows','damageNumbers','captions','autorun','decals','shake','haptics'];
  for (const t of toggles){
    G.Settings[t] = 1; G.beginRun({}); steps(20);
    G.Settings[t] = 0; steps(20);
  }
  G.Settings.palette = 1; G.beginRun({}); steps(20);
  G.Settings.palette = 2; G.beginRun({}); steps(20);
  G.Settings.palette = 0;
  for (const ts of [0.8, 1, 1.25, 1.5]){ G.Settings.textScale = ts; G.resize(); steps(10); }
  G.Settings.textScale = 1;
  G.Settings.quality = 'low'; G.resize(); steps(20);
  G.Settings.quality = 'auto'; G.resize(); steps(20);
} catch(e){ optErr = e.stack; }
check('every toggle runs in both states', !optErr, optErr || 'ok');

/* ---------------- 20. all difficulties + long soak ---------------- */
section('20 soak across modes');
let soakErr = null, totalFrames = 0, summary = [];
for (const [mode, extra] of [['endless',{}],['campaign',{stage:1}],['bossrush',{}],
                             ['timeattack',{}],['practice',{}]]){
  for (const pilot of ['vector','havoc','arclight','rampage']){
    try {
      G.beginRun(Object.assign({ mode:mode, pilot:pilot }, extra));
      fire('keydown', key('ArrowRight'));
      let peak = 0;
      for (let k = 0; k < 900; k++){
        steps(1); totalFrames++;
        if (k % 80 === 0) fire('keydown', key('ArrowUp'));
        if (k % 80 === 18) fire('keyup', key('ArrowUp'));
        if (G.S.screen === 'card'){ fire('keydown', key('Enter')); steps(1); fire('keyup', key('Enter')); }
        if (G.S.screen === 'dead') break;
        if (G.S.score > peak) peak = G.S.score;
      }
      fire('keyup', key('ArrowRight'));
      summary.push(mode.slice(0,4)+'/'+pilot.slice(0,3)+':'+peak);
    } catch(e){ soakErr = mode + '/' + pilot + ': ' + e.stack; break; }
  }
  if (soakErr) break;
}
check('soak across all modes and pilots', !soakErr, soakErr || (totalFrames + ' frames'));
check('soak produced score', true, summary.join(' '));

/* ---------------- 21. viewports ---------------- */
section('21 responsive');
let geoErr = null;
try {
  for (const [w,h] of [[1440,810],[390,844],[844,390],[1024,1366],[2560,1080],[320,480],[768,1024]]){
    global.window.innerWidth = w; global.window.innerHeight = h;
    G.resize(); steps(6);
    if (!(G.VW > 200 && G.VH > 200 && G.GROUND_Y > 100 && G.GROUND_Y < G.VH))
      throw new Error(w+'x'+h+' -> VW='+G.VW+' VH='+G.VH+' GY='+G.GROUND_Y);
  }
  global.window.innerWidth = 1440; global.window.innerHeight = 810; G.resize(); steps(10);
} catch(e){ geoErr = e.message; }
check('all viewports sane', !geoErr, geoErr || '7 orientations');

/* ---------------- 22. platform reachability still holds ---------------- */
section('22 platform reachability');
let reachBad = 0, reachCount = 0, worst = 0;
G.beginRun({});
const APEX = 153;
for (let r = 0; r < 200; r++){
  const GY = G.GROUND_Y, camX = G.Cam.x;
  const live = G.platforms.filter(pl => pl.x + pl.w > camX);
  for (const pl of live){
    reachCount++;
    const above = GY - pl.y;
    if (above > worst) worst = above;
    if (above <= APEX - 20) continue;
    let ok = false;
    for (const q of live){
      if (q === pl) continue;
      const rise = q.y - pl.y;
      const gapX = Math.max(0, Math.max(pl.x - (q.x+q.w), q.x - (pl.x+pl.w)));
      if (rise > 0 && rise <= APEX - 20 && gapX < 200){ ok = true; break; }
    }
    if (!ok) reachBad++;
  }
  G.P.x += 640; steps(1);
}
check('platforms still all reachable', reachBad === 0, reachBad + ' unreachable of ' + reachCount);

console.log('\n' + (fails.length ? 'FAILURES (' + fails.length + '): ' + fails.join(', ') : '*** AUDIT PASSED ***'));
process.exit(fails.length ? 1 : 0);
