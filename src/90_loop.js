/* =====================================================================
   section 10: LOOP
   Fixed-timestep simulation, frame render, tap routing, boot.
   ===================================================================== */

var STEP = 1 / 60;
var acc = 0, lastNow = 0, prevPause = 0;
var fpsSmooth = 60, fpsAcc = 0, fpsN = 0;
var resizeTimer = 0;

function isMobile(){
  return /Android|iPhone|iPad|iPod|Mobile|Silk|Kindle/i.test(navigator.userAgent || '') ||
         (navigator.maxTouchPoints > 1 && Math.min(window.innerWidth, window.innerHeight) < 900);
}
function haptic(ms){
  if (!Settings.haptics) return;
  if (navigator.vibrate) { try { navigator.vibrate(ms); } catch(e){} }
}
function applyTouchVisibility(){
  var want = Settings.touch === 'on' || (Settings.touch === 'auto' && isMobile());
  document.body.classList.toggle('touch', want);
  document.body.classList.toggle('lefty', !!Settings.lefty);
  var host = document.getElementById('touch');
  if (host){
    var bs = clamp(Math.round(Math.min(VW, VH) * 0.13 * (Settings.touchSize || 1)), 44, 130);
    host.style.setProperty('--bs', bs + 'px');
    host.style.setProperty('--ba', String(clamp(Settings.touchOpacity === undefined ? 1 : Settings.touchOpacity, 0.15, 1)));
  }
}
function toggleFullscreen(){
  try {
    var el = document.documentElement;
    if (!document.fullscreenElement && !document.webkitFullscreenElement){
      if (el.requestFullscreen) el.requestFullscreen();
      else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
    } else {
      if (document.exitFullscreen) document.exitFullscreen();
      else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
    }
  } catch(e){}
}

/* ---------- boot ---------- */
function bootToTitle(){
  S.screen = SC.PLAY;
  S.attract = true;
  beginRun({ attract: true });
  S.screen = SC.PLAY;
  S.attract = true;
}

/* ---------- tap routing ---------- */
function inRect(pt, r){ return r && pt.x >= r.x && pt.x <= r.x + r.w && pt.y >= r.y && pt.y <= r.y + r.h; }

function processTaps(){
  while (TapQueue.length){
    var pt = TapQueue.shift();
    if (S.screen === SC.BOOT){ bootToTitle(); continue; }

    if (S.screen === SC.CARD){
      for (var c = 0; c < UI.rects.length; c++){
        if (inRect(pt, UI.rects[c])){ S.cardIndex = c; chooseCard(); break; }
      }
      continue;
    }
    if (S.screen === SC.DEAD){
      var handled = false;
      for (var i = 0; i < UI.rects.length; i++){
        var r = UI.rects[i];
        if (!inRect(pt, r)) continue;
        if (r.initSlot !== undefined){
          S.initSlot = r.initSlot;
          S.initials[r.initSlot] = S.initials[r.initSlot] >= 90 ? 65 : S.initials[r.initSlot] + 1;
          sfx('menu');
        } else if (i < UI.items.length){
          UI.index = i; activateItem(UI.items[i]);
        }
        handled = true; break;
      }
      continue;
    }
    if (S.screen === SC.PLAY && !S.attract) continue;   /* gameplay: pads only */
    if (S.screen === SC.CODEX){ tapCodex(pt); continue; }
    if (S.screen === SC.ACH){ tapAchievements(pt); continue; }
    if (S.screen === SC.HISTORY){ tapHistory(pt); continue; }
    if (S.screen === SC.LOADOUT){ tapLoadout(pt); continue; }
    if (S.screen === SC.STATS){ menuBack(); continue; }
    menuTap(pt);
  }
}

/* ---------- title menu while the demo plays ---------- */
function titleMenuNav(){
  menuBegin('', buildTitleMenu());
  menuNav(UserIn);
}

