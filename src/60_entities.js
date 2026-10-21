/* =====================================================================
   section 7: ENTITIES
   Player (slide / stomp / squash), 16 enemy behaviours, the boss,
   weapons, bullets, shells, pickups.
   ===================================================================== */

var P = null;

/* ---------- weapons ---------- */


function makePlayer(){
  var d = DIFFS[Settings.difficulty];
  var hp = d.hp + Meta.upHP;
  return {
    x: 140, y: GROUND_Y - P_H, w: P_W, h: P_H, vx: 0, vy: 0,
    onGround: true, facing: 1,
    hp: hp, maxHp: hp + 2,
    invuln: 0, shootCd: 0, muzzle: 0, hurtT: 0,
    sliding: false, slideT: 0, slideCd: 0,
    sx: 1, sy: 1, landT: 0, animT: 0,
    shieldT: 0, regenT: 0,
    weapon: 'pulse', weaponRarity: 0, heat: 0, overheated: 0,
    drones: [], turrets: [], orbs: [], jumps: 0, vampK: 0, bulwarkT: 0,
    aura: 0, pilot: null, mods: null, hurtSince: 0,
    stat: { dmg:0, rate:0, range:0, speed:0, graze:0, jump:0, crit:0, magnet:0, regen:0,
            multi:0, pierce:0, cool:0, thorns:0, vamp:0, boom:0, chain:0, freeze:0,
            bounce:0, homing:0, blast:0, luck:0, bulwark:0, drone:0, turret:0, orbit:0,
            slide:0, djump:0, exec:0, berserk:0, greed:0, swarm:0, revive:0, chrono:0 },
    level: 1, xp: 0, xpNeed: 5, cardsTaken: 0,
    afterimages: []
  };
}

/* point-to-segment distance test, used by tether beams */
function segHit(px, py, x1, y1, x2, y2, r){
  var dx = x2 - x1, dy = y2 - y1;
  var len2 = dx*dx + dy*dy;
  var t = len2 > 0 ? ((px - x1) * dx + (py - y1) * dy) / len2 : 0;
  t = clamp(t, 0, 1);
  var cx = x1 + t*dx, cy = y1 + t*dy;
  return Math.hypot(px - cx, py - cy) < r;
}

/* ---------- enemy spawning ---------- */
var _tetherMate = false;
function spawnEnemy(type, forceX, forceY){
  var def = ENEMY_DEF[type];
  if (!def) return null;
  var diff = DIFFS[Settings.difficulty];
  var d = S.difficulty;
  var fromRight = (forceX === null || forceX === undefined) ? chance(0.86) : true;
  var diving = false;
  var x = (forceX === null || forceX === undefined)
        ? (fromRight ? Cam.x + VW + 70 : Cam.x - 100)
        : forceX;
  var y;
  if (forceY !== null && forceY !== undefined) y = forceY;
  else if (def.air){
    /* a third of flyers drop in from above the viewport instead of walking on
       from the right — keeps the action constant on very wide screens */
    if (chance(0.32) && (forceX === null || forceX === undefined)){
      x = Cam.x + rr(VW * 0.35, VW * 1.0);
      y = -60;
      diving = true;
    } else {
      y = GROUND_Y - rr(140, 330);
    }
  }
  else y = GROUND_Y - def.h;

  var e = {
    type: type, x: x, y: y, w: def.w, h: def.h,
    hp: def.hp + Math.floor(d * 0.8), maxHp: def.hp + Math.floor(d * 0.8),
    vx: 0, vy: 0, t: 0, flash: 0, dead: false, pts: def.pts,
    dir: fromRight ? -1 : 1, state: 'walk', stateT: 0,
    baseY: (def.air && (forceY === null || forceY === undefined)) ? GROUND_Y - rr(140, 300) : y,
    phase: rng() * 6.28, shootCd: rr(0.6, 1.6),
    onGround: false, angle: 0, shieldUp: 1, hidden: (type === 'popturret'),
    boss: false, diving: diving
  };
  if (type === 'darter'){
    var ang = Math.atan2((P.y + P.h / 2) - (e.y + e.h / 2), (P.x + P.w / 2) - (e.x + e.w / 2));
    var sp = 165 + d * 20;
    e.vx = Math.cos(ang) * sp; e.vy = Math.sin(ang) * sp;
  }
  if (type === 'roller') e.baseSpd = 150 + S.difficulty * 22;
  enemies.push(e);
  /* tether orbs arrive in linked pairs — guard against recursing forever */
  if (type === 'tether' && !_tetherMate){
    _tetherMate = true;
    var mate = spawnEnemy('tether', x + 130, e.baseY + 40);
    _tetherMate = false;
    if (mate){ mate.partner = e; e.partner = mate; mate.pts = e.pts; mate.baseY = e.baseY + 40; }
  }
  return e;
}



/* ---------- damage ---------- */
function damagePlayer(amount, fromWall){
  var p = P;
  if (S.practiceInv) return;
  if (p.invuln > 0) return;
  S.hitStageRun = (S.hitStageRun || 0) + 1;
  if (p.shieldT > 0){
    p.shieldT = 0;
    p.invuln = 1.1;
    S.shake = Math.max(S.shake, 10);
    burst(p.x + p.w / 2, p.y + p.h / 2, 18, PAL().accent, 260, 0.5);
    sfx('stomp');
    toast('SHIELD BROKEN');
    return;
  }
  var dmg = Math.max(1, Math.round(amount * DIFFS[Settings.difficulty].dmg * (S.mods && S.mods.glass ? 2 : 1)));
  if (p.stat.revive > 0 && p.hp - dmg <= 0){
    p.stat.revive--; p.hp = 1; p.invuln = 2.4;
    S.flash = 0.6; S.shake = 16;
    burst(p.x + p.w/2, p.y + p.h/2, 40, PAL().gold, 320, 0.9);
    toast('SECOND WIND \u2014 REVIVED');
    sfx('bomb');
    return;
  }
  /* retaliation */
  if (p.stat.thorns > 0){
    for (var ti = 0; ti < enemies.length; ti++){
      var te = enemies[ti];
      if (te.dead) continue;
      if (rectHit(p.x - 6, p.y - 6, p.w + 12, p.h + 12, te.x, te.y, te.w, te.h)){
        te.hp -= p.stat.thorns; te.flash = 0.1;
        if (te.hp <= 0) killEnemy(te);
      }
    }
  }
  p.hp -= dmg;
  p.hurtSince = 0;
  if (S.bossActive) S.bossNoHitRun = 0;
  p.invuln = 1.5;
  p.hurtT = 0.3;
  S.shake = Math.max(S.shake, Settings.reduced ? 0 : 15);
  S.flash = 0.2;
  S.combo = 0; S.mult = 1; S.comboT = 0;
  burst(p.x + p.w / 2, p.y + p.h / 2, 16, PAL().danger, 260, 0.5);
  sfx('hit');
  if (!S.attract) haptic(90);
  if (fromWall) p.vx = 320;
  if (p.hp <= 0){ p.hp = 0; killPlayer(); }
  else if (p.hp === 1) caption('low health warning');
}

function killPlayer(){
  if (S.attract){ beginRun({ attract: true }); S.screen = SC.PLAY; S.attract = true; return; }
  finishRun('DESTROYED');
}

function killEnemy(e, byStomp){
  if (e.dead) return;
  e.dead = true;
  S.kills++;
  S.weaponsUsed[P.weapon] = 1;
  discover('enemies', e.type);
  if (e.boss) discover('bosses', e.bossType);
  S.combo++; S.comboT = COMBO_WINDOW;
  if (S.combo > S.comboBest) S.comboBest = S.combo;
  S.mult = clamp(1 + Math.floor(S.combo / 5), 1, 8);
  var gain = Math.floor(e.pts * S.mult * DIFFS[Settings.difficulty].mul * (S.scoreMul || 1));
  S.score += gain;
  S.shake = Math.max(S.shake, Settings.reduced ? 0 : 6);
  S.hitStop = Math.max(S.hitStop, e.boss ? 0.14 : 0.045);
  if (!S.attract) addXP(e.boss ? 6 : (e.pts >= 250 ? 2 : 1));
  if (!S.attract) haptic(e.boss ? 60 : 14);
  if (Settings.decals && !e.boss) addDecal(e.x + e.w / 2, 10 + e.w * 0.28, 'rgba(0,0,0,0.5)');
  if (e.boss) addDecal(e.x + e.w / 2, 52, 'rgba(0,0,0,0.6)');
  burst(e.x + e.w / 2, e.y + e.h / 2, e.boss ? 60 : 16, PAL().e2, 260, 0.6);
  burst(e.x + e.w / 2, e.y + e.h / 2, e.boss ? 34 : 8, '#fff2c9', 190, 0.4);
  floaters.spawn();
  var f = floaters.items[floaters.n - 1];
  f.x = e.x + e.w / 2; f.y = e.y; f.life = 0.9; f.text = '+' + gain;
  f.color = PAL().playerHi; f.size = 16 + Math.min(8, S.mult);
  sfx(e.boss ? 'boom' : 'kill');

  if (e.boss){
    S.bossActive = null;
    S.bossCount = (S.bossCount || 0) + 1;
    if (S.bossNoHitRun) S.bossNoHit++;
    if (S.bossTypeSeen) S.bossTypeSeen[e.bossType] = 1;
    Music.boss = false;
    dropPickup(e.x + e.w / 2, e.y + e.h / 2, 'heart');
    dropPickup(e.x + e.w / 2 - 30, e.y + e.h / 2, 'heart');
    dropPickup(e.x + e.w / 2 + 30, e.y + e.h / 2, 'weapon');
    dropPickup(e.x + e.w / 2, e.y, 'scrap');
    toast('HEAVY UNIT DESTROYED');
    return;
  }

  var r = rng();
  if (S.modNoDrops) { /* BARREN modifier: no drops */ }
  else if (r < 0.10 && P.hp < P.maxHp) dropPickup(e.x + e.w / 2, e.y, 'heart');
  else if (!S.modNoDrops && r < 0.17) dropPickup(e.x + e.w / 2, e.y, 'weapon');
  else if (!S.modNoDrops && r < 0.23) dropPickup(e.x + e.w / 2, e.y, 'scrap');
  else if (!S.modNoDrops && r < 0.27) dropPickup(e.x + e.w / 2, e.y, 'shield');

  if (e.type === 'splitter'){
    for (var i = 0; i < 2; i++){
      var c = spawnEnemy('crawler', e.x + i * 26 - 10, GROUND_Y - ENEMY_DEF.crawler.h);
      if (c){ c.hp = 1; c.maxHp = 1; c.pts = 40; }
    }
  }
  if (e.type === 'exploder') explodeAt(e.x + e.w / 2, e.y + e.h / 2, 78, 1, 1);
  else if (S.modVolatile) explodeAt(e.x + e.w / 2, e.y + e.h / 2, 70, 0, 2);
}

