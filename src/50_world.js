/* =====================================================================
   section 6: WORLD
   Procedural platforms that are ACTUALLY reachable by a jump, hazards,
   the advancing doom wall, and the spawn director.
   ===================================================================== */

var genX = 500;
var genHazX = 900;
var World = { wallOn: false };
var Wall = { x: -900, speed: 0, phase: 0, jag: [], active: false, hitCd: 0 };

/* Reachability guarantee:
   jump apex = JUMP_V^2 / (2*GRAV) = ~153px of clearance.
   Tier-1 platforms sit 62..122px above the ground  (>= 31px of headroom).
   Tier-2 platforms sit 84..118px above tier 1      (>= 35px of headroom).
   Horizontal gaps are 108..200px, inside the ~227px a running jump covers.  */
function genPlatforms(){
  var guard = 0;
  while (genX < Cam.x + VW + 1600 && guard++ < 40){
    var w = 100 + rng() * 115;
    var y1 = GROUND_Y - (62 + rng() * 60);
    platforms.push({ x: genX, y: Math.round(y1), w: Math.round(w), h: 16 });
    if (chance(0.44)){
      var y2 = y1 - (84 + rng() * 34);
      if (y2 > 90){
        /* keep the upper tier fully inside the lower tier's footprint so it
           always shares a landing spot and always culls together with it */
        var w2 = Math.min(w - 12, 88 + rng() * 92);
        if (w2 > 60){
          platforms.push({
            x: Math.round(genX + rr(0, w - w2)),
            y: Math.round(y2),
            w: Math.round(w2),
            h: 16
          });
        }
      }
    }
    genX += w + 108 + rng() * 92;      /* gap 108..200 — comfortably jumpable */
  }
  var cut = Cam.x - 800;
  for (var i = platforms.length - 1; i >= 0; i--){
    if (platforms[i].x + platforms[i].w < cut) platforms.splice(i, 1);
  }
}

/* ---------- hazards ---------- */
function genHazards(){
  var guard = 0;
  while (genHazX < Cam.x + VW + 1800 && guard++ < 30 && hazards.length < 9){
    var bio = biomeAt(genHazX);
    var hw = bio.hazardW;
    var keys = [], tot = 0;
    for (var k in hw){ tot += hw[k]; keys.push([k, tot]); }
    var r = rng() * tot, kind = 'mine';
    for (var i = 0; i < keys.length; i++){ if (r <= keys[i][1]){ kind = keys[i][0]; break; } }

    if (kind === 'mine'){
      hazards.push({ type:'mine', x:genHazX, y: GROUND_Y - rr(90, 300), w:22, h:22,
                     baseY:0, phase: rng() * 6.28, t:0, hp:1 });
      hazards[hazards.length - 1].baseY = hazards[hazards.length - 1].y;
    } else if (kind === 'spike'){
      var sw = 34 + rng() * 54;
      hazards.push({ type:'spike', x:genHazX, y: GROUND_Y - 15, w: sw, h: 15, t:0, hp:0 });
    } else if (kind === 'saw'){
      hazards.push({ type:'saw', x:genHazX, y: GROUND_Y - 27, w:27, h:27,
                     vx: -(90 + rng() * 70), t:0, hp:0 });
    } else if (kind === 'gate'){
      /* spans chest-to-knee height: standing you get hit, ducked you slip under */
      hazards.push({ type:'gate', x:genHazX, y: GROUND_Y - 160, w:12, h:130,
                     cycle: 1.6 + rng() * 1.2, phase: rng() * 3, t:0, hp:0, on:1 });
    } else if (kind === 'stalactite'){
      hazards.push({ type:'stalactite', x:genHazX, y: GROUND_Y - rr(240, 330), w:24, h:34,
                     vy:0, state:'hang', t:0, hp:0 });
    } else if (kind === 'crusher'){
      hazards.push({ type:'crusher', x:genHazX, y: GROUND_Y - 210, w:58, h:40,
                     baseY: GROUND_Y - 210, amp: 96, phase: rng() * 6.28, t:0, hp:0, vy:0 });
    } else if (kind === 'conveyor'){
      hazards.push({ type:'conveyor', x:genHazX, y: GROUND_Y - 15, w: 96 + rng()*70, h:15,
                     dir: chance(0.5) ? -1 : 1, t:0, hp:0 });
    } else if (kind === 'launchpad'){
      hazards.push({ type:'launchpad', x:genHazX, y: GROUND_Y - 13, w:48, h:13,
                     t:0, hp:0, cd:0 });
    } else if (kind === 'ice'){
      hazards.push({ type:'ice', x:genHazX, y: GROUND_Y - 6, w: 110 + rng()*90, h:6, t:0, hp:0 });
    } else if (kind === 'lowgrav'){
      hazards.push({ type:'lowgrav', x:genHazX, y: GROUND_Y - 300, w: 150, h:300, t:0, hp:0 });
    } else {
      hazards.push({ type:'acid', x:genHazX, y: GROUND_Y - 12, w: 90 + rng()*80, h:12, t:0, hp:0 });
    }
    genHazX += 900 + rng() * 1250;
  }
  var cut = Cam.x - 700;
  for (var j = hazards.length - 1; j >= 0; j--){
    if (hazards[j].x + hazards[j].w < cut) hazards.splice(j, 1);
  }
}

