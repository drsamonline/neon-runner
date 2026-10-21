/* =====================================================================
   section 8: SYSTEMS
   Run lifecycle, camera, the EMP bomb, combo, roguelite cards,
   the attract-mode AI, tutorial nudges, music intensity.
   ===================================================================== */

/* ---------- run lifecycle ---------- */
/* ---------- pilots & modifiers ---------- */
function applyPilot(pilotId){
  var pilot = null;
  for (var i = 0; i < PILOTS.length; i++) if (PILOTS[i].id === pilotId) pilot = PILOTS[i];
  if (!pilot) pilot = PILOTS[0];
  var m = pilot.mod;
  for (var k in m) P.stat[k] = (P.stat[k] || 0) + m[k];
  P.pilot = pilot.id;
  P.weapon = pilot.weapon;
  P.weaponRarity = 0;
  if (P.stat.hp){ P.maxHp = Math.max(1, P.maxHp + P.stat.hp); P.hp = P.maxHp; }
  P.stat.hp = 0;
  if (pilot.id === 'rampage') P.aura = 1;
  return pilot;
}
function applyMods(){
  var mods = S.mods || {};
  if (mods.fragile){ P.maxHp = 1; P.hp = 1; }
  if (mods.glass) S.modGlass = 1;
  if (mods.swarm) S.modSpawn = 0.5;
  if (mods.blitz) S.modSpeed = 1.4;
  if (mods.flood) S.modNoDrops = 1;
  if (mods.volatile) S.modVolatile = 1;
  if (mods.dark) S.modDark = 1;
  if (mods.noemp) S.modNoEmp = 1;
}

/* ---------- modes ---------- */
function modeDef(id){
  return {
    endless:    { name:'ENDLESS',    goal:'survive as long as you can' },
    campaign:   { name:'CAMPAIGN',   goal:'' },
    bossrush:   { name:'BOSS RUSH',  goal:'destroy every boss, back to back' },
    timeattack: { name:'TIME ATTACK',goal:'score as much as you can in 90 seconds' },
    practice:   { name:'PRACTICE',   goal:'no damage, no wall, just learn the enemies' }
  }[id] || { name:'ENDLESS', goal:'' };
}

function beginRun(opts){
  opts = opts || {};
  S.attract = !!opts.attract;
  S.seed = opts.seed || ((Date.now() ^ Math.floor(Math.random() * 1e9)) >>> 0);
  srand(S.seed);
  S.screen = SC.PLAY;
  S.t = 0; S.frames = 0; S.score = 0;
  S.shake = 0; S.flash = 0; S.hitStop = 0;
  S.difficulty = 0;
  S.spawnT = 0.9; S.bossT = BOSS_EVERY; S.bossActive = null;
  S.kills = 0; S.distance = 0; S.grazeCount = 0;
  S.bossCount = 0; S.bossNoHit = 0; S.bossNoHitRun = 1; S.bossTypeSeen = {};
  S.eliteT = 38; S.cardsTakenRun = 0; S.weaponsUsed = {};
  S.combo = 0; S.comboT = 0; S.comboBest = 0; S.mult = 1;
  S.bomb = 0; S.bombsUsed = 0;
  S.slowmo = 0; S.target = null; S.toast = null;
  S.cardChoices = null; S.cardIndex = 0;
  S.paused = false;
  S.zone = { ice:0, conv:0, lowgrav:0 };
  S.timeLeft = 0; S.stageClear = 0; S.rewardShown = null;
  S.finished = 0; S.hitStageRun = 0; S.runResult = null;
  S.modGlass = 0; S.modSpawn = 1; S.modSpeed = 1; S.modNoDrops = 0;
  S.modVolatile = 0; S.modDark = 0; S.modNoEmp = 0;

  /* mode */
  var modeId = opts.mode || 'endless';
  S.modeId = modeId;
  S.mode = modeDef(modeId);
  S.stage = opts.stage || null;
  S.stageDef = null;
  if (modeId === 'campaign'){
    var st = STAGES[clamp((opts.stage || 1) - 1, 0, STAGES.length - 1)];
    S.stageDef = st;
    S.mode.stage = st.n;
    S.mode.name = 'STAGE ' + st.n;
    S.mode.goal = st.goal;
    S.biomeIdx = st.biome;
  }
  /* modifiers */
  S.mods = {};
  var ml = opts.mods || [];
  for (var mi = 0; mi < ml.length; mi++) S.mods[ml[mi]] = 1;
  S.modCount = ml.length;
  S.scoreMul = 1;
  for (var mj = 0; mj < ml.length; mj++){
    for (var mk = 0; mk < MODIFIERS.length; mk++)
      if (MODIFIERS[mk].id === ml[mj]) S.scoreMul *= MODIFIERS[mk].mul;
  }

  P = makePlayer();
  if (Meta.upDmg) P.stat.dmg += Meta.upDmg;
  if (Meta.upRate) P.stat.rate += Meta.upRate;
  if (Meta.upLuck) P.stat.crit += Meta.upLuck * 0.04;
  applyPilot(opts.pilot || Meta.lastPilot || 'vector');
  applyMods();
  if (opts.attract) { P.hp = P.maxHp; }

  bullets.clear(); particles.clear(); floaters.clear(); pickups.clear();
  enemies = []; hazards = []; shells = []; shockwaves = []; platforms = [];
  genX = 500; genHazX = 900;
  Cam.x = 0; Cam.y = 0;
  genPlatforms(); genHazards();
  initWall();

  /* mode-specific setup */
  if (modeId === 'bossrush'){
    Wall.active = false;
    S.bossT = 2.0;
    P.maxHp += 2; P.hp = P.maxHp;
  } else if (modeId === 'timeattack'){
    Wall.active = false;
    S.timeLeft = 90;
  } else if (modeId === 'practice'){
    Wall.active = false;
    S.bossT = 9999;
    S.practiceInv = 1;
  } else if (modeId === 'campaign' && S.stageDef){
    Wall.active = DIFFS[Settings.difficulty].wall ? true : false;
    S.spawnT = 0.6;
  }

  Music.boss = false;
  Music.intensity = 1;
  if (!S.attract){ replayStartRecord(); sfx('start'); }
  else replayStopRecord();
  if (!S.attract && S.modeId === 'campaign' && S.stageDef) toast('STAGE ' + S.stageDef.n + ' \u2014 ' + S.stageDef.name);
}

