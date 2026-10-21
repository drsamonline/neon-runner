/* =====================================================================
   section 4: SPRITES
   Every sprite is drawn once into an offscreen canvas and blitted with
   drawImage — far cheaper than hundreds of fillRects per frame.
   Cache keys include the palette index so a palette swap rebuilds them.
   ===================================================================== */

var spriteCache = {};
function clearSpriteCache(){ spriteCache = {}; }

function mk(w, h, fn){
  var c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(w));
  c.height = Math.max(1, Math.round(h));
  var g = c.getContext('2d');
  g.imageSmoothingEnabled = false;
  fn(g, c.width, c.height);
  return c;
}
function cached(key, w, h, fn){
  var s = spriteCache[key];
  if (!s){ s = mk(w, h, fn); spriteCache[key] = s; }
  return s;
}

/* ---------- enemy definitions ---------- */
var ENEMY_DEF = {
  crawler:  { w:30, h:34, hp:2,  pts:100, air:false, stomp:1, cls:'g' },
  armored:  { w:38, h:38, hp:5,  pts:220, air:false, stomp:1, cls:'g' },
  spiked:   { w:30, h:34, hp:3,  pts:180, air:false, stomp:0, cls:'g' },
  splitter: { w:32, h:36, hp:2,  pts:150, air:false, stomp:1, cls:'g' },
  exploder: { w:28, h:30, hp:2,  pts:130, air:false, stomp:1, cls:'g' },
  jumper:   { w:30, h:32, hp:2,  pts:140, air:false, stomp:1, cls:'g' },
  flyer:    { w:32, h:26, hp:1,  pts:120, air:true,  stomp:1, cls:'a' },
  bomber:   { w:40, h:28, hp:2,  pts:170, air:true,  stomp:1, cls:'a' },
  hover:    { w:34, h:30, hp:3,  pts:200, air:true,  stomp:1, cls:'a' },
  carrier:  { w:56, h:42, hp:7,  pts:400, air:true,  stomp:0, cls:'a' },
  turret:   { w:34, h:42, hp:3,  pts:250, air:false, stomp:0, cls:'s' },
  sweeper:  { w:36, h:46, hp:5,  pts:320, air:false, stomp:0, cls:'s' },
  mortar:   { w:38, h:38, hp:3,  pts:260, air:false, stomp:0, cls:'s' },
  shielded: { w:40, h:40, hp:4,  pts:280, air:false, stomp:0, cls:'s' },
  popturret:{ w:34, h:40, hp:3,  pts:240, air:false, stomp:0, cls:'s' },
  darter:   { w:20, h:18, hp:1,  pts:60,  air:true,  stomp:1, cls:'a' }
};

/* ---------- hero ---------- */
function heroSprite(frame){
  var key = 'hero_' + frame + '_' + Settings.palette;
  var duck = (frame === 'duck' || frame === 'slide');
  var w = P_W, h = duck ? P_DUCK_H : P_H;
  return cached(key, w, h, function(g){
    var P = PAL();
    if (duck){
      g.fillStyle = P.player;
      g.fillRect(2, 7, w - 4, 17);
      g.fillStyle = '#155e91';
      g.fillRect(3, h - 6, w - 6, 6);
      g.fillStyle = P.playerSkin;
      g.fillRect(4, 0, w - 8, 10);
      g.fillStyle = P.playerHi;
      g.fillRect(8, 3, w - 11, 4);
      g.fillStyle = P.gold;
      g.fillRect(w - 6, 12, 13, 5);
      if (frame === 'slide'){
        g.fillStyle = 'rgba(255,255,255,0.55)';
        g.fillRect(0, 9, 5, 2);
        g.fillRect(0, 15, 8, 2);
        g.fillRect(0, 20, 4, 2);
      }
      return;
    }
    var legL = 0, legR = 0;
    if (frame === 'run0'){ legL = 3; legR = -2; }
    else if (frame === 'run1'){ legL = -2; legR = 3; }
    else if (frame === 'jump'){ legL = -3; legR = 2; }
    else if (frame === 'fall'){ legL = 3; legR = 3; }
    g.fillStyle = '#155e91';
    g.fillRect(3, h - 12 + legL, 9, 12 - Math.abs(legL) * 0.5);
    g.fillRect(14, h - 12 + legR, 9, 12 - Math.abs(legR) * 0.5);
    g.fillStyle = P.player;
    g.fillRect(3, 13, w - 6, h - 25);
    g.fillStyle = P.playerHi;
    g.fillRect(6, 17, w - 12, 6);
    g.fillStyle = '#155e91';
    g.fillRect(3, h - 15, w - 6, 3);
    g.fillStyle = P.playerSkin;
    g.fillRect(6, 0, w - 12, 14);
    g.fillStyle = P.playerHi;
    g.fillRect(9, 4, w - 13, 6);
    g.fillStyle = '#0d3a55';
    g.fillRect(w - 9, 4, 3, 6);
    g.fillStyle = P.gold;
    g.fillRect(w - 5, Math.round(h * 0.42), 14, 5);
    g.fillStyle = '#c9962a';
    g.fillRect(w - 5, Math.round(h * 0.42) + 5, 6, 4);
  });
}

