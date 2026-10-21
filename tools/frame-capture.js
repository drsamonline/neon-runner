/* Records the game's canvas draw calls for one frame and dumps them to JSON,
   so a screen can be rasterised and actually LOOKED at outside a browser. */
const fs = require('fs');

const REC = { on: false, ops: [], buffers: {}, nextId: 1 };
global.__REC = REC;

/* ---------- transform + style state ---------- */
function mul(m, n){ // m then n  (both [a,b,c,d,e,f])
  return [
    m[0]*n[0] + m[2]*n[1],
    m[1]*n[0] + m[3]*n[1],
    m[0]*n[2] + m[2]*n[3],
    m[1]*n[2] + m[3]*n[3],
    m[0]*n[4] + m[2]*n[5] + m[4],
    m[1]*n[4] + m[3]*n[5] + m[5]
  ];
}
function apply(m, x, y){ return [m[0]*x + m[2]*y + m[4], m[1]*x + m[3]*y + m[5]]; }

function parseColor(c){
  if (c && typeof c === 'object'){
    if (c._c && c._c.length){                             // gradient: use its mid stop
      return c._c[Math.floor(c._c.length / 2)][1];
    }
    return [128,128,128,1];
  }
  if (typeof c !== 'string') return [128,128,128,1];
  c = c.trim();
  if (c[0] === '#'){
    let h = c.slice(1);
    if (h.length === 3) h = h[0]+h[0]+h[1]+h[1]+h[2]+h[2];
    return [parseInt(h.slice(0,2),16), parseInt(h.slice(2,4),16), parseInt(h.slice(4,6),16), 1];
  }
  const m = c.match(/rgba?\(([^)]+)\)/);
  if (m){
    const p = m[1].split(',').map(s => parseFloat(s));
    return [p[0]|0, p[1]|0, p[2]|0, p.length > 3 ? p[3] : 1];
  }
  return [128,128,128,1];
}

