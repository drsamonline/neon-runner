/* =====================================================================
   section 6: CONTENT
   All the data: upgrade cards, weapons, enemy definitions, hazards,
   bosses, pilots, run modifiers. Everything here is offline.
   ===================================================================== */

/* =====================================================================
   WEAPONS
   ===================================================================== */
var WEAPONS = {
  pulse:    { name:'PULSE',    cd:0.19, dmg:1, spd:860, count:1, spread:0,    size:4,   pierce:0, homing:0,   bounce:0, col:'bullet', kind:'shot',   desc:'balanced single shot' },
  spread:   { name:'SPREAD',   cd:0.27, dmg:1, spd:780, count:3, spread:0.27, size:3.5, pierce:0, homing:0,   bounce:0, col:'good',   kind:'shot',   desc:'three-way fan' },
  pierce:   { name:'PIERCE',   cd:0.30, dmg:2, spd:1060,count:1, spread:0,    size:6,   pierce:3, homing:0,   bounce:0, col:'e4',     kind:'rail',   desc:'punches through ranks' },
  homing:   { name:'HOMING',   cd:0.30, dmg:1, spd:600, count:2, spread:0.55, size:4,   pierce:0, homing:2.8, bounce:0, col:'e2',     kind:'missile',desc:'seeker missiles' },
  ricochet: { name:'RICOCHET', cd:0.22, dmg:1, spd:900, count:1, spread:0,    size:5,   pierce:0, homing:0,   bounce:3, col:'e3',     kind:'shot',   desc:'bounces off surfaces' },
  beam:     { name:'BEAM',     cd:0.13, dmg:1, spd:1400,count:1, spread:0,    size:5,   pierce:6, homing:0,   bounce:0, col:'cool',   kind:'rail',   desc:'fast piercing lance' },
  flamer:   { name:'FLAMER',   cd:0.10, dmg:1, spd:520, count:2, spread:0.42, size:7,   pierce:2, homing:0,   bounce:0, col:'warm',   kind:'flame',  desc:'short, wide, relentless' },
  boomerang:{ name:'BOOMERANG',cd:0.34, dmg:2, spd:620, count:1, spread:0,    size:7,   pierce:2, homing:-1.1,bounce:0, col:'good2',  kind:'boomer', desc:'curves back through them' },
  mine:     { name:'MINELAYER',cd:0.40, dmg:3, spd:300, count:1, spread:0,    size:7,   pierce:0, homing:0,   bounce:0, col:'warm2',  kind:'mine',   desc:'drops proximity mines' },
  arc:      { name:'ARC',      cd:0.24, dmg:2, spd:760, count:1, spread:0,    size:5,   pierce:1, homing:0,   bounce:0, col:'purple2',kind:'arc',    desc:'chains between enemies' }
};
var WEAPON_KEYS = ['pulse','spread','pierce','homing','ricochet','beam','flamer','boomerang','mine','arc'];
/* which weapons can drop, by difficulty ramp (the last three are late-game) */
var WEAPON_T1 = ['pulse','spread','ricochet'];
var WEAPON_T2 = ['pierce','homing','flamer','arc'];
var WEAPON_T3 = ['beam','boomerang','mine'];

/* weapon rarity: multiplier applied to damage on pickup */
var RARITY = [
  { name:'COMMON',   dmg:1.0,  col:'rgba(200,225,250,0.85)' },
  { name:'UNCOMMON', dmg:1.25, col:'#5df0a8' },
  { name:'RARE',     dmg:1.6,  col:'#3ad4ff' },
  { name:'EPIC',     dmg:2.1,  col:'#b06bff' },
  { name:'LEGENDARY',dmg:2.8,  col:'#ffd257' }
];
function rollRarity(luck){
  var r = rng() - (luck || 0);
  if (r > 0.985) return 4;
  if (r > 0.94)  return 3;
  if (r > 0.84)  return 2;
  if (r > 0.62)  return 1;
  return 0;
}