/* ---------- one fixed simulation step ---------- */
function fixedStep(dt){
  pollInput();
  replayStep();

  /* global pause toggle */
  if (Input.pause && !prevPause){
    if (S.screen === SC.PLAY && !S.attract){ S.screen = SC.PAUSE; UI.index = 0; sfx('menu'); }
    else if (S.screen === SC.PAUSE){ S.screen = SC.PLAY; sfx('menu'); }
    else if (S.screen === SC.CARD){ S.screen = SC.PLAY; sfx('menu'); }
  }
  prevPause = Input.pause;

  /* back: ESC / Backspace / the on-screen \u21B6 button */
  var backNow = (Raw.back || UI.backPressed) ? 1 : 0;
  if (backNow && !prevBack){
    var inMenu = (S.screen === SC.PAUSE || S.screen === SC.SETTINGS || S.screen === SC.SCORES ||
                  S.screen === SC.HELP || S.screen === SC.META);
    if (inMenu){ sfx('back'); menuBack(); }
    else if (S.screen === SC.PLAY && !S.attract){ S.screen = SC.PAUSE; UI.index = 0; sfx('menu'); }
  }
  prevBack = backNow;
  UI.backPressed = false;

  processTaps();

  if (S.screen === SC.BOOT){
    if (UserIn.anyPressed) bootToTitle();
    return;
  }

  /* hit-stop freezes simulation but not the juice */
  if (S.hitStop > 0){
    S.hitStop -= dt;
    updateEffects(dt);
    if (S.screen === SC.PLAY && S.attract) { /* keep demo alive */ }
    return;
  }

  if (S.screen === SC.PLAY && S.modeId === 'practice' && !S.attract) practiceStep(dt);

  if (S.screen === SC.PLAY){
    if (S.attract){
      stepGame(dt);
      titleMenuNav();
    } else {
      stepGame(dt);
      if (S.screen === SC.PLAY && S.frames % 45 === 0) announceHUD();
    }
    return;
  }

  updateMenuScreens();
  updateEffects(dt);
}
function announceHUD(){
  announce('Score ' + Math.floor(S.score) + ', health ' + P.hp + ' of ' + P.maxHp +
           ', chain ' + S.mult + ', weapon ' + WEAPONS[P.weapon].name);
}

/* ---------- render ---------- */
function render(){
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  ctx.clearRect(0, 0, VW, VH);

  if (S.screen === SC.BOOT){
    drawBoot();
    postProcess();
    return;
  }

  drawBackground();
  drawWeather();
  drawWorld();
  drawBlackout();
  /* the gameplay HUD belongs to gameplay only — never over a menu */
  if (S.screen === SC.PLAY && !S.attract) drawHUD();
  drawScreen();
  if (S.screen === SC.PLAY && !S.attract) drawCaption();

  /* replay progress */
  if (Replay.playing){
    var u = uiScale();
    var w = VW * 0.6, x = (VW - w) / 2, y = VH - 26 * u;
    ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(x, y, w, 5);
    ctx.fillStyle = PAL().accent; ctx.fillRect(x, y, w * replayProgress(), 5);
    txt('REPLAY', VW / 2, y - 6 * u, 'rgba(180,215,245,0.8)', 12 * u, 'center');
  }

  /* floating message */
  if (UI.msgT > 0){
    UI.msgT -= 1 / 60;
    txt(UI.msg, VW / 2, VH * 0.62, PAL().gold, 16 * uiScale(), 'center');
  }

  if (Settings.showFPS){
    txt(Math.round(fpsSmooth) + ' FPS', VW - 10 * uiScale(), VH - 10 * uiScale(), 'rgba(150,200,240,0.7)', 12 * uiScale(), 'right');
  }

  postProcess();
}
function drawBoot(){
  ctx.fillStyle = '#05060d';
  ctx.fillRect(0, 0, VW, VH);
  var u = uiScale();
  var pulse = 0.5 + 0.5 * Math.sin(S.t * 3);
  ctx.textAlign = 'center';
  setFont(52 * u, 'bold');
  ctx.fillStyle = 'rgba(255,60,140,' + (0.3 + pulse * 0.3) + ')';
  ctx.fillText('NEON RUNNER', VW / 2 + 4, VH * 0.44 + 4);
  ctx.fillStyle = PAL().playerHi;
  ctx.fillText('NEON RUNNER', VW / 2, VH * 0.44);
  ctx.textAlign = 'left';
  txt('AUTO-FIRE SIDE-SHOOTER', VW / 2, VH * 0.44 + 30 * u, 'rgba(180,220,255,0.7)', 14 * u, 'center');
  txt(isMobile() ? 'TAP TO START' : 'PRESS ANY KEY OR CLICK TO START', VW / 2, VH * 0.62,
      'rgba(120,255,235,' + (0.45 + pulse * 0.55) + ')', 20 * u, 'center');
  txt('best on desktop \u00B7 fully playable on phone', VW / 2, VH * 0.72, 'rgba(150,190,225,0.5)', 12 * u, 'center');
}