function endRunToTitle(){
  replayStopRecord();
  Music.boss = false;
  Music.intensity = 1;
  beginRun({ attract: true });
  S.screen = SC.PLAY;
  S.attract = true;
}

/* ---------- camera ---------- */
function updateCamera(dt){
  var tx = P.x - VW * 0.34;
  if (Wall.active) tx = Math.max(tx, Wall.x - 70);
  if (tx < 0) tx = 0;
  Cam.x += (tx - Cam.x) * Math.min(1, dt * 9);
  if (Cam.x < 0) Cam.x = 0;
  if (Wall.active && Cam.x < Wall.x - 70) Cam.x = Wall.x - 70;
  var sx = S.shake * (Settings.reduced ? 0 : 1);
  Cam.shakeX = sx > 0.4 ? (Math.random() - 0.5) * sx : 0;
  Cam.shakeY = sx > 0.4 ? (Math.random() - 0.5) * sx : 0;
}

/* ---------- EMP bomb (auto-fires when the graze meter fills) ---------- */
function tryBomb(){
  if (S.bomb < 1) return;
  S.bomb = 0;
  S.bombsUsed++;
  P.invuln = Math.max(P.invuln, 1.7);
  S.flash = Settings.reduced ? 0 : 0.55;
  S.shake = Settings.reduced ? 0 : 22;
  S.hitStop = 0.10;
  sfx('bomb');
  for (var i = 0; i < bullets.n; i++){
    var b = bullets.items[i];
    if (b.team === 0){ b.life = 0; burst(b.x, b.y, 3, PAL().playerHi, 130, 0.3); }
  }
  for (var j = 0; j < enemies.length; j++){
    var e = enemies[j];
    if (e.dead) continue;
    if (e.x + e.w > Cam.x - 80 && e.x < Cam.x + VW + 80){
      e.hp -= e.boss ? 16 : 5;
      e.flash = 0.13;
      if (e.hp <= 0) killEnemy(e);
    }
  }
  burst(P.x + P.w / 2, P.y + P.h / 2, 40, PAL().playerHi, 460, 0.8);
  toast('EMP BLAST!');
}

