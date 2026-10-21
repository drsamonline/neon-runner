/* =====================================================================
   section 3: INPUT
   Keyboard (rebindable) + on-screen touch + gamepad. User input is kept
   separate from the attract-mode AI and the replay feed, so menus always
   respond to the human even while a demo plays behind the title.
   ===================================================================== */

var ACTIONS = ['left','right','up','down','action','pause','back'];

var DefaultKeys = {
  left:  ['ArrowLeft','KeyA'],
  right: ['ArrowRight','KeyD'],
  up:    ['ArrowUp','KeyW'],
  down:  ['ArrowDown','KeyS'],
  action:['Space','Enter','KeyZ','KeyJ'],
  pause: ['KeyP'],
  back:  ['Escape','Backspace']
};
var Keys = Store.get('keys', null);
if (!Keys || typeof Keys !== 'object') Keys = {};
/* always backfill any action added since the player last saved */
for (var _k = 0; _k < ACTIONS.length; _k++){
  if (!Array.isArray(Keys[ACTIONS[_k]])) Keys[ACTIONS[_k]] = DefaultKeys[ACTIONS[_k]].slice();
}
var prevBack = 0;
function saveKeys(){ Store.set('keys', Keys); }
function actionForKey(code){
  for (var i = 0; i < ACTIONS.length; i++){
    var list = Keys[ACTIONS[i]] || [];
    for (var j = 0; j < list.length; j++) if (list[j] === code) return ACTIONS[i];
  }
  return null;
}

var Raw     = { left:0, right:0, up:0, down:0, action:0, pause:0, back:0 };
var TouchIn = { left:0, right:0, up:0, down:0, action:0, pause:0 };
var PadIn   = { left:0, right:0, up:0, down:0, action:0, pause:0 };
var AIIn    = { left:0, right:0, up:0, down:0, action:0, pause:0 };
var RepIn   = { left:0, right:0, up:0, down:0, action:0, pause:0 };

/* the snapshot gameplay code reads */
var Input = { left:0,right:0,up:0,down:0,action:0,pause:0,
              jumpPressed:0,downPressed:0,leftPressed:0,rightPressed:0,upPressed:0,actionPressed:0,anyPressed:0 };
/* the snapshot menus read — always the human */
var UserIn = { left:0,right:0,up:0,down:0,action:0,
               jumpPressed:0,downPressed:0,leftPressed:0,rightPressed:0,upPressed:0,actionPressed:0,anyPressed:0 };

var PrevUser = { left:0,right:0,up:0,down:0,action:0 };
var PrevAI   = { left:0,right:0,up:0,down:0,action:0 };
var PrevRep  = { left:0,right:0,up:0,down:0,action:0 };

var KeyState = {};
var Rebinding = null;

function keyDown(code){
  KeyState[code] = 1;
  if (Rebinding){ return Rebinding(code); }
  var a = actionForKey(code);
  if (a){ Raw[a] = 1; return true; }
  return false;
}
function keyUp(code){
  KeyState[code] = 0;
  var a = actionForKey(code);
  if (a) Raw[a] = 0;
}
function releaseAllKeys(){
  for (var k in Raw) Raw[k] = 0;
  KeyState = {};
}

window.addEventListener('keydown', function(e){
  if (e.repeat){ e.preventDefault(); return; }
  if (keyDown(e.code)) e.preventDefault();
}, { passive:false });
window.addEventListener('keyup', function(e){
  keyUp(e.code);
  e.preventDefault();
}, { passive:false });
window.addEventListener('blur', function(){ releaseAllKeys(); releaseTouch(); });

