# Rock Em Sock Em

## Current State
- 2-player or VS CPU boxing game
- Single difficulty level: AI punches every 800–1500ms, player needs 5 hits to KO
- Win counter tracked locally
- RobotBoxer component renders SVG-style robots with health pips
- No difficulty selection, no boss fight, no progression system

## Requested Changes (Diff)

### Add
- Difficulty selector: Easy, Medium, Hard, Extreme (VS CPU mode only)
- Each difficulty changes AI punch speed and/or number of hits needed to KO:
  - Easy: AI punches every 2000–3000ms, 5 hits to KO opponent
  - Medium: AI punches every 1200–2000ms, 5 hits to KO
  - Hard: AI punches every 600–1000ms, 5 hits to KO
  - Extreme: AI punches every 300–600ms, 5 hits to KO
- Extreme wins counter (persisted in localStorage): tracks how many times the player has beaten Extreme mode
- Boss fight unlock: after 10 Extreme wins, a "BOSS FIGHT" mode is unlocked in the menu
- Boss fight mechanics:
  - Boss robot is larger (2x scale visual)
  - Boss does double damage (each boss punch counts as 2 hits)
  - Boss takes 2x as many hits to KO (10 hits instead of 5)
  - Boss AI punch interval same as Extreme difficulty

### Modify
- Menu screen: add difficulty selector row (Easy / Medium / Hard / Extreme buttons), shown only in VS CPU mode
- VS CPU mode now uses selected difficulty settings
- KO screen: when player wins Extreme mode, show progress toward boss unlock (e.g. "X/10 Extreme wins")
- RobotBoxer component: accept optional `isBoss` prop that scales the robot up and changes color to a menacing purple/dark scheme
- Boss fight intro: special KO overlay text "BOSS UNLOCKED!" with a dramatic reveal when first reaching 10 wins

### Remove
- Nothing removed

## Implementation Plan
1. Add `Difficulty` type and difficulty config object mapping difficulty → AI interval range and hit counts
2. Add `extremeWins` state initialized from localStorage, persisted on each Extreme win
3. Add `isBossUnlocked` derived state (extremeWins >= 10)
4. Add difficulty selector UI in menu (only visible in VS CPU mode)
5. Wire AI loop to use difficulty-based interval
6. Add boss fight as a special mode: `gameMode` gains "boss" option or handle as a flag
7. Update `triggerPunch` to handle boss double-damage (boss hits player for 2)
8. Update MAX_HITS to be dynamic (10 for boss, 5 normal)
9. Update RobotBoxer to accept `isBoss` prop — renders at 2x size with different color palette
10. Update KO overlay to show Extreme wins progress and boss unlock notification
11. Add "BOSS FIGHT" button in menu once unlocked, styled distinctly (red/gold dramatic)