/* =====================================================================
   UPGRADE CARDS  (40)
   tier 1 = common, 2 = uncommon, 3 = rare / build-defining
   ===================================================================== */
var CARDS = [
  /* ---- common ---- */
  { id:'hp',      name:'PLATING',      tier:1, icon:'hp',      desc:'+1 MAX HP, heal 1',
    apply:function(){ P.maxHp++; P.hp = Math.min(P.maxHp, P.hp + 1); } },
  { id:'dmg',     name:'HOT ROUNDS',   tier:1, icon:'dmg',     desc:'+1 bullet damage',
    apply:function(){ P.stat.dmg += 1; } },
  { id:'rate',    name:'LIGHT TRIGGER',tier:1, icon:'rate',    desc:'+8% fire rate',
    apply:function(){ P.stat.rate += 1; } },
  { id:'range',   name:'LONG BARREL',  tier:1, icon:'range',   desc:'+55 targeting range',
    apply:function(){ P.stat.range += 1; } },
  { id:'speed',   name:'SERVO LEGS',   tier:1, icon:'speed',   desc:'+8% move speed',
    apply:function(){ P.stat.speed += 1; } },
  { id:'jump',    name:'BOOST JETS',   tier:1, icon:'jump',    desc:'+22 jump height',
    apply:function(){ P.stat.jump += 1; } },
  { id:'heal',    name:'FIELD KIT',    tier:1, icon:'heal',    desc:'Heal 3 HP now',
    apply:function(){ P.hp = Math.min(P.maxHp, P.hp + 3); } },
  { id:'scrap',   name:'SALVAGE',      tier:1, icon:'scrap',   desc:'+120 scrap immediately',
    apply:function(){ Meta.scrap += 120; saveMeta(); } },
  { id:'shield',  name:'AEGIS',        tier:1, icon:'shield',  desc:'Shield for 9s (absorbs a hit)',
    apply:function(){ P.shieldT = Math.max(P.shieldT, 9); } },
  { id:'mag',     name:'MAGNET',       tier:1, icon:'magnet',  desc:'Pickups drift toward you',
    apply:function(){ P.stat.magnet = Math.min(1.6, P.stat.magnet + 0.8); } },
  { id:'cool',    name:'COOLANT',      tier:1, icon:'cool',    desc:'Heat builds 40% slower',
    apply:function(){ P.stat.cool += 1; } },
  { id:'crit',    name:'CRIT CHIP',    tier:1, icon:'crit',    desc:'+8% critical chance',
    apply:function(){ P.stat.crit += 0.08; } },
  { id:'graze',   name:'GRAZE FIELD',  tier:1, icon:'graze',   desc:'+10 graze radius, faster EMP',
    apply:function(){ P.stat.graze += 1; } },
  { id:'regen',   name:'NANO REPAIR',  tier:1, icon:'regen',   desc:'Regenerate 1 HP every 12s',
    apply:function(){ P.stat.regen += 1; } },

  /* ---- uncommon ---- */
  { id:'multi',   name:'SPLIT MUZZLE', tier:2, icon:'multi',   desc:'+1 projectile per volley',
    apply:function(){ P.stat.multi += 1; } },
  { id:'pierce',  name:'RAIL TIP',     tier:2, icon:'pierce',  desc:'+1 pierce on every shot',
    apply:function(){ P.stat.pierce += 1; } },
  { id:'thorns',  name:'RETALIATE',    tier:2, icon:'thorns',  desc:'Enemies that touch you take 3 damage',
    apply:function(){ P.stat.thorns += 3; } },
  { id:'vamp',    name:'LEECH',        tier:2, icon:'vamp',    desc:'Every 10 kills heals 1 HP',
    apply:function(){ P.stat.vamp += 1; } },
  { id:'boom',    name:'VOLATILE',     tier:2, icon:'boom',    desc:'Kills explode for area damage',
    apply:function(){ P.stat.boom += 1; } },
  { id:'chain',   name:'ARC CHAIN',    tier:2, icon:'chain',   desc:'Shots arc to a nearby enemy',
    apply:function(){ P.stat.chain += 1; } },
  { id:'freeze',  name:'CRYO ROUNDS',  tier:2, icon:'freeze',  desc:'Hits slow enemies for 1.5s',
    apply:function(){ P.stat.freeze += 1; } },
  { id:'ricochet',name:'RICOCHET ROUNDS',tier:2, icon:'ricochet', desc:'Shots bounce off the ground and platforms',
    apply:function(){ P.stat.bounce += 2; } },
  { id:'homing',  name:'SEEKER ROUNDS',tier:2, icon:'homing',  desc:'Shots curve toward targets',
    apply:function(){ P.stat.homing += 1.6; } },
  { id:'blast',   name:'BLAST RADIUS', tier:2, icon:'boom',    desc:'Shots burst for 24 area damage',
    apply:function(){ P.stat.blast += 1; } },
  { id:'luck',    name:'SCRAP LUCK',   tier:2, icon:'luck',    desc:'+12% drop rate and better rarity',
    apply:function(){ P.stat.luck += 1; } },
  { id:'slow',    name:'TIME DILATION',tier:2, icon:'slow',    desc:'Enemy fire slows for 5s',
    apply:function(){ S.slowmo = Math.max(S.slowmo, 5); } },
  { id:'aegis2',  name:'BULWARK',      tier:2, icon:'shield',  desc:'Shield recharges every 14s',
    apply:function(){ P.stat.bulwark += 1; } },
  { id:'twin',    name:'TWIN BARREL',  tier:2, icon:'multi',   desc:'+14% fire rate, +1 damage',
    apply:function(){ P.stat.rate += 2; P.stat.dmg += 1; } },

  /* ---- rare / build-defining ---- */
  { id:'drone',   name:'COMBAT DRONE', tier:3, icon:'drone',   desc:'A drone orbits you and fires at your target',
    apply:function(){ P.stat.drone += 1; } },
  { id:'turret',  name:'DEPLOY TURRET',tier:3, icon:'turret',  desc:'Drops a turret that fights for you',
    apply:function(){ P.stat.turret += 1; } },
  { id:'orbit',   name:'ORBITAL GUARD',tier:3, icon:'orbit',   desc:'Rotating orbs damage anything they touch',
    apply:function(){ P.stat.orbit += 1; } },
  { id:'dash',    name:'PHASE SLIDE',  tier:3, icon:'speed',   desc:'Slides travel further and dodge longer',
    apply:function(){ P.stat.slide += 1; } },
  { id:'djump',   name:'AERIAL PACK',  tier:3, icon:'jump',    desc:'Double jump',
    apply:function(){ P.stat.djump += 1; } },
  { id:'exec',    name:'EXECUTE',      tier:3, icon:'skull',   desc:'Triple damage to enemies below 30% HP',
    apply:function(){ P.stat.exec += 1; } },
  { id:'berserk', name:'BERSERK',      tier:3, icon:'berserk', desc:'+45% damage while at 1 HP',
    apply:function(){ P.stat.berserk += 1; } },
  { id:'glass',   name:'GLASS CANNON', tier:3, icon:'dmg',     desc:'+3 damage, -1 MAX HP',
    apply:function(){ P.stat.dmg += 3; P.maxHp = Math.max(1, P.maxHp - 1); P.hp = Math.min(P.hp, P.maxHp); } },
  { id:'greed',   name:'GREED',        tier:3, icon:'scrap',   desc:'Double scrap earned, -20% MAX HP',
    apply:function(){ P.stat.greed += 1; P.maxHp = Math.max(1, Math.round(P.maxHp * 0.8)); P.hp = Math.min(P.hp, P.maxHp); } },
  { id:'swarm',   name:'SWARM DOCTRINE',tier:3,icon:'multi',   desc:'+1 projectile for every 4 levels',
    apply:function(){ P.stat.swarm += 1; } },
  { id:'revive',  name:'SECOND WIND',  tier:3, icon:'heart_full', desc:'Revive once at 1 HP when you would die',
    apply:function(){ P.stat.revive += 1; } },
  { id:'chrono',  name:'CHRONO FIELD', tier:3, icon:'clock',   desc:'Enemy fire near you moves at half speed',
    apply:function(){ P.stat.chrono += 1; } }
];
var CARDS_BY_ID = {};
for (var _ci = 0; _ci < CARDS.length; _ci++) CARDS_BY_ID[CARDS[_ci].id] = CARDS[_ci];

