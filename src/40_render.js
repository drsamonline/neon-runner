/* =====================================================================
   section 5: RENDER
   Responsive canvas (fills any screen, any orientation), parallax biome
   backgrounds, sprite blitting, and an optional post chain
   (bloom / barrel curvature / scanlines / vignette / RGB shift).
   ===================================================================== */

var canvas, ctx, bloomCanvas, bloomCtx, curveCanvas, curveCtx;
var scanPattern = null, vignetteSprite = null;
var Cam = { x: 0, y: 0, shakeX: 0, shakeY: 0 };
var hasFilter = false;

function initCanvas(){
  canvas = document.getElementById('c');
  ctx = canvas.getContext('2d', { alpha: false });
  ctx.imageSmoothingEnabled = false;
  try { hasFilter = (typeof ctx.filter === 'string'); } catch(e){ hasFilter = false; }
  bloomCanvas = document.createElement('canvas');
  bloomCtx = bloomCanvas.getContext('2d');
  curveCanvas = document.createElement('canvas');
  curveCtx = curveCanvas.getContext('2d');
  resize();
}

function computeLogical(vw, vh){
  var a = vw / Math.max(1, vh);
  if (a >= 1){
    VH = 540;
    VW = Math.round(540 * a);
    VW = clamp(VW, 700, 1900);
    VH = Math.round(VW / a);
  } else {
    VW = 640;
    VH = Math.round(640 / a);
    VH = clamp(VH, 620, 1500);
    VW = Math.round(VH * a);
  }
  VW = Math.max(420, VW); VH = Math.max(420, VH);
}

function resize(){
  var vw = Math.max(320, window.innerWidth || 320);
  var vh = Math.max(320, window.innerHeight || 320);
  computeLogical(vw, vh);
  DPR = clamp(window.devicePixelRatio || 1, 1, 2);
  if (Settings.quality === 'low') DPR = 1;
  canvas.width = Math.round(VW * DPR);
  canvas.height = Math.round(VH * DPR);
  canvas.style.width = '100%';
  canvas.style.height = '100%';

  GROUND_Y = VH - Math.round(clamp(VH * 0.16, 84, 165));
  SKY_H = GROUND_Y;

  bloomCanvas.width = Math.max(2, Math.round(canvas.width / 4));
  bloomCanvas.height = Math.max(2, Math.round(canvas.height / 4));
  curveCanvas.width = canvas.width;
  curveCanvas.height = canvas.height;

  buildScanPattern();
  buildVignette();
  rebuildWorldForResize();
}

function buildScanPattern(){
  var step = Math.max(2, Math.round(3 * DPR));
  var c = document.createElement('canvas');
  c.width = 1; c.height = step;
  var g = c.getContext('2d');
  g.fillStyle = 'rgba(0,0,0,0.20)';
  g.fillRect(0, 0, 1, Math.max(1, Math.round(step * 0.4)));
  scanPattern = ctx.createPattern(c, 'repeat');
}
function buildVignette(){
  var c = document.createElement('canvas');
  c.width = canvas.width; c.height = canvas.height;
  var g = c.getContext('2d');
  var grd = g.createRadialGradient(c.width / 2, c.height / 2, Math.min(c.width, c.height) * 0.32,
                                   c.width / 2, c.height / 2, Math.max(c.width, c.height) * 0.72);
  grd.addColorStop(0, 'rgba(0,0,0,0)');
  grd.addColorStop(1, 'rgba(0,0,0,0.62)');
  g.fillStyle = grd;
  g.fillRect(0, 0, c.width, c.height);
  vignetteSprite = c;
}

/* ---------- text helpers ---------- */
function setFont(size, weight, family){
  var px = Math.max(8, Math.round(size * Settings.textScale * DPR)) / DPR;
  ctx.font = (weight || 'bold') + ' ' + px + 'px ' + (family || '"Courier New",Courier,monospace');
}
function txt(s, x, y, color, size, align, weight, shadow){
  if (Settings.lang && s) s = T(s);
  setFont(size || 16, weight);
  ctx.textAlign = align || 'left';
  if (shadow !== false){
    ctx.fillStyle = 'rgba(0,0,0,0.65)';
    ctx.fillText(s, x + 2, y + 2);
  }
  ctx.fillStyle = color;
  ctx.fillText(s, x, y);
  ctx.textAlign = 'left';
}
function txtW(s, size, weight){
  setFont(size || 16, weight);
  return ctx.measureText(s).width;
}

