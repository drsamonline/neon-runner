/* =====================================================================
   section 4b: ICONS
   A compact pixel-art icon set used by the upgrade cards, the codex,
   the menus and the HUD. Every icon is drawn once into a 32x32 offscreen
   canvas and blitted, so this costs nothing per frame.
   ===================================================================== */

/* palette used by the icons — fixed semantics so icons stay recognisable
   across every colour-blind palette (they differ in lightness as well as hue) */
var IC = {
  bg:      'rgba(10,16,34,0.92)',
  rim:     'rgba(90,220,255,0.45)',
  warm:    '#ff9d3c',
  warm2:   '#ffd257',
  hot:     '#ff4d5e',
  cool:    '#3ad4ff',
  cool2:   '#9ff2ff',
  good:    '#5df0a8',
  good2:   '#a8ffd0',
  purple:  '#b06bff',
  purple2: '#e0c4ff',
  white:   '#eaf6ff',
  dim:     '#7f8ba8',
  gold:    '#ffd257'
};

function ip(g, x, y, w, h, col){ g.fillStyle = col; g.fillRect(x, y, w, h); }
function ibadge(g, s, rim){
  ip(g, 2, 2, s - 4, s - 4, IC.bg);
  g.strokeStyle = rim || IC.rim; g.lineWidth = 2;
  g.strokeRect(2, 2, s - 4, s - 4);
}
function icircle(g, cx, cy, r, col){
  g.fillStyle = col;
  g.beginPath(); g.arc(cx, cy, r, 0, 6.2832); g.fill();
}
function itri(g, x1, y1, x2, y2, x3, y3, col){
  g.fillStyle = col;
  g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.lineTo(x3, y3);
  g.closePath(); g.fill();
}

