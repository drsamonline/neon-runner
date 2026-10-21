# Balance

Tuning notes and the numbers behind them. Everything here is measured by
`tests/speed-probe.js` and `tests/balance-probe.js`, not estimated by hand.

---

## The design constraint

The player runs at **300 px/s** and a full-hold jump lifts them **153 px**
(`JUMP_APEX = JUMP_V² / 2·GRAV`). Those two numbers bound almost every
decision below.

The rule that matters most: **nothing may outrun the player.** This is not a
chase game. If an enemy moves faster than you can retreat, you lose the ability
to reposition, and repositioning is the entire skill of the game — the gun aims
itself, so movement is the only lever you have.

---

## Enemy speeds

Measured top speed at three difficulty points, against a 300 px/s player.

| Enemy | d=0.0 | d=1.4 | d=2.8 | vs player |
| :-- | --: | --: | --: | --: |
| Crawler | 76 | 76 | 76 | 25% |
| Spiked | 76 | 76 | 76 | 25% |
| Splitter | 84 | 84 | 84 | 28% |
| Armored | 58 | 58 | 58 | 19% |
| Burrower | 62 | 62 | 62 | 21% |
| Queen | 43 | 43 | 43 | 14% |
| Carrier | 53 | 53 | 53 | 18% |
| Bomber | 86 | 86 | 86 | 29% |
| Flyer | 98 | 99 | 98 | 33% |
| Hovergun | 120 | 120 | 120 | 40% |
| Jumper (hop) | 142 | 142 | 142 | 47% |
| Darter (dive) | 127 | 179 | 185 | 62% |
| Roller | 150 | 181 | 212 | **71%** |

`d` is the difficulty scalar: `min(2.3, t/58) + min(0.7, score/42000)`, capped
at 2.8. Time is the main driver; score only nudges it along.

### Notes on the outliers

- **Roller (71%)** is the fastest thing in the game and the only enemy that
  cannot be stomped. It was originally at 91% of player speed, which made it a
  guaranteed hit rather than a threat — you could not outrun it and you could
  not jump on it. It is now slow enough to escape and fast enough to matter.
- **Darter (62%)** is a one-shot dive with a fixed trajectory, so its speed is
  a reaction test rather than a chase. It does not home.
- **Lunge attack** — crawlers, spikeds and splitters telegraph for 0.46s, then
  dash at `min(332, 272 × difficultySpeed)`. The cap means that even on
  NIGHTMARE, a running player stays marginally ahead of the dash. Before the
  cap, NIGHTMARE lunges hit 395 px/s and were unavoidable.
- **Ground enemies (19–28%)** are deliberately slow. They are obstacles to be
  jumped, not chases to be won.

---

## Trap density

Hazards are placed every `900 + rand(0..1250)` world pixels, capped at 9 alive
at once.

| Difficulty | Traps per 1,000 px |
| :-- | --: |
| ASSIST | ~1.2 |
| NORMAL | ~1.8 |
| HARD | ~1.6 |
| NIGHTMARE | ~0.6 |

(Sampling noise is real at this sample size — the spacing is uniform across
difficulties; the variance is which hazard types a biome rolls.)

For scale, the original spacing was `520 + rand(0..820)`, roughly **1.9 traps
per 1,000 px** on average. Widening it by ~45% was the single biggest
difficulty reduction in the 3.0 rebalance.

---

## Spawn pressure

```
interval = max(0.55, 1.30 − difficulty × 0.24)
         × rand(0.80 .. 1.35)
         × difficultyModifier      (0.62 ASSIST .. 1.30 NIGHTMARE)
         × runModifier             (SWARM halves this)
         × stageModifier           (campaign stages only)
```

Two safeguards sit on top:

- **Concurrent cap.** Spawning pauses above 15 live enemies (8 in Boss Rush,
  22 in Practice). A bad RNG streak can no longer snowball into an unplayable
  screen.
- **Interval floor.** The old floor was 0.26s — about 3.8 spawns per second at
  high difficulty. It is now 0.55s, roughly halving peak pressure.

---

## Difficulty ramp

| | Before | After |
| :-- | :-- | :-- |
| Time term | `min(3.0, t/42)` | `min(2.3, t/58)` |
| Score term | `min(1.0, score/26000)` | `min(0.7, score/42000)` |
| Cap | 3.4 | 2.8 |

The ramp now takes ~2 minutes longer to reach its ceiling and tops out lower.
Because enemy speed scales with `(1 + difficulty × 0.14)` — down from `0.22` —
the ceiling itself is also gentler.

---

## Survival probe

A scripted player that dodges traps, jumps approaching enemies and ducks
incoming fire, run for up to 180s per configuration:

| Mode | Difficulty | Survived | Peak enemies |
| :-- | :-- | --: | --: |
| Endless | ASSIST | 35s | 10 |
| Endless | NORMAL | 22s | 4 |
| Endless | HARD | 42s | 6 |
| Endless | NIGHTMARE | 23s | 7 |
| Campaign | ASSIST | 59s | 9 |
| Campaign | NORMAL | 72s | 8 |
| Campaign | HARD | 72s | 7 |
| Campaign | NIGHTMARE | 34s | 7 |
| Practice | any | 180s (no damage) | 19–28 |

**Read this table with caution.** The scripted player is deliberately simple:
it reacts only to immediate threats, never retreats strategically, takes the
first card offered, and does not use the EMP deliberately. A human who plans
will comfortably outperform it. The numbers are useful for *comparing*
configurations, not for predicting human survival.

The clearest signal from the rebalance is NIGHTMARE: **8s → 23s** average
survival for the same scripted player, with no change to the script.

---

## If you want to retune

All the constants live in two places:

| File | What is in it |
| :-- | :-- |
| `src/10_core.js` | `GRAV`, `MOVE`, `JUMP_V`, `RANGE_BASE`, `OVERHEAT_*`, `COMBO_WINDOW`, `DIFFS[]` |
| `src/60_entities.js` | per-enemy speeds, fire cadences, the lunge cap |
| `src/50_world.js` | spawn interval, concurrent cap, hazard spacing |
| `src/70_systems.js` | the difficulty ramp |

After changing anything, run:

```bash
npm run speeds     # nothing should exceed ~75% of player speed
npm run balance    # compare survival across difficulties
npm test           # make sure nothing broke
```

Include the before/after tables in your PR — the probes are the only playtest
CI can perform.
