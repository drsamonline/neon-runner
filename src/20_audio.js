/* =====================================================================
   section 2: AUDIO
   Procedural SFX (with a voice cap) + an adaptive chiptune sequencer.
   Entirely generated in-browser — no files, no network.
   ===================================================================== */

var Audio = {
  ctx: null, master: null, musicGain: null, sfxGain: null,
  noiseBuf: null, unlocked: false, voices: 0, lastShot: 0
};

function audioInit(){
  if (Audio.ctx) return Audio.ctx;
  var AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  try {
    Audio.ctx = new AC();
    Audio.master = Audio.ctx.createGain();
    Audio.master.gain.value = 0.9;
    Audio.master.connect(Audio.ctx.destination);
    Audio.musicGain = Audio.ctx.createGain();
    Audio.musicGain.gain.value = Settings.music;
    Audio.musicGain.connect(Audio.master);
    Audio.sfxGain = Audio.ctx.createGain();
    Audio.sfxGain.gain.value = Settings.sfx;
    Audio.sfxGain.connect(Audio.master);
    /* reusable noise buffer */
    var len = Math.floor(Audio.ctx.sampleRate * 0.5);
    Audio.noiseBuf = Audio.ctx.createBuffer(1, len, Audio.ctx.sampleRate);
    var d = Audio.noiseBuf.getChannelData(0);
    for (var i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  } catch(e){ Audio.ctx = null; }
  return Audio.ctx;
}
function audioUnlock(){
  var a = audioInit();
  if (!a) return;
  Audio.unlocked = true;
  if (a.state === 'suspended'){ try { a.resume(); } catch(e){} }
  Music.start();
}
function audioApplyVolumes(){
  if (!Audio.ctx) return;
  try {
    Audio.musicGain.gain.value = Settings.music;
    Audio.sfxGain.gain.value = Settings.sfx;
  } catch(e){}
}

/* ---------- SFX ---------- */
var SFX = {
  shoot:   { f0:900, f1:520, d:0.045, t:'square',   v:0.020, glide:'exp' },
  shoot2:  { f0:1150,f1:640, d:0.050, t:'sawtooth', v:0.016, glide:'exp' },
  shoot3:  { f0:640, f1:1400,d:0.055, t:'square',   v:0.017, glide:'exp' },
  eshot:   { f0:320, f1:170, d:0.080, t:'sawtooth', v:0.026, glide:'exp' },
  laser:   { f0:1400,f1:300, d:0.160, t:'sawtooth', v:0.030, glide:'exp' },
  jump:    { f0:430, f1:790, d:0.100, t:'square',   v:0.040, glide:'exp' },
  land:    { f0:180, f1:90,  d:0.070, t:'triangle', v:0.030, glide:'exp' },
  stomp:   { f0:520, f1:120, d:0.110, t:'square',   v:0.055, glide:'exp' },
  slide:   { f0:700, f1:300, d:0.130, t:'triangle', v:0.028, glide:'exp' },
  hit:     { f0:210, f1:60,  d:0.220, t:'sawtooth', v:0.075, glide:'exp' },
  kill:    { f0:640, f1:120, d:0.150, t:'square',   v:0.045, glide:'exp' },
  boom:    { f0:180, f1:40,  d:0.340, t:'sawtooth', v:0.070, glide:'exp' },
  pick:    { f0:660, f1:1330,d:0.140, t:'triangle', v:0.060, glide:'exp' },
  weapon:  { f0:400, f1:1600,d:0.220, t:'square',   v:0.055, glide:'exp' },
  start:   { f0:300, f1:900, d:0.240, t:'square',   v:0.050, glide:'exp' },
  dead:    { f0:400, f1:70,  d:0.700, t:'sawtooth', v:0.070, glide:'exp' },
  bomb:    { f0:120, f1:900, d:0.500, t:'sawtooth', v:0.075, glide:'exp' },
  graze:   { f0:1800,f1:2400,d:0.040, t:'sine',     v:0.012, glide:'exp' },
  card:    { f0:520, f1:1040,d:0.180, t:'triangle', v:0.055, glide:'exp' },
  menu:    { f0:700, f1:700, d:0.030, t:'square',   v:0.025, glide:'none' },
  confirm: { f0:880, f1:1320,d:0.090, t:'square',   v:0.040, glide:'exp' },
  back:    { f0:500, f1:280, d:0.080, t:'square',   v:0.032, glide:'exp' },
  overheat:{ f0:900, f1:200, d:0.260, t:'sawtooth', v:0.045, glide:'exp' },
  boss:    { f0:110, f1:60,  d:0.900, t:'sawtooth', v:0.080, glide:'exp' },
  warn:    { f0:880, f1:440, d:0.300, t:'square',   v:0.045, glide:'exp' }
};

function sfx(name, pitch){
  if (Settings.sfx <= 0) return;
  var a = Audio.ctx; if (!a || !Audio.unlocked) return;
  var cfg = SFX[name]; if (!cfg) return;
  if (Audio.voices > 22) return;                 /* voice cap */
  var now = a.currentTime;
  if (now - Audio.lastShot < 0.012) return;      /* rate limit */
  Audio.lastShot = now;
  Audio.voices++;
  var o = a.createOscillator(), g = a.createGain();
  o.type = cfg.t;
  var p = pitch || 1;
  o.frequency.setValueAtTime(cfg.f0 * p, now);
  if (cfg.glide === 'exp'){
    o.frequency.exponentialRampToValueAtTime(Math.max(20, cfg.f1 * p), now + cfg.d);
  }
  g.gain.setValueAtTime(cfg.v, now);
  g.gain.exponentialRampToValueAtTime(0.0001, now + cfg.d);
  o.connect(g); g.connect(Audio.sfxGain);
  o.onended = function(){ Audio.voices--; };
  o.start(now); o.stop(now + cfg.d + 0.03);
}

/* =====================================================================
   MUSIC — step sequencer with intensity layers
   ===================================================================== */
var Music = {
  playing: false, step: 0, nextT: 0, bpm: 132, intensity: 0, boss: false,
  timer: 0, enabled: true
};

/* note tables: MIDI numbers. progressions in A minor */
var PROG = [
  /* 0 NEON CITY   — driving minor */
  { bass:[45,45,45,45, 41,41,41,41, 43,43,43,43, 40,40,40,40],
    lead:[69,72,76,72, 65,69,72,69, 67,71,74,71, 64,67,71,67] },
  /* 1 RUST DESERT — loping, wide */
  { bass:[45,45,45,45, 48,48,48,48, 43,43,43,43, 41,41,41,41],
    lead:[69,76,81,76, 72,79,84,79, 67,74,79,74, 65,72,77,72] },
  /* 2 CRYO ICE    — sparse and cold */
  { bass:[40,40,40,40, 45,45,45,45, 38,38,38,38, 43,43,43,43],
    lead:[76,83,88,83, 81,88,93,88, 74,81,86,81, 79,86,91,86] },
  /* 3 DEEP CAVERN — low and heavy */
  { bass:[38,38,38,38, 36,36,36,36, 41,41,41,41, 40,40,40,40],
    lead:[62,65,69,65, 60,64,67,64, 65,69,72,69, 64,67,71,67] },
  /* 4 ORBITAL RING— fast and bright */
  { bass:[45,45,52,52, 43,43,50,50, 41,41,48,48, 40,40,47,47],
    lead:[81,88,93,88, 79,86,91,86, 77,84,89,84, 76,83,88,83] }
];
var BOSS_PROG = {
  bass:[45,45,44,44, 43,43,42,42, 45,45,46,46, 47,47,46,46],
  lead:[81,84,81,79, 80,83,80,78, 81,85,81,79, 83,86,83,81]
};
/* extra percussion stinger layered in during a boss fight */
Music.bossHit = function(){ noiseVoice(0.05, 0.05, 3000); };

function mtof(m){ return 440 * Math.pow(2, (m - 69) / 12); }

function noteVoice(freq, dur, type, vol, dest){
  var a = Audio.ctx; if (!a) return;
  var o = a.createOscillator(), g = a.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, Audio.musT);
  g.gain.setValueAtTime(0.0001, Audio.musT);
  g.gain.linearRampToValueAtTime(vol, Audio.musT + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, Audio.musT + dur);
  o.connect(g); g.connect(dest || Audio.musicGain);
  o.start(Audio.musT); o.stop(Audio.musT + dur + 0.02);
}
function noiseVoice(dur, vol, hp){
  var a = Audio.ctx; if (!a || !Audio.noiseBuf) return;
  var s = a.createBufferSource();
  s.buffer = Audio.noiseBuf;
  var g = a.createGain(), f = a.createBiquadFilter();
  f.type = 'highpass'; f.frequency.value = hp || 2000;
  g.gain.setValueAtTime(vol, Audio.musT);
  g.gain.exponentialRampToValueAtTime(0.0001, Audio.musT + dur);
  s.connect(f); f.connect(g); g.connect(Audio.musicGain);
  s.start(Audio.musT); s.stop(Audio.musT + dur + 0.02);
}
function kickVoice(){
  var a = Audio.ctx; if (!a) return;
  var o = a.createOscillator(), g = a.createGain();
  o.type = 'sine';
  o.frequency.setValueAtTime(155, Audio.musT);
  o.frequency.exponentialRampToValueAtTime(44, Audio.musT + 0.13);
  g.gain.setValueAtTime(0.24, Audio.musT);
  g.gain.exponentialRampToValueAtTime(0.0001, Audio.musT + 0.17);
  o.connect(g); g.connect(Audio.musicGain);
  o.start(Audio.musT); o.stop(Audio.musT + 0.2);
}