/* ---------- enemies ---------- */
function enemySprite(type, frame, phase){
  var d = ENEMY_DEF[type];
  var key = 'e_' + type + '_' + frame + '_' + (phase | 0) + '_' + Settings.palette;
  var w = d.w, h = d.h;
  return cached(key, w, h, function(g){
    var P = PAL();
    var body = d.cls === 'a' ? P.e2 : (d.cls === 's' ? P.e3 : P.e1);
    var dark = 'rgba(0,0,0,0.42)';
    var sw = frame === 0 ? 0 : (frame === 1 ? 3 : -3);

    switch(type){
      case 'crawler':
        g.fillStyle = body; g.fillRect(3, 9, w - 6, h - 15);
        g.fillRect(1, 1, w - 2, 9);
        g.fillStyle = dark;
        g.fillRect(2, h - 8, 6, 8); g.fillRect(12, h - 8 + sw, 6, 8); g.fillRect(22, h - 8 - sw, 6, 8);
        g.fillStyle = P.gold; g.fillRect(6, 3, 6, 5);
        break;
      case 'armored':
        g.fillStyle = body; g.fillRect(2, 8, w - 4, h - 12);
        g.fillRect(0, 0, w, 10);
        g.fillStyle = 'rgba(255,255,255,0.22)';
        g.fillRect(4, 12, w - 8, 4); g.fillRect(4, 20, w - 8, 4);
        g.fillStyle = dark; g.fillRect(2, h - 8, 8, 8); g.fillRect(w - 10, h - 8 + sw, 8, 8);
        g.fillStyle = P.gold; g.fillRect(w - 16, 3, 8, 5);
        break;
      case 'spiked':
        g.fillStyle = body; g.fillRect(4, 12, w - 8, h - 18);
        g.fillStyle = '#ffe14d';
        for (var i = 0; i < 4; i++){ g.fillRect(3 + i * 7, 4, 4, 9); }
        g.fillStyle = dark; g.fillRect(4, h - 7, 7, 7); g.fillRect(w - 11, h - 7 + sw, 7, 7);
        g.fillStyle = '#ffffff'; g.fillRect(w - 12, 15, 5, 4);
        break;
      case 'splitter':
        g.fillStyle = body; g.fillRect(3, 6, w - 6, h - 12);
        g.fillStyle = dark; g.fillRect(w / 2 - 1, 8, 2, h - 16);
        g.fillStyle = '#fff'; g.fillRect(7, 11, 5, 5); g.fillRect(w - 12, 11, 5, 5);
        g.fillStyle = dark; g.fillRect(4, h - 6, 6, 6); g.fillRect(w - 10, h - 6 + sw, 6, 6);
        break;
      case 'exploder':
        g.fillStyle = body; g.beginPath();
        g.arc(w / 2, h / 2, Math.min(w, h) / 2 - 1, 0, 6.2832); g.fill();
        g.fillStyle = frame === 2 ? '#fff' : '#ffe14d';
        g.beginPath(); g.arc(w / 2, h / 2, 4, 0, 6.2832); g.fill();
        g.fillStyle = dark;
        g.fillRect(4, h - 5, 5, 5); g.fillRect(w - 9, h - 5, 5, 5);
        break;
      case 'jumper':
        g.fillStyle = body; g.fillRect(4, 8, w - 8, h - 16);
        g.fillRect(2, 2, w - 4, 8);
        g.fillStyle = dark;
        g.fillRect(2, h - 10, 9, 10); g.fillRect(w - 11, h - 10 + sw, 9, 10);
        g.fillStyle = '#fff'; g.fillRect(w - 13, 4, 5, 5);
        break;
      case 'flyer':
        g.fillStyle = body; g.fillRect(4, 8, w - 8, h - 14); g.fillRect(2, 2, w - 4, 8);
        g.fillStyle = dark; g.fillRect(7, 11, w - 14, 6);
        g.fillStyle = P.gold;
        var rw = 7 + (frame === 0 ? 0 : (frame === 1 ? 9 : 4));
        g.fillRect(w / 2 - rw, 0, rw * 2, 3);
        g.fillStyle = P.danger; g.fillRect(w - 11, 4, 5, 5);
        break;
      case 'bomber':
        g.fillStyle = body; g.fillRect(2, 4, w - 4, h - 10);
        g.fillStyle = dark; g.fillRect(6, 8, w - 12, 7);
        g.fillStyle = P.gold; g.fillRect(8, h - 7, 6, 7); g.fillRect(w - 14, h - 7, 6, 7);
        g.fillStyle = P.danger; g.fillRect(w / 2 - 3, 1, 6, 4);
        break;
      case 'hover':
        g.fillStyle = body; g.fillRect(4, 6, w - 8, h - 14);
        g.fillRect(0, 1, w, 6);
        g.fillStyle = dark; g.fillRect(9, 11, w - 18, 8);
        g.fillStyle = P.danger; g.fillRect(w / 2 - 3, 11, 6, 6);
        g.fillStyle = 'rgba(255,255,255,0.28)';
        g.fillRect(6, h - 5, w - 12, 3);
        break;
      case 'carrier':
        g.fillStyle = body; g.fillRect(2, 6, w - 4, h - 14);
        g.fillStyle = dark;
        for (var c = 0; c < 4; c++) g.fillRect(6 + c * 12, 10, 8, h - 24);
        g.fillStyle = P.gold; g.fillRect(0, 2, w, 5);
        g.fillStyle = P.danger;
        g.fillRect(6, h - 8, 8, 6); g.fillRect(w - 14, h - 8, 8, 6);
        g.fillStyle = '#fff'; g.fillRect(w / 2 - 4, 14, 8, 6);
        break;
      case 'turret':
        g.fillStyle = body; g.fillRect(2, h - 15, w - 4, 15);
        g.fillRect(5, 6, w - 10, h - 20);
        g.fillStyle = 'rgba(0,0,0,0.4)'; g.fillRect(w / 2 - 2, 6, 13, 5);
        g.fillStyle = P.gold; g.fillRect(w / 2 - 3, 12, 6, 6);
        g.fillStyle = 'rgba(255,255,255,0.2)'; g.fillRect(2, h - 15, w - 4, 3);
        break;
      case 'sweeper':
        g.fillStyle = body; g.fillRect(3, h - 14, w - 6, 14);
        g.fillRect(7, 8, w - 14, h - 22);
        g.fillStyle = P.gold;
        g.beginPath(); g.arc(w / 2, 16, 8, 0, 6.2832); g.fill();
        g.fillStyle = 'rgba(0,0,0,0.45)'; g.fillRect(w / 2 - 2, 16, 16, 4);
        break;
      case 'mortar':
        g.fillStyle = body; g.fillRect(3, h - 12, w - 6, 12);
        g.fillStyle = 'rgba(0,0,0,0.45)';
        g.fillRect(w / 2 - 5, 2, 10, h - 16);
        g.fillStyle = body; g.fillRect(6, h - 20, w - 12, 10);
        g.fillStyle = P.danger; g.fillRect(w / 2 - 4, 1, 8, 6);
        break;
      case 'shielded':
        g.fillStyle = body; g.fillRect(4, 8, w - 8, h - 16);
        g.fillStyle = P.accent;
        g.fillRect(0, 4, 7, h - 10);
        g.fillStyle = 'rgba(255,255,255,0.35)'; g.fillRect(1, 6, 3, h - 14);
        g.fillStyle = '#fff'; g.fillRect(w - 14, 13, 6, 6);
        g.fillStyle = 'rgba(0,0,0,0.4)'; g.fillRect(4, h - 8, 8, 8);
        break;
      case 'popturret':
        g.fillStyle = body; g.fillRect(4, 8, w - 8, h - 16);
        g.fillStyle = 'rgba(0,0,0,0.45)'; g.fillRect(w / 2 - 3, 10, 6, 10);
        g.fillStyle = P.gold; g.fillRect(w / 2 - 6, 20, 12, 5);
        g.fillStyle = 'rgba(255,255,255,0.22)'; g.fillRect(4, 8, w - 8, 3);
        break;
      case 'burrower':
        g.fillStyle = body;
        g.beginPath(); g.moveTo(w/2, 0); g.lineTo(w, h-6); g.lineTo(0, h-6); g.closePath(); g.fill();
        g.fillStyle = dark; g.fillRect(0, h-8, w, 8);
        g.fillStyle = P.gold; g.fillRect(w/2-2, 4, 4, 12);
        g.fillStyle = '#fff'; g.fillRect(w/2-5, 12, 4, 4); g.fillRect(w/2+2, 12, 4, 4);
        break;
      case 'roller':
        g.save(); g.translate(w/2, h/2); g.rotate(frame * 0.7);
        g.fillStyle = body;
        for (var rs = 0; rs < 8; rs++){
          var ra = rs * Math.PI/4;
          g.fillRect(Math.cos(ra)*10 - 2, Math.sin(ra)*10 - 2, 5, 5);
        }
        g.beginPath(); g.arc(0,0,10,0,6.2832); g.fill();
        g.fillStyle = '#ffe14d'; g.beginPath(); g.arc(0,0,4,0,6.2832); g.fill();
        g.restore();
        break;
      case 'sniper':
        g.fillStyle = body; g.fillRect(4, 10, w-8, h-16);
        g.fillRect(2, 2, w-4, 9);
        g.fillStyle = dark; g.fillRect(w/2-2, 12, 18, 4);
        g.fillStyle = P.hot; g.fillRect(w/2+12, 11, 5, 6);
        g.fillStyle = '#fff'; g.fillRect(6, 4, 6, 4);
        g.fillStyle = dark; g.fillRect(5, h-6, 7, 6); g.fillRect(w-12, h-6, 7, 6);
        break;
      case 'phalanx':
        g.fillStyle = body; g.fillRect(2, 6, w-4, h-14);
        g.fillStyle = P.accent; g.fillRect(0, 2, 9, h-6);
        g.fillStyle = 'rgba(255,255,255,0.4)'; g.fillRect(1, 4, 3, h-10);
        g.fillStyle = dark; g.fillRect(4, h-8, 12, 8); g.fillRect(w-16, h-8, 12, 8);
        g.fillStyle = '#fff'; g.fillRect(w-16, 12, 7, 7);
        break;
      case 'hive':
        g.fillStyle = body;
        g.beginPath(); g.ellipse(w/2, h/2, w/2-2, h/2-3, 0, 0, 6.2832); g.fill();
        g.fillStyle = dark;
        for (var hh = 0; hh < 5; hh++)
          g.fillRect(8 + (hh%3)*11, 12 + Math.floor(hh/3)*12, 8, 8);
        g.fillStyle = P.gold; g.fillRect(w/2-3, 4, 6, 6);
        break;
      case 'mimic':
        g.fillStyle = '#6b4a1e'; g.fillRect(2, 8, w-4, h-10);
        g.fillStyle = P.gold; g.fillRect(2, 4, w-4, 6); g.fillRect(w/2-3, 8, 6, h-10);
        g.fillStyle = '#fff'; g.fillRect(8, 14, 5, 4); g.fillRect(w-13, 14, 5, 4);
        g.fillStyle = dark; g.fillRect(6, h-8, 6, 6); g.fillRect(w-12, h-8, 6, 6);
        break;
      case 'healer':
        g.fillStyle = body; g.fillRect(4, 6, w-8, h-12);
        g.fillStyle = dark; g.fillRect(8, 10, w-16, 8);
        g.fillStyle = '#7dffb0'; g.fillRect(w/2-2, 8, 5, 14); g.fillRect(w/2-7, 13, 15, 5);
        g.fillStyle = P.gold; g.fillRect(w/2-9, 0, 18, 3);
        break;
      case 'shielddrone':
        g.fillStyle = body; g.fillRect(4, 8, w-8, h-14);
        g.fillStyle = P.accent;
        g.beginPath(); g.moveTo(w/2, 2); g.lineTo(w-4, 10); g.lineTo(w-4, h-8);
        g.lineTo(w/2, h); g.lineTo(4, h-8); g.lineTo(4, 10); g.closePath(); g.fill();
        g.fillStyle = 'rgba(255,255,255,0.5)'; g.fillRect(w/2-2, 8, 4, h-18);
        break;
      case 'tether':
        g.fillStyle = 'rgba(255,255,255,0.25)';
        g.beginPath(); g.arc(w/2, h/2, w/2, 0, 6.2832); g.fill();
        g.fillStyle = body;
        g.beginPath(); g.arc(w/2, h/2, w/2-2, 0, 6.2832); g.fill();
        g.fillStyle = '#fff'; g.beginPath(); g.arc(w/2, h/2, w/2-8, 0, 6.2832); g.fill();
        break;
      case 'queen':
        g.fillStyle = body;
        g.beginPath(); g.ellipse(w/2, h/2+4, w/2-4, h/2-8, 0, 0, 6.2832); g.fill();
        g.fillStyle = dark; g.fillRect(w/2-4, 6, 8, h-16);
        g.fillStyle = 'rgba(255,255,255,0.28)';
        g.beginPath(); g.ellipse(10, 12, 10, 6, -0.5, 0, 6.2832); g.fill();
        g.beginPath(); g.ellipse(w-10, 12, 10, 6, 0.5, 0, 6.2832); g.fill();
        g.fillStyle = P.hot; g.fillRect(w/2-9, 10, 6, 5); g.fillRect(w/2+3, 10, 6, 5);
        g.fillStyle = P.gold; g.fillRect(w/2-2, 2, 4, 8);
        break;
      case 'dummy':
        g.fillStyle = '#6b5a3a'; g.fillRect(w/2-4, h-10, 8, 10);
        g.fillStyle = body; g.fillRect(4, 8, w-8, h-22);
        g.fillStyle = P.gold; g.fillRect(8, 14, w-16, 5);
        g.fillRect(8, 24, w-16, 5); g.fillRect(8, 34, w-16, 5);
        g.fillStyle = '#fff'; g.fillRect(w/2-6, 2, 12, 8);
        g.fillStyle = P.hot; g.fillRect(w/2-3, 4, 6, 4);
        break;
      case 'darter':
        g.fillStyle = body;
        g.beginPath(); g.moveTo(w, h / 2); g.lineTo(0, 0); g.lineTo(0, h); g.closePath(); g.fill();
        g.fillStyle = '#fff'; g.fillRect(2, h / 2 - 1, 4, 2);
        break;
    }
    if (phase === 1){
      g.fillStyle = 'rgba(255,255,255,0.55)';
      g.fillRect(0, 0, w, h);
    }
  });
}

