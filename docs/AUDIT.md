# Audit

What the test suites actually check, why they are written this way, and what
they cannot tell you.

---

## The problem

This is a browser game. CI has no browser, no GPU and no user. The things that
normally catch bugs — a human clicking around, a visual diff, a DOM assertion —
are all unavailable.

So the tests do the next best thing: they **run the real game loop headlessly**
against a stubbed `document`, `window` and canvas, and drive it with synthetic
input. The game code is not modified, mocked or partially loaded. It is the
same bundle that ships, evaluated in a fake browser.

```
tests/harness-core.js    the game itself: gameplay, screens, input, persistence
tests/harness-audit.js   the content: every card, weapon, enemy, boss, mode
```

---

## How the harness is built

The stubs are deliberately minimal but complete enough that the game cannot
tell the difference:

- `document.getElementById` returns a fake canvas whose `getContext('2d')`
  returns a Proxy that accepts every draw call and returns plausible values for
  the handful that return anything (`measureText`, `createLinearGradient`, …).
- `requestAnimationFrame` is captured rather than scheduled, so the test drives
  the loop one frame at a time at a fixed 16.7 ms tick.
- `localStorage` is a plain object, so persistence can be inspected directly.
- `AudioContext` is absent, so the audio layer degrades exactly as it does on a
  browser without Web Audio.

Input is injected through the same `keydown`/`keyup` listeners the real page
uses — nothing reaches into game internals to move the player.

---

## The hook, and why it is injected before minification

To assert on game state, the harnesses need to read `S`, `P`, `enemies` and so
on. Those live inside an IIFE and are invisible from outside.

The hook is a small block that assigns them to `global.__G`. Critically, it is
injected into the source **before** terser runs. Terser therefore sees the hook
as part of the bundle and renames its references consistently with everything
else — so the hook still works in the minified output.

That is what makes `npm run audit:minified` possible, and it is the single most
valuable test here: it is the only thing standing between a bad `mangle` pass
and a shipped bug. Minifiers do occasionally change semantics, and a game is
exactly the kind of code where that hides until a player finds it.

```
tools/minify.js  ->  build/game.hook.min.js   (minified + hook, never shipped)
                     build/game.min.js        (minified, shipped)
```

---

## What the core harness asserts

**Boot and attract mode** — the game starts on the boot screen, a key press
starts the attract demo, the demo spawns enemies and scores kills on its own.

**Platform reachability** — for every generated platform, either it is within
the measured jump apex of the ground, or another platform is within the apex
below it and within horizontal jump distance. Run over ~2,000 platforms as the
camera advances, with culled platforms excluded. This is the test that caught
platforms spawning 280 px up when the jump apex is 153 px.

**Geometry of the duck rule** — numeric, not visual: a turret laser at standing
chest height must overlap a standing player and must not overlap a ducking one.
Same for laser gates. If someone retunes the player's duck height, this fails.

**Gameplay under input** — kills accumulate, score accumulates, roguelite cards
appear, enemy pressure is sustained, the death/restart cycle works.

**Boss encounters** — a boss spawns, closes to firing range, advances phases and
can be defeated.

**Menus** — pause opens and closes, settings opens from the title and from
pause, sliders adjust and persist, Escape goes back, palette swaps rebuild the
sprite cache, the rebind screen captures a new key and that key then moves the
player.

**Death, scores, replay** — death is reachable, a replay is recorded, initials
are committed to the table and persisted, a replay plays back and advances.

**Responsive layout** — eight viewports from 320×480 to 2560×1080 must all
produce sane `VW`/`VH`/`GROUND_Y`.

**Soak** — 12,000 frames of continuous play with mixed input.

**Edge cases** — every key held at once, all 16 enemy types spawned
simultaneously, the EMP fired, extreme score and level values.

---

## What the audit harness adds

**All 40 cards** are applied in isolation; each must not throw, and each must
have an id, icon, tier and description. Ids must be unique.

**All 10 weapons** are fired in isolation.

**All 27 enemy types** spawn and run for 600 frames each.

**All 11 hazards** update without error.

**All 4 bosses** are fought to a conclusion with a buffed player, including
checking that the Siege Fortress actually has four gun pods.

**All 4 pilots, 8 modifiers and 5 game modes**, including loading all 10
campaign stages and verifying the stage definition is applied.

**Time attack expiry** and **campaign stage completion** reach a finished run.

**Achievements** — with a saturated career record and a synthetic run summary,
at least 20 of the 30 must unlock, and every definition must be well-formed.

**Codex** — every category builds, every entry has a name, icon and info string.

**Replay round-trip** — encode then decode must reproduce the original input
bytes exactly.

**Save codes** — meta state survives an export/import cycle.

**All 14 screens** render without throwing.

**All three languages** render.

**Every accessibility toggle** is run in both states, plus three palettes, four
text scales and three quality levels.

**Soak across all modes × all pilots** — 18,000 frames.

**Platform reachability** again, on the current balance numbers.

---

## What these tests cannot tell you

Being explicit about this matters more than the green ticks.

- **They cannot tell you whether the game is fun.** They assert that systems
  function, not that they are enjoyable.
- **They cannot tell you whether the difficulty is right.** The balance probe
  uses a scripted player that is much worse than a human. It is a comparison
  tool, not a playtest.
- **They cannot see.** The stubbed canvas swallows every draw call. A screen
  could render entirely off-screen and every assertion would still pass.
- **They cannot catch audio problems** — the audio layer is inert in Node.
- **They do not test real browser APIs.** `localStorage` quotas, `AudioContext`
  autoplay policy, `requestFullscreen`, haptics and PWA install all behave
  differently in a real browser.

### The visual gap, and how it was closed

Because the harnesses are blind, a separate tool was built:
`tools/frame-capture.js` records the actual sequence of canvas draw calls for a
single frame — including nested sprite and icon draws, with their transforms —
and `tools/rasterize.py` replays them into a PNG.

That is how the UI was checked during development, and it earned its keep: it
found that menus overflowed the viewport with no scrolling, that the title
screen's subtitle was drawn on top of its own logo, that the HUD leaked over
menu screens, and that upgrade cards had no artwork at all. None of those would
have been caught by an assertion.

It has known limits: it cannot reproduce radial gradients or additive blending
faithfully, so glow effects appear as flat blocks in captures. Layout, text and
sprites are accurate.

```bash
node tools/frame-capture.js card     # record a frame
python3 tools/rasterize.py card      # -> shot_card.png
```

---

## Running it

```bash
npm test                    # build + core harness + audit, on the readable build
npm run audit:minified      # the same suites, on the minified bundle
npm run balance             # survival across modes and difficulties
npm run speeds              # enemy speed and trap density vs. the player
```

CI runs all of the above on every push and pull request, and uploads the built
game as an artifact.