function explodeAt(x, y, r, dmg, team, quiet){
  burst(x, y, quiet ? 7 : 22, PAL().e2, quiet ? 170 : 320, 0.45);
  if (!quiet){
    burst(x, y, 12, '#fff', 220, 0.35);
    S.shake = Math.max(S.shake, Settings.reduced ? 0 : 9);
    sfx('boom');
  }
  if (team === 1){
    if (rectHit(x - r, y - r, r * 2, r * 2, P.x, P.y, P.w, P.h)) damagePlayer(dmg);
  }
  for (var i = 0; i < enemies.length; i++){
    var e = enemies[i];
    if (e.dead) continue;
    if (rectHit(x - r, y - r, r * 2, r * 2, e.x, e.y, e.w, e.h)){
      e.hp -= quiet ? 1 : 2; e.flash = 0.09;
      if (e.hp <= 0) killEnemy(e);
    }
  }
}

/* ---------- pickups ---------- */
function dropPickup(x, y, kind){
  pickups.spawn();
  var k = pickups.items[pickups.n - 1];
  k.x = x - 11; k.y = y - 11; k.w = 22; k.h = 22;
  k.vy = -190; k.t = 0; k.life = 18;
  if (kind === 'weapon'){
    var pool = (S.difficulty < 0.5) ? WEAPON_T1 : (S.difficulty < 1.4 ? WEAPON_T1.concat(WEAPON_T2) : WEAPON_KEYS);
    k.kind = pickOne(pool);
    k.rarity = rollRarity(P.stat.luck * 0.03);
  } else {
    k.kind = kind;
    k.rarity = 0;
  }
  return k;
}
function applyPickup(k){
  if (k.kind === 'heart'){
    P.hp = Math.min(P.maxHp, P.hp + 1);
    floaters.spawn();
    var f = floaters.items[floaters.n - 1];
    f.x = k.x + 11; f.y = k.y; f.life = 0.9; f.text = '+1 HP'; f.color = PAL().good; f.size = 16;
    sfx('pick');
  } else if (k.kind === 'scrap'){
    Meta.scrap += 5; saveMeta();
    S.score += 25;
    floaters.spawn();
    var f2 = floaters.items[floaters.n - 1];
    f2.x = k.x + 11; f2.y = k.y; f2.life = 0.9; f2.text = '+5 SCRAP'; f2.color = PAL().gold; f2.size = 15;
    sfx('pick');
  } else if (k.kind === 'shield'){
    P.shieldT = 9;
    sfx('weapon');
    toast('SHIELD ONLINE');
  } else {
    P.weapon = k.kind;
    P.weaponRarity = k.rarity || 0;
    P.heat = 0; P.overheated = 0;
    discover('weapons', k.kind);
    sfx('weapon');
    toast(WEAPONS[k.kind].name + '  \u00B7  ' + RARITY[P.weaponRarity].name + '  EQUIPPED');
  }
  burst(k.x + 11, k.y + 11, 14, PAL().good, 220, 0.5);
}

/* ---------- player update ---------- */
function updatePlayer(dt){
  var p = P;
  var diff = DIFFS[Settings.difficulty];
  p.invuln = Math.max(0, p.invuln - dt);
  p.shieldT = Math.max(0, p.shieldT - dt);
  p.shootCd -= dt;
  p.slideCd = Math.max(0, p.slideCd - dt);
  if (p.muzzle > 0) p.muzzle -= dt;
  if (p.hurtT > 0) p.hurtT -= dt;
  if (p.landT > 0) p.landT -= dt;
  p.animT += dt;
  if (p.stat.regen > 0){
    p.regenT += dt;
    if (p.regenT > 12){ p.regenT = 0; if (p.hp < p.maxHp) p.hp++; }
  }
  if (p.stat.bulwark > 0){
    p.bulwarkT += dt;
    if (p.bulwarkT > 14){ p.bulwarkT = 0; p.shieldT = Math.max(p.shieldT, 5); sfx('pick'); }
  }
  /* berserker pilot aura */
  if (p.aura > 0){
    for (var ai2 = 0; ai2 < enemies.length; ai2++){
      var ae = enemies[ai2];
      if (ae.dead || ae.hidden) continue;
      if (Math.abs((ae.x + ae.w/2) - (p.x + p.w/2)) < 46 &&
          Math.abs((ae.y + ae.h/2) - (p.y + p.h/2)) < 40){
        ae.hp -= 26 * dt; ae.flash = 0.06;
        if (ae.hp <= 0) killEnemy(ae);
      }
    }
  }

  var left = Input.left, right = Input.right, duck = Input.down;
  if (Settings.autorun && !left) right = 1;
  var moveX = (right ? 1 : 0) - (left ? 1 : 0);

  /* ---- slide ---- */
  if (p.sliding){
    p.slideT -= dt;
    p.vx = p.facing * (470 + p.stat.speed * 30);
    if (p.slideT <= 0 || !p.onGround) p.sliding = false;
  } else {
    if (duck && p.onGround && moveX !== 0 && p.slideCd <= 0){
      p.sliding = true; p.slideT = 0.40 + p.stat.slide * 0.16; p.slideCd = 0.62;
      p.invuln = Math.max(p.invuln, 0.36 + p.stat.slide * 0.1);
      p.facing = moveX;
      burst(p.x + p.w / 2, p.y + p.h, 8, PAL().playerHi, 150, 0.3);
      sfx('slide');
    }
    if (moveX !== 0) p.facing = moveX;
    var wantVx = moveX * (MOVE + p.stat.speed * 32);
    if (S.zone && S.zone.ice) p.vx += (wantVx - p.vx) * Math.min(1, dt * 3.0);
    else p.vx = wantVx;
    if (S.zone && S.zone.conv) p.vx += S.zone.conv;
  }

  var ducking = (duck && p.onGround && !p.sliding);

  /* ---- jump ---- */
  if (p.onGround) p.jumps = 0;
  if (Input.jumpPressed){
    if (p.onGround || p.coyote > 0){
      p.vy = (JUMP_V - p.stat.jump * 22);
      p.onGround = false; p.coyote = 0; p.jumps = 1;
      p.sy = 1.28; p.sx = 0.78;
      burst(p.x + p.w / 2, p.y + p.h, 6, PAL().playerHi, 110, 0.3);
      sfx('jump');
    } else if (p.stat.djump > 0 && p.jumps <= p.stat.djump){
      p.vy = (JUMP_V - p.stat.jump * 22) * 0.88;
      p.jumps++;
      p.sy = 1.3; p.sx = 0.76;
      burst(p.x + p.w / 2, p.y + p.h, 10, PAL().good, 150, 0.35);
      sfx('jump', 1.25);
    }
  }
  if (!Input.up && !Input.action && p.vy < 0) p.vy += GRAV * 0.92 * dt;   /* short hop */
  p.jumpHeld = Input.up || Input.action ? 1 : 0;

  /* ---- height / duck ---- */
  var targetH = (ducking || p.sliding) ? P_DUCK_H : P_H;
  if (targetH !== p.h){
    var bottom = p.y + p.h;
    p.h = targetH;
    p.y = bottom - p.h;
  }

  /* ---- physics ---- */
  p.vy += GRAV * (S.zone && S.zone.lowgrav ? 0.42 : 1) * dt;
  if (p.vy > 1400) p.vy = 1400;
  var prevBottom = p.y + p.h;
  p.x += p.vx * dt;
  p.y += p.vy * dt;
  if (p.x < Cam.x - VW * 0.5) p.x = Cam.x - VW * 0.5;

  var wasAir = !p.onGround;
  p.onGround = false;
  if (p.y + p.h >= GROUND_Y){ p.y = GROUND_Y - p.h; p.vy = 0; p.onGround = true; }
  if (p.vy >= 0){
    for (var i = 0; i < platforms.length; i++){
      var pl = platforms[i];
      if (p.x + p.w > pl.x && p.x < pl.x + pl.w && prevBottom <= pl.y + 3 && p.y + p.h >= pl.y){
        p.y = pl.y - p.h; p.vy = 0; p.onGround = true;
      }
    }
  }
  if (p.onGround){
    p.coyote = 0.1;
    if (wasAir && p.vy === 0){
      p.landT = 0.16; p.sx = 1.3; p.sy = 0.74;
      burst(p.x + p.w / 2, p.y + p.h, 7, 'rgba(200,230,255,0.8)', 120, 0.3);
      sfx('land');
    }
  } else {
    p.coyote = Math.max(0, p.coyote - dt);
  }

  /* ---- squash / stretch recovery ---- */
  p.sx += (1 - p.sx) * Math.min(1, dt * 13);
  p.sy += (1 - p.sy) * Math.min(1, dt * 13);
  if (!p.onGround){
    var tgt = p.vy < 0 ? 0.86 : 1.12;
    p.sy += (tgt - p.sy) * Math.min(1, dt * 7);
    p.sx += (1 / tgt - p.sx) * Math.min(1, dt * 7);
  }

  /* ---- afterimages ---- */
  if (p.sliding && S.frames % 2 === 0){
    p.afterimages.push({ x: p.x, y: p.y, f: p.facing, t: 0.28, duck: true });
  }
  for (var a = p.afterimages.length - 1; a >= 0; a--){
    p.afterimages[a].t -= dt;
    if (p.afterimages[a].t <= 0) p.afterimages.splice(a, 1);
  }

  /* ---- heat ---- */
  if (p.overheated){
    p.heat -= OVERHEAT_COOL * 1.5 * dt;
    if (p.heat <= 0.3){ p.heat = 0.3; p.overheated = 0; sfx('confirm'); }
  } else if (!S.target){
    /* the gun only cools when there is nothing to shoot at — so you break
       line of sight to manage heat, which is the whole point of the mechanic */
    p.heat = Math.max(0, p.heat - OVERHEAT_COOL * dt);
  }

  /* ---- auto-fire ---- */
  S.target = findTarget();
  if (S.target && p.shootCd <= 0 && !p.overheated) fireWeapon(p);

  /* ---- companions ---- */
  updateCompanions(dt);

  /* ---- stomp ---- */
  checkStomp();
}

