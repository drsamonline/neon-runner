/* =====================================================================
   section 9b: SCREENS
   Codex, achievements, career stats, run history, pilot/modifier loadout.
   Each is a custom-scrolling list; navigation is handled here too.
   ===================================================================== */

/* shared scroll-window maths so every list behaves the same */
function scrollWindow(count, visible, index, curScroll){
  var s = 0;
  if (count > visible){
    s = clamp(curScroll | 0, 0, count - visible);
    if (index < s) s = index;
    if (index >= s + visible) s = index - visible + 1;
    s = clamp(s, 0, count - visible);
  }
  return s;
}

/* ---------- shared chrome for a full-screen list page ---------- */
function pageFrame(title, subtitle, tabs, activeTab){
  var u = uiScale();
  ctx.fillStyle = 'rgba(4,8,22,0.93)';
  ctx.fillRect(0, 0, VW, VH);
  var pad = 18 * u;
  var pw = Math.min(VW - pad * 2, 900 * u);
  var px = (VW - pw) / 2;
  var py = Math.max(10 * u, (VH - Math.min(VH - 20 * u, 560 * u)) / 2);
  var ph = Math.min(VH - py - 10 * u, 560 * u);
  panel(px, py, pw, ph);
  txt(title, px + pw / 2, py + 34 * u, PAL().playerHi, 26 * u, 'center');
  var headY = py + 54 * u;
  if (tabs && tabs.length){
    var tw = 0;
    for (var i = 0; i < tabs.length; i++) tw += txtW(tabs[i], 13 * u) + 22 * u;
    var tx = px + pw / 2 - tw / 2;
    for (var j = 0; j < tabs.length; j++){
      var w = txtW(tabs[j], 13 * u) + 22 * u;
      var on = j === activeTab;
      ctx.fillStyle = on ? 'rgba(90,220,255,0.22)' : 'rgba(90,220,255,0.06)';
      ctx.fillRect(tx, headY - 13 * u, w, 20 * u);
      if (on){ ctx.fillStyle = PAL().accent; ctx.fillRect(tx, headY - 13 * u, w, 2); }
      txt(tabs[j], tx + w / 2, headY + 2 * u, on ? '#fff' : 'rgba(190,215,240,0.8)', 13 * u, 'center');
      tx += w;
    }
  } else if (subtitle){
    txt(subtitle, px + pw / 2, headY + 2 * u, 'rgba(175,210,240,0.75)', 13 * u, 'center');
  }
  return { px:px, py:py, pw:pw, ph:ph, headY: headY + 22 * u, u:u };
}

/* =====================================================================
   CODEX
   ===================================================================== */