/* =====================================================================
   REPLAY STORAGE / PHOTO / SAVE EXPORT
   ===================================================================== */
function encodeReplay(frames){
  var n = Math.min(frames.length, 60 * 130);
  var s = '';
  for (var i = 0; i < n; i++) s += String.fromCharCode(frames[i] & 31);
  try { return btoa(s); } catch(e){ return ''; }
}
function decodeReplay(str){
  var out = [];
  if (!str) return out;
  try {
    var s = atob(str);
    for (var i = 0; i < s.length; i++) out.push(s.charCodeAt(i) & 31);
  } catch(e){}
  return out;
}
function recordHistory(){
  var hist = Meta.history || (Meta.history = []);
  var rep = encodeReplay(Replay.frames);
  hist.unshift({
    score: Math.floor(S.score), time: Math.round(S.t), kills: S.kills,
    mode: S.mode.name, modeId: S.modeId, stage: S.mode.stage || 0,
    date: dateStamp(), pilot: (P.pilot || 'vector').toUpperCase(), pilotId: P.pilot || 'vector',
    modIds: (function(){ var a = []; for (var k in S.mods) a.push(k); return a; })(),
    seed: S.seed, replay: rep
  });
  if (hist.length > 12) hist.length = 12;
  var kept = 0;
  for (var i = 0; i < hist.length; i++){
    if (hist[i].replay){ kept++; if (kept > 5) hist[i].replay = ''; }
  }
  Meta.history = hist;
  saveMeta();
}
function takePhoto(){
  try {
    var url = canvas.toDataURL('image/png');
    var a = document.createElement('a');
    a.href = url;
    a.download = 'neon-runner-' + Date.now() + '.png';
    document.body.appendChild(a);
    a.click();
    setTimeout(function(){ try { document.body.removeChild(a); } catch(e){} }, 100);
    UI.msg = 'screenshot saved'; UI.msgT = 2;
    sfx('confirm');
  } catch(e){ UI.msg = 'screenshot unavailable'; UI.msgT = 2; }
}
function exportProgress(){
  try {
    var blob = { v:1, meta: Meta, scores: Scores, settings: Settings, keys: Keys };
    var code = btoa(unescape(encodeURIComponent(JSON.stringify(blob))));
    if (typeof prompt === 'function'){
      var got = prompt('Copy this save code somewhere safe:', code);
      if (got) UI.msg = 'save code shown'; UI.msgT = 2;
    } else { UI.msg = 'clipboard unavailable'; UI.msgT = 2; }
  } catch(e){ UI.msg = 'export failed'; UI.msgT = 2; }
}
function importProgress(){
  try {
    if (typeof prompt !== 'function'){ UI.msg = 'import unavailable'; UI.msgT = 2; return; }
    var code = prompt('Paste a save code:');
    if (!code) return;
    var blob = JSON.parse(decodeURIComponent(escape(atob(code.trim()))));
    if (!blob || !blob.meta) throw new Error('bad code');
    if (blob.meta){
      for (var k in Meta) if (Object.prototype.hasOwnProperty.call(blob.meta, k)) Meta[k] = blob.meta[k];
      saveMeta();
    }
    if (blob.scores && blob.scores.length){ Scores.length = 0; for (var i = 0; i < blob.scores.length; i++) Scores.push(blob.scores[i]); Store.set('scores', Scores); }
    if (blob.settings){ for (var s2 in Settings) if (Object.prototype.hasOwnProperty.call(blob.settings, s2)) Settings[s2] = blob.settings[s2]; saveSettings(); audioApplyVolumes(); }
    clearSpriteCache();
    UI.msg = 'save imported'; UI.msgT = 2.4;
    sfx('confirm');
  } catch(e){ UI.msg = 'that code did not parse'; UI.msgT = 2.4; sfx('back'); }
}

