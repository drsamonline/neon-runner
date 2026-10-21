/* =====================================================================
   NEON RUNNER  —  section 1: CORE
   Constants, seeded RNG, storage, settings, meta progression, pools.
   Offline only: every system here is local (localStorage / in-memory).
   ===================================================================== */

/* ---------- logical viewport (recomputed on every resize) ---------- */
var VW = 960, VH = 540, DPR = 1, GROUND_Y = 456, SKY_H = 456;

/* ---------- physics ---------- */
var GRAV = 2150;
var MOVE = 300;
var JUMP_V = -812;          /* apex = 812^2 / (2*2150) = 153px */
var P_W = 26, P_H = 42, P_DUCK_H = 24;
/* how high a full-hold jump actually lifts you — platform generation is
   bounded by this so every ledge stays reachable */
var JUMP_APEX = (JUMP_V * JUMP_V) / (2 * GRAV);

/* ---------- misc tuning ---------- */
var RANGE_BASE = 460;
var COMBO_WINDOW = 2.5;
var GRAZE_R = 30;
var OVERHEAT_MAX = 1.0;
var OVERHEAT_PER_SHOT = 0.052;   /* ~19 shots -> overheat */
var OVERHEAT_COOL = 0.55;        /* per second while not firing */
var BOSS_EVERY = 80;             /* seconds */

/* ---------- screens ---------- */
var SC = {
  BOOT: 'boot', TITLE: 'title', PLAY: 'play', PAUSE: 'pause',
  SETTINGS: 'settings', CARD: 'card', DEAD: 'dead', SCORES: 'scores',
  HELP: 'help', RUNOVER: 'runover', META: 'meta',
  CODEX: 'codex', ACH: 'ach', STATS: 'stats', HISTORY: 'history', LOADOUT: 'loadout'
};

var S = {                    /* global game state */
  screen: SC.BOOT,
  prevScreen: SC.TITLE,
  t: 0, frames: 0,
  score: 0, best: 0,
  shake: 0, flash: 0, hitStop: 0,
  difficulty: 0,
  spawnT: 1, bossT: BOSS_EVERY, bossActive: null,
  kills: 0, distance: 0, grazeCount: 0,
  combo: 0, comboT: 0, comboBest: 0, mult: 1,
  bomb: 0, bombsUsed: 0,
  biome: 0, biomeIdx: 0,
  slowmo: 0,
  seed: 1,
  attractDeathT: 0,
  stats: null,
  seen: {},                  /* tutorial flags */
  toast: null,               /* {text, t, life} */
  paused: false,
  quality: 'high'
};