var CODEX_TABS = ['enemies','hazards','weapons','cards','bosses','pilots'];
var CodexState = { tab:0, index:0, scroll:0 };
function codexList(){
  var cat = CODEX_TABS[CodexState.tab];
  var all = codexEntries(cat);
  var career = careerStats();
  var seen = career.codexSeen || {};
  var out = [];
  for (var i = 0; i < all.length; i++){
    var e = all[i];
    out.push({ e:e, known: !!seen[e.cat + ':' + e.id] });
  }
  return out;
}
function drawCodex(){
  var f = pageFrame('CODEX', null, CODEX_TABS, CodexState.tab);
  var u = f.u;
  var list = codexList();
  var known = 0;
  for (var i = 0; i < list.length; i++) if (list[i].known) known++;

  txt('DISCOVERED ' + known + ' / ' + list.length + '   \u00B7   \u2190 \u2192 CATEGORY   \u00B7   \u2191 \u2193 SCROLL',
      f.px + f.pw / 2, f.headY - 6 * u, 'rgba(150,185,220,0.7)', 11 * u, 'center');

  var rowH = 30 * u;
  var listTop = f.headY + 8 * u;
  var listH = f.ph - (listTop - f.py) - 92 * u;
  var visible = Math.max(2, Math.floor(listH / rowH));
  CodexState.index = clamp(CodexState.index, 0, Math.max(0, list.length - 1));
  CodexState.scroll = scrollWindow(list.length, visible, CodexState.index, CodexState.scroll);
  var sc = CodexState.scroll;

  UI.rects = [];
  var y = listTop;
  for (var k = 0; k < visible; k++){
    var i2 = sc + k;
    if (i2 >= list.length) break;
    var row = list[i2];
    var sel = i2 === CodexState.index;
    var rx = f.px + 14 * u, rw = f.pw - 28 * u - 10 * u, rh = rowH - 4 * u;
    UI.rects[i2] = { x: rx, y: y, w: rw, h: rh };
    if (sel){ ctx.fillStyle = 'rgba(90,220,255,0.16)'; ctx.fillRect(rx, y, rw, rh);
              ctx.fillStyle = PAL().accent; ctx.fillRect(rx, y, 3, rh); }
    var isz = rh - 4 * u;
    if (row.known){
      var ico = iconSprite(row.e.icon);
      if (ico) ctx.drawImage(ico, rx + 6 * u, y + 2 * u, isz, isz);
      txt(row.e.name, rx + 10 * u + isz + 8 * u, y + rh * 0.7,
          sel ? '#fff' : 'rgba(205,230,250,0.88)', 15 * u, 'left');
    } else {
      ctx.fillStyle = 'rgba(60,72,96,0.7)';
      ctx.fillRect(rx + 6 * u, y + 2 * u, isz, isz);
      txt('???', rx + 10 * u + isz + 8 * u, y + rh * 0.7, 'rgba(120,140,170,0.8)', 15 * u, 'left');
    }
    y += rowH;
  }
  if (list.length > visible){
    var sbx = f.px + f.pw - 13 * u;
    var sbh = visible * rowH - 8 * u;
    ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.fillRect(sbx, listTop + 2 * u, 4 * u, sbh);
    var th = Math.max(18 * u, sbh * (visible / list.length));
    var ty = listTop + 2 * u + (sbh - th) * (sc / Math.max(1, list.length - visible));
    ctx.fillStyle = PAL().accent; ctx.fillRect(sbx, ty, 4 * u, th);
  }

  /* detail panel */
  var dy = f.py + f.ph - 76 * u;
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.fillRect(f.px + 12 * u, dy, f.pw - 24 * u, 64 * u);
  var cur = list[CodexState.index];
  if (cur && cur.known){
    txt(cur.e.name, f.px + 24 * u, dy + 20 * u, PAL().gold, 15 * u, 'left');
    var info = cur.e.info || '';
    var words = info.split(' '), line = '', ly = dy + 40 * u, maxW = f.pw - 48 * u;
    for (var w2 = 0; w2 < words.length; w2++){
      var test = line ? line + ' ' + words[w2] : words[w2];
      if (txtW(test, 12 * u) > maxW && line){
        txt(line, f.px + 24 * u, ly, 'rgba(180,212,240,0.85)', 12 * u, 'left');
        ly += 15 * u; line = words[w2];
      } else line = test;
    }
    if (line) txt(line, f.px + 24 * u, ly, 'rgba(180,212,240,0.85)', 12 * u, 'left');
  } else {
    txt('NOT YET DISCOVERED', f.px + f.pw / 2, dy + 36 * u, 'rgba(140,165,195,0.7)', 14 * u, 'center');
  }
  txt('ESC / \u21B6 BACK', f.px + f.pw / 2, f.py + f.ph - 8 * u, 'rgba(150,185,220,0.6)', 11 * u, 'center');
}
function navCodex(inp){
  var list = codexList();
  if (inp.leftPressed){ CodexState.tab = (CodexState.tab + CODEX_TABS.length - 1) % CODEX_TABS.length; CodexState.index = 0; CodexState.scroll = 0; sfx('menu'); }
  if (inp.rightPressed){ CodexState.tab = (CodexState.tab + 1) % CODEX_TABS.length; CodexState.index = 0; CodexState.scroll = 0; sfx('menu'); }
  if (inp.upPressed && list.length){ CodexState.index = (CodexState.index - 1 + list.length) % list.length; sfx('menu'); }
  if (inp.downPressed && list.length){ CodexState.index = (CodexState.index + 1) % list.length; sfx('menu'); }
}
function tapCodex(pt){
  for (var i = 0; i < UI.rects.length; i++){
    var r = UI.rects[i];
    if (r && pt.x >= r.x && pt.x <= r.x + r.w && pt.y >= r.y && pt.y <= r.y + r.h){
      CodexState.index = i; sfx('menu'); return;
    }
  }
}

