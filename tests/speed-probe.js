const fs=require('fs');
function makeCtx(){const s={};return new Proxy(s,{get(t,k){if(k in t)return t[k];
 if(k==='createLinearGradient'||k==='createRadialGradient')return()=>({addColorStop(){}});
 if(k==='createPattern')return()=>({});if(k==='measureText')return x=>({width:8});return()=>{};},set(t,k,v){t[k]=v;return true;}});}
const CTX=makeCtx();
function makeEl(tag){const L={},C=new Set();const el={tagName:tag,width:0,height:0,innerHTML:'',textContent:'',
 style:{setProperty(){}},dataset:{},children:[],classList:{add:()=>{},remove:()=>{},toggle:()=>{},contains:()=>false},
 appendChild(c){el.children.push(c);return c;},setAttribute(){},addEventListener(t,f){(L[t]=L[t]||[]).push(f);},
 getBoundingClientRect(){return{left:0,top:0,width:960,height:540};},getContext(){return CTX;},requestFullscreen(){},click(){}};return el;}
const canvasEl=makeEl('canvas');const winL={};
global.window={addEventListener:(t,f)=>{(winL[t]=winL[t]||[]).push(f);},innerWidth:1440,innerHeight:810,devicePixelRatio:1,matchMedia:()=>({matches:false}),requestAnimationFrame:cb=>{RAF=cb;}};
global.navigator={userAgent:'C',maxTouchPoints:0,getGamepads:()=>[]};
global.document={getElementById:id=>(id==='c'?canvasEl:makeEl('div')),createElement:t=>makeEl(t),querySelectorAll:()=>[],
 addEventListener:(t,f)=>{(winL['doc:'+t]=winL['doc:'+t]||[]).push(f);},body:makeEl('body'),head:makeEl('head'),documentElement:makeEl('html'),fullscreenElement:null,hidden:false};
let RAF=null;global.requestAnimationFrame=cb=>{RAF=cb;};
const LS={};global.localStorage={getItem:k=>k in LS?LS[k]:null,setItem:(k,v)=>{LS[k]=String(v);},removeItem:k=>{delete LS[k];}};
let T=0;global.performance={now:()=>T};global.setTimeout=()=>0;global.clearTimeout=()=>{};
global.btoa=s=>Buffer.from(s,'binary').toString('base64');global.atob=s=>Buffer.from(s,'base64').toString('binary');
global.Blob=function(){};global.URL={createObjectURL:()=>'x',revokeObjectURL(){}};
let code=fs.readFileSync(process.env.GAME_JS || require('path').join(__dirname, '..', 'build', 'game.js'),'utf8');
const hook=`\nglobal.__G={get S(){return S},get P(){return P},get enemies(){return enemies},get hazards(){return hazards},
get Cam(){return Cam},get Settings(){return Settings},get ENEMY_DEF(){return ENEMY_DEF},beginRun:beginRun,spawnEnemy:spawnEnemy};\n`;
const i=code.lastIndexOf('})();');code=code.slice(0,i)+hook+code.slice(i);
eval(code);
const G=global.__G;
const fire=(t,e)=>(winL[t]||[]).forEach(f=>f(e));
const key=c=>({code:c,repeat:false,preventDefault(){}});
function steps(n){for(let i=0;i<n;i++){T+=16.7;const cb=RAF;RAF=null;cb(T);}}

const PLAYER = 300;
console.log('Enemy top speed vs player (player = ' + PLAYER + ' px/s)\n');
console.log('type        d=0.0    d=1.4    d=2.8   vs player @2.8');
console.log('--------------------------------------------------------');
function measure(type, d){
  G.beginRun({});
  G.S.difficulty = d;
  G.P.maxHp=9999;G.P.hp=9999;
  const e = G.spawnEnemy(type, G.Cam.x + 500, null);
  if (!e) return 0;
  let max = 0;
  for (let k=0;k<180;k++){
    steps(1);
    if (e.dead) break;
    const sp = Math.abs(e.vx);
    if (sp > max) max = sp;
  }
  return max;
}
const types = ['crawler','armored','spiked','splitter','jumper','flyer','bomber','darter','roller','burrower','queen','carrier','hover'];
for (const t of types){
  const a = measure(t,0), b = measure(t,1.4), c = measure(t,2.8);
  console.log(t.padEnd(11) + String(Math.round(a)).padStart(6) + String(Math.round(b)).padStart(9) +
              String(Math.round(c)).padStart(9) + ('   ' + Math.round(c/PLAYER*100) + '%').padStart(14));
}
console.log('\nHazard density (traps per 1000 world px):');
for (let d=0; d<4; d++){
  G.Settings.difficulty = d;
  G.beginRun({ mode:'endless' });
  let seen = {};
  let dist = 0;
  for (let k=0;k<400;k++){ G.P.x += 60; dist += 60; steps(1);
    for (const h of G.hazards) seen[Math.round(h.x/10)] = 1; }
  const n = Object.keys(seen).length;
  console.log('  difficulty ' + d + ': ' + (n/(dist/1000)).toFixed(2) + ' traps per 1000px');
}