/* ---------- roguelite cards ---------- */
function openCards(){
  var luck = P.stat.luck;
  var pool = [];
  for (var i = 0; i < CARDS.length; i++){
    var c = CARDS[i];
    var w = c.tier === 1 ? 6.0 : (c.tier === 2 ? 2.4 : 0.9);
    w *= 1 + luck * 0.18 * c.tier;
    if (c.id === 'heal' && P.hp >= P.maxHp) w *= 0.25;
    pool.push([c, w]);
  }
  var chosen = [];
  for (var k = 0; k < 3 && pool.length; k++){
    var tot = 0;
    for (var a = 0; a < pool.length; a++) tot += pool[a][1];
    var r = rng() * tot, acc = 0, idx = 0;
    for (var b = 0; b < pool.length; b++){ acc += pool[b][1]; if (r <= acc){ idx = b; break; } }
    chosen.push(pool[idx][0]);
    pool.splice(idx, 1);
  }
  S.cardChoices = chosen;
  S.cardIndex = 0;
  S.screen = SC.CARD;
  sfx('card');
}
function chooseCard(){
  var c = S.cardChoices && S.cardChoices[S.cardIndex];
  if (c){ c.apply(); P.cardsTaken++; S.cardsTakenRun++; }
  S.cardChoices = null;
  S.screen = SC.PLAY;
  sfx('confirm');
  toast('UPGRADE INSTALLED');
}
function addXP(n){
  P.xp += n;
  if (P.xp >= P.xpNeed){
    P.xp -= P.xpNeed;
    P.level++;
    P.xpNeed = 5 + P.level * 3;
    openCards();
  }
}

/* ---------- toasts / tutorial ---------- */
function toast(text){
  if (!Settings.toasts) return;
  S.toast = { text: text, t: 0, life: 2.6 };
}
function tutorial(key, text){
  var seen = Store.get('seen', {});
  if (seen[key]) return;
  seen[key] = 1;
  Store.set('seen', seen);
  toast(text);
}
function tutorialChecks(){
  if (S.attract) return;
  for (var i = 0; i < enemies.length; i++){
    var t = enemies[i].type;
    if (t === 'turret') tutorial('turret', 'DUCK clears turret lasers');
    else if (t === 'flyer') tutorial('flyer', 'AUTO-FIRE is handling it \u2014 keep moving');
    else if (t === 'mortar') tutorial('mortar', 'Mortar shells land where you stand');
    else if (t === 'shielded') tutorial('shielded', 'Shielded bot blocks frontal fire');
  }
  if (P.hp <= 1) tutorial('lowhp', 'Grab hearts \u2014 you are nearly out');
  if (Wall.active && Wall.x > P.x - 260) tutorial('wall', 'THE WALL IS COMING \u2014 keep right');
  if (S.combo >= 5) tutorial('combo', 'CHAIN x' + S.mult + ' \u2014 stay close to keep it');
}

/* ---------- attract-mode AI ---------- */
function attractAI(){
  AIIn.left = AIIn.right = AIIn.up = AIIn.down = AIIn.action = 0;
  if (!P) return;
  var p = P;
  var pcx = p.x + p.w / 2, pcy = p.y + p.h / 2;
  var t = findTarget();
  if (t){
    var dx = (t.x + t.w / 2) - pcx;
    if (dx > 320) AIIn.right = 1;
    else if (dx < 190) AIIn.left = 1;
  } else {
    AIIn.right = 1;
  }
  for (var i = 0; i < shockwaves.length; i++){
    var w = shockwaves[i];
    if (Math.abs(w.x - pcx) < 110 && p.onGround) AIIn.up = 1;
  }
  for (var j = 0; j < hazards.length; j++){
    var hz = hazards[j];
    var ahead = hz.x - pcx;
    if (hz.type === 'saw' && Math.abs(ahead) < 80 && p.onGround) AIIn.up = 1;
    if (hz.type === 'spike' && hz.x - (p.x + p.w) < 46 && hz.x + hz.w > p.x && p.onGround) AIIn.up = 1;
    if (hz.type === 'mine' && ahead > 0 && ahead < 110) AIIn.up = 1;
    if (hz.type === 'gate' && ahead > 0 && ahead < 110 && hz.on) AIIn.down = 1;
  }
  for (var s = 0; s < shells.length; s++){
    var sh = shells[s];
    if (Math.abs(sh.x - pcx) < 90 && sh.y < p.y - 40 && p.onGround) AIIn.up = 1;
  }
  for (var k = 0; k < bullets.n; k++){
    var b = bullets.items[k];
    if (b.team !== 0) continue;
    if (b.x > pcx && b.x - pcx < 130 && Math.abs(b.y - pcy) < 44) AIIn.down = 1;
  }
  if (Wall.active && Wall.x > p.x - 240) { AIIn.right = 1; AIIn.left = 0; }
  if (p.hp <= 1 && rng() < 0.02) AIIn.up = 1;
}