/* =====================================================================
   ACHIEVEMENTS
   ===================================================================== */
var AchState = { index:0, scroll:0 };
function drawAchievements(){
  var unlocked = Meta.achievements || {};
  var f = pageFrame('ACHIEVEMENTS', null, null, 0);
  var u = f.u;
  var got = 0;
  for (var i = 0; i < ACHIEVEMENTS.length; i++) if (unlocked[ACHIEVEMENTS[i].id]) got++;
  txt('UNLOCKED ' + got + ' / ' + ACHIEVEMENTS.length, f.px + f.pw / 2, f.headY - 6 * u,
      'rgba(150,185,220,0.75)', 12 * u, 'center');

  var rowH = 34 * u;
  var top = f.headY + 8 * u;
  var visible = Math.max(2, Math.floor((f.ph - (top - f.py) - 30 * u) / rowH));
  AchState.index = clamp(AchState.index, 0, ACHIEVEMENTS.length - 1);
  AchState.scroll = scrollWindow(ACHIEVEMENTS.length, visible, AchState.index, AchState.scroll);
  var sc = AchState.scroll;
  UI.rects = [];
  var y = top;
  for (var k = 0; k < visible; k++){
    var idx = sc + k;
    if (idx >= ACHIEVEMENTS.length) break;
    var a = ACHIEVEMENTS[idx];
    var on = !!unlocked[a.id];
    var sel = idx === AchState.index;
    var rx = f.px + 14 * u, rw = f.pw - 28 * u - 10 * u, rh = rowH - 4 * u;
    UI.rects[idx] = { x: rx, y: y, w: rw, h: rh };
    if (sel){ ctx.fillStyle = 'rgba(90,220,255,0.14)'; ctx.fillRect(rx, y, rw, rh);
              ctx.fillStyle = PAL().accent; ctx.fillRect(rx, y, 3, rh); }
    var isz = rh - 4 * u;
    var ico = iconSprite(on ? a.icon : 'lock');
    if (ico){ ctx.globalAlpha = on ? 1 : 0.4; ctx.drawImage(ico, rx + 6 * u, y + 2 * u, isz, isz); ctx.globalAlpha = 1; }
    txt(a.name, rx + 10 * u + isz + 8 * u, y + rh * 0.46, on ? PAL().gold : 'rgba(150,170,195,0.75)', 15 * u, 'left');
    txt(a.desc, rx + 10 * u + isz + 8 * u, y + rh * 0.84, on ? 'rgba(190,215,240,0.8)' : 'rgba(120,140,165,0.6)', 12 * u, 'left');
    if (on) txt('UNLOCKED', rx + rw - 12 * u, y + rh * 0.6, PAL().good, 12 * u, 'right');
    y += rowH;
  }
  if (ACHIEVEMENTS.length > visible){
    var sbx = f.px + f.pw - 13 * u;
    var sbh = visible * rowH - 8 * u;
    ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.fillRect(sbx, top + 2 * u, 4 * u, sbh);
    var th = Math.max(18 * u, sbh * (visible / ACHIEVEMENTS.length));
    var ty = top + 2 * u + (sbh - th) * (sc / Math.max(1, ACHIEVEMENTS.length - visible));
    ctx.fillStyle = PAL().accent; ctx.fillRect(sbx, ty, 4 * u, th);
  }
  txt('ESC / \u21B6 BACK', f.px + f.pw / 2, f.py + f.ph - 10 * u, 'rgba(150,185,220,0.6)', 11 * u, 'center');
}
function navAchievements(inp){
  var n = ACHIEVEMENTS.length;
  if (inp.upPressed){ AchState.index = (AchState.index - 1 + n) % n; sfx('menu'); }
  if (inp.downPressed){ AchState.index = (AchState.index + 1) % n; sfx('menu'); }
}
function tapAchievements(pt){
  for (var i = 0; i < UI.rects.length; i++){
    var r = UI.rects[i];
    if (r && pt.x >= r.x && pt.x <= r.x + r.w && pt.y >= r.y && pt.y <= r.y + r.h){ AchState.index = i; sfx('menu'); return; }
  }
}

