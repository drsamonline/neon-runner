/* =====================================================================
   section 5b: EFFECTS
   Per-biome weather, ground decals, off-screen threat arrows and
   floating damage numbers. All screen-space and cheap.
   ===================================================================== */

var WEATHER = [
  { kind:'rain',  col:'rgba(150,210,255,0.55)', n:90,  spd:900, slant:-0.35 },
  { kind:'ember', col:'rgba(255,170,80,0.65)',  n:40,  spd:-70, slant:0.15 },
  { kind:'snow',  col:'rgba(235,250,255,0.8)',  n:70,  spd:120, slant:0.25 },
  { kind:'ash',   col:'rgba(190,170,220,0.5)',  n:55,  spd:70,  slant:-0.1 },
  { kind:'dust',  col:'rgba(200,255,235,0.5)',  n:60,  spd:150, slant:0.4 }
];
var weatherP = null;

function initWeather(){
  weatherP = [];
  for (var b = 0; b < WEATHER.length; b++){
    var w = WEATHER[b], arr = [];
    for (var i = 0; i < w.n; i++){
      arr.push({ x: rng() * 1.2, y: rng(), z: 0.5 + rng() * 0.8, s: 0.6 + rng() * 1.4 });
    }
    weatherP.push(arr);
  }
}
function updateWeather(dt){
  if (!weatherP) initWeather();
  var idx = clamp(S.biomeIdx | 0, 0, WEATHER.length - 1);
  var w = WEATHER[idx], arr = weatherP[idx];
  if (!arr) return;
  for (var i = 0; i < arr.length; i++){
    var p = arr[i];
    p.y += (w.spd * p.z * dt) / VH;
    p.x += (w.slant * w.spd * p.z * dt) / VW;
    if (p.y > 1.1){ p.y -= 1.25; p.x = rng() * 1.2 - 0.1; }
    if (p.y < -0.15){ p.y += 1.25; p.x = rng() * 1.2 - 0.1; }
    if (p.x > 1.15) p.x -= 1.3;
    if (p.x < -0.15) p.x += 1.3;
  }
}
function drawWeather(){
  if (Settings.weather === 0 || !weatherP) return;
  if (S.quality === 'low' && Settings.weather === 'auto') return;
  var idx = clamp(S.biomeIdx | 0, 0, WEATHER.length - 1);
  var w = WEATHER[idx], arr = weatherP[idx];
  if (!arr) return;
  var col = w.col;
  ctx.fillStyle = col;
  ctx.strokeStyle = col;
  ctx.lineWidth = 1;
  for (var i = 0; i < arr.length; i++){
    var p = arr[i];
    var x = p.x * VW, y = p.y * VH;
    if (w.kind === 'rain'){
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + w.slant * 16 * p.z, y + 20 * p.z);
      ctx.stroke();
    } else if (w.kind === 'snow'){
      ctx.fillRect(x, y, 2 * p.z, 2 * p.z);
    } else if (w.kind === 'ember'){
      ctx.globalAlpha = 0.5 + 0.5 * Math.abs(Math.sin(S.t * 3 + i));
      ctx.fillRect(x, y, 2 * p.z, 2 * p.z);
      ctx.globalAlpha = 1;
    } else {
      ctx.fillRect(x, y, 1.6 * p.z, 3 * p.z);
    }
  }
}