/* ---------- bosses ---------- */
function bossSprite(type, phase, frame){
  type = type || 'mech';
  var dims = { mech:[124,140], serpent:[150,96], fortress:[168,150], overlord:[140,150] };
  var w = dims[type] ? dims[type][0] : 124;
  var h = dims[type] ? dims[type][1] : 140;
  var key = 'boss_' + type + '_' + phase + '_' + frame + '_' + Settings.palette;
  return cached(key, w, h, function(g){
    var P = PAL();
    if (type === 'serpent'){
      var body = phase >= 3 ? P.danger : P.e1;
      g.fillStyle = 'rgba(0,0,0,0.5)';
      g.beginPath(); g.ellipse(w/2, h*0.62, w*0.46, h*0.34, 0, 0, 6.2832); g.fill();
      g.fillStyle = body;
      g.beginPath(); g.ellipse(w/2, h*0.58, w*0.44, h*0.32, 0, 0, 6.2832); g.fill();
      g.fillStyle = 'rgba(0,0,0,0.28)';
      for (var r2 = 0; r2 < 5; r2++)
        g.fillRect(w*0.12 + r2*w*0.18, h*0.30, 7, h*0.58);
      g.fillStyle = body; g.fillRect(w*0.02, h*0.18, w*0.30, h*0.5);
      g.fillStyle = P.gold;
      g.fillRect(w*0.06, h*0.26, 7, 7); g.fillRect(w*0.20, h*0.26, 7, 7);
      g.fillStyle = phase >= 3 ? '#fff' : '#ffe14d';
      g.fillRect(w*0.04, h*0.34, 10, 6); g.fillRect(w*0.20, h*0.34, 10, 6);
      g.fillStyle = '#fff';
      for (var f3 = 0; f3 < 3; f3++)
        g.fillRect(w*0.02 - 6, h*0.42 + f3*8, 8, 4);
      return;
    }
    if (type === 'fortress'){
      var core = phase >= 3 ? P.danger : P.purple2;
      g.fillStyle = 'rgba(0,0,0,0.55)'; g.fillRect(6, h-22, w-12, 22);
      g.fillStyle = '#2b1a44'; g.fillRect(0, 10, w, h-32);
      g.fillStyle = P.e3;
      g.fillRect(4, 16, w-8, 22);
      g.fillRect(4, h-56, w-8, 18);
      g.fillStyle = 'rgba(0,0,0,0.4)';
      for (var v = 0; v < 6; v++) g.fillRect(10 + v*26, 20, 10, h-70);
      g.fillStyle = core;
      g.beginPath(); g.arc(w/2, h*0.46, 22, 0, 6.2832); g.fill();
      g.fillStyle = frame === 1 ? '#fff' : 'rgba(255,255,255,0.6)';
      g.beginPath(); g.arc(w/2, h*0.46, 11, 0, 6.2832); g.fill();
      g.fillStyle = P.gold;
      g.fillRect(10, 44, 22, 16); g.fillRect(w-32, 44, 22, 16);
      g.fillRect(10, h-84, 22, 16); g.fillRect(w-32, h-84, 22, 16);
      return;
    }
    if (type === 'overlord'){
      var aura = phase >= 3 ? P.danger : (phase === 2 ? P.e4 : P.purple);
      g.fillStyle = 'rgba(0,0,0,0.45)';
      g.beginPath(); g.ellipse(w/2, h*0.5, w*0.5, h*0.5, 0, 0, 6.2832); g.fill();
      g.fillStyle = aura;
      for (var sp = 0; sp < 6; sp++){
        var a = sp * Math.PI/3 + (frame ? 0.2 : 0);
        g.save(); g.translate(w/2, h*0.42); g.rotate(a);
        g.fillRect(10, -8, w*0.46, 16);
        g.restore();
      }
      g.fillStyle = '#2b1a44';
      g.beginPath(); g.arc(w/2, h*0.42, 34, 0, 6.2832); g.fill();
      g.fillStyle = aura;
      g.beginPath(); g.arc(w/2, h*0.42, 24, 0, 6.2832); g.fill();
      g.fillStyle = '#fff';
      g.beginPath(); g.arc(w/2, h*0.42, 12, 0, 6.2832); g.fill();
      g.fillStyle = 'rgba(0,0,0,0.6)';
      g.beginPath(); g.arc(w/2, h*0.42, 5, 0, 6.2832); g.fill();
      g.fillStyle = aura;
      g.fillRect(w/2-6, h*0.72, 12, 30);
      return;
    }
    /* mech */
    var coreM = phase >= 3 ? P.danger : (phase === 2 ? P.e4 : P.e3);
    g.fillStyle = 'rgba(0,0,0,0.55)';
    g.fillRect(14, h - 34, 22, 34); g.fillRect(w - 36, h - 34, 22, 34);
    g.fillStyle = '#3a2358';
    g.fillRect(10, h - 26, 30, 26); g.fillRect(w - 40, h - 26, 30, 26);
    g.fillStyle = P.e3; g.fillRect(10, 40, w - 20, h - 70);
    g.fillStyle = 'rgba(0,0,0,0.35)';
    g.fillRect(10, 66, w - 20, 8); g.fillRect(10, 92, w - 20, 8);
    g.fillStyle = P.e3; g.fillRect(0, 44, 16, 30); g.fillRect(w - 16, 44, 16, 30);
    g.fillStyle = '#2b1a44'; g.fillRect(26, 6, w - 52, 40);
    g.fillStyle = coreM; g.fillRect(34, 14, w - 68, 24);
    g.fillStyle = frame === 1 ? '#fff' : 'rgba(255,255,255,0.6)';
    g.fillRect(40, 20, w - 80, 12);
    g.fillStyle = '#4a2f78';
    g.fillRect(2, 30, 16, 10); g.fillRect(w - 18, 30, 16, 10);
    g.fillStyle = P.gold;
    g.fillRect(4, 60, 10, 22); g.fillRect(w - 14, 60, 10, 22);
  });
}