function RecCtx(bufId){
  bufId = bufId || 0;
  const st = { m: [1,0,0,1,0,0], alpha: 1, fill: '#000', font: 'bold 16px monospace', align: 'left' };
  const stack = [];
  const path = [];
  let cur = null;

  function sink(){
    if (bufId === 0) return REC.on ? REC.ops : null;
    if (!REC.buffers[bufId]) REC.buffers[bufId] = [];
    return REC.buffers[bufId];
  }
  function pushPoly(pts, color, alpha, stroke, lw){
    if (pts.length < 3 && !stroke) return;
    var out = sink(); if (!out) return;
    out.push({ t:'poly', pts: pts, c: color, a: alpha, s: stroke?1:0, lw: lw||1 });
  }
  function tf(pts){ return pts.map(p => apply(st.m, p[0], p[1])); }

  const api = {
    setTransform(a,b,c,d,e,f){ st.m = [a,b,c,d,e,f]; },
    resetTransform(){ st.m = [1,0,0,1,0,0]; },
    translate(x,y){ st.m = mul(st.m, [1,0,0,1,x,y]); },
    scale(x,y){ st.m = mul(st.m, [x,0,0,y,0,0]); },
    rotate(a){ const c=Math.cos(a), s=Math.sin(a); st.m = mul(st.m, [c,s,-s,c,0,0]); },
    save(){ stack.push({ m: st.m.slice(), alpha: st.alpha, fill: st.fill, font: st.font, align: st.align }); },
    restore(){ const s = stack.pop(); if (s){ st.m = s.m; st.alpha = s.alpha; st.fill = s.fill; st.font = s.font; st.align = s.align; } },
    get globalAlpha(){ return st.alpha; },
    set globalAlpha(v){ st.alpha = v; },
    get fillStyle(){ return st.fill; },
    set fillStyle(v){ st.fill = v; },
    get strokeStyle(){ return st.fill; },
    set strokeStyle(v){ st.fill = v; },
    get font(){ return st.font; },
    set font(v){ st.font = v; },
    get textAlign(){ return st.align; },
    set textAlign(v){ st.align = v; },
    lineWidth: 1, globalCompositeOperation: 'source-over', imageSmoothingEnabled: false,
    filter: 'none', textBaseline: 'alphabetic', lineCap: 'butt', lineJoin: 'miter', shadowBlur: 0, shadowColor: '#000',

    clearRect(x,y,w,h){ pushPoly(tf([[x,y],[x+w,y],[x+w,y+h],[x,y+h]]), [0,0,0,1], 1, 0); },
    fillRect(x,y,w,h){ pushPoly(tf([[x,y],[x+w,y],[x+w,y+h],[x,y+h]]), parseColor(st.fill), st.alpha, 0); },
    strokeRect(x,y,w,h){ pushPoly(tf([[x,y],[x+w,y],[x+w,y+h],[x,y+h]]), parseColor(st.fill), st.alpha, 1, api.lineWidth); },
    fillText(s,x,y){
      var out0 = sink(); if (!out0) return;
      const p = apply(st.m, x, y);
      const fm = /(\d+(?:\.\d+)?)px/.exec(st.font);
      const size = fm ? parseFloat(fm[1]) : 16;
      const bold = /bold/.test(st.font);
      out0.push({ t:'text', s:String(s), x:p[0], y:p[1], size:size, bold:bold?1:0,
                  align: st.align, c: parseColor(st.fill), a: st.alpha });
    },
    strokeText(){}, measureText(s){ return { width: String(s).length * 8 }; },
    beginPath(){ path.length = 0; cur = null; },
    closePath(){ if (path.length > 2) path.push(path[0].slice()); },
    moveTo(x,y){ cur = [x,y]; path.push([x,y]); },
    lineTo(x,y){ cur = [x,y]; path.push([x,y]); },
    arc(x,y,r,a0,a1){
      const n = Math.max(8, Math.ceil(Math.abs(a1-a0) * 12));
      for (let i = 0; i <= n; i++){
        const a = a0 + (a1-a0) * i / n;
        path.push([x + Math.cos(a)*r, y + Math.sin(a)*r]);
      }
    },
    ellipse(x,y,rx,ry,rot,a0,a1){
      const n = Math.max(8, Math.ceil(Math.abs(a1-a0) * 12));
      for (let i = 0; i <= n; i++){
        const a = a0 + (a1-a0) * i / n;
        path.push([x + Math.cos(a)*rx, y + Math.sin(a)*ry]);
      }
    },
    fill(){ pushPoly(tf(path), parseColor(st.fill), st.alpha, 0); },
    stroke(){ pushPoly(tf(path), parseColor(st.fill), st.alpha, 1, api.lineWidth); },
    setLineDash(){}, getLineDash(){ return []; },
    createLinearGradient(){ var g={ __grad:1, _c:[], addColorStop(o,c){ this._c.push([o,parseColor(c)]); }, toString(){ return '#808080'; } }; return g; },
    createRadialGradient(){ var g={ __grad:1, _c:[], addColorStop(o,c){ this._c.push([o,parseColor(c)]); }, toString(){ return '#808080'; } }; return g; },
    createPattern(){ return { __pattern:1, toString(){ return 'rgba(0,0,0,0.08)'; } }; },
    drawImage(src, dx, dy, dw, dh){
      var out = sink(); if (!out) return;
      if (!src || !src.__id || !REC.buffers[src.__id]) return;
      if (src.__glow) return;   /* additive radial glow — not representable here */
      out.push({ t:'group', m: st.m.slice(), dx: dx, dy: dy,
                 dw: (dw === undefined ? src.width : dw),
                 dh: (dh === undefined ? src.height : dh),
                 sw: src.width, sh: src.height, id: src.__id, a: st.alpha });
    },
    putImageData(){}, getImageData(){ return { data: new Uint8ClampedArray(4) }; },
    clip(){},
    quadraticCurveTo(cx,cy,x,y){
      var x0 = cur ? cur[0] : x, y0 = cur ? cur[1] : y;
      for (var i = 1; i <= 8; i++){
        var t = i/8, u = 1-t;
        path.push([u*u*x0 + 2*u*t*cx + t*t*x, u*u*y0 + 2*u*t*cy + t*t*y]);
      }
      cur = [x,y];
    },
    bezierCurveTo(c1x,c1y,c2x,c2y,x,y){
      var x0 = cur ? cur[0] : x, y0 = cur ? cur[1] : y;
      for (var i = 1; i <= 10; i++){
        var t = i/10, u = 1-t;
        path.push([u*u*u*x0 + 3*u*u*t*c1x + 3*u*t*t*c2x + t*t*t*x,
                   u*u*u*y0 + 3*u*u*t*c1y + 3*u*t*t*c2y + t*t*t*y]);
      }
      cur = [x,y];
    },
    rect(x,y,w,h){ path.push([x,y],[x+w,y],[x+w,y+h],[x,y+h]); },
    setTransform_(a,b,c,d,e,f){ st.m = [a,b,c,d,e,f]; }
  };
  return api;
}