/* =====================================================================
   ENEMIES — extra definitions appended to ENEMY_DEF
   ===================================================================== */
ENEMY_DEF.burrower  = { w:32, h:30, hp:3,  pts:200, air:false, stomp:0, cls:'g', name:'BURROWER',
                        info:'Dives under the ground and erupts right underneath you.' };
ENEMY_DEF.roller    = { w:30, h:30, hp:3,  pts:190, air:false, stomp:0, cls:'g', name:'ROLLER',
                        info:'A spiked ball that rolls fast. Cannot be stomped.' };
ENEMY_DEF.sniper    = { w:30, h:38, hp:2,  pts:230, air:false, stomp:1, cls:'g', name:'SNIPER',
                        info:'Paints you with a laser sight, then fires a fast round.' };
ENEMY_DEF.phalanx   = { w:44, h:44, hp:6,  pts:300, air:false, stomp:0, cls:'g', name:'PHALANX',
                        info:'A shield wall that advances. Jump over it or hit it from behind.' };
ENEMY_DEF.hive      = { w:40, h:44, hp:8,  pts:350, air:false, stomp:0, cls:'s', name:'HIVE',
                        info:'Sits still and keeps releasing small crawlers until destroyed.' };
ENEMY_DEF.mimic     = { w:28, h:26, hp:2,  pts:180, air:false, stomp:1, cls:'g', name:'MIMIC',
                        info:'Pretends to be a pickup, then lunges when you get close.' };
