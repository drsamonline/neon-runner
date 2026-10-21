/* Balance probe: runs a scripted "competent player" across difficulties and
   modes and reports survival, pressure and trap density. */
const fs = require('fs');
function makeCtx(){const s={};return new Proxy(s,{get(t,k){if(k in t)return t[k];
  if(k==='createLinearGradient'||k==='createRadialGradient')return()=>({addColorStop(){}});
  if(k==='createPattern')return()=>({});if(k==='measureText')return x=>({width:String(x).length*8});
  return()=>{};},set(t,k,v){t[k]=v;return true;}});}
const CTX=makeCtx();
function makeEl(tag){const L={},C=new Set();const el={tagName:tag,width:0,height:0,innerHTML:'',textContent:'',
  style:{setProperty(){}},dataset:{},children:[],classList:{add:c=>C.add(c),remove:c=>C.delete(c),toggle:()=>{},contains:()=>false},
  appendChild(c){el.children.push(c);return c;},setAttribute(){},addEventListener(t,f){(L[t]=L[t]||[]).push(f);},
  getBoundingClientRect(){return{left:0,top:0,width:960,height:540};},getContext(){return CTX;},requestFullscreen(){},click(){}};return el;}
const canvasEl=makeEl('canvas');
const winL={};
global.window={addEventListener:(t,f)=>{(winL[t]=winL[t]||[]).push(f);},innerWidth:1440,innerHeight:810,
  devicePixelRatio:1,matchMedia:()=>({matches:false}),requestAnimationFrame:cb=>{RAF=cb;}};
global.navigator={userAgent:'Chrome',maxTouchPoints:0,getGamepads:()=>[]};
global.document={getElementById:id=>(id==='c'?canvasEl:makeEl('div')),createElement:t=>makeEl(t),querySelectorAll:()=>[],
  addEventListener:(t,f)=>{(winL['doc:'+t]=winL['doc:'+t]||[]).push(f);},body:makeEl('body'),head:makeEl('head'),
  documentElement:makeEl('html'),fullscreenElement:null,hidden:false};
let RAF=null; global.requestAnimationFrame=cb=>{RAF=cb;};
const LS={}; global.localStorage={getItem:k=>k in LS?LS[k]:null,setItem:(k,v)=>{LS[k]=String(v);},removeItem:k=>{delete LS[k];}};
let T=0; global.performance={now:()=>T}; global.setTimeout=()=>0; global.clearTimeout=()=>{};
global.btoa=s=>Buffer.from(s,'binary').toString('base64'); global.atob=s=>Buffer.from(s,'base64').toString('binary');
global.Blob=function(){}; global.URL={createObjectURL:()=>'blob:x',revokeObjectURL(){}};

let code=fs.readFileSync(process.env.GAME_JS || require('path').join(__dirname, '..', 'build', 'game.js'),'utf8');
const hook=`\nglobal.__G={get S(){return S},get P(){return P},get enemies(){return enemies},get hazards(){return hazards},
get bullets(){return bullets},get Settings(){return Settings},get Cam(){return Cam},get GROUND_Y(){return GROUND_Y},
get VW(){return VW},get Wall(){return Wall},get ENEMY_DEF(){return ENEMY_DEF},
beginRun:beginRun,modeDef:modeDef};\n`;
const i=code.lastIndexOf('})();'); code=code.slice(0,i)+hook+code.slice(i);
eval(code);
const G=global.__G;
const fire=(t,e)=>(winL[t]||[]).forEach(f=>f(e));
const key=c=>({code:c,repeat:false,preventDefault(){}});
function steps(n){for(let i=0;i<n;i++){T+=16.7;const cb=RAF;RAF=null;cb(T);}}