/* ---------- background ---------- */
function biomeAt(worldX){
  var idx = Math.floor(Math.max(0, worldX) / 2400) % BIOMES.length;
  return BIOMES[idx];
}
function drawSky(bio, bioNext, blend){
  var g = ctx.createLinearGradient(0, 0, 0, SKY_H);
  var s0 = bio.sky[0], s1 = bio.sky[1], s2 = bio.sky[2];
  if (blend > 0){
    s0 = mixHex(bio.sky[0], bioNext.sky[0], blend);
    s1 = mixHex(bio.sky[1], bioNext.sky[1], blend);
    s2 = mixHex(bio.sky[2], bioNext.sky[2], blend);
  }
  g.addColorStop(0, s0); g.addColorStop(0.5, s1); g.addColorStop(1, s2);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, VW, SKY_H);
}
function hex2rgb(h){
  h = h.replace('#', '');
  if (h.length === 3) h = h[0]+h[0]+h[1]+h[1]+h[2]+h[2];
  return [parseInt(h.slice(0,2),16), parseInt(h.slice(2,4),16), parseInt(h.slice(4,6),16)];
}
function mixHex(a, b, t){
  var A = hex2rgb(a), B = hex2rgb(b);
  return 'rgb(' + Math.round(lerp(A[0],B[0],t)) + ',' + Math.round(lerp(A[1],B[1],t)) + ',' + Math.round(lerp(A[2],B[2],t)) + ')';
}

function drawBackground(){
  var camX = Cam.x;
  var bio = biomeAt(camX + VW * 0.4);
  var nextIdx = (Math.floor(Math.max(0, camX) / 2400) + 1) % BIOMES.length;
  var bioNext = BIOMES[nextIdx];
  var intoBiome = (Math.max(0, camX) % 2400);
  var blend = intoBiome > 2100 ? (intoBiome - 2100) / 300 : 0;

  drawSky(bio, bioNext, blend);

  /* stars */
  var so = camX * 0.05;
  var span = VW + 80;
  for (var i = 0; i < 110; i++){
    var sx = ((i * 137.5 + hash1(i) * 400 - so) % span + span) % span - 40;
    var sy = hash1(i * 3.3) * (SKY_H * 0.82);
    var tw = 0.4 + 0.6 * Math.abs(Math.sin(S.t * 1.6 + i));
    ctx.fillStyle = 'rgba(255,255,255,' + (0.18 + tw * 0.45) + ')';
    var s = hash1(i * 7.7) > 0.86 ? 2 : 1;
    ctx.fillRect(sx, sy, s, s);
  }

  /* moon */
  var mx = VW - VW * 0.14 - camX * 0.03;
  var my = SKY_H * 0.2;
  ctx.fillStyle = 'rgba(190,225,255,0.10)';
  ctx.beginPath(); ctx.arc(mx, my, 66, 0, 6.2832); ctx.fill();
  ctx.fillStyle = '#cfe6ff';
  ctx.beginPath(); ctx.arc(mx, my, 42, 0, 6.2832); ctx.fill();
  ctx.fillStyle = 'rgba(120,150,200,0.35)';
  ctx.beginPath(); ctx.arc(mx - 13, my - 10, 7, 0, 6.2832); ctx.fill();
  ctx.beginPath(); ctx.arc(mx + 13, my + 12, 5, 0, 6.2832); ctx.fill();

  mountains(bio, bioNext, blend, 0.12, 250, 118, 150, 'm1');
  mountains(bio, bioNext, blend, 0.26, 190, 86, 200, 'm2');
  hills(bio, bioNext, blend, 0.46, 130, 52, 165);

  /* ground */
  var gc = blend > 0 ? mixHex(bio.ground, bioNext.ground, blend) : bio.ground;
  var ec = blend > 0 ? mixHex(bio.edge, bioNext.edge, blend) : bio.edge;
  ctx.fillStyle = gc;
  ctx.fillRect(0, GROUND_Y, VW, VH - GROUND_Y);
  drawDecals();
  ctx.fillStyle = ec;
  ctx.fillRect(0, GROUND_Y, VW, 3);
  ctx.globalAlpha = 0.14; ctx.fillRect(0, GROUND_Y + 3, VW, 12); ctx.globalAlpha = 1;
  ctx.strokeStyle = 'rgba(120,220,255,0.09)';
  ctx.lineWidth = 2;
  var gs = 64;
  var sx0 = Math.floor(camX / gs) * gs;
  for (var x = sx0; x < camX + VW + gs; x += gs){
    ctx.beginPath();
    ctx.moveTo(x - camX, GROUND_Y + 5);
    ctx.lineTo(x - camX, VH);
    ctx.stroke();
  }
}
function mountains(bio, bioNext, blend, f, step, hBase, hVar, key){
  var off = Cam.x * f;
  var i0 = Math.floor((off - 300) / step), i1 = Math.ceil((off + VW + 300) / step);
  var col = blend > 0 ? mixHex(bio[key], bioNext[key], blend) : bio[key];
  ctx.fillStyle = col;
  ctx.beginPath();
  ctx.moveTo(-60, GROUND_Y);
  for (var i = i0; i <= i1; i++){
    var x = i * step - off;
    var h = hBase + hash1(i * 1.7) * hVar;
    ctx.lineTo(x, GROUND_Y - h);
    ctx.lineTo(x + step * 0.5, GROUND_Y);
  }
  ctx.lineTo(VW + 60, GROUND_Y);
  ctx.closePath(); ctx.fill();
}
function hills(bio, bioNext, blend, f, step, hBase, hVar){
  var off = Cam.x * f;
  var i0 = Math.floor((off - 300) / step), i1 = Math.ceil((off + VW + 300) / step);
  var col = blend > 0 ? mixHex(bio.hill, bioNext.hill, blend) : bio.hill;
  ctx.fillStyle = col;
  for (var i = i0; i <= i1; i++){
    var x = i * step - off;
    var h = hBase + hash1(i * 2.9 + 4) * hVar;
    ctx.beginPath();
    ctx.ellipse(x, GROUND_Y, step * 0.95, h, 0, Math.PI, 0);
    ctx.fill();
  }
}