ENEMY_DEF.healer    = { w:30, h:30, hp:3,  pts:280, air:true,  stomp:1, cls:'a', name:'HEALER DRONE',
                        info:'Repairs every enemy near it. Kill it first.' };
ENEMY_DEF.shielddrone={ w:34, h:30, hp:4, pts:300, air:true,  stomp:1, cls:'a', name:'SHIELD DRONE',
                        info:'Projects a shield onto nearby enemies.' };
ENEMY_DEF.tether    = { w:26, h:26, hp:4,  pts:260, air:true,  stomp:0, cls:'a', name:'TETHER ORB',
                        info:'Comes in pairs. The beam between them burns.' };
ENEMY_DEF.queen     = { w:56, h:48, hp:12, pts:600, air:true,  stomp:0, cls:'a', name:'SWARM QUEEN',
                        info:'Broods darters endlessly. A priority target.' };

ENEMY_DEF.dummy = { w:44, h:56, hp:60, pts:0, air:false, stomp:0, cls:'s', name:'TRAINING DUMMY',
                    info:'A harmless target. Shoot it as much as you like \u2014 it comes back.' };

/* =====================================================================
   HAZARDS
   ===================================================================== */
var HAZARDS = {
  mine:       { name:'PROXIMITY MINE', info:'Floats and drifts. Do not touch it.' },
  spike:      { name:'SPIKE BED',      info:'Static ground spikes. Jump over.' },
  saw:        { name:'SAW BLADE',      info:'Rolls along the ground toward you.' },
  gate:       { name:'LASER GATE',     info:'Fires on a cycle. Duck under it.' },
  stalactite: { name:'STALACTITE',     info:'Falls when you pass beneath.' },
  crusher:    { name:'CRUSHER',        info:'Slams up and down on a timer.' },
  conveyor:   { name:'CONVEYOR',       info:'Drags you backwards. Fight it.' },
  launchpad:  { name:'LAUNCH PAD',     info:'Flings you high into the air.' },
  ice:        { name:'ICE PATCH',      info:'No traction. You keep sliding.' },
  lowgrav:    { name:'LOW GRAVITY',    info:'You float. So do your shots.' },
  acid:       { name:'ACID POOL',      info:'Burns on contact. Jump across.' }
};

