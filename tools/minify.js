#!/usr/bin/env node
/* Minifies the built game into a single deployable file.

   Produces:
     build/neon-runner.min.html  the minified game
     build/game.min.js           the minified script on its own
     build/game.hook.min.js      minified + an instrumentation hook, so the
                                 audit harness can verify the *minified*
                                 bundle rather than only the readable source
     index.html                  the same minified file at the repo root,
                                 which is what GitHub Pages serves
*/
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const { minify } = require('terser');

const ROOT = path.resolve(__dirname, '..');
const BUILD = path.join(ROOT, 'build');

/* Exposed to the harnesses. Injected before minification, so terser renames
   these references consistently with the rest of the bundle. */
const HOOK = `
global.__G = {
  get S(){return S}, get P(){return P}, get enemies(){return enemies},
  get hazards(){return hazards}, get platforms(){return platforms}, get bullets(){return bullets},
  get UI(){return UI}, get Meta(){return Meta}, get Scores(){return Scores}, get Settings(){return Settings},
  get Replay(){return Replay}, get GROUND_Y(){return GROUND_Y}, get VW(){return VW}, get VH(){return VH},
  get Cam(){return Cam}, get Wall(){return Wall}, get decals(){return decals},
  get JUMP_APEX(){return JUMP_APEX}, get P_H(){return P_H}, get P_DUCK_H(){return P_DUCK_H},
  get UserIn(){return UserIn}, get Music(){return Music}, get Input(){return Input},
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

/* Conservative CSS minifier — deliberately never touches arithmetic inside
   calc()/env(), which a naive whitespace pass would corrupt. */
function minifyCss(css){
  return css
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\s+/g, ' ')
    .replace(/\s*([{};:,>])\s*/g, '$1')
    .replace(/;}/g, '}')
    .trim();
}

(async () => {
  const html = fs.readFileSync(path.join(BUILD, 'neon-runner.html'), 'utf8');
  const open = html.indexOf('<script>');
  const close = html.indexOf('</script>');
  const head = html.slice(0, open);
  const tail = html.slice(close);
  const js = html.slice(open + '<script>'.length, close);

  const opts = {
    compress: { passes: 2, drop_debugger: true, pure_getters: false,
                unsafe: false, unsafe_arrows: false, keep_fargs: true },
    mangle: true,
    format: { comments: false, ascii_only: true }
  };

  const minJs = (await minify(js, opts)).code;
  const hooked = (await minify(js.replace('/*NEON_HOOK*/', HOOK), opts)).code;

  const stamp = new Date().toISOString().slice(0, 19).replace('T', ' ') + ' UTC';
  let minHead = head.replace(/<style>[\s\S]*?<\/style>/,
    m => '<style>' + minifyCss(m.slice(7, -8)) + '</style>');
  minHead = minHead.replace('</head>',
    '<!-- NEON RUNNER \u00b7 minified build \u00b7 ' + stamp + ' -->\n</head>');
  const minHtml = minHead + '<script>' + minJs + tail;

  fs.writeFileSync(path.join(BUILD, 'game.min.js'), minJs);
  fs.writeFileSync(path.join(BUILD, 'game.hook.min.js'), hooked);
  fs.writeFileSync(path.join(BUILD, 'neon-runner.min.html'), minHtml);
  fs.writeFileSync(path.join(ROOT, 'index.html'), minHtml);

  const gz = zlib.gzipSync(minHtml, { level: 9 }).length;
  const kb = n => (n / 1024).toFixed(1) + ' KB';
  console.log('readable  ' + kb(html.length) + '   (' + kb(js.length) + ' of JS)');
  console.log('minified  ' + kb(minHtml.length) + '   (' + kb(minJs.length) + ' of JS)');
  console.log('gzipped   ' + kb(gz));
  console.log('saved     ' + (100 - Math.round(minHtml.length / html.length * 100)) + '%');
})();