function drawIcon(g, kind, s){
  var m = s / 2;                 /* centre */
  switch (kind){

  /* ---------- upgrade cards ---------- */
  case 'hp':
    ibadge(g, s, IC.rim);
    heartShape(g, m, m + 1, 11, IC.hot);
    break;
  case 'dmg':
    ibadge(g, s, IC.warm);
    itri(g, m - 9, m + 9, m + 9, m + 9, m, m - 10, IC.warm);
    ip(g, m - 2, m - 2, 4, 12, IC.warm2);
    break;
  case 'rate':
    ibadge(g, s, IC.gold);
    itri(g, m + 3, m - 11, m - 8, m + 2, m + 1, m + 2, IC.gold);
    itri(g, m - 3, m - 2, m + 8, m + 11, m - 1, m + 11, IC.warm2);
    break;
  case 'range':
    ibadge(g, s, IC.cool);
    ip(g, m - 10, m - 2, 16, 4, IC.cool);
    itri(g, m + 12, m - 6, m + 12, m + 6, m + 4, m, IC.cool2);
    ip(g, m - 12, m - 6, 3, 12, IC.dim);
    break;
  case 'speed':
    ibadge(g, s, IC.good);
    for (var i = 0; i < 3; i++)
      ip(g, m - 10 + i * 6, m - 7 + i * 3, 8, 3, i === 2 ? IC.good2 : IC.good);
    break;
  case 'jump':
    ibadge(g, s, IC.good);
    itri(g, m, m - 11, m - 8, m - 1, m + 8, m - 1, IC.good2);
    ip(g, m - 3, m - 1, 6, 11, IC.good);
    break;
  case 'graze':
    ibadge(g, s, IC.cool);
    for (var r2 = 4; r2 <= 11; r2 += 4){
      g.strokeStyle = r2 === 12 ? IC.cool2 : IC.cool;
      g.lineWidth = 2;
      g.beginPath(); g.arc(m, m, r2, 0, 6.2832); g.stroke();
    }
    icircle(g, m, m, 2, IC.white);
    break;
  case 'crit':
    ibadge(g, s, IC.hot);
    for (var a = 0; a < 8; a++){
      var ang = a * Math.PI / 4;
      var rl = a % 2 === 0 ? 12 : 7;
      itri(g, m + Math.cos(ang - 0.3) * 4, m + Math.sin(ang - 0.3) * 4,
               m + Math.cos(ang) * rl, m + Math.sin(ang) * rl,
               m + Math.cos(ang + 0.3) * 4, m + Math.sin(ang + 0.3) * 4, IC.warm2);
    }
    icircle(g, m, m, 3, IC.hot);
    break;
  case 'multi':
    ibadge(g, s, IC.cool);
    icircle(g, m - 8, m, 4, IC.cool);
    icircle(g, m + 8, m, 4, IC.cool);
    icircle(g, m, m - 8, 4, IC.cool2);
    break;
  case 'pierce':
    ibadge(g, s, IC.hot);
    ip(g, m - 11, m - 9, 5, 18, IC.dim);
    ip(g, m - 3, m - 2, 12, 4, IC.hot);
    itri(g, m + 13, m - 6, m + 13, m + 6, m + 6, m, IC.warm2);
    break;
  case 'magnet':
    ibadge(g, s, IC.purple);
    g.strokeStyle = IC.purple; g.lineWidth = 5;
    g.beginPath(); g.arc(m, m + 2, 8, Math.PI, 0); g.stroke();
    ip(g, m - 11, m + 2, 5, 8, IC.purple);
    ip(g, m + 6, m + 2, 5, 8, IC.purple);
    ip(g, m - 11, m + 8, 5, 3, IC.purple2);
    ip(g, m + 6, m + 8, 5, 3, IC.purple2);
    break;
  case 'regen':
    ibadge(g, s, IC.good);
    g.strokeStyle = IC.good; g.lineWidth = 3;
    g.beginPath(); g.arc(m, m, 9, 0.6, 5.2); g.stroke();
    itri(g, m + 8, m - 9, m + 12, m - 3, m + 4, m - 3, IC.good2);
    ip(g, m - 1, m - 5, 3, 10, IC.good2);
    ip(g, m - 5, m - 1, 11, 3, IC.good2);
    break;
  case 'heal':
    ibadge(g, s, IC.good);
    ip(g, m - 3, m - 11, 7, 22, IC.good);
    ip(g, m - 11, m - 3, 22, 7, IC.good);
    ip(g, m - 1, m - 8, 3, 16, IC.good2);
    break;
  case 'shield':
    ibadge(g, s, IC.cool);
    g.fillStyle = IC.cool;
    g.beginPath();
    g.moveTo(m, m - 11); g.lineTo(m + 9, m - 7); g.lineTo(m + 9, m + 3);
    g.lineTo(m, m + 12); g.lineTo(m - 9, m + 3); g.lineTo(m - 9, m - 7);
    g.closePath(); g.fill();
    ip(g, m - 2, m - 7, 4, 13, IC.cool2);
    break;
  case 'slow':
    ibadge(g, s, '#8fd6ff');
    icircle(g, m, m, 11, '#8fd6ff');
    ip(g, m - 1, m - 8, 3, 9, '#0b1030');
    ip(g, m - 1, m - 1, 7, 3, '#0b1030');
    break;
  case 'luck':
    ibadge(g, s, IC.gold);
    icircle(g, m - 6, m - 5, 5, IC.gold);
    icircle(g, m + 6, m - 5, 5, IC.gold);
    icircle(g, m - 6, m + 5, 5, IC.gold);
    icircle(g, m + 6, m + 5, 5, IC.gold);
    icircle(g, m, m, 4, IC.warm2);
    break;
  case 'thorns':
    ibadge(g, s, IC.hot);
    icircle(g, m, m, 7, IC.hot);
    for (var t2 = 0; t2 < 8; t2++){
      var ta = t2 * Math.PI / 4;
      itri(g, m + Math.cos(ta) * 6, m + Math.sin(ta) * 6,
               m + Math.cos(ta) * 14, m + Math.sin(ta) * 14,
               m + Math.cos(ta + 0.5) * 7, m + Math.sin(ta + 0.5) * 7, IC.warm2);
    }
    break;
  case 'vamp':
    ibadge(g, s, IC.hot);
    heartShape(g, m - 4, m, 9, IC.hot);
    ip(g, m + 4, m - 1, 9, 3, IC.warm2);
    break;
  case 'boom':
    ibadge(g, s, IC.warm);
    for (var b2 = 0; b2 < 6; b2++){
      var ba = b2 * Math.PI / 3;
      itri(g, m + Math.cos(ba) * 3, m + Math.sin(ba) * 3,
               m + Math.cos(ba) * 13, m + Math.sin(ba) * 13,
               m + Math.cos(ba + 0.7) * 5, m + Math.sin(ba + 0.7) * 5, IC.warm);
    }
    icircle(g, m, m, 5, IC.warm2);
    break;
  case 'chain':
    ibadge(g, s, IC.cool);
    icircle(g, m - 7, m, 4, IC.cool);
    icircle(g, m + 7, m, 4, IC.cool);
    ip(g, m - 3, m - 1, 6, 3, IC.cool2);
    break;
  case 'freeze':
    ibadge(g, s, IC.cool2);
    for (var f2 = 0; f2 < 3; f2++){
      var fa = f2 * Math.PI / 3;
      ip(g, m - 1 + Math.cos(fa) * 0, m - 1, 3, 3, IC.cool2);
      g.save(); g.translate(m, m); g.rotate(fa);
      ip(g, -11, -1.5, 22, 3, IC.cool2);
      g.restore();
    }
    icircle(g, m, m, 3, IC.white);
    break;
  case 'turret':
    ibadge(g, s, IC.purple);
    ip(g, m - 7, m + 2, 14, 8, IC.purple);
    ip(g, m - 5, m - 6, 10, 9, IC.purple2);
    ip(g, m + 4, m - 4, 9, 4, IC.purple);
    break;
  case 'drone':
    ibadge(g, s, IC.cool);
    ip(g, m - 6, m - 4, 12, 9, IC.cool);
    ip(g, m - 11, m - 8, 22, 3, IC.cool2);
    icircle(g, m, m + 1, 2, IC.white);
    break;
  case 'orbit':
    ibadge(g, s, IC.purple);
    icircle(g, m, m, 5, IC.purple2);
    g.strokeStyle = IC.purple; g.lineWidth = 2;
    g.beginPath(); g.ellipse(m, m, 12, 6, 0, 0, 6.2832); g.stroke();
    icircle(g, m + 12, m, 3, IC.cool);
    break;
  case 'homing':
    ibadge(g, s, IC.warm);
    icircle(g, m - 6, m + 4, 4, IC.warm);
    itri(g, m + 2, m - 11, m + 13, m - 1, m + 1, m - 1, IC.warm2);
    g.strokeStyle = IC.warm; g.lineWidth = 2;
    g.beginPath(); g.arc(m - 4, m + 2, 10, -1.2, 0.6); g.stroke();
    break;
  case 'ricochet':
    ibadge(g, s, IC.purple);
    icircle(g, m - 8, m + 6, 4, IC.purple);
    ip(g, m - 6, m - 1, 4, 4, IC.purple2);
    ip(g, m + 2, m - 8, 4, 4, IC.purple2);
    ip(g, m + 6, m - 4, 4, 4, IC.purple2);
    icircle(g, m + 9, m - 9, 3, IC.purple2);
    break;
  case 'laser':
    ibadge(g, s, IC.hot);
    ip(g, m - 12, m - 2, 24, 5, IC.hot);
    ip(g, m - 12, m - 1, 24, 2, IC.white);
    break;
  case 'flamer':
    ibadge(g, s, IC.warm);
    itri(g, m - 12, m - 5, m + 4, m, m - 12, m + 5, IC.warm);
    icircle(g, m + 6, m, 7, IC.warm2);
    icircle(g, m + 9, m - 2, 4, IC.hot);
    break;
  case 'boomerang':
    ibadge(g, s, IC.good);
    g.strokeStyle = IC.good; g.lineWidth = 5;
    g.beginPath(); g.arc(m, m + 4, 9, -2.4, 0.5); g.stroke();
    ip(g, m - 10, m - 8, 5, 5, IC.good2);
    ip(g, m + 5, m - 8, 5, 5, IC.good2);
    break;
  case 'miner':
    ibadge(g, s, IC.warm);
    icircle(g, m, m + 3, 8, IC.warm);
    ip(g, m - 2, m - 10, 4, 6, IC.dim);
    icircle(g, m + 3, m - 11, 3, IC.warm2);
    break;
  case 'spread':
    ibadge(g, s, IC.good);
    for (var sp = -1; sp <= 1; sp++){
      g.save(); g.translate(m - 4, m); g.rotate(sp * 0.5);
      ip(g, 0, -2, 14, 4, sp === 0 ? IC.good2 : IC.good);
      g.restore();
    }
    break;
  case 'pulse':
    ibadge(g, s, IC.cool);
    icircle(g, m - 2, m, 7, IC.cool);
    icircle(g, m + 1, m - 1, 3, IC.white);
    break;
  case 'beam':
    ibadge(g, s, IC.cool2);
    ip(g, m - 12, m - 3, 24, 3, IC.cool2);
    ip(g, m - 12, m + 2, 24, 3, IC.cool);
    break;

  /* ---------- pilots ---------- */
  case 'scout':
    ibadge(g, s, IC.good);
    icircle(g, m, m - 4, 6, IC.good2);
    ip(g, m - 7, m + 1, 14, 9, IC.good);
    ip(g, m - 10, m + 3, 4, 4, IC.good2);
    break;
  case 'gunner':
    ibadge(g, s, IC.warm);
    icircle(g, m, m - 4, 6, IC.warm2);
    ip(g, m - 8, m + 1, 16, 10, IC.warm);
    ip(g, m + 6, m + 2, 8, 4, IC.dim);
    break;
  case 'tech':
    ibadge(g, s, IC.purple);
    icircle(g, m - 3, m - 3, 5, IC.purple2);
    ip(g, m - 6, m + 1, 12, 9, IC.purple);
    icircle(g, m + 8, m - 8, 4, IC.cool);
    break;
  case 'berserk':
    ibadge(g, s, IC.hot);
    icircle(g, m, m - 3, 6, IC.hot);
    ip(g, m - 7, m + 1, 14, 10, IC.hot);
    itri(g, m - 10, m - 8, m - 4, m - 12, m - 6, m - 3, IC.warm2);
    itri(g, m + 10, m - 8, m + 4, m - 12, m + 6, m - 3, IC.warm2);
    break;

  /* ---------- pickups ---------- */
  case 'heart':
    ibadge(g, s, IC.rim);
    heartShape(g, m, m + 1, 12, IC.hot);
    break;
  case 'bomb':
    ibadge(g, s, IC.gold);
    icircle(g, m, m + 3, 9, IC.dim);
    ip(g, m - 2, m - 9, 4, 6, IC.gold);
    icircle(g, m + 4, m - 10, 3, IC.warm2);
    break;
  case 'scrap':
    ibadge(g, s, IC.gold);
    ip(g, m - 10, m - 6, 20, 13, IC.gold);
    ip(g, m - 4, m - 6, 7, 13, 'rgba(0,0,0,0.3)');
    break;
  case 'weapon':
    ibadge(g, s, IC.cool);
    ip(g, m - 12, m - 3, 20, 6, IC.cool);
    ip(g, m + 6, m - 1, 7, 3, IC.cool2);
    ip(g, m - 6, m + 3, 5, 7, IC.dim);
    break;

  /* ---------- hazards ---------- */
  case 'mine':
    ibadge(g, s, IC.hot);
    icircle(g, m, m, 9, IC.hot);
    for (var mn = 0; mn < 6; mn++){
      var ma = mn * Math.PI / 3;
      ip(g, m + Math.cos(ma) * 11 - 1.5, m + Math.sin(ma) * 11 - 1.5, 3, 3, IC.hot);
    }
    icircle(g, m, m, 3, IC.white);
    break;
  case 'spike':
    ibadge(g, s, IC.dim);
    for (var sk = 0; sk < 3; sk++)
      itri(g, m - 11 + sk * 8, m + 9, m - 7 + sk * 8, m - 9, m - 3 + sk * 8, m + 9, IC.dim);
    ip(g, m - 12, m + 8, 24, 4, '#5b6480');
    break;
  case 'saw':
    ibadge(g, s, '#c9d3ea');
    g.save(); g.translate(m, m);
    g.fillStyle = '#c9d3ea';
    g.beginPath();
    for (var sw = 0; sw < 10; sw++){
      var sa = sw / 10 * 6.2832;
      var sr = sw % 2 === 0 ? 12 : 7;
      g.lineTo(Math.cos(sa) * sr, Math.sin(sa) * sr);
    }
    g.closePath(); g.fill();
    g.fillStyle = '#5b6480';
    g.beginPath(); g.arc(0, 0, 3, 0, 6.2832); g.fill();
    g.restore();
    break;
  case 'gate':
    ibadge(g, s, IC.hot);
    ip(g, m - 10, m - 11, 4, 22, '#4a5f8a');
    ip(g, m + 6, m - 11, 4, 22, '#4a5f8a');
    ip(g, m - 4, m - 9, 8, 18, IC.hot);
    ip(g, m - 2, m - 9, 3, 18, IC.white);
    break;
  case 'stalactite':
    ibadge(g, s, IC.dim);
    itri(g, m - 10, m - 11, m + 10, m - 11, m, m + 11, '#9aa4c0');
    itri(g, m - 3, m - 11, m + 4, m - 11, m + 1, m + 4, '#c9d3ea');
    break;
  case 'crusher':
    ibadge(g, s, IC.dim);
    ip(g, m - 12, m - 11, 24, 9, '#8b93b5');
    ip(g, m - 12, m + 3, 24, 9, '#8b93b5');
    ip(g, m - 8, m - 2, 16, 3, IC.hot);
    break;
  case 'conveyor':
    ibadge(g, s, IC.dim);
    ip(g, m - 13, m - 3, 26, 7, '#5b6480');
    for (var cv = 0; cv < 4; cv++) itri(g, m - 10 + cv * 7, m + 4, m - 6 + cv * 7, m + 4, m - 8 + cv * 7, m + 8, IC.dim);
    break;
  case 'launchpad':
    ibadge(g, s, IC.good);
    ip(g, m - 11, m + 4, 22, 7, IC.good);
    itri(g, m, m - 11, m - 7, m + 2, m + 7, m + 2, IC.good2);
    break;
  case 'ice':
    ibadge(g, s, IC.cool2);
    ip(g, m - 12, m + 4, 24, 7, IC.cool2);
    ip(g, m - 12, m + 4, 24, 2, IC.white);
    break;
  case 'lowgrav':
    ibadge(g, s, IC.purple);
    icircle(g, m, m - 6, 5, IC.purple2);
    for (var lg = 0; lg < 3; lg++)
      ip(g, m - 8 + lg * 7, m + 3 + lg * 2, 4, 4, IC.purple);
    break;
  case 'acid':
    ibadge(g, s, IC.good);
    ip(g, m - 12, m, 24, 11, IC.good);
    itri(g, m - 6, m, m - 2, m - 7, m + 2, m, IC.good2);
    itri(g, m + 3, m, m + 7, m - 5, m + 10, m, IC.good2);
    break;

  /* ---------- ui / meta ---------- */
  case 'star':
    ibadge(g, s, IC.gold);
    starShape(g, m, m, 12, 5, IC.gold, IC.warm2);
    break;
  case 'skull':
    ibadge(g, s, IC.dim);
    icircle(g, m, m - 3, 9, IC.white);
    ip(g, m - 8, m + 4, 16, 7, IC.white);
    ip(g, m - 5, m - 6, 4, 5, '#0b1030');
    ip(g, m + 1, m - 6, 4, 5, '#0b1030');
    break;
  case 'trophy':
    ibadge(g, s, IC.gold);
    ip(g, m - 7, m - 10, 14, 10, IC.gold);
    ip(g, m - 2, m, 4, 6, IC.gold);
    ip(g, m - 8, m + 6, 16, 4, IC.warm2);
    ip(g, m - 10, m - 8, 4, 6, IC.gold);
    ip(g, m + 6, m - 8, 4, 6, IC.gold);
    break;
  case 'medal':
    ibadge(g, s, IC.gold);
    icircle(g, m, m + 3, 8, IC.gold);
    icircle(g, m, m + 3, 4, IC.warm2);
    itri(g, m - 6, m - 11, m - 2, m - 11, m - 5, m - 3, IC.hot);
    itri(g, m + 6, m - 11, m + 2, m - 11, m + 5, m - 3, IC.cool);
    break;
  case 'book':
    ibadge(g, s, IC.cool);
    ip(g, m - 11, m - 9, 10, 18, IC.cool);
    ip(g, m + 1, m - 9, 10, 18, IC.cool2);
    ip(g, m - 1, m - 9, 2, 18, IC.dim);
    break;
  case 'chart':
    ibadge(g, s, IC.good);
    ip(g, m - 11, m - 9, 3, 18, IC.dim);
    ip(g, m - 11, m + 6, 22, 3, IC.dim);
    ip(g, m - 6, m - 2, 4, 8, IC.good);
    ip(g, m, m - 7, 4, 13, IC.good2);
    ip(g, m + 6, m - 4, 4, 10, IC.good);
    break;
  case 'clock':
    ibadge(g, s, IC.cool2);
    icircle(g, m, m, 11, IC.cool2);
    ip(g, m - 1, m - 8, 3, 9, '#0b1030');
    ip(g, m - 1, m - 1, 7, 3, '#0b1030');
    break;
  case 'gear':
    ibadge(g, s, IC.dim);
    icircle(g, m, m, 7, IC.dim);
    for (var gs = 0; gs < 6; gs++){
      var ga = gs * Math.PI / 3;
      ip(g, m + Math.cos(ga) * 10 - 2, m + Math.sin(ga) * 10 - 2, 5, 5, IC.dim);
    }
    icircle(g, m, m, 3, '#0b1030');
    break;
  case 'globe':
    ibadge(g, s, IC.cool);
    icircle(g, m, m, 11, IC.cool);
    g.strokeStyle = IC.cool2; g.lineWidth = 2;
    g.beginPath(); g.ellipse(m, m, 5, 11, 0, 0, 6.2832); g.stroke();
    ip(g, m - 11, m - 1, 22, 2, IC.cool2);
    break;
  case 'flag':
    ibadge(g, s, IC.good);
    ip(g, m - 8, m - 11, 3, 22, IC.dim);
    ip(g, m - 5, m - 10, 14, 9, IC.good);
    itri(g, m + 9, m - 10, m + 9, m - 1, m + 14, m - 5.5, IC.good2);
    break;
  case 'lock':
    ibadge(g, s, IC.dim);
    ip(g, m - 8, m - 1, 16, 12, IC.dim);
    g.strokeStyle = IC.dim; g.lineWidth = 3;
    g.beginPath(); g.arc(m, m - 2, 6, Math.PI, 0); g.stroke();
    icircle(g, m, m + 5, 2, '#0b1030');
    break;
  case 'camera':
    ibadge(g, s, IC.cool);
    ip(g, m - 11, m - 6, 22, 15, IC.cool);
    icircle(g, m, m + 1, 5, IC.cool2);
    ip(g, m + 4, m - 9, 6, 4, IC.cool);
    break;
  case 'grid':
    ibadge(g, s, IC.dim);
    for (var gr = 0; gr < 3; gr++)
      for (var gc = 0; gc < 3; gc++)
        ip(g, m - 10 + gc * 7, m - 10 + gr * 7, 5, 5, IC.dim);
    break;
  case 'arrow':
    ibadge(g, s, IC.cool);
    ip(g, m - 11, m - 2, 18, 4, IC.cool);
    itri(g, m + 13, m - 7, m + 13, m + 7, m + 4, m, IC.cool2);
    break;
  case 'heart_full':
    heartShape(g, m, m + 1, 12, IC.hot);
    break;
  case 'info':
    ibadge(g, s, IC.cool);
    icircle(g, m, m, 11, IC.cool);
    ip(g, m - 2, m - 7, 4, 4, IC.white);
    ip(g, m - 2, m - 1, 4, 9, IC.white);
    break;
  case 'warn':
    ibadge(g, s, IC.warm);
    itri(g, m, m - 11, m + 12, m + 9, m - 12, m + 9, IC.warm);
    ip(g, m - 2, m - 5, 4, 9, '#0b1030');
    ip(g, m - 2, m + 6, 4, 4, '#0b1030');
    break;

  /* ---------- fallbacks: reuse the real sprites ---------- */
  case 'back':
    ibadge(g, s, IC.dim);
    ip(g, m - 2, m - 12, 7, 7, IC.dim);
    ip(g, m - 2, m + 5, 7, 7, IC.dim);
    ip(g, m - 8, m - 6, 7, 7, IC.dim);
    ip(g, m - 8, m - 1, 7, 7, IC.dim);
    ip(g, m + 5, m - 6, 7, 7, IC.dim);
    ip(g, m + 5, m - 1, 7, 7, IC.dim);
    ip(g, m - 13, m - 3, 6, 6, IC.good);
    break;
  case 'cool':
    ibadge(g, s, IC.dim);
    /* a snowflake: three crossing spokes with ticks */
    for (var cs = 0; cs < 3; cs++){
      var ca = cs * Math.PI / 3;
      var cx1 = m - Math.cos(ca) * 12, cy1 = m - Math.sin(ca) * 12;
      var cx2 = m + Math.cos(ca) * 12, cy2 = m + Math.sin(ca) * 12;
      for (var ct = 0; ct <= 12; ct++){
        var tt = ct / 12;
        ip(g, cx1 + (cx2 - cx1) * tt - 1.5, cy1 + (cy2 - cy1) * tt - 1.5, 3, 3, IC.cool);
      }
    }
    icircle(g, m, m, 3, '#ffffff');
    break;
  default: {
    if (typeof ENEMY_DEF !== 'undefined' && ENEMY_DEF[kind]){
      var spr = enemySprite(kind, 0, 0);
      var sc = Math.min((s - 8) / spr.width, (s - 8) / spr.height);
      var dw = spr.width * sc, dh = spr.height * sc;
      g.drawImage(spr, (s - dw) / 2, (s - dh) / 2, dw, dh);
      return;
    }
    if (kind === 'boss' || kind.indexOf('boss_') === 0){
      var bt = (kind === 'boss') ? 'mech' : kind.slice(5);
      var bs = bossSprite(bt, 1, 0);
      var sc2 = Math.min((s - 6) / bs.width, (s - 6) / bs.height);
      g.drawImage(bs, (s - bs.width * sc2) / 2, (s - bs.height * sc2) / 2, bs.width * sc2, bs.height * sc2);
      return;
    }
    ibadge(g, s, IC.dim);
    icircle(g, m, m, 5, IC.dim);
  }
  }
}