/* =====================================================================
   BOSSES
   ===================================================================== */
var BOSSES = {
  mech:     { name:'HEAVY UNIT',     icon:'boss_mech', hp:70,  info:'Stomps shockwaves, fires fans, and gets angrier as it takes damage.' },
  serpent:  { name:'SAND SERPENT',   icon:'boss_serpent', hp:90, info:'Burrows and erupts. Only its head takes damage.' },
  fortress: { name:'SIEGE FORTRESS', icon:'boss_fortress', hp:110, info:'Four destructible turrets guard a central core. Break them all.' },
  overlord: { name:'THE OVERLORD',   icon:'boss_overlord', hp:160, info:'Three forms. The last one has no safe place to stand.' }
};
var BOSS_ORDER = ['mech','serpent','fortress','overlord'];

/* =====================================================================
   PILOTS
   ===================================================================== */
var PILOTS = [
  { id:'vector', name:'VECTOR', role:'SCOUT', icon:'scout',
    desc:'Fast and fragile. Short range, blistering fire rate.',
    mod:{ speed:2, range:-1, rate:2, hp:-1 }, weapon:'spread' },
  { id:'havoc', name:'HAVOC', role:'GUNNER', icon:'gunner',
    desc:'Slow, heavy, hits like a truck.',
    mod:{ dmg:2, rate:-1, speed:-1, hp:0 }, weapon:'pierce' },
  { id:'arclight', name:'ARCLIGHT', role:'TECH', icon:'tech',
    desc:'Starts with a combat drone and a magnetic field.',
    mod:{ drone:1, magnet:1, hp:0 }, weapon:'pulse' },
  { id:'rampage', name:'RAMPAGE', role:'BERSERKER', icon:'berserk',
    desc:'Almost no range, but nothing survives getting close.',
    mod:{ range:-3, dmg:2, hp:1, thorns:2 }, weapon:'flamer' }
];

/* =====================================================================
   RUN MODIFIERS
   ===================================================================== */
var MODIFIERS = [
  { id:'glass',    name:'GLASS',     icon:'warn',   mul:2.0, desc:'Enemies deal double damage' },
  { id:'swarm',    name:'SWARM',     icon:'multi',  mul:1.5, desc:'Twice as many enemies' },
  { id:'blitz',    name:'BLITZ',     icon:'rate',   mul:1.75,desc:'Everything moves 40% faster' },
  { id:'flood',    name:'BARREN',    icon:'skull',  mul:1.4, desc:'Nothing drops pickups' },
  { id:'fragile',  name:'FRAGILE',   icon:'heart',  mul:2.5, desc:'You start with 1 HP' },
  { id:'volatile', name:'VOLATILE',  icon:'boom',   mul:1.6, desc:'Every enemy explodes on death' },
  { id:'dark',     name:'BLACKOUT',  icon:'globe',  mul:1.3, desc:'Visibility is cut to a small pool of light' },
  { id:'noemp',    name:'DRY',       icon:'bomb',   mul:1.2, desc:'Graze never charges the EMP' }
];

/* =====================================================================
   CAMPAIGN STAGES
   ===================================================================== */