const CTX = RecCtx();
const NOOP = new Proxy({}, { get(t,k){ if(k==='measureText') return s=>({width:String(s).length*8}); if(k==='createLinearGradient'||k==='createRadialGradient') return ()=>({addColorStop(){}}); if(k==='createPattern') return ()=>({}); return ()=>{}; }, set(){ return true; } });

/* ---------- DOM stubs ---------- */
function makeEl(tag, realCtx){
  const L = {}, C = new Set();
  const el = {
    tagName: tag, width: 0, height: 0, innerHTML: '', textContent: '',
    style: { setProperty(){} }, dataset: {}, children: [],
    classList: { add:c=>C.add(c), remove:c=>C.delete(c), toggle:()=>{}, contains:()=>false },
    appendChild(c){ el.children.push(c); return c; },
    setAttribute(){}, addEventListener(t,f){ (L[t]=L[t]||[]).push(f); },
    getBoundingClientRect(){ return { left:0, top:0, width:960, height:540 }; },
    getContext(){ return realCtx || NOOP; }, requestFullscreen(){}
  };
  return el;
}
let __cid = 1;
function makeCanvasEl(){
  const el = makeEl('canvas', null);
  el.__id = REC.nextId++;
  const c = RecCtx(el.__id);
  el.getContext = function(){ return c; };
  return el;
}
const canvasEl = makeEl('canvas', CTX);
canvasEl.__id = 0;
const winL = {};
global.window = { addEventListener:(t,f)=>{(winL[t]=winL[t]||[]).push(f);}, innerWidth:1440, innerHeight:810,
                  devicePixelRatio:2, matchMedia:()=>({matches:false}), requestAnimationFrame:cb=>{RAF=cb;} };
global.navigator = { userAgent:'Chrome', maxTouchPoints:0, getGamepads:()=>[] };
global.document = { getElementById:id=>(id==='c'?canvasEl:makeEl('div')), createElement:t=>(t==='canvas'?makeCanvasEl():makeEl(t)),
                    querySelectorAll:()=>[], addEventListener:(t,f)=>{(winL['doc:'+t]=winL['doc:'+t]||[]).push(f);},
                    body:makeEl('body'), documentElement:makeEl('html'), fullscreenElement:null, hidden:false };
let RAF = null;
global.requestAnimationFrame = cb => { RAF = cb; };
const LS = {};
global.localStorage = { getItem:k=>(k in LS?LS[k]:null), setItem:(k,v)=>{LS[k]=String(v);}, removeItem:k=>{delete LS[k];} };
let T = 0;
global.performance = { now:()=>T };
global.setTimeout = ()=>0; global.clearTimeout = ()=>{};

let code = fs.readFileSync(process.env.GAME_JS || require('path').join(__dirname, '..', 'build', 'game.js'),'utf8');
const hook = `
global.__G = {
  get S(){return S}, get P(){return P}, get Settings(){return Settings},
  beginRun:beginRun, endRunToTitle:endRunToTitle, resize:resize,
  openCards:openCards, get VW(){return VW}, get VH(){return VH},
  get UI(){return UI}, spawnEnemy:spawnEnemy,
  get Codex(){return CodexState}, get Ach(){return AchState}, get Hist(){return HistState},
  get Loadout(){return LoadoutState}, get Meta(){return Meta},
  get Cam(){return Cam}, get GROUND_Y(){return GROUND_Y}, get pickups(){return pickups}, get hazards(){return hazards},
  spawnBoss:spawnBoss, finishRun:finishRun
};
`;
const i = code.lastIndexOf('})();');
code = code.slice(0,i) + hook + code.slice(i);
eval(code);
const G = global.__G;
const fire = (t,e) => (winL[t]||[]).forEach(f=>f(e));
const key = c => ({ code:c, repeat:false, preventDefault(){} });
function steps(n){ for(let i=0;i<n;i++){ T+=16.7; const cb=RAF; RAF=null; cb(T); } }

/* kill post-processing so the capture is the raw UI, not the CRT pass */
G.Settings.crt = 0; G.Settings.scan = 0; G.Settings.vignette = 0; G.Settings.bloom = 0;

steps(20); fire('keydown',key('Space')); steps(4); fire('keyup',key('Space')); steps(6);

const target = process.argv[2] || 'card';
G.beginRun({});
steps(60);