/* ---------- glow sprites ---------- */
function glowSprite(color){
  var key = 'glow_' + color;
  if (spriteCache[key]) return spriteCache[key];
  var size = 128;
  var c = mk(size, size, function(g){
    var grd = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    grd.addColorStop(0, color);
    grd.addColorStop(0.45, color);
    grd.addColorStop(1, 'rgba(0,0,0,0)');
    g.globalAlpha = 1;
    g.fillStyle = grd;
    g.fillRect(0, 0, size, size);
  });
  c.__glow = 1;
  spriteCache[key] = c;
  return c;
}

/* ---------- pickups ---------- */
function pickupSprite(kind){
  var key = 'pick_' + kind + '_' + Settings.palette;
  return cached(key, 22, 22, function(g){
    var P = PAL();
    if (kind === 'heart'){
      var map = ["0110110","1111111","1111111","0111110","0011100","0001000"];
      g.fillStyle = P.danger;
      for (var r = 0; r < map.length; r++)
        for (var c = 0; c < 7; c++)
          if (map[r][c] === '1') g.fillRect(3 + c * 2.3, 5 + r * 2.3, 3, 3);
      return;
    }
    if (kind === 'shield'){
      g.fillStyle = P.accent;
      g.beginPath(); g.moveTo(11, 1); g.lineTo(20, 6); g.lineTo(20, 14);
      g.lineTo(11, 21); g.lineTo(2, 14); g.lineTo(2, 6); g.closePath(); g.fill();
      g.fillStyle = 'rgba(255,255,255,0.5)'; g.fillRect(9, 6, 4, 10);
      return;
    }
    if (kind === 'bomb'){
      g.fillStyle = P.gold;
      g.beginPath(); g.arc(11, 13, 8, 0, 6.2832); g.fill();
      g.fillStyle = '#333'; g.fillRect(9, 2, 4, 5);
      g.fillStyle = '#fff'; g.fillRect(13, 1, 3, 3);
      return;
    }
    if (kind === 'slow'){
      g.fillStyle = '#8fd6ff';
      g.beginPath(); g.arc(11, 11, 9, 0, 6.2832); g.fill();
      g.fillStyle = '#0b1030'; g.fillRect(10, 5, 3, 8); g.fillRect(10, 11, 6, 3);
      return;
    }
    if (kind === 'scrap'){
      g.fillStyle = P.gold;
      g.fillRect(4, 6, 14, 10);
      g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(8, 6, 6, 10);
      return;
    }
    /* weapon crate */
    var cols = { pulse:P.playerHi, spread:P.good, pierce:P.e4, homing:P.e2, ricochet:P.e3 };
    g.fillStyle = '#1b2a4d'; g.fillRect(1, 1, 20, 20);
    g.fillStyle = cols[kind] || P.playerHi;
    g.fillRect(3, 3, 16, 16);
    g.fillStyle = 'rgba(0,0,0,0.5)';
    g.fillRect(3, 10, 16, 2);
    g.fillStyle = '#fff'; g.fillRect(8, 6, 6, 3);
  });
}