var STAGES = [
  { n:1, name:'NEON OUTSKIRTS', biome:0, len:2200, dur:70,  spawn:1.15, boss:null,      goal:'Survive 70s and clear 25 kills', kills:25 },
  { n:2, name:'RUST APPROACH',  biome:1, len:2600, dur:75,  spawn:1.05, boss:null,      goal:'Survive 75s and clear 35 kills', kills:35 },
  { n:3, name:'FROZEN SPAN',    biome:2, len:3000, dur:80,  spawn:1.00, boss:null,      goal:'Survive 80s and clear 45 kills', kills:45 },
  { n:4, name:'THE WARDEN',     biome:0, len:2400, dur:0,   spawn:1.20, boss:'mech',    goal:'Destroy the Heavy Unit' },
  { n:5, name:'DEEP CAVERN',    biome:3, len:3400, dur:90,  spawn:0.92, boss:null,      goal:'Survive 90s and clear 60 kills', kills:60 },
  { n:6, name:'BURIED THING',   biome:3, len:2800, dur:0,   spawn:1.15, boss:'serpent', goal:'Destroy the Sand Serpent' },
  { n:7, name:'ORBITAL RING',   biome:4, len:3800, dur:100, spawn:0.85, boss:null,      goal:'Survive 100s and clear 80 kills', kills:80 },
  { n:8, name:'THE SIEGE',      biome:1, len:3000, dur:0,   spawn:1.10, boss:'fortress',goal:'Destroy the Siege Fortress' },
  { n:9, name:'LAST LIGHT',     biome:4, len:4200, dur:110, spawn:0.78, boss:null,      goal:'Survive 110s and clear 100 kills', kills:100 },
  { n:10,name:'THE OVERLORD',   biome:3, len:3200, dur:0,   spawn:1.00, boss:'overlord',goal:'Destroy the Overlord' }
];

/* =====================================================================
   ACHIEVEMENTS
   check(run, career) — run is this run's summary, career is lifetime totals
   ===================================================================== */