/* =====================================================================
   CAREER STATS
   ===================================================================== */
function drawStats(){
  var f = pageFrame('CAREER', null, null, 0);
  var u = f.u;
  var c = careerStats();
  var rows = [
    ['RUNS PLAYED', c.runs || 0, 'clock'],
    ['TOTAL KILLS', c.kills || 0, 'skull'],
    ['BOSSES DESTROYED', c.bosses || 0, 'trophy'],
    ['GRAZES', c.grazes || 0, 'graze'],
    ['EMP BLASTS', c.emps || 0, 'bomb'],
    ['DISTANCE', Math.floor(c.distance || 0) + 'm', 'speed'],
    ['SCRAP EARNED', c.scrapEarned || 0, 'scrap'],
    ['BEST SCORE', fmt(Meta.bestScore || 0), 'star'],
    ['LONGEST RUN', Math.floor(Meta.bestTime || 0) + 's', 'clock'],
    ['CAMPAIGN CLEARED', (c.campaignCleared || 0) + ' / ' + STAGES.length, 'flag'],
    ['PILOTS TRIED', Object.keys(c.pilotsUsed || {}).length + ' / ' + PILOTS.length, 'scout'],
    ['WEAPONS TRIED', Object.keys(c.weaponsUsed || {}).length + ' / ' + WEAPON_KEYS.length, 'weapon'],
    ['CODEX FOUND', Object.keys(c.codexSeen || {}).length + ' / ' + codexTotal(), 'book'],
    ['ACHIEVEMENTS', Object.keys(Meta.achievements || {}).length + ' / ' + ACHIEVEMENTS.length, 'medal']
  ];
  var colW = (f.pw - 48 * u) / 2;
  var rowH = Math.min(34 * u, (f.ph - 110 * u) / Math.ceil(rows.length / 2));
  var top = f.headY + 12 * u;
  for (var i = 0; i < rows.length; i++){
    var col = i % 2, row = Math.floor(i / 2);
    var x = f.px + 24 * u + col * colW;
    var y = top + row * rowH;
    var isz = rowH - 8 * u;
    var ico = iconSprite(rows[i][2]);
    if (ico){ ctx.globalAlpha = 0.9; ctx.drawImage(ico, x, y + 2 * u, isz, isz); ctx.globalAlpha = 1; }
    txt(rows[i][0], x + isz + 10 * u, y + rowH * 0.62, 'rgba(165,200,232,0.82)', 13 * u, 'left');
    txt(String(rows[i][1]), x + colW - 26 * u, y + rowH * 0.62, PAL().playerHi, 15 * u, 'right');
  }
  txt('ESC / \u21B6 BACK', f.px + f.pw / 2, f.py + f.ph - 12 * u, 'rgba(150,185,220,0.6)', 11 * u, 'center');
}

/* =====================================================================
   RUN HISTORY
   ===================================================================== */