/* ---------- targeting ---------- */
S.target = null;
function findTarget(){
  var pcx = P.x + P.w / 2, pcy = P.y + P.h / 2;
  var range = RANGE_BASE + P.stat.range * 55;
  var best = null, bestScore = -1e9;
  for (var i = 0; i < enemies.length; i++){
    var e = enemies[i];
    if (e.dead || e.hidden) continue;
    var dx = (e.x + e.w / 2) - pcx;
    var dy = (e.y + e.h / 2) - pcy;
    if (dx < -130) continue;
    var dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > range) continue;
    var score = -dist;
    if (e.type === 'exploder' && dist < 150) score += 400;      /* threat priority */
    if (e.type === 'turret' || e.type === 'sweeper' || e.type === 'mortar') score += 90;
    if (e.boss) score += 200;
    if (score > bestScore){ bestScore = score; best = e; }
  }
  return best;
}

/* ---------- weapons ---------- */
/* ---------- damage helpers ---------- */
function rarityMul(){ var r = RARITY[P.weaponRarity]; return r ? r.dmg : 1; }
function shotDamage(w){
  var d = (w.dmg + P.stat.dmg) * rarityMul();
  if (P.stat.berserk && P.hp <= 1) d *= 1.45;
  return d;
}

/* ---------- companions: drones, turrets, orbs ---------- */
function updateCompanions(dt){
  var p = P;

  /* --- orbiting combat drones --- */
  var want = p.stat.drone;
  while (p.drones.length < want) p.drones.push({ a: rng() * 6.28, cd: 0 });
  while (p.drones.length > want) p.drones.pop();
  for (var i = 0; i < p.drones.length; i++){
    var d = p.drones[i];
    d.a += dt * 1.9;
    d.cd -= dt;
    d.x = p.x + p.w / 2 + Math.cos(d.a) * 34;
    d.y = p.y + p.h / 2 + Math.sin(d.a) * 26;
    if (d.cd <= 0){
      var t = S.target || findNearestEnemy(d.x, d.y);
      if (t){
        d.cd = 0.42 * (1 - P.stat.rate * 0.05);
        var a = Math.atan2((t.y + t.h/2) - d.y, (t.x + t.w/2) - d.x);
        bullets.spawn();
        var b = bullets.items[bullets.n - 1];
        b.x = d.x; b.y = d.y;
        b.vx = Math.cos(a) * 700; b.vy = Math.sin(a) * 700;
        b.r = 3; b.dmg = 1 + P.stat.dmg * 0.5; b.team = 1; b.life = 1.2;
        b.kind = 'drone'; b.pierce = 0; b.homing = 0; b.bounce = 0;
        b.blast = 0; b.chain = 0; b.freeze = 0; b.turn = 0;
        b.color = PAL().cool;
        sfx('shoot2');
      }
    }
  }

  /* --- deployed ground turrets (max 3, they stay where you left them) --- */
  var wt = Math.min(3, p.stat.turret);
  while (p.turrets.length < wt){
    p.turrets.push({ x: p.x + p.w/2 + (p.turrets.length - 1) * 40, cd: rng() * 0.5, life: 26, flash: 0 });
  }
  while (p.turrets.length > wt) p.turrets.pop();
  for (var j = 0; j < p.turrets.length; j++){
    var tu = p.turrets[j];
    tu.cd -= dt; tu.life -= dt;
    if (tu.flash > 0) tu.flash -= dt;
    if (tu.life <= 0){ tu.life = 26; tu.x = p.x + p.w/2; }
    if (tu.cd <= 0){
      var t2 = null, bd = 340 * 340;
      for (var k = 0; k < enemies.length; k++){
        var e = enemies[k];
        if (e.dead || e.hidden) continue;
        var dx = (e.x + e.w/2) - tu.x, dy = (e.y + e.h/2) - (GROUND_Y - 40);
        var dd = dx*dx + dy*dy;
        if (dd < bd){ bd = dd; t2 = e; }
      }
      if (t2){
        tu.cd = 0.5; tu.flash = 0.08;
        var a2 = Math.atan2((t2.y + t2.h/2) - (GROUND_Y - 40), (t2.x + t2.w/2) - tu.x);
        bullets.spawn();
        var b2 = bullets.items[bullets.n - 1];
        b2.x = tu.x; b2.y = GROUND_Y - 40;
        b2.vx = Math.cos(a2) * 620; b2.vy = Math.sin(a2) * 620;
        b2.r = 4; b2.dmg = 1.5 + P.stat.dmg * 0.5; b2.team = 1; b2.life = 1.4;
        b2.kind = 'turret'; b2.pierce = 0; b2.homing = 0; b2.bounce = 0;
        b2.blast = 0; b2.chain = 0; b2.freeze = 0; b2.turn = 0;
        b2.color = PAL().purple2;
        sfx('shoot3');
      }
    }
  }

  /* --- orbiting damage orbs --- */
  var wo = p.stat.orbit;
  while (p.orbs.length < wo) p.orbs.push({ a: (p.orbs.length / Math.max(1, wo)) * 6.28 });
  while (p.orbs.length > wo) p.orbs.pop();
  for (var m = 0; m < p.orbs.length; m++){
    var o = p.orbs[m];
    o.a += dt * 2.6;
    o.x = p.x + p.w/2 + Math.cos(o.a) * 44;
    o.y = p.y + p.h/2 + Math.sin(o.a) * 44;
    for (var n2 = 0; n2 < enemies.length; n2++){
      var en = enemies[n2];
      if (en.dead || en.hidden) continue;
      if (rectHit(o.x - 8, o.y - 8, 16, 16, en.x, en.y, en.w, en.h)){
        en.hp -= 3 * dt * 10 * 0.1;
        en.flash = 0.06;
        if (en.hp <= 0) killEnemy(en);
      }
    }
  }
}