var ACHIEVEMENTS = [
  { id:'first',      name:'FIRST BLOOD',    icon:'skull',  desc:'Kill your first enemy',            check:function(r,c){ return c.kills >= 1; } },
  { id:'k100',       name:'CENTURION',      icon:'skull',  desc:'Kill 100 enemies',                 check:function(r,c){ return c.kills >= 100; } },
  { id:'k1000',      name:'EXTERMINATOR',   icon:'skull',  desc:'Kill 1,000 enemies',               check:function(r,c){ return c.kills >= 1000; } },
  { id:'k10000',     name:'GENOCIDE',       icon:'trophy', desc:'Kill 10,000 enemies',              check:function(r,c){ return c.kills >= 10000; } },
  { id:'chain8',     name:'CHAIN MASTER',   icon:'chain',  desc:'Reach a x8 chain',                 check:function(r,c){ return r.maxMult >= 8; } },
  { id:'chain25',    name:'UNBROKEN',       icon:'chain',  desc:'Chain 25 kills without a break',   check:function(r,c){ return r.bestCombo >= 25; } },
  { id:'boss1',      name:'GIANT SLAYER',   icon:'trophy', desc:'Destroy your first boss',          check:function(r,c){ return c.bosses >= 1; } },
  { id:'boss10',     name:'MECH BREAKER',   icon:'trophy', desc:'Destroy 10 bosses',                check:function(r,c){ return c.bosses >= 10; } },
  { id:'bossall',    name:'ALL FALL',       icon:'medal',  desc:'Destroy every boss type',          check:function(r,c){ return c.bossTypes && Object.keys(c.bossTypes).length >= 4; } },
  { id:'survive300', name:'ENDURANCE',      icon:'clock',  desc:'Survive 5 minutes in one run',     check:function(r,c){ return r.time >= 300; } },
  { id:'survive600', name:'IMMORTAL',       icon:'clock',  desc:'Survive 10 minutes in one run',    check:function(r,c){ return r.time >= 600; } },
  { id:'score50k',   name:'HIGH ROLLER',    icon:'star',   desc:'Score 50,000 in one run',          check:function(r,c){ return r.score >= 50000; } },
  { id:'score250k',  name:'LEGEND',         icon:'star',   desc:'Score 250,000 in one run',         check:function(r,c){ return r.score >= 250000; } },
  { id:'nomiss',     name:'UNTOUCHED',      icon:'shield', desc:'Beat a boss without taking damage',check:function(r,c){ return r.bossNoHit >= 1; } },
  { id:'nightmare',  name:'NIGHTMARE',      icon:'warn',   desc:'Clear a run on NIGHTMARE',         check:function(r,c){ return r.difficulty === 3 && r.time >= 120; } },
  { id:'assist',     name:'HELPING HAND',   icon:'info',   desc:'Clear a run on ASSIST',            check:function(r,c){ return r.difficulty === 0 && r.time >= 120; } },
  { id:'weapons',    name:'ARSENAL',        icon:'weapon', desc:'Use every weapon type',            check:function(r,c){ return c.weaponsUsed && Object.keys(c.weaponsUsed).length >= 10; } },
  { id:'cards',      name:'BUILD CRAFTED',  icon:'grid',   desc:'Take 12 cards in one run',         check:function(r,c){ return r.cards >= 12; } },
  { id:'cards30',    name:'DECKED OUT',     icon:'grid',   desc:'Take 30 cards in one run',         check:function(r,c){ return r.cards >= 30; } },
  { id:'graze500',   name:'NEAR MISS',      icon:'graze',  desc:'Graze 500 enemy shots',            check:function(r,c){ return c.grazes >= 500; } },
  { id:'emp25',      name:'EMP SPECIALIST', icon:'bomb',   desc:'Fire 25 EMP blasts',               check:function(r,c){ return c.emps >= 25; } },
  { id:'dist10k',    name:'MARATHON',       icon:'speed',  desc:'Travel 10,000m in total',          check:function(r,c){ return c.distance >= 10000; } },
  { id:'stage5',     name:'CAMPAIGNER',     icon:'flag',   desc:'Clear stage 5 of the campaign',    check:function(r,c){ return c.campaignCleared >= 5; } },
  { id:'stage10',    name:'CAMPAIGN COMPLETE',icon:'medal',desc:'Clear the whole campaign',         check:function(r,c){ return c.campaignCleared >= 10; } },
  { id:'runs25',     name:'REGULAR',        icon:'clock',  desc:'Play 25 runs',                     check:function(r,c){ return c.runs >= 25; } },
  { id:'scrap5k',    name:'SCRAP LORD',     icon:'scrap',  desc:'Bank 5,000 scrap in total',        check:function(r,c){ return c.scrapEarned >= 5000; } },
  { id:'modifiers',  name:'HANDICAPPED',    icon:'warn',   desc:'Win a run with 3+ modifiers',      check:function(r,c){ return r.modCount >= 3 && r.time >= 120; } },
  { id:'allpilot',   name:'FLIGHT CREW',    icon:'scout',  desc:'Play a run with every pilot',      check:function(r,c){ return c.pilotsUsed && Object.keys(c.pilotsUsed).length >= 4; } },
  { id:'perfect',    name:'FLAWLESS',       icon:'star',   desc:'Finish a stage without being hit', check:function(r,c){ return r.noHitStage >= 1; } },
  { id:'codex',      name:'SCHOLAR',        icon:'book',   desc:'Discover every codex entry',       check:function(r,c){ return c.codexSeen >= codexTotal(); } }
];

/* =====================================================================
   CODEX — built from the data above
   ===================================================================== */