/* ---------- environmental zones (ice / conveyor / low gravity) ---------- */
function computeZones(){
  var z = { ice:0, conv:0, lowgrav:0 };
  for (var i = 0; i < hazards.length; i++){
    var hz = hazards[i];
    if (hz.type === 'ice' || hz.type === 'conveyor'){
      if (rectHit(P.x + 2, P.y + P.h - 3, P.w - 4, 7, hz.x, hz.y, hz.w, hz.h)){
        if (hz.type === 'ice') z.ice = 1;
        else z.conv += hz.dir * 135;
      }
    } else if (hz.type === 'lowgrav'){
      if (rectHit(P.x, P.y, P.w, P.h, hz.x, hz.y, hz.w, hz.h)) z.lowgrav = 1;
    }
  }
  S.zone = z;
}

/* ---------- the one gameplay step ---------- */
function stepGame(dt){
  S.frames++;
  S.t += dt;
  /* slower ramp: time is the main driver, score nudges it along */
  S.difficulty = Math.min(2.3, S.t / 58) + Math.min(0.7, S.score / 42000);
  S.difficulty = Math.min(2.8, S.difficulty);

  if (S.attract) attractAI();

  computeZones();
  updatePlayer(dt);
  updateEnemies(dt);
  updateBullets(dt);
  updateShells(dt);
  updateHazards(dt);
  updatePickups(dt);
  updateEffects(dt);
  updateDecals(dt);
  updateCaption(dt);
  spawnDirector(dt);
  updateWall(dt);
  genPlatforms();
  genHazards();
  updateCamera(dt);

  S.distance = P.x / 100;
  S.biomeIdx = Math.floor(Math.max(0, Cam.x) / 2400) % BIOMES.length;

  /* graze meter auto-EMP */
  if (S.bomb >= 1) tryBomb();

  /* combo decay */
  if (S.comboT > 0){
    S.comboT -= dt;
    if (S.comboT <= 0){ S.combo = 0; S.mult = 1; }
  }

  /* hazard contact */
  for (var i = 0; i < hazards.length; i++){
    var hz = hazards[i];
    var over = rectHit(hz.x, hz.y, hz.w, hz.h, P.x, P.y, P.w, P.h);
    if (hz.type === 'gate'){
      if (hz.on && over) damagePlayer(1);
    } else if (hz.type === 'spike' || hz.type === 'acid'){
      if (over) damagePlayer(1);
    } else if (hz.type === 'crusher'){
      if (over && P.invuln <= 0) damagePlayer(1);
    } else if (hz.type === 'stalactite'){
      if (over && P.invuln <= 0) damagePlayer(1);
    } else if (hz.type === 'launchpad'){
      if (over && hz.cd <= 0){
        hz.cd = 0.5;
        P.vy = -1180; P.onGround = false;
        P.sy = 1.35; P.sx = 0.72;
        burst(hz.x + hz.w/2, hz.y, 12, PAL().good2, 180, 0.4);
        sfx('jump', 1.5);
      }
    } else if (hz.type === 'mine' || hz.type === 'saw'){
      if (over){
        damagePlayer(1);
        hz.dead = true;
        explodeAt(hz.x + hz.w / 2, hz.y + hz.h / 2, 60, 0, 0);
      }
    }
  }
  for (var h = hazards.length - 1; h >= 0; h--) if (hazards[h].dead) hazards.splice(h, 1);

  /* enemy contact */
  if (P.invuln <= 0){
    for (var j = 0; j < enemies.length; j++){
      var e = enemies[j];
      if (e.dead || e.hidden) continue;
      if (rectHit(P.x, P.y, P.w, P.h, e.x + 3, e.y + 3, e.w - 6, e.h - 6)){
        damagePlayer(1);
        break;
      }
    }
  }

  modeStep(dt);
  if (S.screen !== SC.PLAY) return;
  tutorialChecks();

  /* music intensity follows the action */
  var inten = S.difficulty < 0.5 ? 1 : (S.difficulty < 1.4 ? 2 : 3);
  Music.intensity = inten;
}


/* =====================================================================
   MODE LOGIC
   ===================================================================== */
function modeStep(dt){
  if (S.attract) return;
  var id = S.modeId;

  if (id === 'timeattack'){
    S.timeLeft -= dt;
    if (S.timeLeft <= 0){ S.timeLeft = 0; finishRun('TIME UP'); }
    return;
  }
  if (id === 'campaign' && S.stageDef){
    var st = S.stageDef;
    if (st.boss){
      if (S.bossCount >= 1){ finishRun('STAGE CLEAR'); }
    } else {
      var done = (S.t >= st.dur) && (S.kills >= (st.kills || 0));
      if (done) finishRun('STAGE CLEAR');
    }
    return;
  }
  if (id === 'bossrush'){
    if (S.bossCount >= BOSS_ORDER.length && !S.bossActive){ finishRun('ALL BOSSES DOWN'); return; }
    if (!S.bossActive) S.bossT = Math.min(S.bossT, 1.1);
    return;
  }
}