/* ---------- gamepad ---------- */
function pollGamepad(){
  PadIn.left = PadIn.right = PadIn.up = PadIn.down = PadIn.action = PadIn.pause = 0;
  if (!navigator.getGamepads) return;
  var pads = navigator.getGamepads();
  for (var i = 0; i < pads.length; i++){
    var p = pads[i];
    if (!p || !p.connected) continue;
    var ax = p.axes[0] || 0, ay = p.axes[1] || 0;
    if (ax < -0.35 || (p.buttons[14] && p.buttons[14].pressed)) PadIn.left = 1;
    if (ax >  0.35 || (p.buttons[15] && p.buttons[15].pressed)) PadIn.right = 1;
    if (ay < -0.5  || (p.buttons[12] && p.buttons[12].pressed)) PadIn.up = 1;
    if (ay >  0.5  || (p.buttons[13] && p.buttons[13].pressed)) PadIn.down = 1;
    if ((p.buttons[0] && p.buttons[0].pressed) || (p.buttons[1] && p.buttons[1].pressed)) PadIn.action = 1;
    if (p.buttons[9] && p.buttons[9].pressed) PadIn.pause = 1;
  }
}

/* ---------- touch buttons ---------- */
var touchEls = {};
function buildTouch(){
  var host = document.getElementById('touch');
  if (!host) return;
  host.innerHTML = '';
  function mk(k, label, cls){
    var b = document.createElement('button');
    b.setAttribute('type','button');
    b.setAttribute('aria-label', k);
    b.innerHTML = label;
    if (cls) b.className = cls;
    bindTouchBtn(b, k);
    return b;
  }
  var padL = document.createElement('div'); padL.className = 'pad';
  padL.appendChild(mk('left', '&#9664;', ''));
  padL.appendChild(mk('right', '&#9654;', ''));
  var mid = document.createElement('div'); mid.className = 'mid';
  mid.appendChild(mk('pause', '&#10073;&#10073;', 'small'));
  mid.appendChild(mk('back', '&#8630;', 'small'));
  var padR = document.createElement('div'); padR.className = 'pad';
  padR.appendChild(mk('down', '&#9660;', ''));
  padR.appendChild(mk('up', '&#9650;', ''));
  host.appendChild(padL); host.appendChild(mid); host.appendChild(padR);
}
function bindTouchBtn(b, k){
  function on(e){
    e.preventDefault();
    audioUnlock();
    b.classList.add('on');
    if (k === 'back'){ UI.backPressed = true; return; }
    TouchIn[k] = 1;
    if (k === 'pause') Raw.pause = 1;
  }
  function off(e){
    e.preventDefault();
    b.classList.remove('on');
    if (k === 'back') return;
    TouchIn[k] = 0;
    if (k === 'pause') Raw.pause = 0;
  }
  b.addEventListener('touchstart', on, { passive:false });
  b.addEventListener('touchend', off, { passive:false });
  b.addEventListener('touchcancel', off, { passive:false });
  b.addEventListener('mousedown', on);
  b.addEventListener('mouseup', off);
  b.addEventListener('mouseleave', off);
}
function releaseTouch(){
  for (var k in TouchIn) TouchIn[k] = 0;
  for (var k2 in touchEls){ if (touchEls[k2]) touchEls[k2].classList.remove('on'); }
  Raw.back = 0;
}

/* ---------- pointer taps ---------- */
var TapQueue = [];
function logicalPoint(clientX, clientY){
  var r = canvas.getBoundingClientRect();
  return {
    x: (clientX - r.left) / (r.width || 1) * VW,
    y: (clientY - r.top) / (r.height || 1) * VH
  };
}
function pointerDown(e){
  if (e.cancelable) e.preventDefault();
  audioUnlock();
  var pt = logicalPoint(e.clientX, e.clientY);
  TapQueue.push(pt);
  if (TapQueue.length > 6) TapQueue.shift();
}