function fireWeapon(p){
  var w = WEAPONS[p.weapon];
  var tgt = S.target;
  var cx = p.x + p.w / 2 + p.facing * 10;
  var cy = p.y + p.h * 0.42;
  var tx = tgt ? tgt.x + tgt.w / 2 : cx + p.facing * 200;
  var ty = tgt ? tgt.y + tgt.h / 2 : cy;
  var base = Math.atan2(ty - cy, tx - cx);
  var count = (w.count || 1) + (P.stat.multi || 0) + Math.floor(P.level / 4) * (P.stat.swarm || 0);
  if (!(count > 0)) count = 1;
  if (count > 12) count = 12;
  var lifeByKind = { shot:1.5, rail:1.7, missile:2.6, flame:0.26, boomer:1.5, mine:3.0, arc:0.9 };

  for (var i = 0; i < count; i++){
    var a = base;
    if (count > 1) a += (i - (count - 1) / 2) * (w.spread || 0.22);
    if (w.homing > 0 && count > 1) a += (i - (count - 1) / 2) * 0.42;
    var dmg = shotDamage(w);
    var crit = (P.stat.crit > 0) && chance(P.stat.crit);
    if (crit) dmg *= 2;
    bullets.spawn();
    var b = bullets.items[bullets.n - 1];
    b.x = cx; b.y = cy;
    b.vx = Math.cos(a) * w.spd; b.vy = Math.sin(a) * w.spd;
    b.r = w.size; b.dmg = dmg; b.team = 1;
    b.life = lifeByKind[w.kind] || 1.5;
    b.kind = w.kind; b.crit = crit; b.turn = 0; b.armed = 0; b.grazed = 0;
    b.pierce = (w.pierce || 0) + (P.stat.pierce || 0);
    b.homing = (w.kind === 'boomer') ? 1 : (w.homing > 0 ? w.homing : 0) + (P.stat.homing || 0);
    b.bounce = (w.bounce || 0) + (P.stat.bounce || 0);
    b.blast = P.stat.blast ? 1 : 0;
    b.chain = P.stat.chain ? 1 : 0;
    b.freeze = P.stat.freeze ? 1 : 0;
    b.color = PAL()[w.col] || PAL().bullet;
  }
  p.shootCd = w.cd * (1 - P.stat.rate * 0.07) * DIFFS[Settings.difficulty].fire;
  p.muzzle = 0.07;
  p.heat += OVERHEAT_PER_SHOT * (1 - Math.min(0.6, P.stat.cool * 0.4));
  burst(cx, cy, 3, PAL().playerHi, 130, 0.16);
  if (p.heat >= OVERHEAT_MAX){
    p.heat = OVERHEAT_MAX; p.overheated = 1;
    toast('GUN OVERHEATED \u2014 BREAK LINE OF SIGHT');
    sfx('overheat');
  }
  sfx(p.weapon === 'spread' ? 'shoot2' : (p.weapon === 'beam' || p.weapon === 'pierce' ? 'shoot3' : 'shoot'));
}

/* ---------- stomp ---------- */
function checkStomp(){
  if (P.vy <= 60) return;
  for (var i = 0; i < enemies.length; i++){
    var e = enemies[i];
    if (e.dead || e.hidden) continue;
    var def = e.boss ? { stomp:0 } : ENEMY_DEF[e.type];
    var pb = P.y + P.h;
    if (P.x + P.w > e.x + 3 && P.x < e.x + e.w - 3 && pb >= e.y - 10 && pb <= e.y + 24){
      if (def.stomp){
        P.vy = -560;
        P.sy = 1.3; P.sx = 0.76;
        S.hitStop = Math.max(S.hitStop, 0.05);
        sfx('stomp');
        e.hp -= 2 + Math.floor(P.stat.dmg);
        e.flash = 0.1;
        burst(e.x + e.w / 2, e.y, 12, PAL().gold, 200, 0.45);
        if (e.hp <= 0) killEnemy(e, true);
      } else {
        damagePlayer(1);
        P.vy = -380;
      }
      return;
    }
  }
}

