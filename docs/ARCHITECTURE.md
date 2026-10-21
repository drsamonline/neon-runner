# Architecture

The game ships as a single HTML file, but it is authored as sixteen modules
that are concatenated in a fixed order into one `<script>`. There is no module
system, no bundler and no build-time transformation of the source — the modules
share one scope and call each other directly.

---

## Why concatenation instead of ES modules

The shipped file must work from `file://`. ES modules do not: a `file://` page
loading `<script type="module">` hits CORS restrictions in every major browser.
Classic scripts in a single file are the only form that reliably works by
double-clicking.

The cost is that everything shares one scope, which is why the module order
below matters and why naming discipline matters more than usual.

---

## Build order

`tools/build.js` concatenates these in order. The order is load order: a module
may only reference something defined earlier, unless it is inside a function
that runs later.

| # | Module | Responsibility |
| --: | :-- | :-- |
| 00 | `00_head.html` | Document shell, CSS, the `#c` canvas and touch pads |
| 10 | `10_core.js` | Constants, seeded RNG, storage, settings, palettes, difficulty table |
| 20 | `20_audio.js` | Web Audio setup, procedural SFX, the step sequencer and music progressions |
| 25 | `25_sprites.js` | Sprite cache and the pixel art for player, enemies, bosses, pickups |
| 26 | `26_icons.js` | The icon set used by cards, menus, codex and HUD |
| 30 | `30_input.js` | Keyboard, touch, gamepad, rebinding, and the replay recorder |
| 35 | `35_content.js` | All game data: cards, weapons, enemy definitions, hazards, bosses, pilots, modifiers, stages, achievements |
| 40 | `40_render.js` | Responsive canvas, text helpers, parallax background, post-processing |
| 45 | `45_fx.js` | Weather, ground decals, threat arrows, damage numbers, captions |
| 50 | `50_world.js` | Platform and hazard generation, the doom wall, the spawn director |
| 60 | `60_entities.js` | Player, enemies, bosses, bullets, pickups, companions |
| 70 | `70_systems.js` | Run lifecycle, modes, achievements, career stats, the gameplay step |
| 80 | `80_ui.js` | World rendering, HUD, the menu framework, title/pause/death screens |
| 85 | `85_screens.js` | Codex, achievements, career, run history, loadout, practice range |
| 90 | `90_loop.js` | Fixed-timestep loop, boot, replay storage, save codes, photo mode |
| 99 | `99_tail.html` | Closing tags |

A `/*NEON_HOOK*/` marker sits just before the IIFE closes in `90_loop.js`. The
audit harnesses and the minifier both inject at that marker, which is why it
survives minification being turned off for it.

---

## The loop

```
requestAnimationFrame(t)
  └─ accumulate real elapsed time
     └─ while (acc >= STEP)          STEP = 1/60s
          ├─ fixedStep(dt)           all simulation
          └─ acc -= STEP             (max 5 steps per frame, then clamp)
  └─ render()                        all drawing, once per frame
```

Simulation is fixed-rate and drawing is variable-rate. That separation is what
makes the game deterministic: given the same seed and the same input log, the
simulation produces identical results regardless of frame rate.

`fixedStep` runs in a fixed order that matters:

1. Input sampling and edge detection
2. Global timers, hit-stop, slow-motion
3. The doom wall
4. `computeZones()` — ice, conveyor and low-gravity zones the player is inside
5. `updatePlayer()`
6. `updateEnemies()`
7. `updateBullets()`
8. `updatePickups()`, `updateShells()`, `updateShockwaves()`, `updateEffects()`
9. `updateDecals()`, `updateCaption()`
10. `spawnDirector()`
11. Collision passes, score, and the death check

Zones must be computed before the player moves, because they modify the
player's physics in the same step. Anything that modifies the player must run
before `updatePlayer`.

---

## Determinism

`10_core.js` provides `mulberry32` behind `srand(seed)` and `rng()`. Every
gameplay random draw goes through `rng()` — platform placement, hazard choice,
enemy selection, weapon rarity, boss attack patterns.

Nothing gameplay-relevant reads the wall clock, `Math.random`, or the frame
rate. That is what allows:

- **Seeded runs** — Daily and Weekly modes hand every player the same seed.
- **Replays** — a run is stored as a seed plus one byte of input per frame,
  base64-encoded. Playback re-seeds and feeds the recorded input back in.
- **Reproducible tests** — the harnesses can assert on exact outcomes.

---

## Rendering

`40_render.js` maintains a logical resolution (`VW` × `VH`) derived from the
viewport. Landscape screens fix the height and derive the width; portrait
screens fix the width and derive the height. All layout maths uses `VW`/`VH`
and `uiScale()`, never hardcoded pixels, which is why the game fills any screen
without letterboxing.

Every sprite and icon is rendered once into an offscreen canvas and cached, then
blitted with `drawImage`. The cache key includes the palette, so switching
palettes invalidates it wholesale via `clearSpriteCache()`.

Post-processing (bloom, CRT curvature, scanlines, vignette) draws into an
offscreen buffer and composites once. Each effect is individually toggleable
and the whole chain is skipped on low quality or when reduced motion is on.

---

## Content versus logic

All tunable data lives in `35_content.js` and nothing else:

```
CARDS       40 upgrades, each with an apply() that mutates the player
WEAPONS     10 weapons, each a row of numbers plus a bullet kind
ENEMY_DEF   one row per enemy type: size, HP, points, air/ground, codex text
HAZARDS     hazard names and codex text
BOSSES      4 bosses: HP, icon, codex text
PILOTS      4 pilots: stat modifiers and starting weapon
MODIFIERS   8 run modifiers with score multipliers
STAGES      10 campaign stages
ACHIEVEMENTS  30 definitions, each with a check(run, career) predicate
```

Behaviours live in `60_entities.js` (enemies, bosses), `50_world.js` (spawning)
and `70_systems.js` (modes). Adding an enemy means a row in `ENEMY_DEF`, a
`case` in the enemy update switch, a `case` in the sprite switch, and a weight
in the biome tables. The audit harness will exercise it automatically, because
it iterates `Object.keys(ENEMY_DEF)`.

---

## State

Three globals hold everything:

| Global | Lifetime | Contents |
| :-- | :-- | :-- |
| `S` | one run | score, time, mode, difficulty, spawn timers, cards offered |
| `P` | one run | the player: position, velocity, HP, weapon, stats, companions |
| `Meta` | forever | scrap, workshop upgrades, achievements, career totals, history, loadout |

`S` and `P` are rebuilt by `beginRun()`. `Meta` is loaded from `localStorage`
at boot and written by `saveMeta()`.

`Settings` and `Keys` persist separately. Everything is plain JSON — there is
no serialisation framework and no schema versioning beyond a `v` field in the
export blob.

---

## Offline guarantees

There is no networking code anywhere in the bundle. No `fetch`, no
`XMLHttpRequest`, no `WebSocket`, no `EventSource`, no `sendBeacon`, no service
worker, no external resource of any kind. This is enforced by convention, and
verified by grep in the release checklist.

The PWA manifest is generated at runtime as a Blob URL, so even that is not a
network fetch.