if (target === 'card'){
  /* force a real level-up so the genuine card screen appears */
  G.P.level = 3;
  G.P.xp = 0; G.P.xpNeed = 1;
  G.S.kills = 5;
  G.openCards();
} else if (target === 'settings'){
  G.S.screen = 'settings'; G.UI.index = 0; steps(2);
} else if (target === 'dead'){
  G.S.screen = 'dead'; G.S.needsInitials = false; G.S.score = 12345; steps(2);
} else if (target === 'title'){
  G.endRunToTitle(); steps(6);
} else if (target === 'hud'){
  steps(120);
} else if (target === 'play'){
  /* a rich gameplay frame: mixed enemies, hazards, pickups, boss */
  G.beginRun({ mode:'endless', pilot:'havoc' });
  G.P.maxHp = 5; G.P.hp = 4; G.P.stat.drone = 1; G.P.stat.orbit = 1;
  G.S.score = 48250; G.S.combo = 14; G.S.mult = 3; G.S.comboT = 2; G.S.bomb = 0.62;
  G.P.heat = 0.35; G.P.weapon = 'spread'; G.P.weaponRarity = 2;
  var types = ['crawler','armored','spiked','flyer','turret','burrower','roller','sniper','healer','tether','hive'];
  for (var pi = 0; pi < types.length; pi++) G.spawnEnemy(types[pi], G.Cam.x + 260 + pi*62, null);
  G.hazards.push({ type:'spike', x:G.Cam.x+200, y:G.GROUND_Y-15, w:60, h:15, t:0, hp:0 });
  G.hazards.push({ type:'gate', x:G.Cam.x+520, y:G.GROUND_Y-160, w:12, h:130, t:0, hp:0, on:1, cycle:2, phase:0 });
  G.hazards.push({ type:'saw', x:G.Cam.x+430, y:G.GROUND_Y-27, w:27, h:27, vx:-100, t:0, hp:0 });
  G.hazards.push({ type:'mine', x:G.Cam.x+610, y:G.GROUND_Y-200, w:22, h:22, baseY:G.GROUND_Y-200, phase:0, t:0, hp:1 });
  G.hazards.push({ type:'acid', x:G.Cam.x+300, y:G.GROUND_Y-12, w:90, h:12, t:0, hp:0 });
  G.hazards.push({ type:'launchpad', x:G.Cam.x+680, y:G.GROUND_Y-13, w:48, h:13, t:0, hp:0, cd:0 });
  G.hazards.push({ type:'ice', x:G.Cam.x+120, y:G.GROUND_Y-6, w:120, h:6, t:0, hp:0 });
  G.hazards.push({ type:'stalactite', x:G.Cam.x+560, y:G.GROUND_Y-280, w:24, h:34, vy:0, state:'hang', t:0, hp:0 });
  G.pickups.spawn();
  var pk = G.pickups.items[G.pickups.n-1];
  pk.x = G.Cam.x+350; pk.y = G.GROUND_Y-120; pk.w=22; pk.h=22; pk.vy=0; pk.t=0; pk.life=20; pk.kind='heart'; pk.rarity=0;
  steps(45);
  G.S.toast = { text:'SWARM EQUIPPED', t:0.4, life:2.6 };
  G.S.caption = { text:'explosion', t:0.2, life:1.8 };
  steps(2);
} else if (target === 'codex'){
  var c = G.S; 
  var car = (function(){ return G.Meta.career || (G.Meta.career = {}); })();
  car.codexSeen = car.codexSeen || {};
  ['enemies:crawler','enemies:armored','enemies:spiked','enemies:flyer','enemies:turret',
   'enemies:burrower','enemies:roller','enemies:sniper','enemies:hive','enemies:queen',
   'hazards:mine','hazards:spike','hazards:saw','hazards:gate','hazards:stalactite','hazards:acid',
   'weapons:pulse','weapons:spread','weapons:pierce','weapons:flamer','weapons:arc',
   'cards:hp','cards:dmg','cards:rate','cards:drone','cards:berserk',
   'bosses:mech','bosses:serpent','pilots:vector','pilots:havoc'].forEach(function(k){ car.codexSeen[k]=1; });
  G.S.screen = 'codex'; G.Codex.index = 0; G.Codex.scroll = 0; G.Codex.tab = 0; steps(2);
} else if (target === 'ach'){
  G.Meta.achievements = { first:1, k100:1, chain8:1, boss1:1, survive300:1, weapons:1, cards:1 };
  G.S.screen = 'ach'; G.Ach.index = 2; G.Ach.scroll = 0; steps(2);
} else if (target === 'stats'){
  G.Meta.career = { kills:48213, bosses:37, grazes:3120, emps:64, distance:184320, runs:96,
                  scrapEarned:12400, weaponsUsed:{pulse:1,spread:1,pierce:1,flamer:1,arc:1,homing:1,beam:1},
                  pilotsUsed:{vector:1,havoc:1,tech:1}, bossTypes:{mech:1,serpent:1,fortress:1},
                  campaignCleared:6, codexSeen:{'enemies:crawler':1,'weapons:pulse':1,'cards:hp':1} };
  G.Meta.bestScore = 284300; G.Meta.bestTime = 742;
  G.S.screen = 'stats'; steps(2);
} else if (target === 'history'){
  G.Meta.history = [];
  for (var hi = 0; hi < 6; hi++){
    G.Meta.history.push({ score: 280000 - hi*31000, time: 700 - hi*60, kills: 300 - hi*30,
      mode: hi%2 ? 'CAMPAIGN' : 'ENDLESS', modeId: hi%2?'campaign':'endless', stage: hi%2?6:0,
      date: '2' + (hi+1) + '/10/26', pilot: ['VECTOR','HAVOC','TECH','RAMPAGE'][hi%4],
      pilotId: ['vector','havoc','tech','rampage'][hi%4], modIds:[], seed: 1234, replay: '' });
  }
  G.Meta.history[1].replay = 'AAAA';
  G.S.screen = 'history'; G.Hist.index = 0; G.Hist.scroll = 0; steps(2);
} else if (target === 'campaign'){
  G.beginRun({ mode:'campaign', stage:2, pilot:'havoc' });
  G.P.maxHp=5;G.P.hp=4;
  G.S.t = 38; G.S.kills = 22; G.S.score = 12400; G.S.combo = 9; G.S.mult = 2; G.S.comboT = 2;
  G.spawnEnemy('crawler', G.Cam.x+300, null); G.spawnEnemy('flyer', G.Cam.x+430, null);
  G.spawnEnemy('turret', G.Cam.x+560, null); G.spawnEnemy('spitter', G.Cam.x+680, null);
  steps(20);
} else if (target === 'timeattack'){
  G.beginRun({ mode:'timeattack', pilot:'arclight' });
  G.S.timeLeft = 47; G.S.score = 38200; G.S.kills = 61;
  G.P.stat.drone = 1;
  G.spawnEnemy('armored', G.Cam.x+320, null); G.spawnEnemy('hive', G.Cam.x+470, null);
  steps(20);
} else if (target === 'bossrush'){
  G.beginRun({ mode:'bossrush', pilot:'rampage' });
  G.S.bossCount = 2; G.S.score = 91000;
  G.spawnBoss('fortress');
  steps(120);
} else if (target === 'deadinits'){
  G.Meta.achievements = {};
  G.beginRun({ mode:'endless', pilot:'vector' });
  G.P.maxHp=9999;G.P.hp=9999;G.P.stat.dmg=999;
  G.S.score = 184300; G.S.kills = 640; G.S.t = 512; G.S.comboBest = 44; G.S.mult = 8;
  G.S.bossCount = 2; G.S.bossNoHit = 1; G.S.cardsTakenRun = 34; G.S.grazeCount = 620;
  G.S.bombsUsed = 31; G.S.distance = 4820; G.S.modCount = 3;
  G.spawnEnemy('crawler', G.Cam.x+200, null);
  steps(20);
  G.finishRun('DESTROYED');
  steps(4);
} else if (target === 'loadout'){
  G.S.loadoutMods = { swarm:1, blitz:1 };
  G.S.screen = 'loadout'; G.Loadout.index = 1; G.Loadout.row = 1; G.Loadout.modIndex = 1; steps(2);
}

REC.ops.length = 0;
try {
  var probe = (typeof iconSprite === 'function') ? null : null;
} catch(e){}
REC.on = true;
steps(1);
REC.on = false;
var used = {};
(function walk(ops){ for (var i=0;i<ops.length;i++){ if (ops[i].t==='group'){ used[ops[i].id]=1; walk(REC.buffers[ops[i].id]||[]); } } })(REC.ops);
fs.writeFileSync(require('path').join(__dirname, '..', 'build', 'frame_') + target + '.json',
  JSON.stringify({ w: canvasEl.width, h: canvasEl.height, ops: REC.ops, buffers: REC.buffers }));
console.log(target + ': ' + REC.ops.length + ' ops, ' + Object.keys(REC.buffers).length + ' sprite buffers, canvas ' + canvasEl.width + 'x' + canvasEl.height);