/* ---------- enemy update ---------- */
function updateEnemies(dt){
  var diff = DIFFS[Settings.difficulty];
  var spd = diff.spd * (S.modSpeed || 1);
  var d = S.difficulty;
  for (var z0 = 0; z0 < enemies.length; z0++) enemies[z0].granted = 0;

  for (var i = 0; i < enemies.length; i++){
    var e = enemies[i];
    if (e.dead) continue;
    var baseDt = dt;
    dt = baseDt;
    e.t += dt;
    if (e.flash > 0) e.flash -= dt;
    if (e.slowT > 0) e.slowT -= dt;
    var frozen = (e.slowT > 0) ? 0.45 : 1;
    dt = dt * frozen;

    if (e.boss){ updateBoss(e, dt, spd); continue; }

    /* air units entering from above the viewport */
    if (e.diving){
      e.y += 185 * dt;
      e.x += (e.vx || -90) * dt;
      if (e.y >= e.baseY){ e.y = e.baseY; e.diving = false; }
      continue;
    }

    var pcx = P.x + P.w / 2, pcy = P.y + P.h / 2;
    var ecx = e.x + e.w / 2, ecy = e.y + e.h / 2;
    var dx = pcx - ecx, dy = pcy - ecy;
    e.dir = sign(dx) || -1;

    switch (e.type){
      case 'crawler': case 'spiked': case 'splitter': case 'armored': {
        var speed = (e.type === 'armored' ? 58 : e.type === 'splitter' ? 84 : 76) * spd * (1 + d * 0.14);
        if (e.state === 'walk'){
          e.vx = e.dir * speed;
          if (e.type !== 'armored' && Math.abs(dx) < 108 && e.stateT <= 0){
            e.state = 'tele'; e.stateT = 0.46; e.vx = 0;
          }
        } else if (e.state === 'tele'){
          e.stateT -= dt; e.vx = 0;
          if (e.stateT <= 0){ e.state = 'lunge'; e.stateT = 0.28; sfx('eshot'); }
        } else if (e.state === 'lunge'){
          e.stateT -= dt;
          e.vx = e.dir * Math.min(332, 272 * spd);
          if (e.stateT <= 0){ e.state = 'walk'; e.stateT = 0.55; }
        } else {
          e.stateT -= dt; e.vx = 0;
          if (e.stateT <= 0) e.state = 'walk';
        }
        e.x += e.vx * dt;
        break;
      }
      case 'jumper': {
        e.vy += GRAV * dt;
        e.y += e.vy * dt;
        if (e.y + e.h >= GROUND_Y){
          e.y = GROUND_Y - e.h; e.vy = 0; e.onGround = true;
          e.vx = 0;
          if (e.stateT <= 0){
            e.vy = -540; e.vx = e.dir * 142 * spd; e.onGround = false;
            e.stateT = 1.25;
          }
        } else { e.onGround = false; }
        e.stateT -= dt;
        e.x += e.vx * dt;
        break;
      }
      case 'exploder': {
        e.vx = e.dir * 96 * spd;
        e.x += e.vx * dt;
        var dist = Math.abs(dx);
        if (e.state === 'walk' && dist < 78){ e.state = 'arm'; e.stateT = 0.42; }
        if (e.state === 'arm'){
          e.stateT -= dt; e.vx = 0;
          if (e.stateT <= 0){ explodeAt(ecx, ecy, 80, 1, 1); e.dead = true; }
        }
        break;
      }
      case 'flyer': {
        e.vx = e.dir * (98 + d * 26) * spd;
        e.x += e.vx * dt;
        if (Math.abs(dx) < 270){
          e.y += sign(dy) * 112 * dt;
          e.y = clamp(e.y, 70, GROUND_Y - e.h - 6);
        } else {
          e.y = e.baseY + Math.sin(e.t * 2 + e.phase) * 26;
        }
        break;
      }
      case 'bomber': {
        e.vx = -1 * (86 + d * 18) * spd;
        e.x += e.vx * dt;
        e.y = e.baseY + Math.sin(e.t * 1.4 + e.phase) * 14;
        e.shootCd -= dt;
        if (e.shootCd <= 0 && e.x < Cam.x + VW + 20 && e.x > Cam.x - 40){
          e.shootCd = 1.7;
          shells.push({ x: ecx, y: e.y + e.h, vx: e.vx * 0.4, vy: 60, t: 0, r: 6, dmg: 1, team: 1 });
        }
        break;
      }
      case 'hover': {
        var want = pcx + 220 * (e.dir > 0 ? -1 : 1);
        e.vx = clamp((want - ecx) * 1.4, -120, 120) * spd;
        e.x += e.vx * dt;
        e.y += clamp((GROUND_Y - 190 - ecy) * 0.8, -90, 90) * dt;
        e.y = clamp(e.y, 70, GROUND_Y - e.h - 10);
        e.shootCd -= dt;
        if (e.shootCd <= 0 && Math.abs(dx) < VW * 0.8){
          e.shootCd = Math.max(1.0, 1.75 - d * 0.22);
          var ang = Math.atan2(dy, dx);
          bullets.spawn();
          var hb = bullets.items[bullets.n - 1];
          hb.x = ecx; hb.y = ecy; hb.vx = Math.cos(ang) * 330; hb.vy = Math.sin(ang) * 330;
          hb.r = 5; hb.dmg = 1; hb.team = 0; hb.life = 3; hb.pierce = 0;
          hb.homing = 0; hb.bounce = 0; hb.color = PAL().eBullet; hb.kind = 'enemy';
          sfx('eshot');
        }
        break;
      }
      case 'carrier': {
        e.vx = -1 * (52 + d * 11) * spd;
        e.x += e.vx * dt;
        e.y = e.baseY + Math.sin(e.t * 1.1 + e.phase) * 18;
        e.shootCd -= dt;
        if (e.shootCd <= 0 && e.x < Cam.x + VW){
          e.shootCd = 3.6;
          var c = spawnEnemy('crawler', e.x + 10, GROUND_Y - ENEMY_DEF.crawler.h);
          if (c){ c.hp = 2; }
          sfx('eshot');
        }
        break;
      }
      case 'turret': {
        e.vx = e.dir * 20 * spd;
        e.x += e.vx * dt;
        e.shootCd -= dt;
        if (e.shootCd <= 0 && Math.abs(dx) < VW * 0.88){
          e.shootCd = Math.max(0.95, 1.75 - d * 0.22);
          var mx = ecx + e.dir * 16, my = e.y + 8;
          bullets.spawn();
          var tb = bullets.items[bullets.n - 1];
          tb.x = mx; tb.y = my; tb.vx = e.dir * (410 + d * 40); tb.vy = 0;
          tb.r = 5; tb.dmg = 1; tb.team = 0; tb.life = 3; tb.pierce = 0;
          tb.homing = 0; tb.bounce = 0; tb.color = PAL().eBullet; tb.kind = 'laser';
          burst(mx, my, 3, PAL().eBullet, 120, 0.2);
          sfx('laser');
        }
        break;
      }
      case 'sweeper': {
        e.vx = e.dir * 14 * spd;
        e.x += e.vx * dt;
        e.angle += dt * 1.25 * e.dir;
        e.shootCd -= dt;
        if (e.shootCd <= 0 && Math.abs(dx) < VW * 0.8){
          e.shootCd = 0.075;
          var a2 = e.angle;
          bullets.spawn();
          var sb = bullets.items[bullets.n - 1];
          sb.x = ecx; sb.y = e.y + 16;
          sb.vx = Math.cos(a2) * 300; sb.vy = Math.sin(a2) * 300;
          sb.r = 4; sb.dmg = 1; sb.team = 0; sb.life = 2.4; sb.pierce = 0;
          sb.homing = 0; sb.bounce = 0; sb.color = PAL().eBullet; sb.kind = 'sweep';
        }
        break;
      }
      case 'mortar': {
        e.shootCd -= dt;
        if (e.shootCd <= 0 && Math.abs(dx) < VW * 0.95){
          e.shootCd = Math.max(1.5, 2.5 - d * 0.26);
          var tx2 = pcx + rr(-60, 60);
          var tflight = 1.15;
          shells.push({
            x: ecx, y: e.y + 6,
            vx: (tx2 - ecx) / tflight,
            vy: -0.5 * GRAV * tflight,
            t: 0, r: 7, dmg: 1, team: 1
          });
          sfx('eshot');
        }
        break;
      }
      case 'shielded': {
        e.vx = e.dir * 62 * spd;
        e.x += e.vx * dt;
        e.stateT += dt;
        e.shieldUp = (Math.floor(e.stateT / 1.4) % 2 === 0) ? 1 : 0;
        break;
      }
      case 'popturret': {
        if (e.hidden){
          if (Math.abs(dx) < 330 && e.stateT <= 0){ e.state = 'rise'; e.stateT = 0.45; sfx('eshot'); }
        } else if (e.state === 'rise'){
          e.stateT -= dt;
          e.y -= (e.h / 0.45) * dt;
          if (e.stateT <= 0){ e.hidden = false; e.state = 'fire'; e.stateT = 1.0; e.sub = 3; }
        } else if (e.state === 'fire'){
          e.stateT -= dt;
          e.shootCd -= dt;
          if (e.sub > 0 && e.shootCd <= 0){
            e.sub--; e.shootCd = 0.24;
            var a3 = Math.atan2(dy, dx);
            bullets.spawn();
            var pb2 = bullets.items[bullets.n - 1];
            pb2.x = ecx; pb2.y = e.y + 10;
            pb2.vx = Math.cos(a3) * 360; pb2.vy = Math.sin(a3) * 360;
            pb2.r = 5; pb2.dmg = 1; pb2.team = 0; pb2.life = 3; pb2.pierce = 0;
            pb2.homing = 0; pb2.bounce = 0; pb2.color = PAL().eBullet; pb2.kind = 'enemy';
            sfx('eshot');
          }
          if (e.stateT <= 0){ e.state = 'sink'; e.stateT = 0.5; }
        } else if (e.state === 'sink'){
          e.stateT -= dt;
          e.y += (e.h / 0.5) * dt;
          if (e.stateT <= 0){ e.hidden = true; e.y = GROUND_Y; e.stateT = 2.2; e.state = 'idle'; }
        } else {
          e.stateT -= dt;
        }
        break;
      }
      case 'burrower': {
        if (e.state === 'walk'){
          e.vx = e.dir * 62 * spd;
          e.x += e.vx * dt;
          e.stateT -= dt;
          if (e.stateT <= 0){ e.state = 'dig'; e.stateT = 0.4; }
        } else if (e.state === 'dig'){
          e.stateT -= dt;
          e.y += 110 * dt;
          if (e.stateT <= 0){ e.state = 'under'; e.stateT = 1.1; e.hidden = true; }
        } else if (e.state === 'under'){
          e.stateT -= dt;
          var bdx = (P.x + P.w/2) - (e.x + e.w/2);
          e.x += clamp(bdx, -280 * dt, 280 * dt);
          e.y = GROUND_Y - 4;
          if (e.stateT <= 0){
            e.state = 'erupt'; e.stateT = 0.34; e.hidden = false;
            e.y = GROUND_Y - e.h - 46;
            burst(e.x + e.w/2, GROUND_Y, 16, PAL().e1, 240, 0.5);
            S.shake = Math.max(S.shake, Settings.reduced ? 0 : 6);
            if (Math.abs((P.x + P.w/2) - (e.x + e.w/2)) < 62 && P.invuln <= 0) damagePlayer(1);
            sfx('boom');
          }
        } else {
          e.stateT -= dt;
          e.y += 240 * dt;
          if (e.y + e.h >= GROUND_Y){ e.y = GROUND_Y - e.h; e.state = 'walk'; e.stateT = 1.5; }
        }
        break;
      }
      case 'roller': {
        e.vx = e.dir * e.baseSpd * spd;
        e.x += e.vx * dt;
        if (e.x < Cam.x - 140) e.dir = 1;
        if (e.x > Cam.x + VW + 140) e.dir = -1;
        break;
      }
      case 'sniper': {
        e.vx = 0;
        e.dir = sign((P.x + P.w/2) - (e.x + e.w/2)) || -1;
        e.stateT -= dt;
        if (e.state === 'walk'){
          if (e.stateT <= 0 && Math.abs((P.x + P.w/2) - (e.x + e.w/2)) < VW * 0.92){
            e.state = 'aim'; e.stateT = 0.95;
          }
        } else if (e.state === 'aim'){
          if (e.stateT <= 0){
            e.state = 'walk'; e.stateT = 1.7;
            var sa = Math.atan2((P.y + P.h/2) - (e.y + 10), (P.x + P.w/2) - (e.x + e.w/2));
            bullets.spawn();
            var sb2 = bullets.items[bullets.n - 1];
            sb2.x = e.x + e.w/2; sb2.y = e.y + 10;
            sb2.vx = Math.cos(sa) * 760; sb2.vy = Math.sin(sa) * 760;
            sb2.r = 4; sb2.dmg = 1; sb2.team = 0; sb2.life = 2.4; sb2.pierce = 0;
            sb2.homing = 0; sb2.bounce = 0; sb2.color = PAL().hot; sb2.kind = 'laser'; sb2.turn = 0;
            sfx('laser');
          }
        }
        break;
      }
      case 'phalanx': {
        e.vx = e.dir * 34 * spd;
        e.x += e.vx * dt;
        e.stateT += dt;
        e.shieldUp = (Math.floor(e.stateT / 1.5) % 2 === 0) ? 1 : 0;
        break;
      }
      case 'hive': {
        e.shootCd -= dt;
        if (e.shootCd <= 0 && e.x < Cam.x + VW + 40){
          e.shootCd = 2.7;
          var hc = spawnEnemy('crawler', e.x + 4, GROUND_Y - ENEMY_DEF.crawler.h);
          if (hc){ hc.hp = 2; hc.maxHp = 2; hc.pts = 40; }
          sfx('eshot');
        }
        break;
      }
      case 'mimic': {
        if (e.state === 'walk'){
          e.vx = 0;
          if (Math.abs(dx) < 95 && Math.abs(dy) < 70){ e.state = 'lunge'; e.stateT = 0.55; sfx('eshot'); }
        } else {
          e.stateT -= dt;
          e.vx = e.dir * 340 * spd;
          e.x += e.vx * dt;
          e.y += e.vy * dt;
          e.vy += GRAV * dt;
          if (e.y + e.h >= GROUND_Y){ e.y = GROUND_Y - e.h; e.vy = 0; }
          if (e.stateT <= 0){ e.state = 'walk'; e.stateT = 0.7; }
        }
        break;
      }
      case 'healer': {
        e.vx = clamp((pcx + 180 * e.dir - ecx) * 1.2, -90, 90) * spd;
        e.x += e.vx * dt;
        e.y += clamp((GROUND_Y - 230 - ecy) * 0.7, -70, 70) * dt;
        e.y = clamp(e.y, 70, GROUND_Y - e.h - 10);
        e.shootCd -= dt;
        if (e.shootCd <= 0){
          e.shootCd = 0.5;
          for (var hi = 0; hi < enemies.length; hi++){
            var he = enemies[hi];
            if (he.dead || he === e || he.hp >= he.maxHp) continue;
            if (Math.hypot((he.x + he.w/2) - ecx, (he.y + he.h/2) - ecy) < 175){
              he.hp = Math.min(he.maxHp, he.hp + 2);
              e.beam = { x: he.x + he.w/2, y: he.y + he.h/2, t: 0.12 };
              break;
            }
          }
        }
        if (e.beam){ e.beam.t -= dt; if (e.beam.t <= 0) e.beam = null; }
        break;
      }
      case 'shielddrone': {
        e.vx = clamp((pcx + 200 * e.dir - ecx) * 1.2, -100, 100) * spd;
        e.x += e.vx * dt;
        e.y += clamp((GROUND_Y - 215 - ecy) * 0.7, -80, 80) * dt;
        e.y = clamp(e.y, 70, GROUND_Y - e.h - 10);
        for (var si = 0; si < enemies.length; si++){
          var se = enemies[si];
          if (se.dead || se === e) continue;
          if (Math.hypot((se.x + se.w/2) - ecx, (se.y + se.h/2) - ecy) < 135) se.granted = 1;
        }
        break;
      }
      case 'tether': {
        e.vx = e.dir * 60 * spd;
        e.x += e.vx * dt;
        e.y = e.baseY + Math.sin(e.t * 1.5 + e.phase) * 22;
        if (e.partner && !e.partner.dead){
          if (P.invuln <= 0 && segHit(P.x + P.w/2, P.y + P.h/2,
              e.x + e.w/2, e.y + e.h/2,
              e.partner.x + e.partner.w/2, e.partner.y + e.partner.h/2, 10)){
            damagePlayer(1);
          }
        }
        break;
      }
      case 'queen': {
        e.vx = -1 * (42 + d * 11) * spd;
        e.x += e.vx * dt;
        e.y = e.baseY + Math.sin(e.t * 1.1 + e.phase) * 20;
        e.shootCd -= dt;
        if (e.shootCd <= 0 && e.x < Cam.x + VW){
          e.shootCd = 2.3;
          var q = spawnEnemy('darter', e.x + 10, e.y + 24);
          if (q){ q.pts = 40; }
          sfx('eshot');
        }
        break;
      }
      case 'dummy': {
        e.vx = 0; e.vy = 0;
        e.x += Math.sin(e.t * 0.4) * 6 * dt;
        break;
      }
      case 'darter': {
        e.x += e.vx * dt; e.y += e.vy * dt;
        break;
      }
    }

    /* keep ground units on the ground */
    if (!ENEMY_DEF[e.type].air && e.type !== 'jumper' && e.type !== 'popturret' &&
        e.type !== 'mortar' && e.type !== 'burrower' && e.type !== 'mimic'){
      if (e.y + e.h > GROUND_Y){ e.y = GROUND_Y - e.h; }
    }
    if (e.type === 'popturret' && e.hidden) e.y = GROUND_Y;
    dt = baseDt;
  }

  /* cull */
  if (enemies.length){
    var out = [];
    for (var j = 0; j < enemies.length; j++){
      var en = enemies[j];
      if (en.dead) continue;
      if (en.boss){ out.push(en); continue; }
      if (en.x < Cam.x - 700) continue;
      if (en.x > Cam.x + VW + 1500) continue;
      if (en.y > VH + 260) continue;
      out.push(en);
    }
    enemies = out;
  }
}