var HistState = { index:0, scroll:0 };
function drawHistory(){
  var f = pageFrame('RUN HISTORY', null, null, 0);
  var u = f.u;
  var hist = Meta.history || [];
  txt('LAST ' + hist.length + ' RUNS   \u00B7   ENTER / TAP REPLAYS THE HIGHLIGHTED RUN',
      f.px + f.pw / 2, f.headY - 6 * u, 'rgba(150,185,220,0.72)', 11 * u, 'center');
  var rowH = 36 * u;
  var top = f.headY + 8 * u;
  var visible = Math.max(2, Math.floor((f.ph - (top - f.py) - 34 * u) / rowH));
  UI.rects = [];
  if (!hist.length){
    txt('no runs recorded yet', f.px + f.pw / 2, top + 40 * u, 'rgba(160,190,220,0.7)', 14 * u, 'center');
  } else {
    HistState.index = clamp(HistState.index, 0, hist.length - 1);
    HistState.scroll = scrollWindow(hist.length, visible, HistState.index, HistState.scroll);
    var sc = HistState.scroll;
    var y = top;
    for (var k = 0; k < visible; k++){
      var idx = sc + k;
      if (idx >= hist.length) break;
      var h = hist[idx];
      var sel = idx === HistState.index;
      var rx = f.px + 14 * u, rw = f.pw - 28 * u - 10 * u, rh = rowH - 4 * u;
      UI.rects[idx] = { x: rx, y: y, w: rw, h: rh };
      if (sel){ ctx.fillStyle = 'rgba(90,220,255,0.14)'; ctx.fillRect(rx, y, rw, rh);
                ctx.fillStyle = PAL().accent; ctx.fillRect(rx, y, 3, rh); }
      txt(fmt(h.score), rx + 12 * u, y + rh * 0.62, sel ? '#fff' : PAL().playerHi, 16 * u, 'left');
      txt((h.mode || 'ENDLESS') + (h.stage ? ' ' + h.stage : '') + '   \u00B7   ' + h.pilot + '   \u00B7   ' +
          h.kills + ' kills   \u00B7   ' + h.time + 's   \u00B7   ' + h.date,
          rx + 100 * u, y + rh * 0.62, 'rgba(170,205,235,0.78)', 11 * u, 'left');
      if (h.replay) txt('\u25B6 REPLAY', rx + rw - 12 * u, y + rh * 0.62, PAL().good, 11 * u, 'right');
      y += rowH;
    }
    if (hist.length > visible){
      var sbx = f.px + f.pw - 13 * u;
      var sbh = visible * rowH - 8 * u;
      ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.fillRect(sbx, top + 2 * u, 4 * u, sbh);
      var th = Math.max(18 * u, sbh * (visible / hist.length));
      var ty = top + 2 * u + (sbh - th) * (sc / Math.max(1, hist.length - visible));
      ctx.fillStyle = PAL().accent; ctx.fillRect(sbx, ty, 4 * u, th);
    }
  }
  txt('ESC / \u21B6 BACK', f.px + f.pw / 2, f.py + f.ph - 12 * u, 'rgba(150,185,220,0.6)', 11 * u, 'center');
}
function navHistory(inp){
  var n = (Meta.history || []).length;
  if (!n) return;
  if (inp.upPressed){ HistState.index = (HistState.index - 1 + n) % n; sfx('menu'); }
  if (inp.downPressed){ HistState.index = (HistState.index + 1) % n; sfx('menu'); }
}
function tapHistory(pt){
  var hist = Meta.history || [];
  for (var i = 0; i < UI.rects.length; i++){
    var r = UI.rects[i];
    if (r && pt.x >= r.x && pt.x <= r.x + r.w && pt.y >= r.y && pt.y <= r.y + r.h){
      HistState.index = i;
      playHistoryRun(i);
      return;
    }
  }
}
function playHistoryRun(i){
  var hist = Meta.history || [];
  var h = hist[i];
  if (!h || !h.replay){ UI.msg = 'no replay stored for that run'; UI.msgT = 1.8; sfx('back'); return; }
  var frames = decodeReplay(h.replay);
  if (!frames.length){ UI.msg = 'replay unreadable'; UI.msgT = 1.8; return; }
  Replay.frames = frames;
  Replay.idx = 0;
  beginRun({ seed: h.seed || 1, mode: h.modeId || 'endless', stage: h.stage || null,
             pilot: h.pilotId || 'vector', mods: h.modIds || [] });
  Replay.recording = false;
  Replay.playing = true;
  S.replayMode = 1;
  toast('REPLAY');
}

/* =====================================================================
   LOADOUT (pilot + modifiers)
   ===================================================================== */
