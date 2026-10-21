#!/usr/bin/env node
/* Produces the minified single-file build plus a "hooked" copy of the
   minified JS so the audit harness can verify the *minified* logic, not
   just the readable source. */
const fs = require('fs');
const path = require('path');
const { minify } = require('terser');

const ROOT = '/scratch/work';
const SRC = path.join(ROOT, 'src');

/* the same instrumentation hook the audit harnesses inject, so we can prove
   the minified bundle behaves identically */
const HOOK = `
global.__G = {
  get S(){return S}, get P(){return P}, get enemies(){return enemies},
  get hazards(){return hazards}, get platforms(){return platforms}, get bullets(){return bullets},
  get UI(){return UI}, get Meta(){return Meta}, get Scores(){return Scores}, get Settings(){return Settings},
  get Replay(){return Replay}, get GROUND_Y(){return GROUND_Y}, get VW(){return VW}, get VH(){return VH},
  get Cam(){return Cam}, get Wall(){return Wall}, get decals(){return decals},
  get JUMP_APEX(){return JUMP_APEX}, get P_H(){return P_H}, get P_DUCK_H(){return P_DUCK_H},
  get UserIn(){return UserIn}, get Music(){return Music}, get Input(){return Input},
  get Audio(){return Audio}, get Keys(){return Keys}, get ACTIONS(){return ACTIONS},
  get DefaultKeys(){return DefaultKeys}, get AnyKeyEver(){return AnyKeyEver},
  get AnyKeyFlag(){return AnyKeyFlag}, get LastKeyCode(){return LastKeyCode},
  keyLabel:keyLabel, audioUnlock:audioUnlock, audioBlocked:audioBlocked, audioState:audioState,
  actionForKey:actionForKey, saveKeys:saveKeys,
  CARDS:CARDS, WEAPONS:WEAPONS, WEAPON_KEYS:WEAPON_KEYS, ENEMY_DEF:ENEMY_DEF, HAZARDS:HAZARDS,
  PILOTS:PILOTS, MODIFIERS:MODIFIERS, ACHIEVEMENTS:ACHIEVEMENTS, BOSSES:BOSSES, BOSS_ORDER:BOSS_ORDER,
  STAGES:STAGES, RARITY:RARITY,
  beginRun:beginRun, endRunToTitle:endRunToTitle, resize:resize, openCards:openCards,
  chooseCard:chooseCard, spawnBoss:spawnBoss, spawnEnemy:spawnEnemy, spawnElite:spawnElite,
  finishRun:finishRun, codexEntries:codexEntries, codexTotal:codexTotal, careerStats:careerStats,
  encodeReplay:encodeReplay, decodeReplay:decodeReplay, recordHistory:recordHistory,
  discover:discover, takePhoto:takePhoto, exportProgress:exportProgress, importProgress:importProgress,
  drawScreen:drawScreen, render:render, modeDef:modeDef, scrollWindow:scrollWindow,
  commitInitials:commitInitials
};
global.__T = global.__G;
`;

function injectHook(js){
  const i = js.indexOf('/*NEON_HOOK*/');
  if (i < 0) throw new Error('NEON_HOOK marker missing from the source');
  return js.slice(0, i) + HOOK + js.slice(i);
}

/* conservative CSS minifier: never touches calc()/env() arithmetic */
function minifyCss(css){
  return css
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\s+/g, ' ')
    .replace(/\s*([{};:,>])\s*/g, '$1')
    .replace(/;}/g, '}')
    .trim();
}

(async () => {
  const order = ['00_head.html','10_core.js','20_audio.js','25_sprites.js','26_icons.js',
                 '30_input.js','35_content.js','40_render.js','45_fx.js','50_world.js',
                 '60_entities.js','70_systems.js','80_ui.js','85_screens.js','90_loop.js','99_tail.html'];
  let html = '';
  for (const f of order) html += fs.readFileSync(path.join(SRC, f), 'utf8');

  const head = html.slice(0, html.indexOf('<script>'));
  const tail = html.slice(html.indexOf('</script>'));
  const js = html.slice(html.indexOf('<script>') + '<script>'.length, html.indexOf('</script>'));

  const opts = {
    compress: { passes: 2, drop_debugger: true, pure_getters: false,
                unsafe: false, unsafe_arrows: false, keep_fargs: true },
    mangle: true,
    format: { comments: /NEON_HOOK/, ascii_only: true }
  };

  const out = await minify(js, opts);
  if (out.error) throw out.error;
  const minJs = out.code;

  const hooked = await minify(injectHook(js), opts);
  if (hooked.error) throw hooked.error;

  /* rebuild the html: minified css + minified js, plus a build stamp */
  const stamp = new Date().toISOString().slice(0, 19).replace('T', ' ') + ' UTC';
  let minHead = head.replace(/<style>[\s\S]*?<\/style>/, m => {
    const inner = m.slice(7, -8);
    return '<style>' + minifyCss(inner) + '</style>';
  });
  minHead = minHead.replace('</head>',
    '<!-- NEON RUNNER \u2014 minified build, generated ' + stamp + ' -->\n</head>');
  const minHtml = minHead + '<script>' + minJs + tail;

  fs.writeFileSync(path.join(ROOT, 'game.min.js'), minJs);
  fs.writeFileSync(path.join(ROOT, 'game.hook.min.js'), hooked.code);
  fs.writeFileSync(path.join(ROOT, 'neon-runner.min.html'), minHtml);

  const rawHtml = fs.statSync(path.join(ROOT, 'neon-runner.html')).size;
  const minSize = Buffer.byteLength(minHtml);
  console.log('raw   html : ' + rawHtml.toLocaleString() + ' bytes');
  console.log('min   html : ' + minSize.toLocaleString() + ' bytes  (' +
              (100 - Math.round(minSize / rawHtml * 100)) + '% smaller)');
  console.log('raw    js  : ' + Buffer.byteLength(js).toLocaleString() + ' bytes');
  console.log('min    js  : ' + Buffer.byteLength(minJs).toLocaleString() + ' bytes  (' +
              (100 - Math.round(Buffer.byteLength(minJs) / Buffer.byteLength(js) * 100)) + '% smaller)');
  console.log('gzip  html : ' + require('zlib').gzipSync(minHtml, {level:9}).length.toLocaleString() + ' bytes');
})();