function codexEntries(cat){
  var out = [];
  if (cat === 'enemies' || cat === undefined){
    for (var k in ENEMY_DEF){
      var d = ENEMY_DEF[k];
      out.push({ cat:'enemies', id:k, name:d.name || k.toUpperCase(), icon:k,
                 info:d.info || ('A hostile unit. ' + d.hp + ' HP, worth ' + d.pts + ' points.') });
    }
  }
  if (cat === 'hazards' || cat === undefined){
    for (var h in HAZARDS)
      out.push({ cat:'hazards', id:h, name:HAZARDS[h].name, icon:h, info:HAZARDS[h].info });
  }
  if (cat === 'weapons' || cat === undefined){
    for (var wi = 0; wi < WEAPON_KEYS.length; wi++){
      var w = WEAPONS[WEAPON_KEYS[wi]];
      out.push({ cat:'weapons', id:WEAPON_KEYS[wi], name:w.name, icon:WEAPON_KEYS[wi],
                 info:w.desc + '  \\u00B7  ' + w.dmg + ' base damage, ' + (1/w.cd).toFixed(1) + ' shots/sec.' });
    }
  }
  if (cat === 'cards' || cat === undefined){
    for (var ci = 0; ci < CARDS.length; ci++)
      out.push({ cat:'cards', id:CARDS[ci].id, name:CARDS[ci].name, icon:CARDS[ci].icon,
                 info:CARDS[ci].desc + (CARDS[ci].tier >= 3 ? '  \\u00B7  RARE' : CARDS[ci].tier === 2 ? '  \\u00B7  UNCOMMON' : '') });
  }
  if (cat === 'bosses' || cat === undefined){
    for (var bk in BOSSES)
      out.push({ cat:'bosses', id:bk, name:BOSSES[bk].name, icon:BOSSES[bk].icon, info:BOSSES[bk].info });
  }
  if (cat === 'pilots' || cat === undefined){
    for (var pi = 0; pi < PILOTS.length; pi++)
      out.push({ cat:'pilots', id:PILOTS[pi].id, name:PILOTS[pi].name + '  \\u00B7  ' + PILOTS[pi].role,
                 icon:PILOTS[pi].icon, info:PILOTS[pi].desc });
  }
  return out;
}
function codexTotal(){ return codexEntries().length; }


/* =====================================================================
   CODEX TEXT FOR THE ORIGINAL ENEMY ROSTER
   ===================================================================== */
(function fillEnemyCodex(){
  var TXT = {
    crawler:  ['CRAWLER',  'Walks at you, stops, then lunges. Jump over it or stomp it flat.'],
    armored:  ['ARMORED',  'Slow and heavily plated. Takes a lot of hits, but it stomps easily.'],
    spiked:   ['SPIKED',   'Spikes on its back. Stomping it hurts you \u2014 shoot it instead.'],
    splitter: ['SPLITTER', 'Breaks into two smaller crawlers when it dies.'],
    exploder: ['EXPLODER', 'Arms itself and detonates when you get close. Back off.'],
    jumper:   ['JUMPER',   'Hops toward you in arcs. Hard to hit while it is airborne.'],
    flyer:    ['DRONE',    'Flies in a sine wave and dives at you when you get near.'],
    bomber:   ['BOMBER',   'Flies overhead and drops bombs that explode on landing.'],
    hover:    ['HOVERGUN', 'Keeps its distance and fires aimed shots.'],
    carrier:  ['CARRIER',  'A heavy transport that keeps releasing crawlers.'],
    turret:   ['TURRET',   'Fires a flat laser at chest height. Duck and it passes over you.'],
    sweeper:  ['SWEEPER',  'Fires a laser that rotates in a full circle. Keep moving.'],
    mortar:   ['MORTAR',   'Lobs arcing shells that land where you were standing.'],
    shielded: ['SHIELDBOT', 'A front plate blocks your fire while it is up. Wait for the gap.'],
    popturret:['POP-UP TURRET', 'Hides underground, pops up when you are close, fires a burst.'],
    darter:   ['DARTER',   'Fast little flier that beelines straight at you.']
  };
  for (var k in TXT){
    if (ENEMY_DEF[k]){ ENEMY_DEF[k].name = TXT[k][0]; ENEMY_DEF[k].info = TXT[k][1]; }
  }
})();