var LoadoutState = { row:0, index:0, scroll:0 };
function drawLoadout(){
  var u = uiScale();
  ctx.fillStyle = 'rgba(4,8,22,0.93)';
  ctx.fillRect(0, 0, VW, VH);
  var pw = Math.min(VW - 36 * u, 880 * u);
  var ph = Math.min(VH - 20 * u, 580 * u);
  var px = (VW - pw) / 2, py = (VH - ph) / 2;
  panel(px, py, pw, ph);
  txt('LOADOUT', VW / 2, py + 34 * u, PAL().playerHi, 26 * u, 'center');
  txt('\u2191 \u2193 ROW   \u00B7   \u2190 \u2192 CHANGE   \u00B7   ENTER TOGGLES MODIFIERS',
      VW / 2, py + 56 * u, 'rgba(160,195,230,0.72)', 12 * u, 'center');

  /* pilot picker */
  var py2 = py + 84 * u;
  var n = PILOTS.length;
  var cw = Math.min((pw - 60 * u) / n, 190 * u);
  var gap = 14 * u;
  var total = n * cw + (n - 1) * gap;
  var x0 = VW / 2 - total / 2;
  UI.rects = [];
  for (var i = 0; i < n; i++){
    var pl = PILOTS[i];
    var sel = (i === LoadoutState.index);
    var x = x0 + i * (cw + gap);
    var ch = 118 * u;
    UI.rects.push({ x: x, y: py2, w: cw, h: ch, loadPilot: i });
    ctx.fillStyle = sel ? 'rgba(90,220,255,0.16)' : 'rgba(10,16,34,0.9)';
    ctx.fillRect(x, py2, cw, ch);
    ctx.strokeStyle = sel ? PAL().accent : 'rgba(90,220,255,0.3)';
    ctx.lineWidth = sel ? 3 : 2;
    ctx.strokeRect(x + 0.5, py2 + 0.5, cw - 1, ch - 1);
    var isz = Math.min(cw * 0.36, 44 * u);
    var ico = iconSprite(pl.icon);
    if (ico) ctx.drawImage(ico, x + (cw - isz) / 2, py2 + 10 * u, isz, isz);
    txt(pl.name, x + cw / 2, py2 + 10 * u + isz + 16 * u, sel ? '#fff' : 'rgba(220,238,255,0.9)', 15 * u, 'center');
    txt(pl.role, x + cw / 2, py2 + 10 * u + isz + 30 * u, PAL().gold, 10 * u, 'center');
    if (sel) txt('\u25B2', x + cw / 2, py2 - 6 * u, PAL().accent, 13 * u, 'center');
  }
  var cur = PILOTS[clamp(LoadoutState.index, 0, PILOTS.length - 1)];
  txt(cur.desc, VW / 2, py2 + 138 * u, 'rgba(190,215,240,0.85)', 13 * u, 'center');

  /* modifiers */
  var my = py2 + 162 * u;
  txt('RUN MODIFIERS   \u2014   higher risk, higher score', VW / 2, my, PAL().warm2, 14 * u, 'center');
  var mSel = (LoadoutState.row === 1);
  var mPerRow = 4;
  var mw = Math.min((pw - 60 * u) / mPerRow, 190 * u);
  var mh = 46 * u;
  var mgap = 10 * u;
  var mTotal = mPerRow * mw + (mPerRow - 1) * mgap;
  var mx0 = VW / 2 - mTotal / 2;
  for (var m = 0; m < MODIFIERS.length; m++){
    var mod = MODIFIERS[m];
    var col = m % mPerRow, row = Math.floor(m / mPerRow);
    var mx = mx0 + col * (mw + mgap), myy = my + 14 * u + row * (mh + mgap);
    var on = !!(S.loadoutMods && S.loadoutMods[mod.id]);
    var focus = mSel && (LoadoutState.modIndex === m);
    UI.rects.push({ x: mx, y: myy, w: mw, h: mh, loadMod: m });
    ctx.fillStyle = on ? 'rgba(255,157,60,0.20)' : 'rgba(10,16,34,0.9)';
    ctx.fillRect(mx, myy, mw, mh);
    ctx.strokeStyle = focus ? PAL().accent : (on ? PAL().warm : 'rgba(90,220,255,0.25)');
    ctx.lineWidth = focus ? 3 : 2;
    ctx.strokeRect(mx + 0.5, myy + 0.5, mw - 1, mh - 1);
    var isz2 = mh - 12 * u;
    var ic2 = iconSprite(mod.icon);
    if (ic2) ctx.drawImage(ic2, mx + 6 * u, myy + 6 * u, isz2, isz2);
    txt(mod.name, mx + 12 * u + isz2, myy + mh * 0.42, on ? '#fff' : 'rgba(200,225,250,0.85)', 12 * u, 'left');
    txt('x' + mod.mul.toFixed(2), mx + mw - 10 * u, myy + mh * 0.42, on ? PAL().warm2 : 'rgba(160,185,215,0.7)', 11 * u, 'right');
    txt(mod.desc, mx + 12 * u + isz2, myy + mh * 0.78, 'rgba(160,195,225,0.72)', 9.5 * u, 'left');
  }
  var mul = 1, cnt = 0;
  for (var mm = 0; mm < MODIFIERS.length; mm++)
    if (S.loadoutMods && S.loadoutMods[MODIFIERS[mm].id]){ mul *= MODIFIERS[mm].mul; cnt++; }
  txt('ACTIVE ' + cnt + '   \u00B7   SCORE x' + mul.toFixed(2), VW / 2, py + ph - 26 * u, PAL().gold, 13 * u, 'center');
  txt('ESC / \u21B6 BACK', VW / 2, py + ph - 10 * u, 'rgba(150,185,220,0.6)', 11 * u, 'center');
}
function navLoadout(inp){
  if (!S.loadoutMods) S.loadoutMods = {};
  if (inp.upPressed){ LoadoutState.row = 0; sfx('menu'); }
  if (inp.downPressed){ LoadoutState.row = 1; sfx('menu'); }
  if (inp.leftPressed){
    if (LoadoutState.row === 0){ LoadoutState.index = (LoadoutState.index - 1 + PILOTS.length) % PILOTS.length; sfx('menu'); }
    else { LoadoutState.modIndex = (LoadoutState.modIndex - 1 + MODIFIERS.length) % MODIFIERS.length; sfx('menu'); }
  }
  if (inp.rightPressed){
    if (LoadoutState.row === 0){ LoadoutState.index = (LoadoutState.index + 1) % PILOTS.length; sfx('menu'); }
    else { LoadoutState.modIndex = (LoadoutState.modIndex + 1) % MODIFIERS.length; sfx('menu'); }
  }
  if (inp.actionPressed){
    if (LoadoutState.row === 1){
      var id = MODIFIERS[LoadoutState.modIndex].id;
      if (S.loadoutMods[id]) delete S.loadoutMods[id]; else S.loadoutMods[id] = 1;
      sfx('confirm');
    }
  }
}
function tapLoadout(pt){
  for (var i = 0; i < UI.rects.length; i++){
    var r = UI.rects[i];
    if (!r) continue;
    if (pt.x >= r.x && pt.x <= r.x + r.w && pt.y >= r.y && pt.y <= r.y + r.h){
      if (r.loadPilot !== undefined){ LoadoutState.row = 0; LoadoutState.index = r.loadPilot; sfx('menu'); }
      else if (r.loadMod !== undefined){
        LoadoutState.row = 1; LoadoutState.modIndex = r.loadMod;
        var id = MODIFIERS[r.loadMod].id;
        if (!S.loadoutMods) S.loadoutMods = {};
        if (S.loadoutMods[id]) delete S.loadoutMods[id]; else S.loadoutMods[id] = 1;
        sfx('confirm');
      }
      return;
    }
  }
}

/* =====================================================================
   PRACTICE RANGE
   ===================================================================== */
function practiceStep(dt){
  /* a permanent dummy to test your build on, plus a parade of real enemies */
  if (!S.dummy){
    S.dummy = spawnEnemy('dummy', Cam.x + VW * 0.72, null);
  }
  if (S.dummy && S.dummy.dead){
    S.dummy = spawnEnemy('dummy', Cam.x + VW * 0.72, null);
  }
  if (S.dummy){ S.dummy.x = Cam.x + VW * 0.72; }
  S.practiceT = (S.practiceT || 0) - dt;
  if (S.practiceT <= 0){
    S.practiceT = 2.2;
    var keys = [];
    for (var k in ENEMY_DEF) if (k !== 'dummy') keys.push(k);
    var t = keys[Math.floor(rng() * keys.length)];
    spawnEnemy(t, Cam.x + VW + 70, null);
  }
}