function heartShape(g, cx, cy, r, col){
  g.fillStyle = col;
  g.beginPath();
  g.moveTo(cx, cy + r * 0.75);
  g.bezierCurveTo(cx - r * 1.3, cy - r * 0.35, cx - r * 0.55, cy - r * 1.15, cx, cy - r * 0.35);
  g.bezierCurveTo(cx + r * 0.55, cy - r * 1.15, cx + r * 1.3, cy - r * 0.35, cx, cy + r * 0.75);
  g.closePath(); g.fill();
}
function starShape(g, cx, cy, r, points, col, col2){
  g.fillStyle = col;
  g.beginPath();
  for (var i = 0; i < points * 2; i++){
    var a = (i / (points * 2)) * 6.2832 - Math.PI / 2;
    var rr = i % 2 === 0 ? r : r * 0.45;
    if (i === 0) g.moveTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
    else g.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
  }
  g.closePath(); g.fill();
  if (col2) icircle(g, cx, cy, r * 0.28, col2);
}

/* Every icon is authored on a fixed 32x32 grid and blitted at whatever
   size the caller wants, so one cache entry serves all sizes. */
var ICON_BASE = 32;
function iconSprite(kind){
  if (!kind) return null;
  var key = 'ico_' + kind + '_' + Settings.palette;
  if (spriteCache[key]) return spriteCache[key];
  var c = mk(ICON_BASE, ICON_BASE, function(g){ drawIcon(g, kind, ICON_BASE); });
  spriteCache[key] = c;
  return c;
}
/* draw an icon straight into the main context */
function drawIconAt(kind, x, y, size, alpha){
  var s = iconSprite(kind);
  if (!s) return;
  if (alpha !== undefined && alpha < 1){ ctx.globalAlpha = alpha; }
  ctx.drawImage(s, x, y, size, size);
  if (alpha !== undefined && alpha < 1){ ctx.globalAlpha = 1; }
}
