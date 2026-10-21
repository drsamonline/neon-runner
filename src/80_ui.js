/* =====================================================================
   section 9: UI
   World rendering, HUD, and every menu (title / pause / settings /
   cards / death / scores / help / meta) with keyboard + tap navigation.
   ===================================================================== */

var UI = {
  index: 0, scroll: 0, rects: [], items: [], title: '',
  backPressed: false, msg: '', msgT: 0,
  listening: null, listenLabel: ''
};
var a11yEl = null, a11yLast = '';

function uiScale(){
  return clamp(Math.min(VW / 800, VH / 560), 0.80, 1.8) * Settings.textScale;
}
function announce(text){
  if (!a11yEl) a11yEl = document.getElementById('a11y');
  if (!a11yEl || text === a11yLast) return;
  a11yLast = text;
  a11yEl.textContent = text;
}

/* =====================================================================
   WORLD RENDERING
   ===================================================================== */
function drawWorld(){
  ctx.save();
  ctx.translate(-Cam.x + Cam.shakeX, Cam.shakeY);

  drawPlatforms();
  drawHazards();
  drawPickupsW();
  drawShells();
  drawEnemiesW();
  drawBulletsW();
  drawPlayerW();
  drawShockwaves();
  drawParticlesW();
  drawFloatersW();

  ctx.restore();
  drawWall();
  drawForeground();
  drawThreatArrows();
}