/* ---------- ground decals ---------- */
var decals = [];
function addDecal(x, r, col){
  decals.push({ x: x, y: GROUND_Y, r: r, life: 16, max: 16, col: col || 'rgba(0,0,0,0.45)' });
  if (decals.length > 70) decals.shift();
}
function updateDecals(dt){
  for (var i = decals.length - 1; i >= 0; i--){
    decals[i].life -= dt;
    if (decals[i].life <= 0) decals.splice(i, 1);
  }
}
function drawDecals(){
  for (var i = 0; i < decals.length; i++){
    var d = decals[i];
    ctx.globalAlpha = clamp(d.life / d.max, 0, 1) * 0.8;
    ctx.fillStyle = d.col;
    ctx.beginPath();
    ctx.ellipse(d.x, d.y + 2, d.r, d.r * 0.28, 0, 0, 6.2832);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

/* ---------- off-screen threat arrows ---------- */
function drawThreatArrows(){
  if (Settings.threatArrows === 0) return;
  var u = uiScale();
  var seenR = {}, seenL = {};
  function arrow(side, y, col, size){
    var x = side > 0 ? VW - 12 * u : 12 * u;
    var yy = clamp(y, 40 * u, VH - 40 * u);
    ctx.fillStyle = col;
    ctx.beginPath();
    if (side > 0){
      ctx.moveTo(x, yy); ctx.lineTo(x - size, yy - size * 0.7); ctx.lineTo(x - size, yy + size * 0.7);
    } else {
      ctx.moveTo(x, yy); ctx.lineTo(x + size, yy - size * 0.7); ctx.lineTo(x + size, yy + size * 0.7);
    }
    ctx.closePath(); ctx.fill();
  }
  for (var i = 0; i < enemies.length; i++){
    var e = enemies[i];
    if (e.dead || e.hidden) continue;
    var sx = e.x - Cam.x;
    if (sx > VW + 6){
      var k = Math.floor((e.y + e.h / 2) / 60);
      if (seenR[k]) continue;
      seenR[k] = 1;
      arrow(1, e.y + e.h / 2, e.boss ? PAL().gold : 'rgba(255,120,140,0.85)', e.boss ? 13 * u : 8 * u);
    } else if (sx + e.w < -6){
      var k2 = Math.floor((e.y + e.h / 2) / 60);
      if (seenL[k2]) continue;
      seenL[k2] = 1;
      arrow(-1, e.y + e.h / 2, 'rgba(255,120,140,0.7)', 8 * u);
    }
  }
  if (Wall.active && (Wall.x - Cam.x) < 0){
    arrow(-1, VH * 0.5, PAL().danger, 12 * u);
  }
}

/* ---------- floating damage numbers ---------- */
function dmgNum(x, y, amount, crit){
  if (Settings.damageNumbers === 0) return;
  if (!crit && amount < 3) return;          /* keep the screen readable */
  floaters.spawn();
  var f = floaters.items[floaters.n - 1];
  f.x = x; f.y = y; f.life = crit ? 0.7 : 0.5;
  f.text = String(Math.round(amount));
  f.color = crit ? PAL().gold : 'rgba(235,245,255,0.95)';
  f.size = crit ? 17 : 13;
}

/* ---------- captions for important audio cues ---------- */
function caption(text){
  if (!Settings.captions) return;
  S.caption = { text: text, t: 0, life: 1.8 };
}
function updateCaption(dt){
  if (S.caption){
    S.caption.t += dt;
    if (S.caption.t > S.caption.life) S.caption = null;
  }
}
function drawCaption(){
  if (!S.caption) return;
  var u = uiScale();
  var a = Math.min(1, S.caption.t * 4) * Math.min(1, (S.caption.life - S.caption.t) * 3);
  ctx.globalAlpha = clamp(a, 0, 1);
  var y = VH - 40 * u;
  var w = txtW(S.caption.text, 12 * u) + 20 * u;
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillRect(VW / 2 - w / 2, y - 12 * u, w, 20 * u);
  txt('[' + S.caption.text + ']', VW / 2, y + 2 * u, 'rgba(210,230,250,0.85)', 12 * u, 'center');
  ctx.globalAlpha = 1;
}

/* ---------- blackout modifier ---------- */
function drawBlackout(){
  if (!S.modDark) return;
  var p = P;
  var cx = p.x + p.w / 2 - Cam.x, cy = p.y + p.h / 2;
  var r = Math.max(VW, VH) * 0.42;
  var g = ctx.createRadialGradient(cx, cy, r * 0.22, cx, cy, r);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(0.55, 'rgba(0,0,0,0.55)');
  g.addColorStop(1, 'rgba(0,0,0,0.94)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, VW, VH);
}