/* =====================================================================
   RUN SUMMARY / ACHIEVEMENTS / CAREER
   ===================================================================== */
function careerStats(){
  if (!Meta.career){
    Meta.career = { kills:0, bosses:0, grazes:0, emps:0, distance:0, runs:0,
                    scrapEarned:0, weaponsUsed:{}, pilotsUsed:{}, bossTypes:{},
                    campaignCleared:0, codexSeen:{} };
  }
  return Meta.career;
}
function runSummary(){
  return {
    score: Math.floor(S.score), time: S.t, kills: S.kills,
    maxMult: S.mult, bestCombo: S.comboBest, cards: S.cardsTakenRun,
    difficulty: Settings.difficulty, bossNoHit: S.bossNoHit,
    modCount: S.modCount || 0, noHitStage: S.hitStageRun === 0 ? 1 : 0,
    mode: S.modeId, stage: S.mode.stage || 0
  };
}
function finishRun(reason){
  if (S.finished) return;
  S.finished = 1;
  var run = runSummary();
  var career = careerStats();
  career.runs++;
  career.kills += S.kills;
  career.bosses += S.bossCount || 0;
  career.grazes += S.grazeCount;
  career.emps += S.bombsUsed;
  career.distance += S.distance;
  career.scrapEarned += Math.floor(S.score / 100);
  for (var w in S.weaponsUsed) career.weaponsUsed[w] = 1;
  career.pilotsUsed[P.pilot || 'vector'] = 1;
  for (var bt in S.bossTypeSeen) career.bossTypes[bt] = 1;
  if (S.modeId === 'campaign' && S.stageDef){
    if (S.stageDef.n > (career.campaignCleared || 0)) career.campaignCleared = S.stageDef.n;
    if (S.stageDef.n >= (Meta.campaign || 0) + 1) Meta.campaign = S.stageDef.n;
  }
  Meta.scrap += Math.floor(S.score / 100 * (P.stat.greed ? 2 : 1));
  if (S.score > Meta.bestScore) Meta.bestScore = Math.floor(S.score);
  if (S.t > Meta.bestTime) Meta.bestTime = S.t;
  saveMeta();

  /* achievements */
  var unlocked = Meta.achievements || (Meta.achievements = {});
  var newly = [];
  for (var i = 0; i < ACHIEVEMENTS.length; i++){
    var a = ACHIEVEMENTS[i];
    if (unlocked[a.id]) continue;
    try { if (a.check(run, career)) { unlocked[a.id] = 1; newly.push(a); } } catch(e){}
  }
  S.lastReplay = Replay.frames.slice();
  S.lastSeed = S.seed;
  S.lastModeId = S.modeId;
  S.lastStage = S.mode.stage || null;
  S.lastModIds = (function(){ var a = []; for (var k2 in S.mods) a.push(k2); return a; })();
  recordHistory();
  if (newly.length){
    Meta.lastAchievements = newly.map(function(x){ return x.name; });
    saveMeta();
    S.toastQueue = newly.slice();
  }
  S.runResult = { reason: reason, run: run, newAch: newly };
  killPlayerFinal(reason);
}
function killPlayerFinal(reason){
  haptic(120);
  S.screen = SC.DEAD;
  S.shake = Settings.reduced ? 0 : 26;
  burst(P.x + P.w / 2, P.y + P.h / 2, 46, PAL().playerHi, 340, 0.9);
  burst(P.x + P.w / 2, P.y + P.h / 2, 26, PAL().gold, 260, 0.8);
  sfx('dead');
  replayStopRecord();
  Music.intensity = 0;
  Music.boss = false;
  S.needsInitials = scoreQualifies(S.score);
  S.initials = [65, 65, 65];
  S.initSlot = 0;
  S.deathT = 0;
  S.deathReason = reason || 'DESTROYED';
  if (S.toastQueue && S.toastQueue.length){
    S.achToast = S.toastQueue.shift();
    S.achToastT = 3.4;
  }
}

/* =====================================================================
   CODEX DISCOVERY
   ===================================================================== */
function discover(kind, id){
  if (!id) return;
  var c = careerStats();
  if (!c.codexSeen) c.codexSeen = {};
  var key = kind + ':' + id;
  if (!c.codexSeen[key]){ c.codexSeen[key] = 1; Meta.dirty = 1; }
}
