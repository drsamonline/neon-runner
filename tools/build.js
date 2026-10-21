#!/usr/bin/env node
/* Builds the single-file game from src/ into build/.
   Node port of the original shell script so CI needs nothing but Node. */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'src');
const OUT = path.join(ROOT, 'build');

const ORDER = [
  '00_head.html', '10_core.js', '20_audio.js', '25_sprites.js', '26_icons.js',
  '30_input.js', '35_content.js', '40_render.js', '45_fx.js', '50_world.js',
  '60_entities.js', '70_systems.js', '80_ui.js', '85_screens.js', '90_loop.js',
  '99_tail.html'
];

fs.mkdirSync(OUT, { recursive: true });

let html = '';
for (const f of ORDER) html += fs.readFileSync(path.join(SRC, f), 'utf8');

const open = html.indexOf('<script>');
const close = html.indexOf('</script>');
if (open < 0 || close < 0) throw new Error('src has no <script> block');
const js = html.slice(open + '<script>'.length, close);

fs.writeFileSync(path.join(OUT, 'neon-runner.html'), html);
fs.writeFileSync(path.join(OUT, 'game.js'), js);

console.log('built build/neon-runner.html  ' + html.length.toLocaleString() + ' bytes');
console.log('built build/game.js           ' + js.length.toLocaleString() + ' bytes');