function drawPlatforms(){
  var P = PAL();
  for (var i = 0; i < platforms.length; i++){
    var pl = platforms[i];
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(pl.x + 2, pl.y + pl.h, pl.w, 6);
    ctx.fillStyle = 'rgba(120,220,255,0.10)';
    ctx.fillRect(pl.x - 2, pl.y - 2, pl.w + 4, pl.h + 4);
    ctx.fillStyle = '#1b2a4d';
    ctx.fillRect(pl.x, pl.y, pl.w, pl.h);
    ctx.fillStyle = P.accent;
    ctx.fillRect(pl.x, pl.y, pl.w, 3);
    ctx.fillStyle = 'rgba(255,255,255,0.16)';
    for (var x = pl.x + 8; x < pl.x + pl.w - 6; x += 22) ctx.fillRect(x, pl.y + 6, 8, 3);
  }
}
function drawHazards(){
  var P = PAL();
  for (var i = 0; i < hazards.length; i++){
    var hz = hazards[i];
    if (hz.type === 'mine'){
      drawGlow(hz.x + 11, hz.y + 11, 26, P.danger, 0.28);
      ctx.fillStyle = P.danger;
      ctx.beginPath(); ctx.arc(hz.x + 11, hz.y + 11, 9, 0, 6.2832); ctx.fill();
      ctx.fillStyle = '#fff';
      var blink = Math.sin(hz.t * 9) > 0 ? 1 : 0.3;
      ctx.globalAlpha = blink;
      ctx.fillRect(hz.x + 7, hz.y + 7, 8, 8);
      ctx.globalAlpha = 1;
      ctx.strokeStyle = P.danger; ctx.lineWidth = 2;
      for (var s = 0; s < 4; s++){
        var a = hz.t * 2 + s * 1.57;
        ctx.beginPath();
        ctx.moveTo(hz.x + 11 + Math.cos(a) * 11, hz.y + 11 + Math.sin(a) * 11);
        ctx.lineTo(hz.x + 11 + Math.cos(a) * 16, hz.y + 11 + Math.sin(a) * 16);
        ctx.stroke();
      }
    } else if (hz.type === 'spike'){
      ctx.fillStyle = '#8b93b5';
      for (var k = 0; k < hz.w; k += 12){
        ctx.beginPath();
        ctx.moveTo(hz.x + k, hz.y + hz.h);
        ctx.lineTo(hz.x + k + 6, hz.y);
        ctx.lineTo(hz.x + k + 12, hz.y + hz.h);
        ctx.closePath(); ctx.fill();
      }
      ctx.fillStyle = 'rgba(255,255,255,0.25)';
      ctx.fillRect(hz.x, hz.y + hz.h - 3, hz.w, 3);
    } else if (hz.type === 'saw'){
      ctx.save();
      ctx.translate(hz.x + hz.w / 2, hz.y + hz.h / 2);
      ctx.rotate(hz.t * 14);
      ctx.fillStyle = '#c9d3ea';
      ctx.beginPath();
      for (var t = 0; t < 10; t++){
        var a2 = (t / 10) * 6.2832;
        var r = t % 2 === 0 ? 13 : 8;
        ctx.lineTo(Math.cos(a2) * r, Math.sin(a2) * r);
      }
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#5b6480';
      ctx.beginPath(); ctx.arc(0, 0, 3.5, 0, 6.2832); ctx.fill();
      ctx.restore();
    } else if (hz.type === 'gate'){
      ctx.fillStyle = '#2b3a5e';
      ctx.fillRect(hz.x - 3, hz.y, hz.w + 6, hz.h);
      if (hz.on){
        drawGlow(hz.x + hz.w / 2, hz.y + hz.h / 2, 60, P.danger, 0.20);
        ctx.fillStyle = P.danger;
        ctx.fillRect(hz.x, hz.y, hz.w, hz.h);
        ctx.fillStyle = 'rgba(255,255,255,0.55)';
        ctx.fillRect(hz.x + 3, hz.y, 3, hz.h);
      } else {
        ctx.fillStyle = 'rgba(255,80,120,0.20)';
        ctx.fillRect(hz.x + hz.w / 2 - 1, hz.y, 2, hz.h);
      }
      ctx.fillStyle = '#4a5f8a';
      ctx.fillRect(hz.x - 6, hz.y - 8, hz.w + 12, 8);
      ctx.fillRect(hz.x - 6, hz.y + hz.h, hz.w + 12, 8);
    } else if (hz.type === 'stalactite'){
      if (hz.state === 'hang'){
        ctx.fillStyle = 'rgba(255,120,120,' + (0.3 + 0.3 * Math.sin(hz.t * 8)) + ')';
        ctx.fillRect(hz.x + hz.w/2 - 2, hz.y + hz.h, 4, GROUND_Y - (hz.y + hz.h));
      }
      ctx.fillStyle = '#9aa4c0';
      ctx.beginPath();
      ctx.moveTo(hz.x, hz.y); ctx.lineTo(hz.x + hz.w, hz.y);
      ctx.lineTo(hz.x + hz.w/2, hz.y + hz.h); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#c9d3ea';
      ctx.fillRect(hz.x + hz.w/2 - 4, hz.y + 2, 4, hz.h - 12);
    } else if (hz.type === 'crusher'){
      ctx.fillStyle = '#8b93b5';
      ctx.fillRect(hz.x, hz.y, hz.w, hz.h);
      ctx.fillRect(hz.x, hz.y + hz.h + 96, hz.w, 18);
      ctx.fillStyle = 'rgba(255,255,255,0.25)';
      ctx.fillRect(hz.x, hz.y, hz.w, 4);
      ctx.fillStyle = PAL().danger;
      ctx.fillRect(hz.x + 4, hz.y + hz.h - 6, hz.w - 8, 4);
      ctx.fillStyle = '#4a5f8a';
      ctx.fillRect(hz.x + hz.w/2 - 3, hz.y + hz.h, 6, 96);
    } else if (hz.type === 'conveyor'){
      ctx.fillStyle = '#3b4560';
      ctx.fillRect(hz.x, hz.y, hz.w, hz.h);
      ctx.fillStyle = '#6b78a0';
      var off = (hz.t * 60 * hz.dir) % 20;
      for (var cx2 = hz.x + 4; cx2 < hz.x + hz.w - 8; cx2 += 20){
        var px2 = cx2 + off;
        ctx.beginPath();
        ctx.moveTo(px2, hz.y + 4); ctx.lineTo(px2 + 9, hz.y + hz.h/2);
        ctx.lineTo(px2, hz.y + hz.h - 4); ctx.closePath(); ctx.fill();
      }
      ctx.fillStyle = 'rgba(120,220,255,0.18)';
      ctx.fillRect(hz.x, hz.y, hz.w, 3);
    } else if (hz.type === 'launchpad'){
      var sq = hz.cd > 0 ? 0.5 : 1;
      ctx.fillStyle = PAL().good;
      ctx.fillRect(hz.x, hz.y + 6 * sq, hz.w, hz.h);
      ctx.fillStyle = PAL().good2;
      ctx.fillRect(hz.x + 4, hz.y + 2 * sq, hz.w - 8, 5);
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.fillRect(hz.x + hz.w/2 - 2, hz.y - 6, 4, 8);
    } else if (hz.type === 'ice'){
      ctx.fillStyle = 'rgba(180,240,255,0.55)';
      ctx.fillRect(hz.x, hz.y, hz.w, hz.h);
      ctx.fillStyle = 'rgba(255,255,255,0.75)';
      for (var ix2 = hz.x + 6; ix2 < hz.x + hz.w - 6; ix2 += 26) ctx.fillRect(ix2, hz.y, 10, 2);
    } else if (hz.type === 'lowgrav'){
      ctx.fillStyle = 'rgba(176,107,255,0.10)';
      ctx.fillRect(hz.x, hz.y, hz.w, hz.h);
      ctx.strokeStyle = 'rgba(176,107,255,0.45)';
      ctx.lineWidth = 2;
      ctx.strokeRect(hz.x + 1, hz.y + 1, hz.w - 2, hz.h - 2);
      for (var lg2 = 0; lg2 < 5; lg2++){
        var ly2 = hz.y + hz.h - ((hz.t * 40 + lg2 * 60) % hz.h);
        ctx.fillStyle = 'rgba(224,196,255,0.5)';
        ctx.fillRect(hz.x + 14 + (lg2 % 3) * 44, ly2, 4, 4);
      }
    } else if (hz.type === 'acid'){
      ctx.fillStyle = PAL().good;
      ctx.fillRect(hz.x, hz.y, hz.w, hz.h);
      ctx.fillStyle = PAL().good2;
      for (var ax = hz.x + 4; ax < hz.x + hz.w - 6; ax += 16){
        var bubble = Math.sin(hz.t * 3 + ax) * 2;
        ctx.fillRect(ax, hz.y - 3 + bubble, 8, 4);
      }
    }
  }
}
function drawPickupsW(){
  for (var i = 0; i < pickups.n; i++){
    var k = pickups.items[i];
    var bob = Math.sin(k.t * 5) * 2;
    var known = (k.kind === 'heart' || k.kind === 'shield' || k.kind === 'scrap' || k.kind === 'slow' || k.kind === 'bomb');
    var spr = pickupSprite(known ? k.kind : 'weapon');
    ctx.globalAlpha = k.life < 3 ? (0.35 + 0.65 * Math.abs(Math.sin(k.t * 12))) : 1;
    drawGlow(k.x + 11, k.y + 11 + bob, 26, known ? PAL().good : PAL().gold, 0.20);
    ctx.drawImage(spr, k.x, k.y + bob, 22, 22);
    ctx.globalAlpha = 1;
  }
}
function drawShells(){
  for (var i = 0; i < shells.length; i++){
    var s = shells[i];
    drawGlow(s.x, s.y, 20, PAL().danger, 0.3);
    ctx.fillStyle = PAL().danger;
    ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, 6.2832); ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.fillRect(s.x - 2, s.y - 2, 4, 4);
  }
}
function drawShockwaves(){
  for (var i = 0; i < shockwaves.length; i++){
    var w = shockwaves[i];
    var a = 1 - w.t / w.life;
    ctx.globalAlpha = clamp(a, 0, 1);
    ctx.fillStyle = PAL().danger;
    ctx.beginPath();
    ctx.moveTo(w.x - w.w / 2, GROUND_Y);
    ctx.lineTo(w.x, GROUND_Y - w.h);
    ctx.lineTo(w.x + w.w / 2, GROUND_Y);
    ctx.closePath(); ctx.fill();
    ctx.globalAlpha = 1;
  }
}
function drawEnemiesW(){
  for (var i = 0; i < enemies.length; i++){
    var e = enemies[i];
    if (e.boss){ drawBoss(e); continue; }
    var frame = Math.floor(e.t * 8) % 3;
    if (e.type === 'darter') frame = 0;
    if (e.type === 'shielded') frame = 0;
    if (e.state === 'tele') frame = 2;
    if (e.elite){
      ctx.strokeStyle = PAL().gold; ctx.lineWidth = 2;
      ctx.strokeRect(e.x - 3, e.y - 3, e.w + 6, e.h + 6);
      drawGlow(e.x + e.w/2, e.y + e.h/2, e.w * 0.8, PAL().gold, 0.16);
    }
    var spr = enemySprite(e.type, frame, 0);
    ctx.save();
    ctx.translate(e.x + e.w / 2, e.y);
    if (e.dir > 0) ctx.scale(-1, 1);
    if (e.hidden){
      ctx.globalAlpha = 0.4;
    }
    ctx.drawImage(spr, -e.w / 2, 0);
    ctx.restore();
    if (e.flash > 0){
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = 'rgba(255,255,255,' + clamp(e.flash * 6, 0, 0.85) + ')';
      ctx.fillRect(e.x, e.y, e.w, e.h);
      ctx.globalCompositeOperation = 'source-over';
    }
    if (e.type === 'shielded' && e.shieldUp){
      ctx.fillStyle = PAL().accent;
      ctx.globalAlpha = 0.85;
      ctx.fillRect(e.dir < 0 ? e.x : e.x + e.w - 6, e.y + 2, 6, e.h - 4);
      ctx.globalAlpha = 1;
    }
    if (e.maxHp > 3 && e.hp < e.maxHp){
      var bw = e.w;
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(e.x, e.y - 9, bw, 4);
      ctx.fillStyle = PAL().danger;
      ctx.fillRect(e.x, e.y - 9, bw * (e.hp / e.maxHp), 4);
    }
  }
}
function drawBoss(e){
  var frame = e.flash > 0 ? 1 : (Math.floor(e.t * 5) % 2);
  var spr = bossSprite(e.bossType, e.phase, frame);
  drawGlow(e.x + e.w / 2, e.y + e.h / 2, 120, PAL().e3, 0.18);
  ctx.drawImage(spr, e.x, e.y, e.w, e.h);
  if (e.flash > 0){
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = 'rgba(255,255,255,' + clamp(e.flash * 6, 0, 0.8) + ')';
    ctx.fillRect(e.x, e.y, e.w, e.h);
    ctx.globalCompositeOperation = 'source-over';
  }
  /* fortress gun pods */
  if (e.turrets && e.turrets.length){
    for (var ti = 0; ti < e.turrets.length; ti++){
      var tu = e.turrets[ti];
      var tx = e.x + tu.ox, ty = e.y + tu.oy;
      if (tu.hp > 0){
        ctx.fillStyle = PAL().gold;
        ctx.fillRect(tx, ty, tu.w, tu.h);
        ctx.fillStyle = 'rgba(0,0,0,0.4)';
        ctx.fillRect(tx + 3, ty + 3, tu.w - 6, tu.h - 6);
        ctx.fillStyle = PAL().danger;
        ctx.fillRect(tx + 2, ty + 2, tu.w - 4, 3);
      } else {
        ctx.fillStyle = 'rgba(60,60,70,0.7)';
        ctx.fillRect(tx, ty, tu.w, tu.h);
      }
    }
  }
}
function drawBulletsW(){
  for (var i = 0; i < bullets.n; i++){
    var b = bullets.items[i];
    var col = b.color || '#fff';
    drawGlow(b.x, b.y, b.r * 4.5, col, b.team === 1 ? 0.34 : 0.30);
    ctx.fillStyle = col;
    if (b.team === 1 && (b.kind === 'pierce' || b.kind === 'ricochet')){
      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.rotate(Math.atan2(b.vy, b.vx));
      ctx.fillRect(-b.r * 2.4, -b.r * 0.6, b.r * 4.8, b.r * 1.2);
      ctx.restore();
      ctx.fillStyle = '#fff';
      ctx.fillRect(b.x - b.r * 0.7, b.y - b.r * 0.7, b.r * 1.4, b.r * 1.4);
    } else {
      ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, 6.2832); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.beginPath(); ctx.arc(b.x, b.y, b.r * 0.45, 0, 6.2832); ctx.fill();
    }
  }
}
function drawPlayerW(){
  if (!P) return;
  var p = P;
  if (p.invuln > 0 && Math.floor(S.t * 22) % 2 === 0 && !S.attract) return;

  /* afterimages */
  for (var a = 0; a < p.afterimages.length; a++){
    var ai = p.afterimages[a];
    var spr = heroSprite('slide');
    ctx.globalAlpha = (ai.t / 0.28) * 0.4;
    ctx.save();
    ctx.translate(ai.x + p.w / 2, ai.y);
    ctx.scale(ai.f, 1);
    ctx.drawImage(spr, -p.w / 2, 0);
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  var frame = 'idle';
  if (p.sliding) frame = 'slide';
  else if (p.h === P_DUCK_H) frame = 'duck';
  else if (!p.onGround) frame = p.vy < 0 ? 'jump' : 'fall';
  else if (Math.abs(p.vx) > 14) frame = (Math.floor(p.animT * 11) % 2 === 0) ? 'run0' : 'run1';

  var spr = heroSprite(frame);
  var cx = p.x + p.w / 2, bottom = p.y + p.h;
  drawGlow(cx, p.y + p.h * 0.5, 40, PAL().playerHi, 0.12);

  ctx.save();
  ctx.translate(cx, bottom);
  ctx.scale(p.facing * p.sx, p.sy);
  ctx.drawImage(spr, -p.w / 2, -p.h);
  ctx.restore();

  if (p.shieldT > 0){
    ctx.strokeStyle = PAL().accent;
    ctx.lineWidth = 2;
    ctx.globalAlpha = 0.5 + 0.3 * Math.sin(S.t * 8);
    ctx.beginPath(); ctx.arc(cx, p.y + p.h / 2, 26, 0, 6.2832); ctx.stroke();
    ctx.globalAlpha = 1;
  }
  if (p.muzzle > 0){
    var gx = cx + p.facing * 18, gy = p.y + p.h * 0.42;
    drawGlow(gx, gy, 34, PAL().playerHi, 0.5);
  }
  if (p.overheated){
    ctx.fillStyle = 'rgba(255,90,90,' + (0.3 + 0.25 * Math.sin(S.t * 18)) + ')';
    ctx.fillRect(p.x - 2, p.y - 8, p.w + 4, 3);
  }

  /* target reticle */
  var tg = S.target;
  if (tg && !tg.dead && !S.attract){
    var tx = tg.x + tg.w / 2, ty = tg.y + tg.h / 2;
    var r = Math.max(tg.w, tg.h) * 0.72 + 7;
    var al = 0.5 + 0.45 * Math.sin(S.t * 12);
    ctx.strokeStyle = 'rgba(120,255,235,' + al + ')';
    ctx.lineWidth = 2;
    var seg = 7, corners = [[-1,-1],[1,-1],[1,1],[-1,1]];
    for (var c = 0; c < 4; c++){
      var sx = tx + corners[c][0] * r, sy = ty + corners[c][1] * r;
      ctx.beginPath();
      ctx.moveTo(sx, sy - corners[c][1] * seg);
      ctx.lineTo(sx, sy);
      ctx.lineTo(sx - corners[c][0] * seg, sy);
      ctx.stroke();
    }
  }
}
function drawParticlesW(){
  for (var i = 0; i < particles.n; i++){
    var q = particles.items[i];
    var a = clamp(q.life / q.max, 0, 1);
    ctx.globalAlpha = a;
    ctx.fillStyle = q.color;
    ctx.fillRect(q.x - q.size / 2, q.y - q.size / 2, q.size, q.size);
  }
  ctx.globalAlpha = 1;
}
function drawFloatersW(){
  ctx.textAlign = 'center';
  for (var i = 0; i < floaters.n; i++){
    var f = floaters.items[i];
    ctx.globalAlpha = Math.min(1, f.life * 1.6);
    setFont(f.size, 'bold');
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillText(f.text, f.x + 2, f.y + 2);
    ctx.fillStyle = f.color;
    ctx.fillText(f.text, f.x, f.y);
  }
  ctx.globalAlpha = 1;
  ctx.textAlign = 'left';
}
function drawWall(){
  if (!Wall.active) return;
  var x = Wall.x - Cam.x;
  if (x < -140) return;
  var grd = ctx.createLinearGradient(x - 160, 0, x, 0);
  grd.addColorStop(0, 'rgba(255,40,90,0)');
  grd.addColorStop(0.55, 'rgba(255,40,90,0.30)');
  grd.addColorStop(1, 'rgba(255,90,140,0.75)');
  ctx.fillStyle = grd;
  ctx.fillRect(x - 160, 0, 160, VH);
  ctx.fillStyle = PAL().danger;
  ctx.beginPath();
  ctx.moveTo(x, 0);
  var step = 26;
  for (var y = 0; y <= VH + step; y += step){
    var j = Wall.jag[Math.floor(y / step) % Wall.jag.length];
    ctx.lineTo(x + j + Math.sin(Wall.phase + y * 0.02) * 6, y);
  }
  ctx.lineTo(x - 30, VH); ctx.lineTo(x - 30, 0);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.fillRect(x - 3, 0, 3, VH);
}

/* =====================================================================
   HUD
   ===================================================================== */
function drawHUD(){
  if (!P) return;
  var u = uiScale();
  var pad = Math.round(14 * u);

  /* hearts */
  var hs = Math.round(20 * u);
  for (var i = 0; i < P.maxHp; i++){
    var hx = pad + (i % 8) * (hs + 4);
    var hy = pad + Math.floor(i / 8) * (hs + 4);
    drawHeart(hx, hy, hs, i < P.hp, PAL().danger);
  }

  /* score */
  txt(fmt(S.score), VW - pad, pad + 26 * u, PAL().playerHi, 26 * u, 'right');
  txt('BEST ' + fmt(Math.max(S.best, Meta.bestScore)), VW - pad, pad + 44 * u, 'rgba(170,205,235,0.7)', 12 * u, 'right');
  txt('TIME ' + Math.floor(S.t) + 's   DIST ' + Math.floor(S.distance) + 'm', VW - pad, pad + 60 * u, 'rgba(170,205,235,0.55)', 12 * u, 'right');

  var y = pad + 66 * u;

  /* combo */
  if (S.combo > 0){
    var cw = Math.round(150 * u);
    txt('CHAIN x' + S.mult + '  (' + S.combo + ')', pad, y + 12 * u, PAL().gold, 15 * u, 'left');
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(pad, y + 18 * u, cw, 5);
    ctx.fillStyle = PAL().gold;
    ctx.fillRect(pad, y + 18 * u, cw * clamp(S.comboT / COMBO_WINDOW, 0, 1), 5);
    y += 30 * u;
  }

  /* heat */
  var hw = Math.round(120 * u);
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.fillRect(pad, y + 6 * u, hw, 5);
  ctx.fillStyle = P.overheated ? '#ff4d5e' : (P.heat > 0.7 ? '#ffb14d' : PAL().accent);
  ctx.fillRect(pad, y + 6 * u, hw * clamp(P.heat, 0, 1), 5);
  txt(P.overheated ? 'OVERHEAT' : WEAPONS[P.weapon].name, pad + hw + 8 * u, y + 12 * u,
      P.overheated ? '#ff4d5e' : 'rgba(190,220,250,0.8)', 12 * u, 'left');
  y += 22 * u;

  /* EMP meter */
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.fillRect(pad, y + 6 * u, hw, 5);
  ctx.fillStyle = S.bomb > 0.99 ? '#fff' : PAL().playerHi;
  ctx.fillRect(pad, y + 6 * u, hw * clamp(S.bomb, 0, 1), 5);
  txt('EMP', pad + hw + 8 * u, y + 12 * u, 'rgba(190,220,250,0.6)', 12 * u, 'left');
  y += 22 * u;

  /* shield timer */
  if (P.shieldT > 0){
    txt('SHIELD ' + P.shieldT.toFixed(1) + 's', pad, y + 10 * u, PAL().accent, 12 * u, 'left');
  }
  if (S.slowmo > 0){
    txt('TIME DILATION ' + S.slowmo.toFixed(1) + 's', pad, y + 24 * u, '#8fd6ff', 12 * u, 'left');
  }

  /* ---- mode objective ---- */
  if (S.modeId && S.modeId !== 'endless' && !S.attract){
    var oy = pad + ((S.bossActive && !S.bossActive.dead) ? 62 : 36) * u;
    var label = '', detail = '', prog = -1;
    if (S.modeId === 'timeattack'){
      label = 'TIME ATTACK'; detail = Math.ceil(S.timeLeft) + 's';
      prog = clamp(S.timeLeft / 90, 0, 1);
    } else if (S.modeId === 'bossrush'){
      label = 'BOSS RUSH'; detail = (S.bossCount || 0) + ' / ' + BOSS_ORDER.length;
      prog = clamp((S.bossCount || 0) / BOSS_ORDER.length, 0, 1);
    } else if (S.modeId === 'practice'){
      label = 'PRACTICE'; detail = 'NO DAMAGE';
    } else if (S.modeId === 'campaign' && S.stageDef){
      var st = S.stageDef;
      label = 'STAGE ' + st.n + ' \u00B7 ' + st.name;
      if (st.boss){
        detail = (S.bossCount >= 1) ? 'BOSS DOWN' : ('FIND THE ' + (BOSSES[st.boss] ? BOSSES[st.boss].name : 'BOSS'));
      } else {
        var need = st.kills || 0;
        detail = Math.max(0, Math.ceil(st.dur - S.t)) + 's   \u00B7   ' +
                 Math.min(S.kills, need) + ' / ' + need + ' KILLS';
        var tp = clamp(S.t / st.dur, 0, 1), kp = need ? clamp(S.kills / need, 0, 1) : 1;
        prog = Math.min(tp, kp);
      }
    }
    if (label){
      var bw2 = Math.round(VW * 0.42), bx2 = (VW - bw2) / 2;
      ctx.fillStyle = 'rgba(6,10,26,0.72)';
      ctx.fillRect(bx2 - 4, oy - 16 * u, bw2 + 8, prog >= 0 ? 36 * u : 24 * u);
      ctx.strokeStyle = 'rgba(90,220,255,0.35)'; ctx.lineWidth = 1;
      ctx.strokeRect(bx2 - 4, oy - 16 * u, bw2 + 8, prog >= 0 ? 36 * u : 24 * u);
      txt(label, VW / 2, oy, PAL().gold, 13 * u, 'center');
      txt(detail, VW / 2, oy + 15 * u, 'rgba(215,235,255,0.9)', 14 * u, 'center');
      if (prog >= 0){
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(bx2, oy + 20 * u, bw2, 5 * u);
        ctx.fillStyle = PAL().accent;
        ctx.fillRect(bx2, oy + 20 * u, bw2 * prog, 5 * u);
      }
    }
  }

  /* boss bar */
  if (S.bossActive && !S.bossActive.dead){
    var b = S.bossActive;
    var bw = Math.round(VW * 0.5), bx = (VW - bw) / 2, by = pad + 8 * u;
    ctx.fillStyle = 'rgba(0,0,0,0.65)';
    ctx.fillRect(bx - 3, by - 3, bw + 6, 18 * u + 6);
    ctx.fillStyle = 'rgba(120,40,80,0.9)';
    ctx.fillRect(bx, by, bw, 18 * u);
    var frac = clamp(b.hp / b.maxHp, 0, 1);
    ctx.fillStyle = b.phase === 3 ? '#ff2d6f' : (b.phase === 2 ? '#ff8a2b' : '#c47bff');
    ctx.fillRect(bx, by, bw * frac, 18 * u);
    var bl = (b.name || 'BOSS') + '  \u2014  PHASE ' + b.phase;
    if (b.turrets && b.turrets.length){
      var alive = 0;
      for (var tq = 0; tq < b.turrets.length; tq++) if (b.turrets[tq].hp > 0) alive++;
      bl += '   \u00B7   GUN PODS ' + alive + '/' + b.turrets.length;
      if (alive === 0) bl += '   \u00B7   CORE EXPOSED';
    }
    txt(bl, VW / 2, by + 13 * u, '#fff', 12 * u, 'center');
  }

  /* toast */
  if (S.toast){
    var ta = Math.min(1, S.toast.t * 3) * Math.min(1, (S.toast.life - S.toast.t) * 2);
    ctx.globalAlpha = clamp(ta, 0, 1);
    var ty = VH * 0.20;
    var tw = txtW(S.toast.text, 20 * u) + 40 * u;
    ctx.fillStyle = 'rgba(6,10,26,0.85)';
    ctx.fillRect(VW / 2 - tw / 2, ty - 26 * u, tw, 38 * u);
    ctx.strokeStyle = PAL().accent; ctx.lineWidth = 2;
    ctx.strokeRect(VW / 2 - tw / 2, ty - 26 * u, tw, 38 * u);
    txt(S.toast.text, VW / 2, ty, PAL().accent, 20 * u, 'center');
    ctx.globalAlpha = 1;
  }

  /* biome banner */
  var bio = biomeAt(Cam.x + VW * 0.4);
  if (bio.name !== S.lastBiomeName){
    S.lastBiomeName = bio.name;
    if (!S.attract) toast('ENTERING ' + bio.name);
  }
}
function drawHeart(x, y, size, filled, color){
  var map = ["0110110","1111111","1111111","0111110","0011100","0001000"];
  var px = size / 7;
  ctx.fillStyle = filled ? color : 'rgba(255,255,255,0.16)';
  for (var r = 0; r < map.length; r++)
    for (var c = 0; c < 7; c++)
      if (map[r][c] === '1') ctx.fillRect(x + c * px, y + r * px, Math.ceil(px) + 0.5, Math.ceil(px) + 0.5);
}

/* =====================================================================
   MENU FRAMEWORK
   ===================================================================== */
function panel(x, y, w, h, alpha){
  ctx.fillStyle = 'rgba(6,10,26,' + (alpha === undefined ? 0.88 : alpha) + ')';
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = 'rgba(90,220,255,0.5)'; ctx.lineWidth = 2;
  ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
  ctx.strokeStyle = 'rgba(90,220,255,0.14)';
  ctx.strokeRect(x + 7.5, y + 7.5, w - 15, h - 15);
}
function menuBegin(title, items){
  UI.title = title;
  UI.items = items;
  if (UI.index >= items.length) UI.index = 0;
}
function menuNav(inp){
  inp = inp || UserIn;
  var n = UI.items.length;
  if (!n) return;
  if (inp.upPressed) UI.index = (UI.index - 1 + n) % n;
  if (inp.downPressed) UI.index = (UI.index + 1) % n;
  var it = UI.items[UI.index];
  if (it){
    if (inp.leftPressed){
      if (it.type === 'slider'){ it.set(clamp(it.get() - it.step, it.min, it.max)); sfx('menu'); }
      else if (it.type === 'choice'){ it.set((it.get() - 1 + it.choices.length) % it.choices.length); sfx('menu'); }
    }
    if (inp.rightPressed){
      if (it.type === 'slider'){ it.set(clamp(it.get() + it.step, it.min, it.max)); sfx('menu'); }
      else if (it.type === 'choice'){ it.set((it.get() + 1) % it.choices.length); sfx('menu'); }
    }
    if (inp.actionPressed) activateItem(it);
  }
  if (UI.backPressed){ UI.backPressed = false; menuBack(); }
}
function activateItem(it){
  if (!it) return;
  if (it.type === 'action'){ sfx('confirm'); if (it.action) it.action(); }
  else if (it.type === 'toggle'){ it.set(it.get() ? 0 : 1); sfx('confirm'); }
  else if (it.type === 'choice'){ it.set((it.get() + 1) % it.choices.length); sfx('confirm'); }
  else if (it.type === 'slider'){ it.set(it.max); sfx('confirm'); }
  else if (it.type === 'back'){ sfx('back'); menuBack(); }
  else if (it.type === 'info'){ sfx('menu'); }
}
function menuBack(){
  var s = S.screen;
  if (s === SC.SETTINGS){
    if (UI.settingsFrom === SC.PAUSE){ S.screen = SC.PAUSE; }
    else { S.screen = SC.PLAY; S.attract = true; }
  }
  else if (s === SC.HELP && UI.helpMode === 'bind'){
    if (UI.settingsFrom === SC.PAUSE){ S.screen = SC.PAUSE; }
    else { S.screen = SC.PLAY; S.attract = true; }
    UI.helpMode = 'help';
  }
  else if (s === SC.LOADOUT){ S.screen = SC.PLAY; S.attract = true; }
  else if (s === SC.CODEX || s === SC.ACH || s === SC.STATS || s === SC.HISTORY ||
           s === SC.SCORES || s === SC.HELP || s === SC.META){ S.screen = SC.PLAY; S.attract = true; }
  else if (s === SC.PAUSE){ S.screen = SC.PLAY; }
}
function menuTap(pt){
  for (var i = 0; i < UI.rects.length; i++){
    var r = UI.rects[i];
    if (!r) continue;
    if (pt.x >= r.x && pt.x <= r.x + r.w && pt.y >= r.y && pt.y <= r.y + r.h){
      UI.index = i;
      var it = UI.items[i];
      if (!it) return;
      if (it.type === 'slider'){
        var mid = r.x + r.w / 2;
        if (pt.x < mid) it.set(clamp(it.get() - it.step, it.min, it.max));
        else it.set(clamp(it.get() + it.step, it.min, it.max));
        sfx('menu');
        return;
      }
      activateItem(it);
      return;
    }
  }
}

/* ---------- generic menu renderer (scrollable, icon-aware) ---------- */
function renderMenu(title, subtitle, items, opts){
  opts = opts || {};
  var u = uiScale();
  var pw = Math.min(VW * 0.92, 640 * u);
  var rowH = 46 * u;
  var headH = (subtitle ? 78 : 54) * u;
  var footH = (opts.footer ? 44 : 22) * u;
  var availTop = opts.top || (10 * u);
  var availBot = VH - (opts.bottom || (10 * u));
  var maxPanelH = availBot - availTop;
  var listSpace = maxPanelH - headH - footH;
  var visible = Math.max(3, Math.floor(listSpace / rowH));
  if (visible > items.length) visible = items.length;
  if (visible < 1) visible = 1;

  /* keep the highlighted row on screen */
  var scroll = 0;
  if (items.length > visible){
    scroll = clamp(UI.scroll | 0, 0, items.length - visible);
    if (UI.index < scroll) scroll = UI.index;
    if (UI.index >= scroll + visible) scroll = UI.index - visible + 1;
    scroll = clamp(scroll, 0, items.length - visible);
  }
  UI.scroll = scroll;

  var ph = headH + visible * rowH + footH;
  var px = (VW - pw) / 2;
  var py = clamp((VH - ph) / 2, availTop, Math.max(availTop, availBot - ph));
  panel(px, py, pw, ph, opts.alpha);

  txt(title, VW / 2, py + 36 * u, PAL().playerHi, 30 * u, 'center');
  if (subtitle) txt(subtitle, VW / 2, py + 62 * u, 'rgba(175,210,240,0.75)', 14 * u, 'center');

  var scrollable = items.length > visible;
  var scrollbarW = scrollable ? 10 * u : 0;

  UI.rects = [];
  var y = py + headH;
  for (var k = 0; k < visible; k++){
    var i = scroll + k;
    var it = items[i];
    if (!it) break;
    var sel = (i === UI.index);
    var rx = px + 14 * u;
    var rw = pw - 28 * u - scrollbarW;
    var rh = rowH - 6 * u;
    UI.rects[i] = { x: rx, y: y, w: rw, h: rh };

    if (sel){
      ctx.fillStyle = 'rgba(90,220,255,0.16)';
      ctx.fillRect(rx, y, rw, rh);
      ctx.fillStyle = PAL().accent;
      ctx.fillRect(rx, y, 3, rh);
    }

    var lx = rx + 14 * u;
    if (it.icon){
      var isz = rh - 6 * u;
      var ico = iconSprite(it.icon);
      if (ico){
        ctx.globalAlpha = sel ? 1 : 0.82;
        ctx.drawImage(ico, rx + 10 * u, y + (rh - isz) / 2, isz, isz);
        ctx.globalAlpha = 1;
      }
      lx = rx + 12 * u + isz + 10 * u;
    }

    var ly = it.desc ? (y + rh * 0.44) : (y + rh * 0.68);
    txt(it.label, lx, ly, sel ? '#ffffff' : 'rgba(200,225,250,0.85)', 17 * u, 'left');
    if (it.desc){
      txt(it.desc, lx, y + rh * 0.84, 'rgba(150,185,220,0.72)', 12 * u, 'left');
    }

    if (it.type === 'toggle'){
      txt(it.get() ? 'ON' : 'OFF', rx + rw - 14 * u, y + rh * 0.68,
          it.get() ? PAL().good : 'rgba(160,180,205,0.6)', 16 * u, 'right');
    } else if (it.type === 'choice'){
      var lbl = it.choices[clamp(it.get(), 0, it.choices.length - 1)];
      txt(lbl, rx + rw - 14 * u, y + rh * 0.68, PAL().gold, 16 * u, 'right');
      txt('\u25C0', rx + rw - 14 * u - txtW(lbl, 16 * u) - 16 * u, y + rh * 0.68,
          'rgba(180,210,240,0.6)', 13 * u, 'right');
    } else if (it.type === 'slider'){
      var bw = 130 * u, bx = rx + rw - 14 * u - bw, by = y + rh * 0.5 - 3 * u;
      ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(bx, by, bw, 6 * u);
      var f = (it.get() - it.min) / (it.max - it.min);
      ctx.fillStyle = PAL().accent; ctx.fillRect(bx, by, bw * f, 6 * u);
      txt(Math.round(f * 100) + '%', bx - 8 * u, y + rh * 0.68, 'rgba(200,225,250,0.85)', 14 * u, 'right');
    } else if (it.type === 'info'){
      txt(it.value || '', rx + rw - 14 * u, y + rh * 0.68, 'rgba(190,215,240,0.8)', 16 * u, 'right');
    } else if (it.type === 'action' && it.value){
      txt(it.value, rx + rw - 14 * u, y + rh * 0.68, 'rgba(190,215,240,0.8)', 15 * u, 'right');
    }
    y += rowH;
  }

  if (scrollable){
    var sbx = px + pw - 13 * u;
    var sby = py + headH + 2 * u;
    var sbh = visible * rowH - 8 * u;
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    ctx.fillRect(sbx, sby, 4 * u, sbh);
    var thumbH = Math.max(18 * u, sbh * (visible / items.length));
    var thumbY = sby + (sbh - thumbH) * (scroll / Math.max(1, items.length - visible));
    ctx.fillStyle = PAL().accent;
    ctx.fillRect(sbx, thumbY, 4 * u, thumbH);
    if (scroll > 0)
      txt('\u25B2', VW / 2, py + headH - 8 * u, 'rgba(120,255,235,0.85)', 14 * u, 'center');
    if (scroll + visible < items.length)
      txt('\u25BC', VW / 2, py + ph - footH + 6 * u, 'rgba(120,255,235,0.85)', 14 * u, 'center');
  }

  if (opts.footer){
    txt(opts.footer, VW / 2, py + ph - 16 * u, 'rgba(160,195,230,0.6)', 13 * u, 'center');
  }
  return { x: px, y: py, w: pw, h: ph };
}


/* =====================================================================
   LOCALISATION — every drawn string passes through T()
   ===================================================================== */
var LANG = [
  null,
  { /* Hindi */
    'START RUN':'\u0916\u0947\u0932 \u0936\u0941\u0930\u0942 \u0915\u0930\u0947\u0902', 'CAMPAIGN':'\u0905\u092D\u093F\u092F\u093E\u0928', 'BOSS RUSH':'\u092C\u0949\u0938 \u0930\u0936',
    'TIME ATTACK':'\u0938\u092E\u092F \u091A\u0941\u0928\u094C\u0924\u0940', 'PRACTICE RANGE':'\u0905\u092D\u094D\u092F\u093E\u0938 \u0915\u094D\u0937\u0947\u0924\u094D\u0930',
    'DAILY RUN':'\u0926\u0948\u0928\u093F\u0915 \u0926\u094C\u0921\u093C', 'WEEKLY CHALLENGE':'\u0938\u093E\u092A\u094D\u0924\u093E\u0939\u093F\u0915 \u091A\u0941\u0928\u094C\u0924\u0940',
    'LOADOUT':'\u0938\u091C\u094D\u091C\u093E', 'HOW TO PLAY':'\u0915\u0948\u0938\u0947 \u0916\u0947\u0932\u0947\u0902', 'CODEX':'\u0915\u094B\u0921\u0947\u0915\u094D\u0938',
    'ACHIEVEMENTS':'\u0909\u092A\u0932\u092C\u094D\u0927\u093F\u092F\u093E\u0901', 'CAREER STATS':'\u0915\u0930\u093F\u092F\u0930 \u0906\u0901\u0915\u0921\u093C\u0947',
    'RUN HISTORY':'\u0926\u094C\u0921\u093C \u0907\u0924\u093F\u0939\u093E\u0938', 'HIGH SCORES':'\u0909\u091A\u094D\u091A \u0905\u0902\u0915',
    'WORKSHOP':'\u0915\u093E\u0930\u094D\u092F\u0936\u093E\u0932\u093E', 'SETTINGS':'\u0938\u0947\u091F\u093F\u0902\u0917\u094D\u0938',
    'FULLSCREEN':'\u092A\u0942\u0930\u094D\u0923 \u0938\u094D\u0915\u094D\u0930\u0940\u0928', 'BACK':'\u0935\u093E\u092A\u0938',
    'RESUME':'\u091C\u093E\u0930\u0940 \u0930\u0916\u0947\u0902', 'RESTART RUN':'\u0926\u094C\u0921\u093C \u092A\u0941\u0928\u0903 \u0906\u0930\u0902\u092D',
    'QUIT TO TITLE':'\u0936\u0940\u0930\u094D\u0937\u0915 \u092A\u0930 \u091C\u093E\u090F\u0901', 'GAME OVER':'\u0916\u0947\u0932 \u0938\u092E\u093E\u092A\u094D\u0924',
    'PAUSED':'\u0930\u0941\u0915\u093E \u0939\u0941\u0906', 'SCORE':'\u0905\u0902\u0915', 'KILLS':'\u092E\u093E\u0930',
    'SURVIVED':'\u091C\u0940\u0935\u093F\u0924 \u0930\u0939\u0947', 'LEVEL':'\u0938\u094D\u0924\u0930', 'DIFFICULTY':'\u0915\u0920\u093F\u0928\u093E\u0908',
    'MUSIC VOLUME':'\u0938\u0902\u0917\u0940\u0924', 'SFX VOLUME':'\u092A\u094D\u0930\u092D\u093E\u0935 \u0927\u094D\u0935\u0928\u093F',
    'COLOUR PALETTE':'\u0930\u0902\u0917 \u092A\u091F\u0932', 'TEXT SIZE':'\u092A\u093E\u0920 \u0906\u0915\u093E\u0930',
    'SCREEN SHAKE':'\u0938\u094D\u0915\u094D\u0930\u0940\u0928 \u0915\u0902\u092A\u0928', 'REDUCED MOTION':'\u0915\u092E \u0917\u0924\u093F',
    'ON':'\u091A\u093E\u0932\u0942', 'OFF':'\u092C\u0902\u0926', 'NORMAL':'\u0938\u093E\u092E\u093E\u0928\u094D\u092F',
    'HARD':'\u0915\u0920\u093F\u0928', 'NIGHTMARE':'\u0926\u0941\u0903\u0938\u094D\u0935\u092A\u094D\u0928', 'ASSIST':'\u0938\u0939\u093E\u092F\u0924\u093E',
    'SELECT':'\u091A\u0941\u0928\u0947\u0902'
  },
  { /* Gujarati */
    'START RUN':'\u0AB0\u0AAE\u0AA4 \u0AB6\u0AB0\u0AC2 \u0A95\u0AB0\u0ACB', 'CAMPAIGN':'\u0A9D\u0AC1\u0A82\u0AAC\u0AC7\u0AB6', 'BOSS RUSH':'\u0AAC\u0ACB\u0AB8 \u0AB0\u0AB6',
    'TIME ATTACK':'\u0AB8\u0AAE\u0AAF \u0AAA\u0AB0\u0AC0\u0A95\u0ACD\u0AB7\u0ABE', 'PRACTICE RANGE':'\u0A85\u0AAD\u0ACD\u0AAF\u0ABE\u0AB8 \u0A95\u0ACD\u0AB7\u0AC7\u0AA4\u0ACD\u0AB0',
    'DAILY RUN':'\u0AA6\u0AC8\u0AA8\u0ABF\u0A95 \u0AA6\u0ACC\u0AA1', 'WEEKLY CHALLENGE':'\u0AB8\u0AAA\u0ACD\u0AA4\u0ABE\u0AB9\u0ABF\u0A95 \u0AAA\u0AB0\u0AC0\u0A95\u0ACD\u0AB7\u0ABE',
    'LOADOUT':'\u0AB8\u0A9C\u0ACD\u0A9C\u0ABE', 'HOW TO PLAY':'\u0A95\u0AC7\u0AB5\u0AC0 \u0AB0\u0AC0\u0AA4\u0AC7 \u0AB0\u0AAE\u0AB5\u0AC1\u0A82',
    'CODEX':'\u0A95\u0ACB\u0AA1\u0AC7\u0A95\u0ACD\u0AB8', 'ACHIEVEMENTS':'\u0AB8\u0ABF\u0AA6\u0ACD\u0AA7\u0ABF\u0A93',
    'CAREER STATS':'\u0A95\u0AB0\u0ABF\u0AAF\u0AB0 \u0A86\u0A82\u0A95\u0AA1\u0ABE', 'RUN HISTORY':'\u0AA6\u0ACC\u0AA1 \u0A87\u0AA4\u0ABF\u0AB9\u0ABE\u0AB8',
    'HIGH SCORES':'\u0AB8\u0AB0\u0ACD\u0AB5\u0ACB\u0A9A\u0ACD\u0A9A \u0AB8\u0ACD\u0A95\u0ACB\u0AB0', 'WORKSHOP':'\u0A95\u0ABE\u0AB0\u0ACD\u0AAF\u0AB6\u0ABE\u0AB3\u0ABE',
    'SETTINGS':'\u0AB8\u0AC7\u0A9F\u0ABF\u0A82\u0A97\u0ACD\u0AB8', 'FULLSCREEN':'\u0AAA\u0AC2\u0AB0\u0ACD\u0AA3 \u0AB8\u0ACD\u0A95\u0ACD\u0AB0\u0AC0\u0AA8',
    'BACK':'\u0AAA\u0ABE\u0A9B\u0AB3', 'RESUME':'\u0A9A\u0ABE\u0AB2\u0AC1 \u0AB0\u0ABE\u0A96\u0ACB',
    'RESTART RUN':'\u0AA6\u0ACC\u0AA1 \u0AAB\u0AB0\u0AC0 \u0AB6\u0AB0\u0AC2', 'QUIT TO TITLE':'\u0AB6\u0AC0\u0AB0\u0ACD\u0AB7\u0A95 \u0AAA\u0AB0 \u0A9C\u0ABE\u0A93',
    'GAME OVER':'\u0AB0\u0AAE\u0AA4 \u0AB8\u0AAE\u0ABE\u0AAA\u0ACD\u0AA4', 'PAUSED':'\u0AB0\u0AC1\u0A95\u0AC7\u0AB2\u0AC1\u0A82',
    'SCORE':'\u0AB8\u0ACD\u0A95\u0ACB\u0AB0', 'KILLS':'\u0AAE\u0ABE\u0AB0', 'SURVIVED':'\u0A9F\u0ABF\u0A95\u0ACD\u0AAF\u0AC1\u0A82',
    'LEVEL':'\u0AB8\u0ACD\u0AA4\u0AB0', 'DIFFICULTY':'\u0AAE\u0AC1\u0AB6\u0ACD\u0A95\u0AC7\u0AB2\u0AC0', 'ON':'\u0A9A\u0ABE\u0AB2\u0AC1',
    'OFF':'\u0AAC\u0A82\u0AA7', 'NORMAL':'\u0AB8\u0ABE\u0AAE\u0ABE\u0AA8\u0ACD\u0AAF', 'HARD':'\u0A95\u0AA0\u0ABF\u0AA8',
    'SELECT':'\u0AAA\u0AB8\u0A82\u0AA6 \u0A95\u0AB0\u0ACB'
  }
];
function T(s){
  if (!Settings.lang) return s;
  var t = LANG[Settings.lang];
  return (t && t[s]) || s;
}

/* =====================================================================
   SCREEN BUILDERS
   ===================================================================== */
function buildPauseMenu(){
  return [
    { label:'RESUME', icon:'flag', type:'action', action:function(){ S.screen = SC.PLAY; } },
    { label:'CONTROLS', icon:'gear', type:'action', action:function(){ UI.settingsFrom = SC.PAUSE; S.screen = SC.HELP; UI.helpMode = 'bind'; UI.index = 0; } },
    { label:'SETTINGS', icon:'gear', type:'action', action:function(){ UI.settingsFrom = SC.PAUSE; S.screen = SC.SETTINGS; UI.index = 0; } },
    { label:'CODEX', icon:'book', type:'action', action:function(){ S.screen = SC.CODEX; CodexState.index = 0; CodexState.scroll = 0; } },
    { label:'CAREER STATS', icon:'chart', type:'action', action:function(){ S.screen = SC.STATS; } },
    { label:'WATCH REPLAY', icon:'camera', type:'action', action:function(){
        if (S.lastReplay && S.lastReplay.length){
          Replay.frames = S.lastReplay.slice();
          Replay.idx = 0;
          beginRun({ seed: S.lastSeed || 1, mode: S.lastModeId || 'endless',
                     stage: S.lastStage || null, pilot: P.pilot, mods: S.lastModIds || [] });
          Replay.recording = false; Replay.playing = true; S.replayMode = 1;
          toast('REPLAY');
        } else if (replayStartPlayback()){ S.screen = SC.PLAY; toast('REPLAY'); }
        else { UI.msg = 'no replay recorded'; UI.msgT = 1.6; }
      } },
    { label:'SAVE A SCREENSHOT', icon:'camera', type:'action', action:function(){ takePhoto(); } },
    { label:'RESTART RUN', icon:'regen', type:'action', action:function(){ beginRun({ mode: S.modeId, stage: S.mode.stage || null, pilot: P.pilot, mods: S.lastModIds || [] }); } },
    { label:'QUIT TO TITLE', icon:'back', type:'back' }
  ];
}
function buildSettingsMenu(){
  return [
    { label:'DIFFICULTY', type:'choice', choices:['ASSIST','NORMAL','HARD','NIGHTMARE'],
      get:function(){ return Settings.difficulty; },
      set:function(v){ Settings.difficulty = clamp(v, 0, 3); saveSettings(); } },
    { label:'MUSIC VOLUME', type:'slider', min:0, max:1, step:0.1,
      get:function(){ return Settings.music; },
      set:function(v){ Settings.music = clamp(v, 0, 1); audioApplyVolumes(); saveSettings(); } },
    { label:'SFX VOLUME', type:'slider', min:0, max:1, step:0.1,
      get:function(){ return Settings.sfx; },
      set:function(v){ Settings.sfx = clamp(v, 0, 1); audioApplyVolumes(); saveSettings(); } },
    { label:'COLOUR PALETTE', type:'choice', choices:['NEON','DEUTERANOPIA','HIGH CONTRAST'],
      get:function(){ return Settings.palette; },
      set:function(v){ Settings.palette = clamp(v, 0, 2); clearSpriteCache(); saveSettings(); } },
    { label:'TEXT SIZE', type:'choice', choices:['NORMAL','LARGE','HUGE'],
      get:function(){ return Math.round((Settings.textScale - 1) / 0.25); },
      set:function(v){ Settings.textScale = 1 + clamp(v, 0, 2) * 0.25; saveSettings(); } },
    { label:'SCREEN SHAKE', type:'toggle',
      get:function(){ return Settings.shake; },
      set:function(v){ Settings.shake = v; saveSettings(); } },
    { label:'REDUCED MOTION', type:'toggle',
      get:function(){ return Settings.reduced; },
      set:function(v){ Settings.reduced = v; saveSettings(); } },
    { label:'CRT CURVATURE', type:'toggle',
      get:function(){ return Settings.crt; },
      set:function(v){ Settings.crt = v; saveSettings(); } },
    { label:'BLOOM GLOW', type:'toggle',
      get:function(){ return Settings.bloom; },
      set:function(v){ Settings.bloom = v; saveSettings(); } },
    { label:'SCANLINES', type:'toggle',
      get:function(){ return Settings.scan; },
      set:function(v){ Settings.scan = v; saveSettings(); } },
    { label:'LIGHT POOLS', type:'toggle',
      get:function(){ return Settings.lights; },
      set:function(v){ Settings.lights = v; saveSettings(); } },
    { label:'FOREGROUND', type:'toggle',
      get:function(){ return Settings.fg; },
      set:function(v){ Settings.fg = v; saveSettings(); } },
    { label:'TUTORIAL TIPS', type:'toggle',
      get:function(){ return Settings.toasts; },
      set:function(v){ Settings.toasts = v; saveSettings(); } },
    { label:'PERFORMANCE', type:'choice', choices:['AUTO','HIGH','LOW'],
      get:function(){ return Settings.quality === 'auto' ? 0 : (Settings.quality === 'high' ? 1 : 2); },
      set:function(v){
        Settings.quality = v === 0 ? 'auto' : (v === 1 ? 'high' : 'low');
        if (Settings.quality === 'auto') S.quality = isMobile() ? 'low' : 'high';
        else S.quality = Settings.quality;
        saveSettings(); resize();
      } },
    { label:'TOUCH CONTROLS', type:'choice', choices:['AUTO','ON','OFF'],
      get:function(){ return Settings.touch === 'auto' ? 0 : (Settings.touch === 'on' ? 1 : 2); },
      set:function(v){ Settings.touch = v === 0 ? 'auto' : (v === 1 ? 'on' : 'off'); saveSettings(); applyTouchVisibility(); } },
    { label:'LEFT-HANDED PAD', type:'toggle',
      get:function(){ return Settings.lefty; },
      set:function(v){ Settings.lefty = v; saveSettings(); applyTouchVisibility(); } },
    { label:'HAPTICS', type:'toggle',
      get:function(){ return Settings.haptics; },
      set:function(v){ Settings.haptics = v; saveSettings(); } },
    { label:'LANGUAGE', type:'choice', choices:['ENGLISH','\u0939\u093F\u0928\u094D\u0926\u0940','\u0A97\u0AC1\u0A9C\u0AB0\u0ABE\u0AA4\u0AC0'],
      get:function(){ return Settings.lang | 0; },
      set:function(v){ Settings.lang = clamp(v, 0, 2); clearSpriteCache(); saveSettings(); } },
    { label:'WEATHER', type:'toggle', get:function(){ return Settings.weather; },
      set:function(v){ Settings.weather = v; saveSettings(); } },
    { label:'THREAT ARROWS', type:'toggle', get:function(){ return Settings.threatArrows; },
      set:function(v){ Settings.threatArrows = v; saveSettings(); } },
    { label:'DAMAGE NUMBERS', type:'toggle', get:function(){ return Settings.damageNumbers; },
      set:function(v){ Settings.damageNumbers = v; saveSettings(); } },
    { label:'GROUND DECALS', type:'toggle', get:function(){ return Settings.decals; },
      set:function(v){ Settings.decals = v; saveSettings(); } },
    { label:'CAPTIONS', type:'toggle', get:function(){ return Settings.captions; },
      set:function(v){ Settings.captions = v; saveSettings(); } },
    { label:'AUTO-RUN', type:'toggle', get:function(){ return Settings.autorun; },
      set:function(v){ Settings.autorun = v; saveSettings(); } },
    { label:'TOUCH BUTTON SIZE', type:'slider', min:0.7, max:1.5, step:0.1,
      get:function(){ return Settings.touchSize; },
      set:function(v){ Settings.touchSize = clamp(v, 0.7, 1.5); saveSettings(); applyTouchVisibility(); } },
    { label:'TOUCH BUTTON OPACITY', type:'slider', min:0.2, max:1, step:0.1,
      get:function(){ return Settings.touchOpacity; },
      set:function(v){ Settings.touchOpacity = clamp(v, 0.2, 1); saveSettings(); applyTouchVisibility(); } },
    { label:'PHOTO MODE', type:'action', action:function(){ takePhoto(); } },
    { label:'EXPORT SAVE CODE', type:'action', action:function(){ exportProgress(); } },
    { label:'IMPORT SAVE CODE', type:'action', action:function(){ importProgress(); } },
    { label:'REBIND CONTROLS', type:'action', action:function(){ UI.settingsFrom = SC.SETTINGS; UI.bindIndex = 0; S.screen = SC.HELP; UI.helpMode = 'bind'; } },
    { label:'RESET META PROGRESS', type:'action', action:function(){
        Meta.scrap = 0; Meta.upHP = 0; Meta.upDmg = 0; Meta.upRate = 0; Meta.upLuck = 0;
        Meta.runs = 0; saveMeta(); UI.msg = 'meta progress reset'; UI.msgT = 1.8;
      } },
    { label:'BACK', type:'back' }
  ];
}
function buildTitleMenu(){
  function go(mode, stage){
    return function(){
      var mods = [];
      if (S.loadoutMods) for (var k in S.loadoutMods) if (S.loadoutMods[k]) mods.push(k);
      beginRun({ mode: mode, stage: stage, pilot: S.loadoutPilot || 'vector', mods: mods });
    };
  }
  return [
    { label:'START RUN', desc:'endless survival, difficulty ramps forever', icon:'flag', type:'action', action:go('endless') },
    { label:'CAMPAIGN', desc:'10 hand-built stages ending in a boss', icon:'flag', type:'action',
      action:function(){ S.screen = SC.LOADOUT; UI.returnTo = 'campaign'; } },
    { label:'BOSS RUSH', desc:'every boss back to back', icon:'trophy', type:'action', action:go('bossrush') },
    { label:'TIME ATTACK', desc:'90 seconds, maximum score', icon:'clock', type:'action', action:go('timeattack') },
    { label:'PRACTICE RANGE', desc:'no damage, no wall — learn the enemies', icon:'info', type:'action', action:go('practice') },
    { label:'DAILY RUN', desc:'same seed for everyone today', icon:'globe', type:'action',
      action:function(){ beginRun({ seed: todaySeed(), pilot: S.loadoutPilot || 'vector' }); toast('DAILY SEED ' + todaySeed().toString(16)); } },
    { label:'WEEKLY CHALLENGE', desc:'a harder seed that changes each week', icon:'star', type:'action',
      action:function(){ beginRun({ seed: weekSeed(), pilot: S.loadoutPilot || 'vector', mods:['swarm'] }); toast('WEEKLY SEED ' + weekSeed().toString(16)); } },
    { label:'LOADOUT', desc:'pick a pilot and stack run modifiers', icon:'grid', type:'action',
      action:function(){ S.screen = SC.LOADOUT; UI.returnTo = 'title'; } },
    { label:'CONTROLS', desc:'see and rebind every key', icon:'gear', type:'action',
      action:function(){ S.screen = SC.HELP; UI.helpMode = 'bind'; UI.index = 0; UI.settingsFrom = 'attract'; } },
    { label:'HOW TO PLAY', desc:'mechanics, the duck rule, and how scoring works', icon:'book', type:'action',
      action:function(){ S.screen = SC.HELP; UI.helpMode = 'help'; UI.index = 0; } },
    { label:'CODEX', desc:'every enemy, hazard, weapon and card you have found', icon:'book', type:'action',
      action:function(){ S.screen = SC.CODEX; CodexState.index = 0; CodexState.scroll = 0; } },
    { label:'ACHIEVEMENTS', desc:'30 things to chase', icon:'medal', type:'action',
      action:function(){ S.screen = SC.ACH; AchState.index = 0; AchState.scroll = 0; } },
    { label:'CAREER STATS', desc:'lifetime totals', icon:'chart', type:'action',
      action:function(){ S.screen = SC.STATS; } },
    { label:'RUN HISTORY', desc:'your last 12 runs, replayable', icon:'clock', type:'action',
      action:function(){ S.screen = SC.HISTORY; HistState.index = 0; HistState.scroll = 0; } },
    { label:'HIGH SCORES', desc:'top 10, stored on this device', icon:'trophy', type:'action',
      action:function(){ S.screen = SC.SCORES; UI.index = 0; } },
    { label:'WORKSHOP', desc:'spend scrap on permanent upgrades', icon:'scrap', type:'action',
      action:function(){ S.screen = SC.META; UI.index = 0; } },
    { label:'SETTINGS', desc:'volume, accessibility, controls', icon:'gear', type:'action',
      action:function(){ UI.settingsFrom = 'attract'; S.screen = SC.SETTINGS; UI.index = 0; } },
    { label: (document.fullscreenElement || document.webkitFullscreenElement) ? 'EXIT FULLSCREEN' : 'FULLSCREEN',
      desc:'fill the screen', icon:'grid', type:'action', action:function(){ toggleFullscreen(); } }
  ];
}
function buildMetaMenu(){
  function cost(level){ return 40 + level * 35; }
  return [
    { label:'+1 START HP', type:'action', value:'LV ' + Meta.upHP,
      action:function(){ var c = cost(Meta.upHP); if (Meta.scrap >= c){ Meta.scrap -= c; Meta.upHP++; saveMeta(); sfx('confirm'); } else { sfx('back'); UI.msg = 'need ' + c + ' scrap'; UI.msgT = 1.5; } } },
    { label:'+1 START DAMAGE', type:'action', value:'LV ' + Meta.upDmg,
      action:function(){ var c = cost(Meta.upDmg); if (Meta.scrap >= c){ Meta.scrap -= c; Meta.upDmg++; saveMeta(); sfx('confirm'); } else { sfx('back'); UI.msg = 'need ' + c + ' scrap'; UI.msgT = 1.5; } } },
    { label:'+1 FIRE RATE', type:'action', value:'LV ' + Meta.upRate,
      action:function(){ var c = cost(Meta.upRate); if (Meta.scrap >= c){ Meta.scrap -= c; Meta.upRate++; saveMeta(); sfx('confirm'); } else { sfx('back'); UI.msg = 'need ' + c + ' scrap'; UI.msgT = 1.5; } } },
    { label:'+4% CRIT CHANCE', type:'action', value:'LV ' + Meta.upLuck,
      action:function(){ var c = cost(Meta.upLuck); if (Meta.scrap >= c){ Meta.scrap -= c; Meta.upLuck++; saveMeta(); sfx('confirm'); } else { sfx('back'); UI.msg = 'need ' + c + ' scrap'; UI.msgT = 1.5; } } },
    { label:'BACK', type:'back' }
  ];
}

/* ---------- draw the title / attract ---------- */
function drawTitle(){
  var u = uiScale();
  var pulse = 0.5 + 0.5 * Math.sin(S.t * 3);

  ctx.fillStyle = 'rgba(4,6,16,0.74)';
  ctx.fillRect(0, 0, VW, VH);

  /* logo block, sized to the screen so it never fights the menu */
  var logoSize = Math.min(58 * u, VH * 0.105);
  var topY = Math.max(10 * u, VH * 0.03);
  var logoBase = topY + logoSize;            /* baseline of the wordmark */
  var sub1Y = logoBase + 20 * u;
  var sub2Y = sub1Y + 20 * u;
  var logoBottom = sub2Y + 14 * u;

  ctx.textAlign = 'center';
  setFont(logoSize, 'bold');
  ctx.fillStyle = 'rgba(255,60,140,' + (0.30 + pulse * 0.30) + ')';
  ctx.fillText('NEON RUNNER', VW / 2 + 4, logoBase + 4);
  ctx.fillStyle = PAL().playerHi;
  ctx.fillText('NEON RUNNER', VW / 2, logoBase);
  ctx.textAlign = 'left';
  txt('AUTO-FIRE \u00B7 SIDE-SCROLLING \u00B7 SHOOTER', VW / 2, sub1Y, 'rgba(180,220,255,0.75)', 14 * u, 'center');
  txt('you never press fire \u2014 the gun shoots anything in range', VW / 2, sub2Y, 'rgba(150,190,225,0.6)', 12 * u, 'center');

  var items = buildTitleMenu();
  renderMenu('', null, items, {
    top: logoBottom,
    bottom: 10 * u,
    footer: '\u2191\u2193 SELECT  \u00B7  ENTER / TAP TO PLAY  \u00B7  ESC BACK'
  });
}
function drawHelp(){
  var u = uiScale();
  if (UI.helpMode === 'bind'){ drawBindScreen(); return; }
  var items = [{ label:'BACK', type:'back' }];
  var pw = Math.min(VW * 0.92, 720 * u);
  var ph = Math.min(VH * 0.86, 520 * u);
  var px = (VW - pw) / 2, py = (VH - ph) / 2;
  panel(px, py, pw, ph);
  txt('HOW TO PLAY', VW / 2, py + 40 * u, PAL().playerHi, 28 * u, 'center');
  var lines = [
    [keyLabel(Keys.left[0]) + '  ' + keyLabel(Keys.right[0]), 'RUN LEFT / RIGHT'],
    [keyLabel(Keys.up[0]) + '  /  ' + keyLabel(Keys.action[0]), 'JUMP'],
    [keyLabel(Keys.down[0]), 'DUCK \u2014 enemy lasers pass over you'],
    ['hold ' + keyLabel(Keys.down[0]) + ' while running', 'SLIDE \u2014 brief invulnerability'],
    ['land on an enemy', 'STOMP \u2014 kills it, bounces you up'],
    ['(no fire button)', 'YOUR GUN FIRES ITSELF AT ANY TARGET IN RANGE'],
    ['', ''],
    ['GRAZE', 'near-miss enemy fire to charge the EMP blast'],
    ['CHAIN', 'kills within 2.5s stack up to a x8 multiplier'],
    ['HEAT', 'firing builds heat \u2014 break line of sight to cool'],
    ['', ''],
    ['P / \u2190 back', 'PAUSE  \u00B7  ESC or the \u21B6 button goes back'],
    ['WALL', 'the red wall never stops \u2014 keep moving right']
  ];
  var y = py + 78 * u;
  var lh = Math.min(26 * u, (ph - 150 * u) / lines.length);
  for (var i = 0; i < lines.length; i++){
    txt(lines[i][0], px + 30 * u, y, PAL().gold, 14 * u, 'left');
    txt(lines[i][1], px + 210 * u, y, 'rgba(210,235,255,0.88)', 13 * u, 'left');
    y += lh;
  }
  UI.rects = [{ x: px + pw / 2 - 90 * u, y: py + ph - 58 * u, w: 180 * u, h: 40 * u }];
  var sel = UI.index === 0;
  ctx.fillStyle = sel ? 'rgba(90,220,255,0.18)' : 'rgba(90,220,255,0.07)';
  ctx.fillRect(UI.rects[0].x, UI.rects[0].y, UI.rects[0].w, UI.rects[0].h);
  txt('BACK', VW / 2, py + ph - 32 * u, sel ? '#fff' : 'rgba(200,225,250,0.85)', 17 * u, 'center');
}
var ACTION_LABEL = {
  left:'RUN LEFT', right:'RUN RIGHT', up:'JUMP', down:'DUCK / SLIDE',
  action:'JUMP / CONFIRM', pause:'PAUSE', back:'BACK / CANCEL'
};
function buildBindItems(){
  var items = ACTIONS.map(function(a){
    var keys = (Keys[a] || []).map(keyLabel).join('   ');
    return { label: (ACTION_LABEL[a] || a.toUpperCase()), type:'action', value: keys,
      icon: (a === 'left' || a === 'right') ? 'speed' : (a === 'up' ? 'jump' :
            (a === 'down' ? 'shield' : (a === 'pause' ? 'clock' : 'back'))),
      action:function(){ startRebind(a); } };
  });
  items.push({ label:'RESET TO DEFAULTS', type:'action', icon:'regen', action:function(){
    for (var i = 0; i < ACTIONS.length; i++) Keys[ACTIONS[i]] = DefaultKeys[ACTIONS[i]].slice();
    saveKeys(); sfx('confirm'); UI.msg = 'controls reset to defaults'; UI.msgT = 1.8;
  } });
  items.push({ label:'BACK', type:'back', icon:'back' });
  return items;
}
function drawBindScreen(){
  var items = buildBindItems();
  renderMenu('CONTROLS',
             UI.listening
               ? ('PRESS THE NEW KEY FOR "' + (ACTION_LABEL[UI.listening] || UI.listening) + '"  \u00B7  ESC TO CANCEL')
               : 'select an action and press a key to rebind it',
             items, { footer:'\u2191\u2193 SELECT  \u00B7  ENTER REBIND  \u00B7  ESC BACK' });
}
function startRebind(action){
  UI.listenLabel = action.toUpperCase();
  UI.listening = action;
  Rebinding = function(code){
    if (code === 'Escape'){ UI.listening = null; Rebinding = null; sfx('back'); return true; }
    var list = Keys[action] || [];
    for (var i = 0; i < ACTIONS.length; i++){
      if (ACTIONS[i] === action) continue;
      Keys[ACTIONS[i]] = (Keys[ACTIONS[i]] || []).filter(function(c){ return c !== code; });
    }
    if (list.indexOf(code) === -1) list.push(code);
    Keys[action] = list.slice(0, 4);
    saveKeys();
    UI.listening = null; Rebinding = null;
    sfx('confirm');
    return true;
  };
}
function drawScores(){
  var u = uiScale();
  var items = [{ label:'BACK', type:'back' }];
  var pw = Math.min(VW * 0.92, 640 * u);
  var ph = Math.min(VH * 0.9, 560 * u);
  var px = (VW - pw) / 2, py = (VH - ph) / 2;
  panel(px, py, pw, ph);
  txt('HIGH SCORES', VW / 2, py + 40 * u, PAL().playerHi, 28 * u, 'center');
  txt('stored on this device only', VW / 2, py + 62 * u, 'rgba(160,195,230,0.6)', 12 * u, 'center');
  var y = py + 96 * u;
  if (!Scores.length){
    txt('no scores yet \u2014 go and survive something', VW / 2, y + 20 * u, 'rgba(180,210,240,0.7)', 15 * u, 'center');
  }
  for (var i = 0; i < Scores.length; i++){
    var s = Scores[i];
    var col = i === 0 ? PAL().gold : (i < 3 ? PAL().accent : 'rgba(200,225,250,0.85)');
    txt(String(i + 1).padStart(2, '0'), px + 40 * u, y, 'rgba(160,195,230,0.7)', 15 * u, 'left');
    txt(s.name, px + 86 * u, y, col, 16 * u, 'left');
    txt(fmt(s.score), px + pw - 40 * u, y, col, 16 * u, 'right');
    txt(s.mode + '  ' + s.kills + 'K  ' + s.time + 's  ' + s.date, px + 86 * u, y + 15 * u, 'rgba(150,185,220,0.55)', 11 * u, 'left');
    y += 34 * u;
  }
  UI.rects = [{ x: px + pw / 2 - 90 * u, y: py + ph - 58 * u, w: 180 * u, h: 40 * u }];
  var sel = UI.index === 0;
  ctx.fillStyle = sel ? 'rgba(90,220,255,0.18)' : 'rgba(90,220,255,0.07)';
  ctx.fillRect(UI.rects[0].x, UI.rects[0].y, UI.rects[0].w, UI.rects[0].h);
  txt('BACK', VW / 2, py + ph - 32 * u, sel ? '#fff' : 'rgba(200,225,250,0.85)', 17 * u, 'center');
}
function drawPause(){
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillRect(0, 0, VW, VH);
  var items = buildPauseMenu();
  renderMenu('PAUSED', 'P to resume \u00B7 ESC or \u21B6 to go back', items);
}
function drawSettings(){
  ctx.fillStyle = 'rgba(0,0,0,0.72)';
  ctx.fillRect(0, 0, VW, VH);
  var items = buildSettingsMenu();
  renderMenu('SETTINGS', 'arrows adjust \u00B7 ENTER selects \u00B7 tap on touch', items, { footer:'changes save automatically' });
}
function drawCards(){
  var u = uiScale();
  ctx.fillStyle = 'rgba(4,8,22,0.88)';
  ctx.fillRect(0, 0, VW, VH);

  var list = S.cardChoices || [];
  var n = list.length;
  if (!n) return;

  var need = 132 + 250 + 54;
  var fu = u * Math.min(1, (VH - 20 * u) / (need * u));

  var headY = Math.max(16 * fu, VH * 0.07);
  txt('LEVEL ' + P.level + '  \u2014  CHOOSE AN UPGRADE', VW / 2, headY, PAL().playerHi, 26 * fu, 'center');
  txt('HP ' + P.hp + '/' + P.maxHp + '   \u00B7   ' + WEAPONS[P.weapon].name +
      '   \u00B7   ' + P.cardsTaken + ' CARDS TAKEN',
      VW / 2, headY + 22 * fu, 'rgba(160,195,230,0.7)', 12 * fu, 'center');

  var gap = 20 * fu;
  var sideMargin = Math.max(16 * fu, VW * 0.04);
  var cw = Math.min((VW - sideMargin * 2 - gap * (n - 1)) / n, 250 * fu);
  var iszFu = Math.min(cw * 0.42 / fu, 62);
  var dsize = Math.min(13 * fu, cw * 0.095);
  var maxW = cw - 22 * fu;

  /* pre-wrap every description so all cards share one height */
  var wrapped = [], maxLines = 1;
  for (var p = 0; p < n; p++){
    var words = String(list[p].desc || '').split(' ');
    var lines = [], line = '';
    for (var w = 0; w < words.length; w++){
      var test = line ? line + ' ' + words[w] : words[w];
      if (txtW(test, dsize) > maxW && line){ lines.push(line); line = words[w]; }
      else line = test;
    }
    if (line) lines.push(line);
    if (!lines.length) lines.push('');
    wrapped.push(lines);
    if (lines.length > maxLines) maxLines = lines.length;
  }

  var chUnits = 14 + iszFu + 22 + 20 + maxLines * 17 + 30;
  var ch = Math.min(chUnits * fu, VH - (headY + 60 * fu) - 54 * fu);
  if (ch < 130 * fu) ch = 130 * fu;

  var totalW = n * cw + (n - 1) * gap;
  var x0 = (VW - totalW) / 2;
  var y0 = headY + 44 * fu;

  UI.rects = [];
  for (var i = 0; i < n; i++){
    var c = list[i];
    var x = x0 + i * (cw + gap);
    UI.rects.push({ x: x, y: y0, w: cw, h: ch });
    var sel = (i === S.cardIndex);
    var tier = c.tier || 1;
    var tierCol = tier >= 3 ? PAL().gold : (tier === 2 ? PAL().accent : 'rgba(90,220,255,0.55)');

    ctx.fillStyle = sel ? 'rgba(90,220,255,0.16)' : 'rgba(10,16,34,0.94)';
    ctx.fillRect(x, y0, cw, ch);
    ctx.strokeStyle = sel ? PAL().accent : tierCol;
    ctx.lineWidth = sel ? 3 : 2;
    ctx.strokeRect(x + 0.5, y0 + 0.5, cw - 1, ch - 1);
    if (sel){ ctx.fillStyle = PAL().accent; ctx.fillRect(x, y0, cw, 3); }

    var isz = iszFu * fu;
    var ix = x + (cw - isz) / 2, iy = y0 + 14 * fu;
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(ix - 4 * fu, iy - 4 * fu, isz + 8 * fu, isz + 8 * fu);
    ctx.strokeStyle = tierCol; ctx.lineWidth = 1;
    ctx.strokeRect(ix - 4 * fu + 0.5, iy - 4 * fu + 0.5, isz + 8 * fu - 1, isz + 8 * fu - 1);
    var ico = iconSprite(c.icon || c.id);
    if (ico) ctx.drawImage(ico, ix, iy, isz, isz);

    var ny = iy + isz + 22 * fu;
    txt(c.name, x + cw / 2, ny, sel ? '#ffffff' : 'rgba(225,240,255,0.92)',
        Math.min(18 * fu, cw * 0.13), 'center');

    var ly = ny + 20 * fu;
    for (var L = 0; L < wrapped[i].length; L++){
      txt(wrapped[i][L], x + cw / 2, ly, 'rgba(180,212,240,0.88)', dsize, 'center');
      ly += 17 * fu;
    }

    var tag = tier >= 3 ? 'RARE' : (tier === 2 ? 'UNCOMMON' : '');
    if (tag) txt(tag, x + cw / 2, ly + 8 * fu, tierCol, 11 * fu, 'center');
    if (sel) txt('\u25B2', x + cw / 2, y0 - 6 * fu, PAL().accent, 14 * fu, 'center');
  }

  txt('\u2190 \u2192  SELECT        ENTER / SPACE / TAP  TO TAKE',
      VW / 2, y0 + ch + 34 * fu, 'rgba(170,205,240,0.8)', 14 * fu, 'center');
}
function drawDead(){
  var u = uiScale();
  ctx.fillStyle = 'rgba(30,0,12,0.66)';
  ctx.fillRect(0, 0, VW, VH);

  var items = buildDeadItems();
  var nInit = S.needsInitials ? 1 : 0;
  /* everything below is expressed in "fu" units; fu is shrunk so it always fits */
  var achUnits = (S.runResult && S.runResult.newAch && S.runResult.newAch.length) ? 76 : 0;
  var needUnits = 118 + 7 * 21 + nInit * 78 + achUnits + items.length * 34 + 26;
  var fu = u * Math.min(1, (VH - 16 * u) / (needUnits * u));

  var pw = Math.min(VW * 0.94, 620 * fu);
  var headH = 118 * fu;
  var statsH = 7 * 21 * fu;
  var initH = nInit * 78 * fu;
  var btnH = items.length * 34 * fu;
  var ph = headH + statsH + initH + achUnits * fu + btnH + 26 * fu;
  var px = (VW - pw) / 2;
  var py = Math.max(8 * fu, (VH - ph) / 2);
  panel(px, py, pw, ph);

  txt('GAME OVER', VW / 2, py + 44 * fu, PAL().danger, 38 * fu, 'center');
  txt(fmt(S.score), VW / 2, py + 86 * fu, PAL().playerHi, 32 * fu, 'center');
  var modeName = (S.mode && S.mode.name) ? S.mode.name : DIFFS[Settings.difficulty].name;
  txt((S.deathReason ? (S.deathReason + '   \u00B7   ') : '') + modeName +
      (S.mode && S.mode.stage ? ('  \u00B7  STAGE ' + S.mode.stage) : ''),
      VW / 2, py + 106 * fu, 'rgba(170,205,240,0.7)', 12 * fu, 'center');

  var y = py + headH + 6 * fu;
  var col1 = px + 34 * fu, col2 = px + pw - 34 * fu;
  var statLines = [
    ['SURVIVED', Math.floor(S.t) + 's'],
    ['KILLS', String(S.kills)],
    ['BEST CHAIN', 'x' + clamp(1 + Math.floor(S.comboBest / 5), 1, 8) + '  (' + S.comboBest + ')'],
    ['DISTANCE', Math.floor(S.distance) + 'm'],
    ['GRAZES', String(S.grazeCount)],
    ['EMP BLASTS', String(S.bombsUsed)],
    ['LEVEL REACHED', String(P.level)]
  ];
  for (var i = 0; i < statLines.length; i++){
    txt(statLines[i][0], col1, y, 'rgba(160,195,230,0.78)', 13 * fu, 'left');
    txt(statLines[i][1], col2, y, 'rgba(225,240,255,0.95)', 14 * fu, 'right');
    y += 21 * fu;
  }

  if (S.needsInitials){
    y += 8 * fu;
    txt('NEW HIGH SCORE \u2014 ENTER INITIALS', VW / 2, y, PAL().gold, 15 * fu, 'center');
    y += 28 * fu;
    var lw = 42 * fu, lg = 10 * fu;
    var lx0 = VW / 2 - (lw * 3 + lg * 2) / 2;
    for (var k = 0; k < 3; k++){
      var bx = lx0 + k * (lw + lg);
      var active = k === S.initSlot;
      ctx.fillStyle = active ? 'rgba(90,220,255,0.22)' : 'rgba(10,16,34,0.9)';
      ctx.fillRect(bx, y - 24 * fu, lw, 34 * fu);
      ctx.strokeStyle = active ? PAL().accent : 'rgba(90,220,255,0.3)';
      ctx.lineWidth = 2;
      ctx.strokeRect(bx + 0.5, y - 24 * fu + 0.5, lw - 1, 34 * fu - 1);
      txt(String.fromCharCode(S.initials[k]), bx + lw / 2, y, '#fff', 21 * fu, 'center');
      UI.rects.push({ x: bx, y: y - 24 * fu, w: lw, h: 34 * fu, initSlot: k });
    }
    txt('\u2190 \u2192 pick letter  \u00B7  \u2191 \u2193 change  \u00B7  ENTER saves',
        VW / 2, y + 20 * fu, 'rgba(160,195,230,0.68)', 11 * fu, 'center');
    y += 30 * fu;
  }

  /* achievements unlocked by this run */
  var newAch = (S.runResult && S.runResult.newAch) || [];
  if (newAch.length){
    y += 4 * fu;
    txt('ACHIEVEMENT' + (newAch.length > 1 ? 'S' : '') + ' UNLOCKED', VW / 2, y, PAL().gold, 13 * fu, 'center');
    y += 20 * fu;
    for (var na = 0; na < Math.min(3, newAch.length); na++){
      var ax = VW / 2 - Math.min(3, newAch.length) * 46 * fu + na * 92 * fu;
      var aico = iconSprite(newAch[na].icon);
      if (aico) ctx.drawImage(aico, ax, y - 4 * fu, 26 * fu, 26 * fu);
      txt(newAch[na].name, ax + 13 * fu, y + 30 * fu, 'rgba(230,240,255,0.92)', 10 * fu, 'center');
    }
    y += 46 * fu;
    if (newAch.length > 3) txt('+' + (newAch.length - 3) + ' more', VW / 2, y, 'rgba(180,210,240,0.7)', 10 * fu, 'center');
    y += 8 * fu;
  }

  var by = y + 10 * fu;
  for (var m = 0; m < items.length; m++){
    var rx = px + 30 * fu, rw = pw - 60 * fu, rh = 30 * fu;
    var ry = by + m * 34 * fu;
    UI.rects.push({ x: rx, y: ry, w: rw, h: rh });
    var sel = UI.index === m;
    ctx.fillStyle = sel ? 'rgba(90,220,255,0.18)' : 'rgba(90,220,255,0.06)';
    ctx.fillRect(rx, ry, rw, rh);
    if (sel){ ctx.fillStyle = PAL().accent; ctx.fillRect(rx, ry, 3, rh); }
    txt(items[m].label, rx + 14 * fu, ry + rh * 0.7, sel ? '#fff' : 'rgba(205,228,250,0.85)', 15 * fu, 'left');
  }
}
function commitInitials(){
  var name = String.fromCharCode(S.initials[0]) + String.fromCharCode(S.initials[1]) + String.fromCharCode(S.initials[2]);
  addScore(name, S.score, DIFFS[Settings.difficulty].name, S.t, S.kills);
  S.needsInitials = false;
  sfx('confirm');
}

/* =====================================================================
   SCREEN DISPATCH
   ===================================================================== */
function updateMenuScreens(){
  /* per-frame input for menus — always the human, never the demo */
  var inp = UserIn;
  if (S.screen === SC.PAUSE){
    menuBegin('', buildPauseMenu());
    menuNav(inp);
  } else if (S.screen === SC.SETTINGS){
    menuBegin('', buildSettingsMenu());
    menuNav(inp);
  } else if (S.screen === SC.META){
    menuBegin('', buildMetaMenu());
    menuNav(inp);
  } else if (S.screen === SC.HELP && UI.helpMode === 'bind'){
    menuBegin('', buildBindItems());
    menuNav(inp);
  } else if (S.screen === SC.SCORES || S.screen === SC.HELP){
    menuBegin('', [{ label:'BACK', type:'back' }]);
    if (inp.actionPressed || UI.backPressed){ UI.backPressed = false; menuBack(); }
  } else if (S.screen === SC.CODEX){
    navCodex(inp);
    if (UI.backPressed){ UI.backPressed = false; menuBack(); }
  } else if (S.screen === SC.ACH){
    navAchievements(inp);
    if (UI.backPressed){ UI.backPressed = false; menuBack(); }
  } else if (S.screen === SC.HISTORY){
    navHistory(inp);
    if (inp.actionPressed && (Meta.history || []).length) playHistoryRun(HistState.index);
    if (UI.backPressed){ UI.backPressed = false; menuBack(); }
  } else if (S.screen === SC.STATS){
    if (inp.actionPressed || UI.backPressed){ UI.backPressed = false; menuBack(); }
  } else if (S.screen === SC.LOADOUT){
    navLoadout(inp);
    if (inp.actionPressed && UI.returnTo === 'campaign'){
      /* pick the next unlocked stage */
      var nxt = clamp((Meta.campaign || 0) + 1, 1, STAGES.length);
      var mods2 = [];
      if (S.loadoutMods) for (var mk2 in S.loadoutMods) if (S.loadoutMods[mk2]) mods2.push(mk2);
      beginRun({ mode:'campaign', stage:nxt, pilot: S.loadoutPilot, mods: mods2 });
    }
    if (UI.backPressed){ UI.backPressed = false; menuBack(); }
  } else if (S.screen === SC.CARD){
    if (S.cardChoices){
      if (inp.leftPressed) { S.cardIndex = (S.cardIndex - 1 + S.cardChoices.length) % S.cardChoices.length; sfx('menu'); }
      if (inp.rightPressed){ S.cardIndex = (S.cardIndex + 1) % S.cardChoices.length; sfx('menu'); }
      if (inp.actionPressed) chooseCard();
    }
  } else if (S.screen === SC.DEAD){
    if (S.needsInitials){
      if (inp.leftPressed){ S.initSlot = (S.initSlot + 2) % 3; sfx('menu'); }
      if (inp.rightPressed){ S.initSlot = (S.initSlot + 1) % 3; sfx('menu'); }
      if (inp.upPressed){ S.initials[S.initSlot] = S.initials[S.initSlot] >= 90 ? 65 : S.initials[S.initSlot] + 1; sfx('menu'); }
      if (inp.downPressed){ S.initials[S.initSlot] = S.initials[S.initSlot] <= 65 ? 90 : S.initials[S.initSlot] - 1; sfx('menu'); }
      if (inp.actionPressed){ commitInitials(); return; }
      return;   /* initials picker owns the pad — don't also drive the button list */
    }
    menuBegin('', buildDeadItems());
    if (inp.upPressed) UI.index = (UI.index - 1 + UI.items.length) % UI.items.length;
    if (inp.downPressed) UI.index = (UI.index + 1) % UI.items.length;
    if (inp.actionPressed) activateItem(UI.items[UI.index]);
  }
}
function buildDeadItems(){
  var items = [];
  if (S.needsInitials) items.push({ label:'SAVE SCORE', type:'action', action:function(){ commitInitials(); } });
  items.push({ label:'RETRY', type:'action', action:function(){ beginRun({}); } });
  items.push({ label:'WATCH REPLAY', type:'action', action:function(){ if (replayStartPlayback()){ S.screen = SC.PLAY; toast('REPLAY'); } else { UI.msg='no replay'; UI.msgT=1.5; } } });
  items.push({ label:'HIGH SCORES', type:'action', action:function(){ S.screen = SC.SCORES; UI.index = 0; } });
  items.push({ label:'QUIT TO TITLE', type:'action', action:function(){ endRunToTitle(); } });
  return items;
}
function drawScreen(){
  if (S.attract && S.screen === SC.PLAY){ drawTitle(); return; }
  if (S.screen === SC.BOOT) drawBoot();
  else if (S.screen === SC.CODEX) drawCodex();
  else if (S.screen === SC.ACH) drawAchievements();
  else if (S.screen === SC.STATS) drawStats();
  else if (S.screen === SC.HISTORY) drawHistory();
  else if (S.screen === SC.LOADOUT) drawLoadout();
  else if (S.screen === SC.PAUSE) drawPause();
  else if (S.screen === SC.SETTINGS) drawSettings();
  else if (S.screen === SC.SCORES) drawScores();
  else if (S.screen === SC.HELP) drawHelp();
  else if (S.screen === SC.META) drawMeta();
  else if (S.screen === SC.CARD) drawCards();
  else if (S.screen === SC.DEAD) drawDead();
}
function drawMeta(){
  var u = uiScale();
  ctx.fillStyle = 'rgba(0,0,0,0.75)';
  ctx.fillRect(0, 0, VW, VH);
  var items = buildMetaMenu();
  renderMenu('WORKSHOP', 'SCRAP ' + Meta.scrap + '   \u00B7   RUNS ' + Meta.runs + '   \u00B7   BEST ' + fmt(Meta.bestScore), items,
             { footer:'upgrades apply to every future run \u00B7 stored on this device' });
}