/* ---------- boss ---------- */
function bossCoreOpen(e){
  if (!e.turrets || !e.turrets.length) return true;
  for (var i = 0; i < e.turrets.length; i++) if (e.turrets[i].hp > 0) return false;
  return true;
}
function spawnBoss(forceType){
  S.bossT = BOSS_EVERY;
  var n = S.bossCount || 0;
  var type = forceType || BOSS_ORDER[n % BOSS_ORDER.length];
  var def = BOSSES[type];
  var dims = { mech:[124,140], serpent:[150,96], fortress:[168,150], overlord:[140,150] };
  var d = dims[type] || dims.mech;
  var hpMul = 1 + n * 0.16;
  var e = {
    type:'boss', boss:true, bossType:type, name:def.name,
    x: Cam.x + VW + 150, y: GROUND_Y - d[1], w: d[0], h: d[1],
    hp: Math.round(def.hp * hpMul), maxHp: 0,
    vx: 0, vy: 0, t: 0, flash: 0, dead: false, pts: 3000 + n * 400,
    phase: 1, state: 'enter', stateT: 0, shootCd: 1.4, sub: 0,
    dir: -1, baseY: GROUND_Y - d[1], hidden: false, angle: 0, noHit: 1, elite: 0
  };
  e.maxHp = e.hp;
  if (type === 'fortress'){
    e.turrets = [
      { ox: 6, oy: 34, w: 28, h: 20, hp: 16, maxHp: 16, cd: 1.1 },
      { ox: d[0] - 34, oy: 34, w: 28, h: 20, hp: 16, maxHp: 16, cd: 1.5 },
      { ox: 6, oy: d[1] - 78, w: 28, h: 20, hp: 16, maxHp: 16, cd: 1.9 },
      { ox: d[0] - 34, oy: d[1] - 78, w: 28, h: 20, hp: 16, maxHp: 16, cd: 2.3 }
    ];
  }
  enemies.push(e);
  S.bossActive = e;
  S.bossNoHitRun = 1;
  Music.boss = true;
  Music.intensity = 3;
  sfx('boss');
  toast('WARNING  \u2014  ' + def.name + ' INBOUND');
  return e;
}
function spawnElite(){
  var pool = ['armored','spiked','splitter','sniper','jumper','exploder','flyer','bomber','hover','roller','phalanx'];
  var t = pickOne(pool);
  var def = ENEMY_DEF[t];
  var e = spawnEnemy(t, Cam.x + VW + 80, null);
  if (!e) return null;
  e.elite = 1;
  e.w = Math.round(e.w * 1.35); e.h = Math.round(e.h * 1.35);
  e.hp = e.maxHp = Math.round(e.maxHp * 4.5);
  e.pts = def.pts * 5;
  e.y = GROUND_Y - e.h;
  e.baseY = e.y;
  toast('ELITE ' + (def.name || t.toUpperCase()));
  sfx('warn');
  return e;
}

function updateBoss(e, dt, spd){
  var pcx = P.x + P.w / 2;
  var ecx = e.x + e.w / 2;
  var dx = pcx - ecx;
  var frac = e.hp / e.maxHp;
  e.phase = frac > 0.66 ? 1 : (frac > 0.33 ? 2 : 3);
  e.dir = sign(dx) || -1;
  e.noHit = 0;

  if (e.state === 'enter'){
    e.x -= 190 * dt;
    if (e.bossType !== 'overlord') e.y = e.baseY + Math.sin(e.t * 3) * 3;
    else e.y = e.baseY + Math.sin(e.t * 1.6) * 10;
    if (e.x < Cam.x + VW * 0.78){ e.state = 'idle'; e.stateT = 1.0; }
    return;
  }

  var want = pcx + (e.bossType === 'fortress' ? 330 : (e.bossType === 'serpent' ? 250 : 280));
  if (e.bossType !== 'overlord'){
    e.x += clamp((want - ecx) * 1.5, -250, 250) * spd * dt;
  }
  e.stateT -= dt;
  e.shootCd -= dt;

  if (e.bossType === 'serpent'){ updateSerpent(e, dt, pcx); return; }
  if (e.bossType === 'fortress'){ updateFortress(e, dt, spd); return; }
  if (e.bossType === 'overlord'){ updateOverlord(e, dt, spd, pcx); return; }

  /* ---------------- MECH ---------------- */
  e.y = e.baseY + Math.sin(e.t * 2.4) * 4;
  if (e.phase === 1){
    if (e.stateT <= 0){
      e.stateT = 2.3;
      shockwaves.push({ x: ecx, y: GROUND_Y, w: 34, h: 40, vx: -340, t: 0, life: 4 });
      shockwaves.push({ x: ecx, y: GROUND_Y, w: 34, h: 40, vx: 340, t: 0, life: 4 });
      S.shake = Math.max(S.shake, Settings.reduced ? 0 : 11);
      sfx('boom');
    }
    if (e.shootCd <= 0){
      e.shootCd = 1.7;
      for (var i = -1; i <= 1; i++) bossShot(ecx, e.y + 40, -420, i * 90, 6, 'enemy');
      sfx('eshot');
    }
  } else if (e.phase === 2){
    if (e.stateT <= 0){
      e.stateT = 3.4;
      var n = 9;
      for (var k = 0; k < n; k++){
        var ang = Math.PI * 0.62 + (k / (n - 1)) * Math.PI * 0.76;
        bossShot(ecx, e.y + 60, Math.cos(ang) * 300, Math.sin(ang) * 300, 6, 'enemy');
      }
      sfx('eshot');
    }
    if (e.shootCd <= 0){
      e.shootCd = 5.2;
      spawnEnemy('crawler', e.x + 10, GROUND_Y - ENEMY_DEF.crawler.h);
      spawnEnemy('crawler', e.x + 40, GROUND_Y - ENEMY_DEF.crawler.h);
    }
  } else {
    e.angle += dt * 3.4;
    if (e.shootCd <= 0){
      e.shootCd = 0.085;
      for (var s2 = 0; s2 < 2; s2++){
        var a = e.angle + s2 * Math.PI;
        bossShot(ecx, e.y + 50, Math.cos(a) * 340, Math.sin(a) * 340, 5, 'sweep');
      }
    }
    if (e.stateT <= 0){
      e.stateT = 4.2;
      shockwaves.push({ x: ecx, y: GROUND_Y, w: 34, h: 40, vx: -400, t: 0, life: 4 });
      shockwaves.push({ x: ecx, y: GROUND_Y, w: 34, h: 40, vx: 400, t: 0, life: 4 });
      sfx('boom');
    }
  }
}