/* ---------- foreground silhouettes (parallax > 1) ---------- */
function drawForeground(){
  if (!Settings.fg) return;
  var f = 1.45;
  var off = Cam.x * f;
  var step = 210;
  var i0 = Math.floor((off - 200) / step), i1 = Math.ceil((off + VW + 200) / step);
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  for (var i = i0; i <= i1; i++){
    var x = i * step - off;
    var h = 26 + hash1(i * 5.1) * 46;
    ctx.beginPath();
    ctx.moveTo(x - 34, VH);
    ctx.lineTo(x, VH - h);
    ctx.lineTo(x + 34, VH);
    ctx.closePath(); ctx.fill();
  }
}

/* ---------- glow blobs (additive) ---------- */
function drawGlow(x, y, r, color, alpha){
  if (!Settings.lights && r > 28) return;   /* LIGHT POOLS off: keep small functional glows */
  var s = glowSprite(color);
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = alpha;
  ctx.drawImage(s, x - r, y - r, r * 2, r * 2);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
}

/* ---------- post processing ---------- */
function applyBloom(){
  if (!Settings.bloom || !hasFilter || S.quality === 'low') return;
  var bw = bloomCanvas.width, bh = bloomCanvas.height;
  bloomCtx.setTransform(1, 0, 0, 1, 0, 0);
  bloomCtx.clearRect(0, 0, bw, bh);
  bloomCtx.filter = 'blur(3px)';
  bloomCtx.drawImage(canvas, 0, 0, bw, bh);
  bloomCtx.filter = 'none';
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = 0.45;
  ctx.drawImage(bloomCanvas, 0, 0, canvas.width, canvas.height);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
}
function applyCurvature(){
  if (!Settings.crt || S.quality === 'low') return;
  var cw = canvas.width, ch = canvas.height;
  curveCtx.setTransform(1, 0, 0, 1, 0, 0);
  curveCtx.clearRect(0, 0, cw, ch);
  curveCtx.drawImage(canvas, 0, 0);
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, cw, ch);
  var strips = 44;
  var sh = ch / strips;
  for (var i = 0; i < strips; i++){
    var v = (i + 0.5) / strips;
    var yy = v * 2 - 1;
    var bulge = 1 - 0.055 * yy * yy;
    var dw = cw * bulge;
    var dx = (cw - dw) / 2;
    ctx.drawImage(curveCanvas, 0, i * sh, cw, sh, dx, i * sh, dw, sh);
  }
}
function applyRGBShift(amount){
  if (S.quality === 'low' || amount <= 0) return;
  var cw = canvas.width, ch = canvas.height;
  curveCtx.setTransform(1, 0, 0, 1, 0, 0);
  curveCtx.clearRect(0, 0, cw, ch);
  curveCtx.drawImage(canvas, 0, 0);
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = amount * 0.5;
  ctx.drawImage(curveCanvas, -amount * 2, 0);
  ctx.drawImage(curveCanvas, amount * 2, 0);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
}
function postProcess(){
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  applyBloom();
  applyCurvature();
  if (Settings.crt && S.flash > 0.02 && !Settings.reduced) applyRGBShift(S.flash * 8);
  if (Settings.scan && scanPattern){
    ctx.globalAlpha = 0.55;
    ctx.fillStyle = scanPattern;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.globalAlpha = 1;
  }
  if (Settings.vignette && vignetteSprite) ctx.drawImage(vignetteSprite, 0, 0);
  if (S.flash > 0 && !Settings.reduced){
    ctx.fillStyle = 'rgba(255,60,110,' + Math.min(0.5, S.flash * 1.2) + ')';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
}