/* ---------- main loop ---------- */
function frame(now){
  requestAnimationFrame(frame);
  if (!lastNow) lastNow = now;
  var dt = (now - lastNow) / 1000;
  lastNow = now;
  if (dt > 0.25) dt = 0.25;

  /* fps */
  if (dt > 0){ fpsAcc += 1 / dt; fpsN++; }
  if (fpsN >= 30){
    fpsSmooth = fpsAcc / fpsN; fpsAcc = 0; fpsN = 0;
    if (Settings.quality === 'auto') S.quality = (fpsSmooth < 45 || isMobile()) ? 'low' : 'high';
  }

  updateWeather(dt);

  acc += dt;
  var steps = 0;
  while (acc >= STEP && steps < 5){
    fixedStep(STEP);
    acc -= STEP;
    steps++;
  }
  if (steps >= 5) acc = 0;

  render();
  Music.tick();
}

/* ---------- boot ---------- */
function boot(){
  initCanvas();
  buildTouch();
  applyTouchVisibility();
  S.quality = Settings.quality === 'auto' ? (isMobile() ? 'low' : 'high') : Settings.quality;
  if (isMobile() && Settings.bloom) Settings.bloom = 0;
  srand(1);
  S.loadoutMods = {};
  if (Meta.loadoutMods){ for (var lk in Meta.loadoutMods) if (Meta.loadoutMods[lk]) S.loadoutMods[lk] = 1; }
  S.loadoutPilot = Meta.lastPilot || 'vector';
  S.lastReplay = null;
  beginRun({ attract: true });
  S.screen = SC.BOOT;
  S.attract = false;
  a11yEl = document.getElementById('a11y');

  /* inline PWA manifest so the page can be installed to a home screen */
  try {
    var manifest = {
      name: 'NEON RUNNER', short_name: 'Neon Runner', start_url: '.',
      display: 'fullscreen', orientation: 'any', background_color: '#05060d',
      theme_color: '#05060d', description: 'Retro auto-fire side-scrolling shooter.'
    };
    var blob = new Blob([JSON.stringify(manifest)], { type: 'application/json' });
    var link = document.createElement('link');
    link.rel = 'manifest';
    link.href = URL.createObjectURL(blob);
    document.head.appendChild(link);
  } catch(e){}

  window.addEventListener('resize', function(){
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function(){ resize(); applyTouchVisibility(); }, 120);
  });
  window.addEventListener('orientationchange', function(){
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function(){ resize(); applyTouchVisibility(); }, 260);
  });
  document.addEventListener('visibilitychange', function(){
    if (document.hidden && S.screen === SC.PLAY && !S.attract){ S.screen = SC.PAUSE; UI.index = 0; }
    releaseAllKeys(); releaseTouch();
  });

  requestAnimationFrame(frame);
}

/* pointer wiring (canvas may not exist before initCanvas, so bind lazily) */
function wirePointer(){
  canvas.addEventListener('pointerdown', pointerDown, { passive:false });
  canvas.addEventListener('contextmenu', function(e){ e.preventDefault(); });
  canvas.addEventListener('touchstart', function(e){ if (e.cancelable) e.preventDefault(); }, { passive:false });
  canvas.addEventListener('gesturestart', function(e){ e.preventDefault(); });
  document.addEventListener('dblclick', function(e){ e.preventDefault(); });
}

boot();
wirePointer();
/*NEON_HOOK*/
})();
