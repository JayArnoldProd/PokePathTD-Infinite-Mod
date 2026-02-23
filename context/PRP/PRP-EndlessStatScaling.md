# PRP: Endless Stat Scaling — Sync Actual Stats with Preview

## Problem Statement

Past level 100, the level-up preview (green text on hover) shows stat gains for critical rate and range using asymptotic/logarithmic formulas, but the **actual `updateStats()` in Pokemon.js uses plain linear formulas** that don't match. This means:

1. **Critical rate**: Pokemon with `critical.scale = 0` (e.g., Chatot: `{base: 4.4, scale: 0}`) show a green `(+0.7%)` in the preview, but their actual crit stays at 4.4% forever. The preview lies.
2. **Range**: Preview uses logarithmic scaling (`1x at 100, 3x at 1000`), but actual range is just `base + scale * level` — linear forever.

The **preview formulas are already correct and well-designed**. The fix is simply to use them in `updateStats()` too.

## Root Cause

```
PokemonScene.js (PREVIEW — correct):
├── calculatePreviewCrit()    → asymptotic approach to 100%, works for scale=0
├── calculatePreviewRange()   → logarithmic scaling past 100
└── calculatePreviewSpeed()   → asymptotic decay (already synced)

Pokemon.js (ACTUAL STATS — broken):
├── this.critical = base + (scale * level)     ← linear, ignores endless scaling
├── this.range = floor(base + (scale * level)) ← linear, ignores endless scaling  
└── this.speed = calculateAsymptoticSpeed()    ← already uses asymptotic ✅
```

Speed was already fixed (asymptotic). Critical and range were missed.

## Files to Modify

| File | Change |
|------|--------|
| `Pokemon.js` (~line 313) | Add `calculateEndlessCrit()` and `calculateEndlessRange()` methods, use in `updateStats()` and `setStatsLevel()` |
| `PokemonScene.js` (no changes needed) | Preview formulas are already correct — they become the reference |

## Implementation

### Pokemon.js — Add endless scaling methods

Add two new methods (mirroring the preview functions in PokemonScene.js):

```javascript
// Add after calculateAsymptoticSpeed() method

calculateEndlessCrit(base, scale, level) {
    if (level <= 100) {
        return base + (scale * level);
    }
    const critAt100 = base + (scale * 100);
    // Asymptotic approach to 100%: every 100 levels past 100, close 50% of gap
    const periods = (level - 100) / 100;
    const remainingGap = (100 - critAt100) * Math.pow(0.5, periods);
    return 100 - remainingGap;
}

calculateEndlessRange(base, scale, level) {
    const baseRange = Math.floor(base + (scale * level));
    if (level <= 100) {
        return baseRange;
    }
    // Logarithmic scaling: 1x at 100, 3x at 1000
    const scaleFactor = 2 / Math.log2(10); // ~0.602
    const rangeMultiplier = 1 + Math.log2(level / 100) * scaleFactor;
    return Math.floor(baseRange * rangeMultiplier);
}
```

### Pokemon.js — Update `updateStats()` and `setStatsLevel()`

Replace the linear critical/range lines:

```javascript
// BEFORE (in both updateStats and setStatsLevel):
this.range = Math.floor(this.specie.range.base + (this.specie.range.scale * level));
this.critical = this.specie.critical.base + (this.specie.critical.scale * level);

// AFTER:
this.range = this.calculateEndlessRange(this.specie.range.base, this.specie.range.scale, level);
this.critical = this.calculateEndlessCrit(this.specie.critical.base, this.specie.critical.scale, level);
```

Also update the `transformADN()` block (~line 363) which has the same linear formulas.

## Behavior

### Critical Rate (scale = 0 Pokemon like Chatot)
| Level | Before (broken) | After (fixed) |
|-------|-----------------|---------------|
| 100 | 4.4% | 4.4% |
| 200 | 4.4% | 52.2% |
| 300 | 4.4% | 76.1% |
| 500 | 4.4% | 92.8% |
| 1000 | 4.4% | 99.5% |

### Critical Rate (scale > 0 Pokemon, e.g., base=2, scale=0.3)
| Level | Before | After |
|-------|--------|-------|
| 100 | 32% | 32% |
| 200 | 62% | 66% |
| 500 | 152% (broken) | 96.6% |

The asymptotic formula naturally prevents crit from exceeding 100%, which is better behavior than linear.

### Range (all Pokemon)
| Level | Linear (before) | Log-scaled (after) |
|-------|-----------------|-------------------|
| 100 | 441 | 441 |
| 200 | 781 | 1093 |
| 500 | 1801 | 3494 |
| 1000 | 3501 | 10503 |

Range grows meaningfully in endless but doesn't explode linearly.

## Known Gotchas

1. **Levels 1-100 are completely unchanged** — all formulas gate on `level <= 100` and use vanilla math below that threshold
2. **Speed is already handled** — `calculateAsymptoticSpeed()` exists and is used in `updateStats()`. Don't touch it.
3. **`setStatsLevel()` must also be updated** — used by challenge mode level caps
4. **`transformADN()` has a third copy** of the stat formulas (~line 363) — must update that too
5. **These are the SAME formulas** already in `PokemonScene.js` (`calculatePreviewCrit`, `calculatePreviewRange`) — we're just adding them to `Pokemon.js` so actual stats match the preview

## Where to Apply

This is an **inline patch** in `apply_mods.py`, NOT a full file replacement. Pokemon.js already has several inline patches (speed scaling, level cap removal, cost formula). Add a new function `apply_endless_crit_range()` in the mod features.

## Testing Strategy

1. Pick Chatot (crit scale = 0), level past 100 — verify crit actually increases and matches the green preview text
2. Pick a normal Pokemon (crit scale > 0), level past 100 — verify crit approaches but never exceeds 100%
3. Verify range scales logarithmically past 100 for any Pokemon
4. Verify levels 1-100 are identical to vanilla behavior
5. Verify challenge mode level caps still work (`setStatsLevel`)

## Success Criteria

- [ ] Green preview text matches actual stat changes for ALL Pokemon past level 100
- [ ] Crit asymptotically approaches 100% (never exceeds)
- [ ] Range scales logarithmically (meaningful growth without explosion)
- [ ] No changes to levels 1-100 behavior
- [ ] `updateStats()`, `setStatsLevel()`, and `transformADN()` all use the same formulas