/* --- a scripted player that actually tries: dodges traps, jumps, ducks --- */
function drive(){
  const p=G.P, pcx=p.x+p.w/2, pcy=p.y+p.h/2;
  let left=0,right=1,up=0,down=0;

  /* stop advancing if a wall is closing in from the right */
  for (const hz of G.hazards){
    const ahead=hz.x-pcx;
    if (hz.type==='saw' && Math.abs(ahead)<95 && p.onGround) up=1;
    if (hz.type==='mine' && ahead>0 && ahead<120) up=1;
    if (hz.type==='gate' && ahead>0 && ahead<120 && hz.on) down=1;
    if (hz.type==='stalactite' && hz.state==='fall' && Math.abs(ahead)<60) up=1;
    if (hz.type==='crusher' && Math.abs(ahead)<90) { right=0; }
    if ((hz.type==='spike'||hz.type==='acid') && hz.x-(p.x+p.w)<52 && hz.x+hz.w>p.x && p.onGround) up=1;
    if (hz.type==='launchpad' && ahead>0 && ahead<70) right=0;
  }
  /* jump enemies that are about to reach us */
  for (const e of G.enemies){
    const d=(e.x+e.w/2)-pcx;
    if (d>0 && d<80 && !G.ENEMY_DEF[e.type].air && p.onGround) up=1;
  }
  /* duck incoming fire */
  for (let b=0;b<G.bullets.n;b++){
    const bb=G.bullets.items[b];
    if (bb.team===0 && bb.x>pcx && bb.x-pcx<150 && Math.abs(bb.y-pcy)<55) down=1;
  }
  /* back off if the wall is right on top of us */
  if (G.Wall.active && G.Wall.x > p.x-150){ right=1; left=0; }

  fire(right?'keydown':'keyup', key('ArrowRight'));
  fire(left?'keydown':'keyup', key('ArrowLeft'));
  fire(up?'keydown':'keyup', key('ArrowUp'));
  fire(down?'keydown':'keyup', key('ArrowDown'));
}

function probe(diff, mode, extra, seconds){
  G.Settings.difficulty = diff;
  G.beginRun(Object.assign({ mode: mode, pilot:'vector' }, extra || {}));
  steps(20);
  let frames=0, deaths=0, peakEnemies=0, peakHazards=0, peakScore=0, hazardSamples=0, hazardSum=0;
  const cap = seconds*60;
  for (let k=0;k<cap;k++){
    drive(); steps(1); frames++;
    if (G.enemies.length>peakEnemies) peakEnemies=G.enemies.length;
    if (G.hazards.length>peakHazards) peakHazards=G.hazards.length;
    hazardSum+=G.hazards.length; hazardSamples++;
    if (G.S.score>peakScore) peakScore=G.S.score;
    if (G.S.screen==='card'){ fire('keydown',key('Enter')); steps(1); fire('keyup',key('Enter')); }
    if (G.S.screen==='dead'){ deaths++; break; }
  }
  ['ArrowRight','ArrowLeft','ArrowUp','ArrowDown'].forEach(c=>fire('keyup',key(c)));
  return { diff, mode, survived: (frames/60).toFixed(1), deaths,
           peakEnemies, avgHaz: (hazardSum/Math.max(1,hazardSamples)).toFixed(2),
           peakHazards, score: peakScore };
}

const DIFF=['ASSIST','NORMAL','HARD','NIGHTMARE'];
console.log('mode        difficulty   survived   peakEnemies  avgTraps  peakTraps  score');
console.log('--------------------------------------------------------------------------');
for (const [mode,extra] of [['endless',null],['campaign',{stage:1}],['practice',null]]){
  for (let d=0; d<4; d++){
    const r = probe(d, mode, extra, 180);
    console.log(
      r.mode.padEnd(11) + DIFF[d].padEnd(11) +
      (r.survived + 's').padStart(9) +
      String(r.peakEnemies).padStart(12) +
      String(r.avgHaz).padStart(10) +
      String(r.peakHazards).padStart(11) +
      String(r.score).padStart(8));
  }
}