function updateHazards(dt){
  for (var i = 0; i < hazards.length; i++){
    var hz = hazards[i];
    hz.t += dt;
    if (hz.type === 'mine'){
      hz.y = hz.baseY + Math.sin(hz.t * 1.6 + hz.phase) * 16;
      hz.x -= 26 * dt;
    } else if (hz.type === 'saw'){
      hz.x += hz.vx * dt;
      if (hz.x < Cam.x - 400) hz.vx = Math.abs(hz.vx) * 0.5;
    } else if (hz.type === 'gate'){
      var ph = (hz.t + hz.phase) % hz.cycle;
      hz.on = ph < hz.cycle * 0.62 ? 1 : 0;
      if (ph > hz.cycle * 0.5 && ph < hz.cycle * 0.56) hz.on = 1;
    } else if (hz.type === 'stalactite'){
      if (hz.state === 'hang'){
        if (Math.abs((P.x + P.w/2) - (hz.x + hz.w/2)) < 34) hz.state = 'fall';
      } else {
        hz.vy += 1500 * dt;
        hz.y += hz.vy * dt;
        if (hz.y + hz.h >= GROUND_Y){
          hz.y = GROUND_Y - hz.h;
          hz.dead = true;
          burst(hz.x + hz.w/2, GROUND_Y - 6, 12, '#9aa4c0', 220, 0.5);
          if (Math.abs((P.x + P.w/2) - (hz.x + hz.w/2)) < 46 && P.invuln <= 0) damagePlayer(1);
          S.shake = Math.max(S.shake, Settings.reduced ? 0 : 5);
          sfx('land');
        }
      }
    } else if (hz.type === 'crusher'){
      hz.y = hz.baseY + Math.sin(hz.t * 1.35 + hz.phase) * hz.amp;
      hz.vy = Math.cos(hz.t * 1.35 + hz.phase) * hz.amp * 1.35;
    } else if (hz.type === 'launchpad'){
      if (hz.cd > 0) hz.cd -= dt;
    }
  }
}

/* ---------- doom wall ---------- */
function initWall(){
  Wall.x = Cam.x - VW * 0.9;
  Wall.speed = 0;
  Wall.phase = 0;
  Wall.hitCd = 0;
  Wall.active = DIFFS[Settings.difficulty].wall ? true : false;
  Wall.jag = [];
  for (var i = 0; i < 40; i++) Wall.jag.push(rng() * 26);
  World.wallOn = Wall.active;
}
function updateWall(dt){
  if (!Wall.active) return;
  Wall.phase += dt * 3;
  var base = 26 + S.difficulty * 15;
  var target = P.x - VW * 0.72;
  if (Wall.x < target) base *= 2.3;          /* rubber-band so it never gets lost */
  if (Wall.x > P.x - 40) base *= 0.35;       /* ease off when breathing down your neck */
  Wall.x += base * dt;

  if (Wall.hitCd > 0) Wall.hitCd -= dt;
  if (P.x < Wall.x + 26 && Wall.hitCd <= 0){
    Wall.hitCd = 1.0;
    damagePlayer(1, true);
  }
}