/* ---------- seeded RNG (mulberry32) ---------- */
var _rngState = 1;
function srand(s){ _rngState = (s >>> 0) || 1; }
function rng(){
  _rngState = (_rngState + 0x6D2B79F5) | 0;
  var t = Math.imul(_rngState ^ (_rngState >>> 15), 1 | _rngState);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
function rr(a, b){ return a + rng() * (b - a); }
function ri(a, b){ return Math.floor(a + rng() * (b - a + 1)); }
function pickOne(a){ return a[Math.floor(rng() * a.length)]; }
function chance(p){ return rng() < p; }
function rsign(){ return rng() < 0.5 ? -1 : 1; }

/* ---------- pure helpers ---------- */
function clamp(v, a, b){ return v < a ? a : (v > b ? b : v); }
function lerp(a, b, t){ return a + (b - a) * t; }
function rectHit(ax, ay, aw, ah, bx, by, bw, bh){
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}
function hash1(n){ var s = Math.sin(n * 127.1) * 43758.5453; return s - Math.floor(s); }
function sign(v){ return v < 0 ? -1 : (v > 0 ? 1 : 0); }
function fmt(n){
  var s = String(Math.floor(n));
  while (s.length < 6) s = '0' + s;
  return s;
}
function seedFromString(str){
  var h = 2166136261;
  for (var i = 0; i < str.length; i++){
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
function todaySeed(){
  var d = new Date();
  return seedFromString('NEON-' + d.getFullYear() + '-' + (d.getMonth()+1) + '-' + d.getDate());
}
function weekSeed(){
  var d = new Date();
  var onejan = new Date(d.getFullYear(), 0, 1);
  var wk = Math.ceil((((d - onejan) / 86400000) + onejan.getDay() + 1) / 7);
  return seedFromString('NEON-WEEK-' + d.getFullYear() + '-' + wk);
}
function dateStamp(){
  var d = new Date();
  return d.getDate() + '/' + (d.getMonth()+1) + '/' + String(d.getFullYear()).slice(2);
}

/* ---------- safe storage ---------- */
var Store = {
  get: function(k, d){
    try { var v = localStorage.getItem('nr_' + k); return v === null ? d : JSON.parse(v); }
    catch(e){ return d; }
  },
  set: function(k, v){
    try { localStorage.setItem('nr_' + k, JSON.stringify(v)); } catch(e){}
  }
};

/* ---------- difficulty ---------- */
var DIFFS = [
  { name:'ASSIST',    hp:5, dmg:0.65, spd:0.75, wall:0, spawn:1.30, mul:0.60, range:1.15, fire:0.85 },
  { name:'NORMAL',    hp:3, dmg:1.00, spd:1.00, wall:1, spawn:1.00, mul:1.00, range:1.00, fire:1.00 },
  { name:'HARD',      hp:3, dmg:1.30, spd:1.18, wall:1, spawn:0.80, mul:1.40, range:0.95, fire:1.08 },
  { name:'NIGHTMARE', hp:2, dmg:1.60, spd:1.38, wall:1, spawn:0.62, mul:2.00, range:0.90, fire:1.15 }
];

/* ---------- settings ---------- */
var Settings = {
  music: 0.45, sfx: 0.75, shake: 1, crt: 1, bloom: 0, scan: 1, vignette: 1,
  reduced: 0, palette: 0, textScale: 1, difficulty: 1, touch: 'auto', lefty: 0,
  haptics: 1, lights: 1, fg: 1, toasts: 1, quality: 'auto', showFPS: 0,
  weather: 1, threatArrows: 1, damageNumbers: 1, captions: 0, autorun: 0,
  touchSize: 1, touchOpacity: 1, lang: 0, decals: 1
};
(function loadSettings(){
  var saved = Store.get('settings', null);
  if (saved && typeof saved === 'object'){
    for (var k in Settings){ if (Object.prototype.hasOwnProperty.call(saved, k)) Settings[k] = saved[k]; }
  }
})();
function saveSettings(){ Store.set('settings', Settings); }

/* ---------- meta progression (local only) ---------- */
var Meta = { scrap: 0, upHP: 0, upDmg: 0, upRate: 0, upLuck: 0, runs: 0, bestScore: 0, bestTime: 0 };
(function loadMeta(){
  var saved = Store.get('meta', null);
  if (saved && typeof saved === 'object'){
    for (var k in Meta){ if (Object.prototype.hasOwnProperty.call(saved, k)) Meta[k] = saved[k]; }
  }
})();
function saveMeta(){ Store.set('meta', Meta); }

/* ---------- high scores (local only) ---------- */
var Scores = Store.get('scores', null);
if (!Array.isArray(Scores)) Scores = [];
function scoreQualifies(score){
  if (score <= 0) return false;
  if (Scores.length < 10) return true;
  return score > Scores[Scores.length - 1].score;
}
function addScore(name, score, mode, time, kills){
  Scores.push({ name: name, score: Math.floor(score), mode: mode, time: Math.round(time), kills: kills, date: dateStamp() });
  Scores.sort(function(a, b){ return b.score - a.score; });
  if (Scores.length > 10) Scores.length = 10;
  Store.set('scores', Scores);
}

/* ---------- palettes (default / colourblind-safe / high contrast) ---------- */
var PALETTES = [
  { name:'NEON',        bg:'#0b1030', player:'#2ea8e0', playerHi:'#7fe0ff', playerSkin:'#e8f6ff',
    e1:'#e0453f', e2:'#ff8a2b', e3:'#9b5cff', e4:'#ff2d9e', bullet:'#eaffff', eBullet:'#ffd6f2',
    accent:'#49e6c0', danger:'#ff4d7a', good:'#7dffb0', gold:'#ffd257' },
  { name:'DEUTERANOPIA',bg:'#0a1030', player:'#4aa8ff', playerHi:'#a8dcff', playerSkin:'#ffffff',
    e1:'#ff9d00', e2:'#ffd000', e3:'#b06bff', e4:'#ff5fa8', bullet:'#ffffff', eBullet:'#ffd0a0',
    accent:'#5ad4ff', danger:'#ff8c00', good:'#5ad4ff', gold:'#ffe066' },
  { name:'HIGH CONTRAST',bg:'#000000', player:'#ffffff', playerHi:'#00ffff', playerSkin:'#ffffff',
    e1:'#ff0000', e2:'#ff8800', e3:'#ff00ff', e4:'#ffff00', bullet:'#ffffff', eBullet:'#ff0000',
    accent:'#00ff00', danger:'#ff0000', good:'#00ff00', gold:'#ffff00' }
];
function PAL(){ return PALETTES[clamp(Settings.palette|0, 0, PALETTES.length - 1)]; }

/* ---------- biome definitions ---------- */
var BIOMES = [
  { name:'NEON CITY',  sky:['#080c22','#161a46','#3b2a63'], m1:'#141a3e', m2:'#1d2557', hill:'#272f6b',
    ground:'#0d1526', edge:'#49e6c0', star:'#bee1ff', accent:'#49e6c0',
    hazardW: { mine:1, spike:1, saw:0.5, gate:1, stalactite:0.8, crusher:0.5, conveyor:0.7, launchpad:0.6, ice:0.4, lowgrav:0.3, acid:0.4}, enemyW: { crawler:3, armored:1, spiked:1, splitter:1, exploder:1, jumper:1, flyer:2, bomber:1, hover:1, turret:2, sweeper:0.6, mortar:1, shielded:0.7, popturret:1, swarm:1, carrier:0.4, burrower:1.0, roller:1.0, sniper:1.0, phalanx:0.5, hive:0.4, mimic:0.8, healer:0.6, shielddrone:0.6, tether:0.8, queen:0.25} },
  { name:'RUST DESERT', sky:['#1a0d0a','#3a1a12','#6b3418'], m1:'#3a1c12', m2:'#55281a', hill:'#7a3a1e',
    ground:'#241209', edge:'#ffb14d', star:'#ffd7a0', accent:'#ffb14d',
    hazardW: { mine:1.6, spike:1.8, saw:1, gate:0.6, stalactite:0.6, crusher:0.9, conveyor:1.0, launchpad:0.5, ice:0.2, lowgrav:0.3, acid:0.6}, enemyW: { crawler:3, armored:1.4, spiked:1.6, splitter:1, exploder:1.6, jumper:1.4, flyer:2, bomber:1.6, hover:0.8, turret:1.6, sweeper:0.6, mortar:1.4, shielded:0.8, popturret:0.8, swarm:1, carrier:0.4, burrower:1.6, roller:1.4, sniper:0.8, phalanx:0.8, hive:0.6, mimic:1.0, healer:0.4, shielddrone:0.5, tether:0.5, queen:0.3} },
  { name:'CRYO ICE',   sky:['#04101f','#0b2740','#1e4a6b'], m1:'#0d2236', m2:'#123249', hill:'#1a4863',
    ground:'#08161f', edge:'#8ff0ff', star:'#dff6ff', accent:'#8ff0ff',
    hazardW: { mine:1, spike:1.2, saw:0.8, gate:1.4, stalactite:1.2, crusher:0.6, conveyor:0.5, launchpad:0.8, ice:1.6, lowgrav:0.7, acid:0.2}, enemyW: { crawler:2.4, armored:1.2, spiked:0.8, splitter:1.2, exploder:0.8, jumper:1.6, flyer:2.4, bomber:1, hover:1.4, turret:2, sweeper:1.4, mortar:0.8, shielded:1, popturret:1.2, swarm:1.2, carrier:0.5, burrower:0.6, roller:1.2, sniper:1.2, phalanx:0.6, hive:0.4, mimic:0.5, healer:0.8, shielddrone:0.9, tether:1.0, queen:0.3} },
  { name:'DEEP CAVERN',sky:['#0b0616','#1c0f2e','#2e1747'], m1:'#170d26', m2:'#22133a', hill:'#2f1b4d',
    ground:'#120a1c', edge:'#c47bff', star:'#d9c2ff', accent:'#c47bff',
    hazardW: { mine:1.4, spike:1.6, saw:1.2, gate:1, stalactite:1.4, crusher:1.2, conveyor:0.8, launchpad:0.5, ice:0.3, lowgrav:0.5, acid:1.0}, enemyW: { crawler:2.6, armored:1.6, spiked:1.4, splitter:1.4, exploder:1.4, jumper:1, flyer:1.4, bomber:1.4, hover:1.2, turret:1.8, sweeper:1.2, mortar:1.6, shielded:1.2, popturret:1.6, swarm:1.4, carrier:0.6, burrower:1.8, roller:0.6, sniper:1.0, phalanx:0.7, hive:1.0, mimic:1.2, healer:0.7, shielddrone:0.7, tether:0.8, queen:0.5} },
  { name:'ORBITAL RING',sky:['#02040c','#061024','#0a1c3a'], m1:'#071228','m2':'#0a1a35', hill:'#0f2748',
    ground:'#050d18', edge:'#5affd0', star:'#eaf6ff', accent:'#5affd0',
    hazardW: { mine:1.8, spike:0.5, saw:1.4, gate:1.6, stalactite:0.7, crusher:0.8, conveyor:0.6, launchpad:0.7, ice:0.4, lowgrav:1.4, acid:0.5}, enemyW: { crawler:1.6, armored:1, spiked:0.6, splitter:1, exploder:1, jumper:0.8, flyer:2.6, bomber:1.8, hover:2, turret:1.6, sweeper:1.8, mortar:1, shielded:1.4, popturret:1, swarm:2, carrier:0.8, burrower:0.5, roller:0.7, sniper:1.4, phalanx:0.9, hive:0.5, mimic:0.5, healer:1.0, shielddrone:1.2, tether:1.2, queen:0.6} }
];

/* ---------- object pools ---------- */
function Pool(factory, reset){
  this.items = [];
  this.factory = factory;
  this.reset = reset;
  this.n = 0;
}
Pool.prototype.spawn = function(){
  var o;
  if (this.n < this.items.length){ o = this.items[this.n]; }
  else { o = this.factory(); this.items.push(o); }
  this.n++;
  return o;
};
Pool.prototype.clear = function(){ this.n = 0; };
Pool.prototype.each = function(fn){
  for (var i = 0; i < this.n; i++) fn(this.items[i], i);
};
Pool.prototype.compact = function(alive){
  var w = 0;
  for (var i = 0; i < this.n; i++){
    var o = this.items[i];
    if (alive(o)){ if (w !== i){ var tmp = this.items[w]; this.items[w] = o; this.items[i] = tmp; } w++; }
  }
  this.n = w;
};
Pool.prototype.free = function(o){
  for (var i = 0; i < this.n; i++){
    if (this.items[i] === o){
      var t = this.items[i]; this.items[i] = this.items[this.n-1]; this.items[this.n-1] = t;
      this.n--; return;
    }
  }
};

var bullets  = new Pool(function(){ return { x:0,y:0,vx:0,vy:0,r:4,dmg:1,team:0,life:0,kind:'pulse',pierce:0,hits:null,homing:0,turn:0,bounce:0,color:'#fff',trail:0 }; });
var particles= new Pool(function(){ return { x:0,y:0,vx:0,vy:0,life:0,max:1,color:'#fff',size:3,grav:640,glow:0 }; });
var floaters = new Pool(function(){ return { x:0,y:0,life:0,text:'',color:'#fff',size:16 }; });
var enemies  = [];      /* small list, rebuilt each frame */
var pickups  = new Pool(function(){ return { x:0,y:0,w:18,h:16,vy:0,t:0,kind:'heart',life:0 }; });
var hazards  = [];
var shockwaves = [];
var platforms = [];
var shells   = [];      /* mortar shells */
