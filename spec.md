# Rock Em Sock Em

## Current State
The game has four difficulty modes (easy, medium, hard, extreme) and a boss fight unlocked after 10 extreme wins. Beating extreme mode grants +1 bonus health point, saved to localStorage. The player's robot (P1) always renders in red; the boss robot renders in purple.

## Requested Changes (Diff)

### Add
- A `bossDefeated` boolean flag stored in `localStorage` that is set to `true` when the player beats the boss (P1 wins in boss mode).
- A "black" color scheme for the P1 robot that is used when `bossDefeated` is `true`. Black robot uses near-black body colors with a subtle white/silver glow instead of the default red.
- A victory announcement on the KO overlay when beating the boss that includes "COLOR UNLOCKED: BLACK ROBOT" to make the reward clear to the player.

### Modify
- `App.tsx`: Read `bossDefeated` from `localStorage` on mount. When the game ends with `winner === "p1"` and `gameMode === "boss"`, set `bossDefeated = true` in both state and `localStorage`.
- `RobotBoxer.tsx`: Accept a new optional `isBlack?: boolean` prop. When true, apply a black/dark steel color palette (body near-black oklch ~0.15, accents silver/white) instead of the default red.
- Pass `isBlack={bossDefeated}` to the P1 `<RobotBoxer>` instance in `App.tsx`.

### Remove
- Nothing removed.

## Implementation Plan
1. In `App.tsx`, add `getStoredBossDefeated()` helper reading `localStorage.getItem("bossDefeated")`.
2. Add `bossDefeated` state initialized from `getStoredBossDefeated`.
3. In the KO trigger logic, after setting `gamePhase("ko")`, if `attacker === "p1"` and `currentModeNow === "boss"`, persist and set `bossDefeated = true`.
4. Add a "BLACK ROBOT UNLOCKED!" announcement panel to the KO overlay, shown when `winner === "p1" && gameMode === "boss"`, similar to the boss-unlock panel.
5. In `RobotBoxer.tsx`, add `isBlack?: boolean` prop; compute alternate near-black color variables when `isBlack` is true. Apply to all body, arm, leg, and glow colors.
6. Pass `isBlack={bossDefeated}` to the P1 `<RobotBoxer>` in App.tsx.