/* ---------- spawn director ---------- */
function pickEnemyType(){
  var bio = biomeAt(Cam.x + VW * 0.5);
  var w = bio.enemyW, d = S.difficulty;
  var acc = [], tot = 0;
  for (var k in w){
    var weight = w[k];
    if ((k === 'carrier' || k === 'sweeper' || k === 'shielded' || k === 'mortar') && d < 0.55) weight *= 0.12;
    if ((k === 'hover' || k === 'bomber' || k === 'popturret' || k === 'swarm') && d < 0.28) weight *= 0.25;
    /* new heavy hitters only show up once the run has warmed up */
    if ((k === 'queen' || k === 'hive' || k === 'phalanx') && d < 0.7) weight *= 0.10;
    if ((k === 'healer' || k === 'shielddrone' || k === 'tether' || k === 'sniper' ||
         k === 'burrower' || k === 'mimic') && d < 0.35) weight *= 0.30;
    if (k === 'roller' && d < 0.2) weight *= 0.35;
    if (weight < 0.01) weight = 0.01;
    tot += weight;
    acc.push([k, tot]);
  }
  var r = rng() * tot;
  for (var i = 0; i < acc.length; i++) if (r <= acc[i][1]) return acc[i][0];
  return 'crawler';
}

function spawnDirector(dt){
  if (S.bossActive) return;
  S.bossT -= dt;
  /* boss rush starts throwing bosses immediately; endless warms up first */
  var gate = (S.modeId === 'bossrush') ? 0.5 : 20;
  if (S.bossT <= 0 && S.t > gate){ spawnBoss(); return; }
  if (S.modeId === 'bossrush') return;
  S.eliteT = (S.eliteT === undefined ? 38 : S.eliteT) - dt;
  if (S.eliteT <= 0){
    S.eliteT = 58 + rng() * 26;
    if (S.t > 35) spawnElite();
  }
  S.spawnT -= dt;
  /* hard cap on simultaneous enemies so a bad roll can never snowball */
  var cap = (S.modeId === 'practice') ? 22 : (S.modeId === 'bossrush' ? 8 : 15);
  if (enemies.length >= cap) S.spawnT = Math.max(S.spawnT, 0.35);
  if (S.spawnT <= 0 && enemies.length < cap){
    var t = pickEnemyType();
    if (t === 'swarm'){
      var n = 4 + Math.floor(S.difficulty);
      var baseY = GROUND_Y - rr(150, 300);
      for (var i = 0; i < n; i++){
        spawnEnemy('darter', Cam.x + VW + 70 + i * 34, baseY - i * 18);
      }
    } else {
      spawnEnemy(t, null, null);
    }
    var stageMul = (S.modeId === 'campaign' && S.stageDef) ? S.stageDef.spawn : 1;
    S.spawnT = Math.max(0.55, 1.30 - S.difficulty * 0.24)
             * rr(0.80, 1.35) * DIFFS[Settings.difficulty].spawn
             * (S.modSpawn || 1) * stageMul;
  }
}

/* ---------- resize handling ---------- */
function rebuildWorldForResize(){
  if (S.screen !== SC.PLAY && S.screen !== SC.TITLE) return;
  platforms.length = 0;
  hazards.length = 0;
  genX = Cam.x + 200;
  genHazX = Cam.x + 700;
  genPlatforms();
  genHazards();
  for (var i = 0; i < enemies.length; i++){
    var e = enemies[i];
    if (!ENEMY_DEF[e.type].air && e.type !== 'boss'){
      e.y = GROUND_Y - e.h;
    } else {
      e.y = clamp(e.y, 60, GROUND_Y - e.h - 4);
    }
  }
  if (P) P.y = clamp(P.y, 0, GROUND_Y - P.h);
}