Music.start = function(){
  if (!Audio.ctx || Music.playing) return;
  Music.playing = true;
  Music.nextT = Audio.ctx.currentTime + 0.08;
  Music.step = 0;
};
Music.stop = function(){ Music.playing = false; };

Music.tick = function(){
  if (!Music.playing || !Audio.ctx || Settings.music <= 0) return;
  var bpm = Music.boss ? Music.bpm * 1.22 : Music.bpm;
  var spb = 60 / bpm / 4;               /* 16th note */
  var lookahead = 0.2;
  var guard = 0;
  while (Music.nextT < Audio.ctx.currentTime + lookahead && guard++ < 32){
    Music.scheduleStep(Music.step, Music.nextT);
    Music.nextT += spb;
    Music.step = (Music.step + 1) % 64;
  }
};
Music.scheduleStep = function(step, when){
  Audio.musT = when;
  var inten = Music.intensity | 0;
  var bar = Math.floor(step / 16);
  var s = step % 16;
  var prog = Music.boss ? null : PROG[S.biomeIdx % PROG.length];

  /* bass — always */
  var bassNote = Music.boss ? BOSS_PROG.bass[step % 16] : prog.bass[bar * 4 + (s >> 2)];
  if (s % 2 === 0 || inten >= 2){
    noteVoice(mtof(bassNote), 0.16, 'square', 0.055 + inten * 0.012);
  }
  /* kick */
  if (s === 0 || s === 4 || s === 8 || s === 12) kickVoice();
  /* hats */
  if (inten >= 1 && s % 2 === 1) noiseVoice(0.03, 0.05, 6000);
  /* snare */
  if (inten >= 2 && (s === 4 || s === 12)) noiseVoice(0.09, 0.075, 1400);
  /* lead arpeggio */
  if (inten >= 2 && s % 2 === 0){
    var ln = Music.boss ? BOSS_PROG.lead[step % 16] : prog.lead[bar * 4 + (s >> 2)];
    noteVoice(mtof(ln), 0.11, 'triangle', 0.036 + inten * 0.006);
  }
  /* high harmony */
  if (inten >= 3 && s % 4 === 2){
    var hn = (Music.boss ? BOSS_PROG.lead[step % 16] : prog.lead[bar * 4 + (s >> 2)]) + 12;
    noteVoice(mtof(hn), 0.09, 'square', 0.020);
  }
};