function bossShot(x, y, vx, vy, r, kind, col){
  bullets.spawn();
  var b = bullets.items[bullets.n - 1];
  b.x = x; b.y = y; b.vx = vx; b.vy = vy;
  b.r = r; b.dmg = 1; b.team = 0; b.life = 3.4; b.pierce = 0;
  b.homing = 0; b.bounce = 0; b.turn = 0; b.grazed = 0; b.armed = 0;
  b.color = col || PAL().eBullet;
  b.kind = kind || 'enemy';
  return b;
}

/* ---------------- SAND SERPENT ---------------- */
function updateSerpent(e, dt, pcx){
  if (e.state === 'idle'){
    e.y = e.baseY + Math.sin(e.t * 2) * 8;
    if (e.stateT <= 0){
      e.state = 'burrow'; e.stateT = 0.7; e.hidden = true;
      burst(e.x + e.w/2, GROUND_Y - 10, 16, PAL().e1, 220, 0.5);
      sfx('land');
    }
    if (e.shootCd <= 0){
      e.shootCd = 1.9;
      for (var i = -1; i <= 1; i++){
        var t2 = 1.1;
        shells.push({ x: e.x + 20, y: e.y + 20,
                      vx: ((P.x + P.w/2) - (e.x + 20)) / t2 + i * 60,
                      vy: -0.5 * GRAV * t2, t: 0, r: 7, dmg: 1, team: 1 });
      }
      sfx('eshot');
    }
  } else if (e.state === 'burrow'){
    e.stateT -= dt;
    e.x += clamp((pcx - (e.x + e.w/2)), -300 * dt, 300 * dt);
    e.y = GROUND_Y - 20;
    if (e.stateT <= 0){
      e.state = 'erupt'; e.stateT = 0.5;
      e.hidden = false;
      e.x = pcx - e.w/2;
      e.y = GROUND_Y - e.h - 90;
      burst(e.x + e.w/2, GROUND_Y, 26, PAL().e1, 320, 0.7);
      S.shake = Math.max(S.shake, Settings.reduced ? 0 : 12);
      shockwaves.push({ x: e.x + e.w/2, y: GROUND_Y, w: 40, h: 46, vx: -380, t: 0, life: 3 });
      shockwaves.push({ x: e.x + e.w/2, y: GROUND_Y, w: 40, h: 46, vx: 380, t: 0, life: 3 });
      sfx('boom');
    }
  } else {
    e.stateT -= dt;
    e.y += 240 * dt;
    if (e.y >= e.baseY){ e.y = e.baseY; e.state = 'idle'; e.stateT = 2.4; e.shootCd = 0.6; }
  }
}

/* ---------------- SIEGE FORTRESS ---------------- */
function updateFortress(e, dt, spd){
  e.y = e.baseY + Math.sin(e.t * 1.2) * 4;
  var open = bossCoreOpen(e);
  for (var i = 0; i < e.turrets.length; i++){
    var tu = e.turrets[i];
    if (tu.hp <= 0) continue;
    tu.cd -= dt;
    if (tu.cd <= 0 && Math.abs((P.x + P.w/2) - (e.x + tu.ox)) < VW){
      tu.cd = 1.5 + i * 0.35;
      var mx = e.x + tu.ox + tu.w/2, my = e.y + tu.oy + tu.h/2;
      var a = Math.atan2((P.y + P.h/2) - my, (P.x + P.w/2) - mx);
      bossShot(mx, my, Math.cos(a) * 380, Math.sin(a) * 380, 5, 'enemy');
      sfx('eshot');
    }
  }
  if (open){
    if (e.stateT <= 0){
      e.stateT = 2.4;
      var n = 10;
      for (var k = 0; k < n; k++){
        var ang = (k / n) * 6.2832;
        bossShot(e.x + e.w/2, e.y + e.h*0.46, Math.cos(ang) * 280, Math.sin(ang) * 280, 6, 'enemy');
      }
      sfx('eshot');
    }
    if (e.shootCd <= 0){
      e.shootCd = 6.0;
      spawnEnemy('sniper', e.x + 20, GROUND_Y - ENEMY_DEF.sniper.h);
    }
  } else if (e.stateT <= 0){
    e.stateT = 5.0;
    spawnEnemy('roller', Cam.x + VW + 60, null);
  }
}

/* ---------------- THE OVERLORD ---------------- */
function updateOverlord(e, dt, spd, pcx){
  var wantY = GROUND_Y - 150 + Math.sin(e.t * 1.3) * 30;
  e.y += (wantY - e.y) * Math.min(1, dt * 2);
  e.angle += dt * (e.phase >= 3 ? 4.2 : 2.0);

  if (e.phase === 1){
    e.x += clamp((pcx + 300 - (e.x + e.w/2)) * 1.2, -160, 160) * spd * dt;
    if (e.shootCd <= 0){
      e.shootCd = 2.0;
      for (var i = -2; i <= 2; i++){
        var a1 = Math.atan2((P.y + P.h/2) - (e.y + e.h*0.42), (P.x + P.w/2) - (e.x + e.w/2)) + i * 0.22;
        bossShot(e.x + e.w/2, e.y + e.h*0.42, Math.cos(a1) * 320, Math.sin(a1) * 320, 7, 'enemy');
      }
      sfx('eshot');
    }
  } else if (e.phase === 2){
    e.x += clamp((pcx + 320 - (e.x + e.w/2)) * 1.3, -220, 220) * spd * dt;
    if (e.shootCd <= 0){
      e.shootCd = 0.12;
      for (var s3 = 0; s3 < 3; s3++){
        var a2 = e.angle + s3 * 2.094;
        bossShot(e.x + e.w/2, e.y + e.h*0.42, Math.cos(a2) * 300, Math.sin(a2) * 300, 5, 'sweep');
      }
    }
    if (e.stateT <= 0){
      e.stateT = 4.0;
      for (var q2 = 0; q2 < 3; q2++) spawnEnemy('darter', e.x + 20 + q2 * 26, e.y + 40);
    }
  } else {
    /* teleports, sweeps and shockwaves */
    if (e.stateT <= 0){
      e.stateT = 2.6;
      e.x = Cam.x + VW * (0.55 + rng() * 0.3) - e.w/2;
      e.y = GROUND_Y - e.h - rng() * 120;
      burst(e.x + e.w/2, e.y + e.h/2, 26, PAL().e4, 300, 0.5);
      sfx('boss');
      shockwaves.push({ x: e.x + e.w/2, y: GROUND_Y, w: 40, h: 46, vx: -430, t: 0, life: 3 });
      shockwaves.push({ x: e.x + e.w/2, y: GROUND_Y, w: 40, h: 46, vx: 430, t: 0, life: 3 });
    }
    if (e.shootCd <= 0){
      e.shootCd = 0.07;
      for (var s4 = 0; s4 < 4; s4++){
        var a3 = e.angle + s4 * 1.5708;
        bossShot(e.x + e.w/2, e.y + e.h*0.42, Math.cos(a3) * 360, Math.sin(a3) * 360, 5, 'sweep');
      }
    }
  }
}

/* ---------- bullets ---------- */
function chainTo(b, from){
  var best = null, bd = 190 * 190;
  for (var i = 0; i < enemies.length; i++){
    var e = enemies[i];
    if (e.dead || e.hidden || e === from) continue;
    var dx = (e.x + e.w/2) - b.x, dy = (e.y + e.h/2) - b.y;
    var d = dx*dx + dy*dy;
    if (d < bd){ bd = d; best = e; }
  }
  if (!best) return;
  best.hp -= b.dmg * 0.6;
  best.flash = 0.1;
  burst(best.x + best.w/2, best.y + best.h/2, 5, PAL().purple2, 170, 0.3);
  /* draw the arc as a short-lived particle line */
  var steps = 7;
  for (var k = 0; k <= steps; k++){
    var t = k / steps;
    particles.spawn();
    var q = particles.items[particles.n - 1];
    q.x = b.x + ((best.x + best.w/2) - b.x) * t;
    q.y = b.y + ((best.y + best.h/2) - b.y) * t;
    q.vx = 0; q.vy = 0; q.life = 0.16; q.max = 0.16;
    q.color = PAL().purple2; q.size = 3; q.grav = 0;
  }
  if (best.hp <= 0) killEnemy(best);
}

