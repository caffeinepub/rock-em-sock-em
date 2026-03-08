# Rock Em Sock Em

## Current State
- Four difficulty modes: Easy, Medium, Hard, Extreme (controls AI punch interval)
- VS CPU & 2-Player modes; Boss Fight mode unlocked after 10 Extreme wins
- Boss 1: deals 2x damage, takes 10 hits to KO, uses Extreme AI speed, scaled-up purple robot
- Player wins Extreme mode → +1 bonus health (persists via localStorage), +1 extremeWins
- Defeating Boss 1 unlocks black robot color for player
- MAX_HITS = 5 (base), BOSS_MAX_HITS = 10
- Difficulty intervals: Easy 2000–3000ms, Medium 1200–2000ms, Hard 600–1000ms, Extreme 300–600ms

## Requested Changes (Diff)

### Add
- **Second Boss Fight ("Boss 2")**: unlocked after defeating Boss 1. Accessible as a separate button "💀 BOSS 2" in the menu (only shown after bossDefeated === true).
- Boss 2 stats: 4x damage per hit (double Boss 1's 2x), takes 20 hits to KO (double Boss 1's 10), AI punch interval is half of Boss 1's Extreme speed (minInterval: 150ms, maxInterval: 300ms).
- Boss 2 visual: giant orange/gold robot with its own distinct color scheme, scaled to 2.2x (vs Boss 1's 1.6x).
- Boss 2 win text: "YOU DEFEATED BOSS 2!" / lose text: "BOSS 2 WINS!"
- Defeating Boss 2 unlocks a gold robot color for player (persisted in localStorage as "goldRobot").
- Show "GOLD ROBOT UNLOCKED!" announcement on the KO screen when Boss 2 is first defeated.
- New constant BOSS2_MAX_HITS = 20.
- New localStorage key "boss2Defeated" and state `boss2Defeated` / `showGoldUnlock`.
- New gameMode value: "boss2".

### Modify
- **Make ALL difficulties harder** (reduce all AI punch intervals):
  - Easy: 1200–2000ms (was 2000–3000ms)
  - Medium: 700–1200ms (was 1200–2000ms)
  - Hard: 350–600ms (was 600–1000ms)
  - Extreme: 150–300ms (was 300–600ms)
- **Boss 1 AI speed** also increases to match new Extreme (150–300ms).
- Boss 2 button only shown when `bossDefeated === true`.
- p2MaxHits logic: `gameMode === "boss2" ? BOSS2_MAX_HITS : gameMode === "boss" ? BOSS_MAX_HITS : MAX_HITS`.
- Damage: Boss 2 (p2 attacker) deals 4 damage per hit; Boss 1 stays at 2.
- KO text logic updated for boss2 mode.
- Menu warning text updated for boss2 mode: "⚠ BOSS 2 DEALS 4× DAMAGE · TAKES 20 HITS TO KO".
- scheduleAI: boss2 uses { minInterval: 150, maxInterval: 300 }.
- isKO_p2 check uses updated p2MaxHits.
- RobotBoxer component: add `isBoss2` prop; when true use orange/gold color scheme and scale 2.2x.

### Remove
- Nothing removed.

## Implementation Plan
1. Add BOSS2_MAX_HITS = 20 constant and "boss2" to GameMode type.
2. Add `DIFFICULTY_CONFIG` entries update (tighten all four intervals).
3. Add Boss 2 AI config constant: `{ minInterval: 150, maxInterval: 300 }`.
4. Add `boss2Defeated` / `showGoldUnlock` state and localStorage helpers.
5. Update `triggerPunch`: damage = boss2 attacker → 4, boss attacker → 2, else 1.
6. Update `p2MaxHits` derived value and `isKO_p2`.
7. Update `scheduleAI` to handle boss2 mode.
8. Update `koText` logic for boss2 win/lose messages.
9. Add boss2 defeat reward: set `boss2Defeated`, `showGoldUnlock`, persist "boss2Defeated".
10. Add "BOSS 2" button in menu (visible only when bossDefeated).
11. Add boss2 mode warning text in menu.
12. Add gold unlock announcement in KO overlay.
13. Update score display for boss2 label ("BOSS 2").
14. Update RobotBoxer: add `isBoss2` prop with orange/gold palette and scale 2.2x.
15. Pass `isBoss2`, `isGold` props to RobotBoxer in App.tsx.
16. Apply `isGold` robot color to player robot when boss2 is defeated (gold skin unlock).
