# Changelog

All notable changes to this project. Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/);
versioning follows [Semantic Versioning](https://semver.org/).

## [3.0.1] — 2026-10-21

### Fixed

- **No sound when playing with the keyboard.** The audio context was only
  unlocked by a click or tap, never by a keypress — so a desktop player who
  never touched the mouse got a silent game. Browsers require a user gesture
  before audio may start, and a keypress is a valid gesture; the keydown
  handler now unlocks audio like every other input path. Covered by a new
  assertion that fails against the previous build.
- **"Press any key" only accepted about ten keys.** The boot screen advanced on
  any *bound* action, so pressing an unbound letter did nothing and the game
  looked unresponsive on desktop. Any key at all now starts it.
- **Keyboard did not work on some layouts or browsers.** Keys were read only
  from `e.code`. There is now a fallback chain to `e.key` and `e.keyCode`, so
  exotic layouts and older browsers register instead of silently ignoring you.
- **Browser shortcuts were being swallowed.** `Ctrl`/`Cmd`/`Alt` combinations
  are now passed straight through, so `Ctrl+R` and friends still work.
- **The `back` icon did not exist.** Menu rows that used it rendered an empty
  grey box. Added, along with the missing `cool` card icon.
- **Boss codex icons used the wrong sprite signature** and only ever drew the
  mech. All four bosses now render their own art in the codex.

### Added

- **A CONTROLS screen**, reachable from the title screen and the pause menu,
  listing every action with its current keys and letting you rebind inline.
- **Live key bindings on the boot screen**, read from your saved bindings, so
  rebinding is reflected before you start.
- **Explicit audio-state feedback.** The boot screen says when sound is waiting
  for a gesture, and reports the audio state once it is running.
- **A keyboard diagnostic.** If no key reaches the page within five seconds,
  the boot screen says so and suggests clicking the page first, rather than
  looking broken.
- **The page grabs focus on load and on click**, so the first keypress lands on
  the game instead of the browser chrome.
- **Audio is now covered by the test suite.** The harnesses install a fake Web
  Audio implementation, so the sound path is exercised instead of skipped.

## [3.0.0] — 2026-10-21

The content and polish release. Everything below is offline; there is no
server component and no network access of any kind.

### Added

**Content**
- 11 new enemy types: Burrower, Roller, Sniper, Phalanx, Hive, Mimic, Healer
  Drone, Shield Drone, Tether Orb, Swarm Queen, Training Dummy (27 total).
- 3 new bosses: Sand Serpent, Siege Fortress (four destructible gun pods
  guarding a sealed core) and The Overlord (three forms), plus timed elites.
- 5 new weapons: Beam, Flamer, Boomerang, Minelayer, Arc (10 total).
- Weapon rarity tiers — COMMON through LEGENDARY, scaling damage ×1.0 to ×2.8.
- 24 new upgrade cards (40 total), including 12 build-defining rares such as
  Combat Drone, Orbital Guard, Execute, Berserk, Glass Cannon and Second Wind.
- 7 new hazards: Stalactite, Crusher, Conveyor, Launch Pad, Ice, Low Gravity,
  Acid (11 total), plus ice/conveyor/low-gravity environmental zones.
- 4 playable pilots with distinct stat profiles and starting weapons.
- 8 run modifiers with individual score multipliers.
- A 10-stage campaign, Boss Rush, Time Attack and a Practice Range.
- Daily and weekly seeded runs.

**Meta**
- Codex with 95 entries and discovery tracking across six categories.
- 30 achievements with a gallery.
- Career stats dashboard.
- Run history for the last 12 runs, with replay playback for the last 5.
- Save export/import as a copy-paste code.
- Photo mode (canvas → PNG download).

**Presentation**
- Per-biome music (five progressions) plus a distinct faster boss theme.
- Per-biome weather: rain, embers, snow, ash and dust.
- Persistent ground decals, off-screen threat arrows and damage numbers.
- Captions for important audio cues.
- A pixel-art icon set used by cards, menus, the codex and the HUD.
- Mode objective panel showing the live goal (countdown, stage progress,
  boss-rush progress).

**Accessibility and platform**
- Menus now scroll and keep the selection visible.
- Languages: English, Hindi and Gujarati, applied to every drawn string.
- Adjustable touch button size and opacity; left-handed layout.
- Auto-run mode, reduced motion, high-contrast and deuteranopia palettes.
- Inline PWA manifest for home-screen install.

### Changed

- **Rebalanced difficulty.** Enemy speeds reduced 15–20%, the lunge attack
  capped below player run speed, the difficulty ramp slowed, the spawn
  interval floor roughly doubled, hazard spacing widened by ~45%, and
  concurrent enemies hard-capped at 15. See `docs/BALANCE.md`.
- Menus now confirm on the action button only — previously the up arrow both
  navigated and confirmed.
- The gameplay HUD is hidden on menu screens.
- The title screen layout no longer overlaps its own subtitle.

### Fixed

- **Upgrade cards had no artwork.** They were text-only; every card now has an
  icon, and card height is computed from a wrapped-text pre-pass.
- **Menus overflowed the screen.** Settings had 20 rows and only ~11 fitted,
  so the lower half was invisible but still reachable with the arrow keys.
- **The HUD leaked over every menu**, showing hearts, heat and score bars on
  top of the settings, title, death and card screens.
- **Boss Rush never spawned a boss** — an early return sat above the boss
  timer, so it never counted down.
- **Tether orbs recursed infinitely** — spawning a pair spawned a pair spawned
  a pair.
- **The Siege Fortress's gun pods were indestructible** — the bullet collision
  code never checked them.
- **The player never fired at all.** The stat object was missing two fields, so
  the shot-count calculation evaluated to `NaN` and the firing loop never ran a
  single iteration. The gun built heat and looked busy while producing no
  bullets.
- `applyPilot` crashed on boot (parameter shadowed the player object).
- Platforms could spawn out of jump range. Tier heights are now bounded by the
  measured jump apex and verified geometrically in CI.
- Removed dead constants.

## [2.0.0] — 2026-10-20

### Added
- Responsive single-file build that fills any screen in any orientation.
- 16 enemy types, a three-phase boss, 5 weapons, 16 upgrade cards.
- Combo chains, graze-to-EMP, gun overheat, slide and stomp mechanics.
- Five biomes with procedural parallax, hazards and a doom wall.
- Local workshop meta-progression, attract-mode demo, adaptive chiptune.
- Replays (seeded RNG + input log), rebindable keys, gamepad support.
- Accessibility suite: reduced motion, three palettes, text scaling,
  screen-reader announcements.
- A headless audit harness that drives the real loop with a stubbed DOM.

### Fixed
- Jump reachability: tier-1 platforms are now within the measured jump apex.

## [1.0.0] — 2026-10-20

### Added
- Initial release: an auto-fire side-scrolling shooter with three controls.
- Score, best score, three hearts, procedural platforms and parallax.
- Title, pause and game-over screens.