/* ---------- per-step snapshot ---------- */
function copyWithEdges(dst, src, prev){
  dst.left = src.left; dst.right = src.right; dst.up = src.up;
  dst.down = src.down; dst.action = src.action;
  dst.leftPressed   = (src.left   && !prev.left)   ? 1 : 0;
  dst.rightPressed  = (src.right  && !prev.right)  ? 1 : 0;
  dst.upPressed     = (src.up     && !prev.up)     ? 1 : 0;
  dst.downPressed   = (src.down   && !prev.down)   ? 1 : 0;
  dst.actionPressed = (src.action && !prev.action) ? 1 : 0;
  dst.jumpPressed   = (dst.upPressed || dst.actionPressed) ? 1 : 0;
  dst.anyPressed    = (dst.jumpPressed || dst.downPressed || dst.leftPressed || dst.rightPressed) ? 1 : 0;
  prev.left = src.left; prev.right = src.right; prev.up = src.up;
  prev.down = src.down; prev.action = src.action;
}

function pollInput(){
  pollGamepad();

  /* --- what the human is doing, always --- */
  var US = {
    left:  (Raw.left  || TouchIn.left  || PadIn.left)  ? 1 : 0,
    right: (Raw.right || TouchIn.right || PadIn.right) ? 1 : 0,
    up:    (Raw.up    || TouchIn.up    || PadIn.up)    ? 1 : 0,
    down:  (Raw.down  || TouchIn.down  || PadIn.down)  ? 1 : 0,
    action:(Raw.action|| TouchIn.action|| PadIn.action)? 1 : 0
  };
  copyWithEdges(UserIn, US, PrevUser);

  /* --- what the game reads --- */
  var src = null, prev = null;
  if (S.screen === SC.PLAY && S.attract){ src = AIIn; prev = PrevAI; }
  else if (S.screen === SC.PLAY && Replay.playing){ src = RepIn; prev = PrevRep; }

  if (src) copyWithEdges(Input, src, prev);
  else {
    Input.left = UserIn.left; Input.right = UserIn.right;
    Input.up = UserIn.up; Input.down = UserIn.down; Input.action = UserIn.action;
    Input.leftPressed = UserIn.leftPressed; Input.rightPressed = UserIn.rightPressed;
    Input.upPressed = UserIn.upPressed; Input.downPressed = UserIn.downPressed;
    Input.actionPressed = UserIn.actionPressed;
    Input.jumpPressed = UserIn.jumpPressed; Input.anyPressed = UserIn.anyPressed;
  }
  Input.pause = (Raw.pause || TouchIn.pause || PadIn.pause) ? 1 : 0;

  /* --- replay recorder --- */
  if (Replay.recording && S.screen === SC.PLAY && !S.attract){
    if (Replay.frames.length < Replay.maxFrames){
      Replay.frames.push(
        (UserIn.left ? 1 : 0) | (UserIn.right ? 2 : 0) | (UserIn.up ? 4 : 0) |
        (UserIn.down ? 8 : 0) | (UserIn.action ? 16 : 0)
      );
    }
  }
}

/* ---------- replay ---------- */
var Replay = { recording: false, playing: false, frames: [], maxFrames: 60 * 150, idx: 0 };
function replayReset(){ Replay.frames = []; Replay.idx = 0; }
function replayStartRecord(){ replayReset(); Replay.recording = true; Replay.playing = false; }
function replayStopRecord(){ Replay.recording = false; }
function replayStartPlayback(){
  if (!Replay.frames.length) return false;
  Replay.playing = true; Replay.recording = false; Replay.idx = 0;
  RepIn.left = RepIn.right = RepIn.up = RepIn.down = RepIn.action = 0;
  PrevRep.left = PrevRep.right = PrevRep.up = PrevRep.down = PrevRep.action = 0;
  return true;
}
function replayStep(){
  if (!Replay.playing) return;
  if (Replay.idx >= Replay.frames.length){ Replay.playing = false; return; }
  var b = Replay.frames[Replay.idx++];
  RepIn.left = b & 1; RepIn.right = b & 2; RepIn.up = b & 4;
  RepIn.down = b & 8; RepIn.action = b & 16;
}
function replayProgress(){
  return Replay.frames.length ? clamp(Replay.idx / Replay.frames.length, 0, 1) : 0;
}