function updateBullets(dt){
  var slow = S.slowmo > 0 ? 0.45 : 1;
  var chrono = 1 - Math.min(0.5, (P.stat.chrono || 0) * 0.5);
  bullets.compact(function(b){ return b.life > 0; });
  for (var i = 0; i < bullets.n; i++){
    var b = bullets.items[i];
    var sdt = dt * (b.team === 1 ? 1 : slow * chrono);

    /* homing / boomerang steering */
    if (b.team === 1 && b.homing){
      var t = findNearestEnemy(b.x, b.y);
      var turnRate = 0;
      if (b.kind === 'boomer'){ turnRate = b.turn < 0.42 ? 0 : 5.0; }
      else turnRate = b.homing;
      if (t && turnRate > 0){
        var want = Math.atan2((t.y + t.h/2) - b.y, (t.x + t.w/2) - b.x);
        var cur = Math.atan2(b.vy, b.vx);
        var diff = want - cur;
        while (diff > Math.PI) diff -= 6.2832;
        while (diff < -Math.PI) diff += 6.2832;
        cur += clamp(diff, -turnRate * sdt, turnRate * sdt);
        var sp = Math.sqrt(b.vx*b.vx + b.vy*b.vy) || 1;
        b.vx = Math.cos(cur) * sp; b.vy = Math.sin(cur) * sp;
      }
    }
    /* mines stop and arm */
    if (b.kind === 'mine' && b.turn > 0.3){ b.vx = 0; b.vy = 0; b.armed = 1; }
    /* flame peters out */
    if (b.kind === 'flame'){ b.vx *= (1 - dt * 3.2); b.vy *= (1 - dt * 3.2); }

    b.x += b.vx * sdt;
    b.y += b.vy * sdt;
    b.life -= dt;
    b.turn += dt;

    if (b.bounce > 0){
      if (b.y - b.r < 0){ b.y = b.r; b.vy = Math.abs(b.vy); b.bounce--; }
      if (b.y + b.r > GROUND_Y){ b.y = GROUND_Y - b.r; b.vy = -Math.abs(b.vy); b.bounce--; }
    }
    if (b.x < Cam.x - 200 || b.x > Cam.x + VW + 200 || b.y > VH + 120 || b.y < -220) b.life = 0;

    if (b.team === 1){
      for (var j = 0; j < enemies.length; j++){
        var e = enemies[j];
        if (e.dead || e.hidden) continue;
        if (rectHit(b.x - b.r, b.y - b.r, b.r * 2, b.r * 2, e.x, e.y, e.w, e.h)){
          if ((e.type === 'shielded' && e.shieldUp && sign(e.x - b.x) === e.dir) ||
              (e.type === 'phalanx' && e.shieldUp && sign(e.x - b.x) === e.dir) ||
              e.granted){
            burst(b.x, b.y, 5, PAL().accent, 180, 0.3);
            b.life = 0; sfx('menu'); break;
          }
          var dmg = b.dmg;
          if (e.boss && e.turrets && e.turrets.length){
            var pod = null;
            for (var pt = 0; pt < e.turrets.length; pt++){
              var pu = e.turrets[pt];
              if (pu.hp > 0 && rectHit(b.x - b.r, b.y - b.r, b.r*2, b.r*2,
                                       e.x + pu.ox, e.y + pu.oy, pu.w, pu.h)){ pod = pu; break; }
            }
            if (pod){
              pod.hp -= dmg;
              burst(b.x, b.y, 6, PAL().gold, 180, 0.3);
              if (pod.hp <= 0) explodeAt(e.x + pod.ox + pod.w/2, e.y + pod.oy + pod.h/2, 72, 0, 2);
              b.life = 0; break;
            }
            if (!bossCoreOpen(e)){
              burst(b.x, b.y, 4, 'rgba(170,190,220,0.8)', 140, 0.25);
              b.life = 0; sfx('menu'); break;
            }
          }
          if (P.stat.exec > 0 && e.maxHp > 0 && e.hp < e.maxHp * 0.3) dmg *= 3;
          e.hp -= dmg;
          e.flash = 0.09;
          if (b.freeze) e.slowT = Math.max(e.slowT || 0, 1.5);
          burst(b.x, b.y, b.crit ? 8 : 5, b.crit ? PAL().gold : PAL().playerHi, 190, 0.3);
          dmgNum(e.x + e.w/2, e.y - 4, dmg, b.crit);
          if (b.blast) explodeAt(b.x, b.y, 30, 0, 2, true);
          if (b.chain) chainTo(b, e);
          if (e.hp <= 0) killEnemy(e);
          if (b.pierce > 0) b.pierce--;
          else b.life = 0;
          break;
        }
      }
    } else {
      var pdx = b.x - (P.x + P.w / 2), pdy = b.y - (P.y + P.h / 2);
      var pd = Math.sqrt(pdx * pdx + pdy * pdy);
      var gr = GRAZE_R + P.stat.graze * 10;
      if (!b.grazed && pd < gr + P.w * 0.6 && pd > b.r + 8){
        b.grazed = 1;
        S.grazeCount++;
        if (!(S.mods && S.mods.noemp)) S.bomb = Math.min(1, S.bomb + 0.035 + P.stat.graze * 0.01);
        S.score += 5;
        sfx('graze', 1 + rng() * 0.2);
        burst(b.x, b.y, 2, PAL().playerHi, 80, 0.25);
      }
      if (P.invuln <= 0 && rectHit(b.x - b.r, b.y - b.r, b.r * 2, b.r * 2, P.x, P.y, P.w, P.h)){
        b.life = 0;
        damagePlayer(b.dmg);
      }
    }
  }
  bullets.compact(function(b){ return b.life > 0; });
}
function findNearestEnemy(x, y){
  var best = null, bd = 1e9;
  for (var i = 0; i < enemies.length; i++){
    var e = enemies[i];
    if (e.dead || e.hidden) continue;
    var dx = (e.x + e.w / 2) - x, dy = (e.y + e.h / 2) - y;
    var d = dx * dx + dy * dy;
    if (d < bd){ bd = d; best = e; }
  }
  return best;
}

/* ---------- shells & shockwaves ---------- */
function updateShells(dt){
  for (var i = shells.length - 1; i >= 0; i--){
    var s = shells[i];
    s.t += dt;
    s.vy += GRAV * dt;
    s.x += s.vx * dt;
    s.y += s.vy * dt;
    var hitGround = s.y >= GROUND_Y - 6;
    var hitPlayer = rectHit(s.x - s.r, s.y - s.r, s.r * 2, s.r * 2, P.x, P.y, P.w, P.h);
    if (hitGround || hitPlayer || s.t > 4){
      explodeAt(s.x, Math.min(s.y, GROUND_Y - 4), 74, 1, 1);
      shells.splice(i, 1);
    }
  }
  for (var j = shockwaves.length - 1; j >= 0; j--){
    var w = shockwaves[j];
    w.t += dt;
    w.x += w.vx * dt;
    if (rectHit(w.x - w.w / 2, GROUND_Y - 34, w.w, 34, P.x, P.y, P.w, P.h)) damagePlayer(1);
    if (w.t > w.life) shockwaves.splice(j, 1);
  }
}

/* ---------- pickups update ---------- */
function updatePickups(dt){
  for (var i = 0; i < pickups.n; i++){
    var k = pickups.items[i];
    k.t += dt;
    k.life -= dt;
    k.vy += 900 * dt;
    k.y += k.vy * dt;
    if (k.y + k.h >= GROUND_Y){ k.y = GROUND_Y - k.h; k.vy = 0; }
    var pull = P.stat.magnet;
    if (pull > 0){
      var dx = (P.x + P.w / 2) - (k.x + 11), dy = (P.y + P.h / 2) - (k.y + 11);
      var d = Math.sqrt(dx * dx + dy * dy);
      if (d < 160 * pull){ k.x += (dx / d) * 220 * dt; k.y += (dy / d) * 220 * dt; k.vy = 0; }
    }
    if (rectHit(P.x, P.y, P.w, P.h, k.x, k.y, k.w, k.h)){
      applyPickup(k);
      k.life = 0;
    }
  }
  pickups.compact(function(k){ return k.life > 0; });
}

/* ---------- effects ---------- */
function burst(x, y, n, color, spread, life){
  if (Settings.reduced) n = Math.max(2, Math.ceil(n * 0.35));
  spread = spread || 200; life = life || 0.55;
  for (var i = 0; i < n; i++){
    particles.spawn();
    var q = particles.items[particles.n - 1];
    var a = rng() * 6.2832;
    var s = rng() * spread;
    q.x = x; q.y = y;
    q.vx = Math.cos(a) * s;
    q.vy = Math.sin(a) * s - 60;
    q.life = life * (0.6 + rng() * 0.8);
    q.max = q.life;
    q.color = color;
    q.size = 2 + rng() * 3;
    q.grav = 640;
    q.glow = 0;
  }
}
function updateEffects(dt){
  particles.compact(function(q){ return q.life > 0; });
  for (var i = 0; i < particles.n; i++){
    var q = particles.items[i];
    q.life -= dt;
    q.vy += q.grav * dt;
    q.x += q.vx * dt;
    q.y += q.vy * dt;
  }
  particles.compact(function(q){ return q.life > 0; });

  floaters.compact(function(f){ return f.life > 0; });
  for (var j = 0; j < floaters.n; j++){
    var f = floaters.items[j];
    f.life -= dt;
    f.y -= 46 * dt;
  }
  floaters.compact(function(f){ return f.life > 0; });

  if (S.shake > 0){ S.shake -= dt * 46; if (S.shake < 0) S.shake = 0; }
  if (S.flash > 0){ S.flash -= dt * 1.6; if (S.flash < 0) S.flash = 0; }
  if (S.slowmo > 0) S.slowmo -= dt;
  if (S.comboT > 0){
    S.comboT -= dt;
    if (S.comboT <= 0){ S.combo = 0; S.mult = 1; }
  }
  if (S.toast){ S.toast.t += dt; if (S.toast.t > S.toast.life) S.toast = null; }
}
