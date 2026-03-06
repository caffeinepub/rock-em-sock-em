import { AnimatePresence, motion } from "motion/react";
import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import RobotBoxer from "./components/RobotBoxer";
import { useRecordWin } from "./hooks/useQueries";

// ── CONSTANTS ──────────────────────────────────────────────────
const MAX_HITS = 5;
const BOSS_MAX_HITS = 10;
const PUNCH_ANIM_DURATION = 180;
const HIT_FLASH_DURATION = 300;
const EXTREME_WINS_REQUIRED = 10;
const MAX_BONUS_HEALTH = 20; // cap so health bar doesn't get ridiculous

type Difficulty = "easy" | "medium" | "hard" | "extreme";
type GameMode = "2player" | "vsAI" | "boss";
type GamePhase = "menu" | "playing" | "ko";
type PunchSide = "left" | "right";

const DIFFICULTY_CONFIG: Record<
  Difficulty,
  { minInterval: number; maxInterval: number }
> = {
  easy: { minInterval: 2000, maxInterval: 3000 },
  medium: { minInterval: 1200, maxInterval: 2000 },
  hard: { minInterval: 600, maxInterval: 1000 },
  extreme: { minInterval: 300, maxInterval: 600 },
};

interface PlayerState {
  hits: number;
  isPunching: PunchSide | null;
  isHit: boolean;
}

interface GameState {
  p1: PlayerState;
  p2: PlayerState;
}

const initialPlayerState = (): PlayerState => ({
  hits: 0,
  isPunching: null,
  isHit: false,
});

const initialGameState = (): GameState => ({
  p1: initialPlayerState(),
  p2: initialPlayerState(),
});

// ── HELPERS ────────────────────────────────────────────────────
function randomBetween(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getStoredExtremeWins(): number {
  try {
    return Number.parseInt(localStorage.getItem("extremeWins") ?? "0", 10) || 0;
  } catch {
    return 0;
  }
}

function getStoredBonusHealth(): number {
  try {
    return Number.parseInt(localStorage.getItem("bonusHealth") ?? "0", 10) || 0;
  } catch {
    return 0;
  }
}

function getStoredBossDefeated(): boolean {
  try {
    return localStorage.getItem("bossDefeated") === "true";
  } catch {
    return false;
  }
}

// ── MAIN APP ───────────────────────────────────────────────────
export default function App() {
  const [gameMode, setGameMode] = useState<GameMode>("vsAI");
  const [gamePhase, setGamePhase] = useState<GamePhase>("menu");
  const [game, setGame] = useState<GameState>(initialGameState());
  const [winner, setWinner] = useState<"p1" | "p2" | null>(null);
  const [localWins, setLocalWins] = useState({ p1: 0, p2: 0 });
  const [koText, setKoText] = useState("");
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [extremeWins, setExtremeWins] = useState<number>(getStoredExtremeWins);
  const [showBossUnlock, setShowBossUnlock] = useState(false);
  const [bossDefeated, setBossDefeated] = useState<boolean>(
    getStoredBossDefeated,
  );
  const [showBlackUnlock, setShowBlackUnlock] = useState(false);
  const [bonusHealth, setBonusHealth] = useState<number>(getStoredBonusHealth);
  const [justGainedHealth, setJustGainedHealth] = useState(false);

  const isBossUnlocked = extremeWins >= EXTREME_WINS_REQUIRED;

  const gamePhaseRef = useRef<GamePhase>("menu");
  const gameModeRef = useRef<GameMode>("vsAI");
  const difficultyRef = useRef<Difficulty>("medium");
  const bonusHealthRef = useRef<number>(getStoredBonusHealth());
  const aiTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const punchTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(
    new Map(),
  );

  const recordWinMutation = useRecordWin();

  // Keep refs in sync
  useEffect(() => {
    gamePhaseRef.current = gamePhase;
  }, [gamePhase]);

  useEffect(() => {
    gameModeRef.current = gameMode;
  }, [gameMode]);

  useEffect(() => {
    difficultyRef.current = difficulty;
  }, [difficulty]);

  useEffect(() => {
    bonusHealthRef.current = bonusHealth;
  }, [bonusHealth]);

  // ── Punch Logic ──────────────────────────────────────────────
  const triggerPunch = useCallback(
    (attacker: "p1" | "p2", side: PunchSide) => {
      if (gamePhaseRef.current !== "playing") return;

      const defender = attacker === "p1" ? "p2" : "p1";
      const currentMode = gameModeRef.current;

      // Boss deals 2 damage when it hits the player
      const damage = currentMode === "boss" && attacker === "p2" ? 2 : 1;

      // Animate attacker arm
      setGame((prev) => ({
        ...prev,
        [attacker]: { ...prev[attacker], isPunching: side },
      }));

      // Clear punch animation
      const punchKey = `${attacker}-punch`;
      if (punchTimersRef.current.has(punchKey)) {
        clearTimeout(punchTimersRef.current.get(punchKey));
      }
      const punchTimer = setTimeout(() => {
        setGame((prev) => ({
          ...prev,
          [attacker]: { ...prev[attacker], isPunching: null },
        }));
        punchTimersRef.current.delete(punchKey);
      }, PUNCH_ANIM_DURATION);
      punchTimersRef.current.set(punchKey, punchTimer);

      // Flash defender + increment hits
      setGame((prev) => {
        const newHits = prev[defender].hits + damage;

        // Determine KO thresholds
        const p1MaxHitsNow = MAX_HITS + bonusHealthRef.current;
        const p2MaxHits = currentMode === "boss" ? BOSS_MAX_HITS : MAX_HITS;
        const defenderMaxHits = defender === "p1" ? p1MaxHitsNow : p2MaxHits;

        const isKO = newHits >= defenderMaxHits;

        if (isKO) {
          setTimeout(() => {
            if (gamePhaseRef.current === "playing") {
              setWinner(attacker);
              const isP1Win = attacker === "p1";
              const currentModeNow = gameModeRef.current;
              setKoText(
                isP1Win
                  ? currentModeNow === "boss"
                    ? "YOU DEFEATED THE BOSS!"
                    : "PLAYER 1 WINS!"
                  : currentModeNow === "vsAI" || currentModeNow === "boss"
                    ? currentModeNow === "boss"
                      ? "BOSS WINS!"
                      : "CPU WINS!"
                    : "PLAYER 2 WINS!",
              );
              setGamePhase("ko");
              setLocalWins((w) => ({
                ...w,
                [attacker]: w[attacker] + 1,
              }));
              recordWinMutation.mutate(attacker);

              // Boss defeat reward: unlock black robot color
              if (isP1Win && currentModeNow === "boss") {
                setBossDefeated(true);
                setShowBlackUnlock(true);
                try {
                  localStorage.setItem("bossDefeated", "true");
                } catch {
                  // ignore
                }
              }

              // Track extreme wins for VS AI extreme difficulty
              if (
                isP1Win &&
                currentModeNow === "vsAI" &&
                difficultyRef.current === "extreme"
              ) {
                // +1 bonus health per extreme win
                setBonusHealth((prev) => {
                  const next = Math.min(prev + 1, MAX_BONUS_HEALTH);
                  try {
                    localStorage.setItem("bonusHealth", next.toString());
                  } catch {
                    // ignore
                  }
                  return next;
                });
                setJustGainedHealth(true);

                setExtremeWins((prev) => {
                  const next = prev + 1;
                  try {
                    localStorage.setItem("extremeWins", next.toString());
                  } catch {
                    // ignore
                  }
                  if (next === EXTREME_WINS_REQUIRED) {
                    setShowBossUnlock(true);
                  }
                  return next;
                });
              }
            }
          }, 400);
        }

        return {
          ...prev,
          [defender]: {
            ...prev[defender],
            hits: newHits,
            isHit: true,
          },
        };
      });

      // Clear hit flash
      const hitKey = `${defender}-hit`;
      if (punchTimersRef.current.has(hitKey)) {
        clearTimeout(punchTimersRef.current.get(hitKey));
      }
      const hitTimer = setTimeout(() => {
        setGame((prev) => ({
          ...prev,
          [defender]: { ...prev[defender], isHit: false },
        }));
        punchTimersRef.current.delete(hitKey);
      }, HIT_FLASH_DURATION);
      punchTimersRef.current.set(hitKey, hitTimer);
    },
    [recordWinMutation],
  );

  // ── AI Loop ──────────────────────────────────────────────────
  const scheduleAI = useCallback(() => {
    if (aiTimerRef.current) clearTimeout(aiTimerRef.current);

    // Boss always uses extreme intervals
    const currentMode = gameModeRef.current;
    const config =
      currentMode === "boss"
        ? DIFFICULTY_CONFIG.extreme
        : DIFFICULTY_CONFIG[difficultyRef.current];

    const delay = randomBetween(config.minInterval, config.maxInterval);
    aiTimerRef.current = setTimeout(() => {
      if (gamePhaseRef.current === "playing") {
        const side: PunchSide = Math.random() < 0.5 ? "left" : "right";
        triggerPunch("p2", side);
        scheduleAI();
      }
    }, delay);
  }, [triggerPunch]);

  // ── Keyboard Controls ────────────────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gamePhaseRef.current !== "playing") return;
      switch (e.code) {
        case "KeyA":
          e.preventDefault();
          triggerPunch("p1", "left");
          break;
        case "KeyD":
          e.preventDefault();
          triggerPunch("p1", "right");
          break;
        case "ArrowLeft":
          if (gameModeRef.current === "2player") {
            e.preventDefault();
            triggerPunch("p2", "left");
          }
          break;
        case "ArrowRight":
          if (gameModeRef.current === "2player") {
            e.preventDefault();
            triggerPunch("p2", "right");
          }
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [triggerPunch]);

  // ── Start / Restart ──────────────────────────────────────────
  const startGame = useCallback(() => {
    setGame(initialGameState());
    setWinner(null);
    setGamePhase("playing");

    if (gameMode === "vsAI" || gameMode === "boss") {
      scheduleAI();
    }
  }, [gameMode, scheduleAI]);

  const playAgain = useCallback(() => {
    if (aiTimerRef.current) clearTimeout(aiTimerRef.current);
    for (const t of punchTimersRef.current.values()) clearTimeout(t);
    punchTimersRef.current.clear();
    setGame(initialGameState());
    setWinner(null);
    setShowBossUnlock(false);
    setShowBlackUnlock(false);
    setJustGainedHealth(false);
    setGamePhase("playing");

    if (gameMode === "vsAI" || gameMode === "boss") {
      scheduleAI();
    }
  }, [gameMode, scheduleAI]);

  const backToMenu = useCallback(() => {
    if (aiTimerRef.current) clearTimeout(aiTimerRef.current);
    for (const t of punchTimersRef.current.values()) clearTimeout(t);
    punchTimersRef.current.clear();
    setGame(initialGameState());
    setWinner(null);
    setShowBossUnlock(false);
    setShowBlackUnlock(false);
    setJustGainedHealth(false);
    setGamePhase("menu");
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (aiTimerRef.current) clearTimeout(aiTimerRef.current);
      for (const t of punchTimersRef.current.values()) clearTimeout(t);
    };
  }, []);

  // Stop AI when KO
  useEffect(() => {
    if (gamePhase === "ko" && aiTimerRef.current) {
      clearTimeout(aiTimerRef.current);
    }
  }, [gamePhase]);

  // Derived values
  const p1MaxHits = MAX_HITS + bonusHealth;
  const p2MaxHits = gameMode === "boss" ? BOSS_MAX_HITS : MAX_HITS;
  const isKO_p1 = game.p1.hits >= p1MaxHits;
  const isKO_p2 = game.p2.hits >= p2MaxHits;

  // ── RENDER ───────────────────────────────────────────────────
  return (
    <div
      className="relative w-full h-screen overflow-hidden flex flex-col"
      style={{
        background: "oklch(0.1 0.02 280)",
        fontFamily: "'Cabinet Grotesk', system-ui, sans-serif",
      }}
    >
      {/* Starfield background */}
      <div className="absolute inset-0 stars-bg opacity-30 pointer-events-none" />

      {/* CRT scanlines */}
      <div
        className="absolute inset-0 crt-lines pointer-events-none"
        style={{ zIndex: 20 }}
      />

      {/* Corner decorations */}
      <div
        className="absolute top-0 left-0 w-32 h-32 pointer-events-none"
        style={{ zIndex: 5 }}
      >
        <div
          className="absolute top-0 left-0 w-full h-1"
          style={{
            background: "oklch(0.88 0.2 95)",
            boxShadow: "0 0 12px oklch(0.88 0.2 95)",
          }}
        />
        <div
          className="absolute top-0 left-0 w-1 h-full"
          style={{
            background: "oklch(0.88 0.2 95)",
            boxShadow: "0 0 12px oklch(0.88 0.2 95)",
          }}
        />
      </div>
      <div
        className="absolute top-0 right-0 w-32 h-32 pointer-events-none"
        style={{ zIndex: 5 }}
      >
        <div
          className="absolute top-0 right-0 w-full h-1"
          style={{
            background: "oklch(0.88 0.2 95)",
            boxShadow: "0 0 12px oklch(0.88 0.2 95)",
          }}
        />
        <div
          className="absolute top-0 right-0 w-1 h-full"
          style={{
            background: "oklch(0.88 0.2 95)",
            boxShadow: "0 0 12px oklch(0.88 0.2 95)",
          }}
        />
      </div>
      <div
        className="absolute bottom-0 left-0 w-32 h-32 pointer-events-none"
        style={{ zIndex: 5 }}
      >
        <div
          className="absolute bottom-0 left-0 w-full h-1"
          style={{
            background: "oklch(0.88 0.2 95)",
            boxShadow: "0 0 12px oklch(0.88 0.2 95)",
          }}
        />
        <div
          className="absolute bottom-0 left-0 w-1 h-full"
          style={{
            background: "oklch(0.88 0.2 95)",
            boxShadow: "0 0 12px oklch(0.88 0.2 95)",
          }}
        />
      </div>
      <div
        className="absolute bottom-0 right-0 w-32 h-32 pointer-events-none"
        style={{ zIndex: 5 }}
      >
        <div
          className="absolute bottom-0 right-0 w-full h-1"
          style={{
            background: "oklch(0.88 0.2 95)",
            boxShadow: "0 0 12px oklch(0.88 0.2 95)",
          }}
        />
        <div
          className="absolute bottom-0 right-0 w-1 h-full"
          style={{
            background: "oklch(0.88 0.2 95)",
            boxShadow: "0 0 12px oklch(0.88 0.2 95)",
          }}
        />
      </div>

      {/* ── HEADER ── */}
      <header
        className="relative flex-shrink-0 flex items-center justify-between px-6 pt-4 pb-2"
        style={{ zIndex: 10 }}
      >
        {/* Title */}
        <div className="flex-1 flex justify-center">
          <h1
            className="font-display text-center leading-none tracking-widest uppercase"
            style={{
              fontSize: "clamp(1.4rem, 4vw, 2.2rem)",
              fontWeight: 900,
              color: "oklch(0.88 0.2 95)",
              textShadow:
                "0 0 12px oklch(0.88 0.2 95 / 0.8), 0 0 32px oklch(0.88 0.2 95 / 0.4), 0 0 64px oklch(0.88 0.2 95 / 0.2)",
              letterSpacing: "0.25em",
            }}
          >
            ⚡ ROCK 'EM SOCK 'EM ⚡
          </h1>
        </div>
      </header>

      {/* ── SCORES ── */}
      <div
        className="relative flex-shrink-0 flex items-center justify-center gap-8 px-6 pb-2"
        data-ocid="game.scores.panel"
        style={{ zIndex: 10 }}
      >
        {/* P1 score */}
        <div className="flex flex-col items-center">
          <span
            className="font-display text-xs tracking-widest uppercase mb-1"
            style={{
              color: "oklch(0.72 0.28 25)",
              textShadow: "0 0 8px oklch(0.72 0.28 25 / 0.7)",
            }}
          >
            {gameMode === "2player" ? "PLAYER 1" : "YOU"}
          </span>
          <span
            className="font-display text-4xl font-black"
            style={{
              color: "oklch(0.72 0.28 25)",
              textShadow:
                "0 0 12px oklch(0.72 0.28 25 / 0.8), 0 0 32px oklch(0.72 0.28 25 / 0.4)",
              lineHeight: 1,
            }}
          >
            {localWins.p1}
          </span>
          {/* Bonus health indicator */}
          {bonusHealth > 0 && (
            <span
              className="font-display font-black"
              style={{
                fontSize: "0.6rem",
                letterSpacing: "0.08em",
                color: "oklch(0.72 0.22 145)",
                textShadow: "0 0 6px oklch(0.72 0.22 145 / 0.6)",
                marginTop: "2px",
              }}
            >
              ❤ HP {MAX_HITS + bonusHealth}
            </span>
          )}
        </div>

        {/* VS */}
        <div
          className="font-display text-xl font-black tracking-widest"
          style={{ color: "oklch(0.55 0.04 280)", letterSpacing: "0.2em" }}
        >
          VS
        </div>

        {/* P2 score */}
        <div className="flex flex-col items-center">
          <span
            className="font-display text-xs tracking-widest uppercase mb-1"
            style={{
              color:
                gameMode === "boss"
                  ? "oklch(0.65 0.28 300)"
                  : "oklch(0.65 0.25 250)",
              textShadow:
                gameMode === "boss"
                  ? "0 0 8px oklch(0.65 0.28 300 / 0.7)"
                  : "0 0 8px oklch(0.65 0.25 250 / 0.7)",
            }}
          >
            {gameMode === "2player"
              ? "PLAYER 2"
              : gameMode === "boss"
                ? "BOSS"
                : "CPU"}
          </span>
          <span
            className="font-display text-4xl font-black"
            style={{
              color:
                gameMode === "boss"
                  ? "oklch(0.65 0.28 300)"
                  : "oklch(0.65 0.25 250)",
              textShadow:
                gameMode === "boss"
                  ? "0 0 12px oklch(0.65 0.28 300 / 0.8), 0 0 32px oklch(0.65 0.28 300 / 0.4)"
                  : "0 0 12px oklch(0.65 0.25 250 / 0.8), 0 0 32px oklch(0.65 0.25 250 / 0.4)",
              lineHeight: 1,
            }}
          >
            {localWins.p2}
          </span>
        </div>
      </div>

      {/* ── MODE SELECTOR (menu only) ── */}
      <AnimatePresence>
        {gamePhase === "menu" && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="relative flex-shrink-0 flex flex-col items-center gap-2 pb-1"
            style={{ zIndex: 10 }}
          >
            {/* Main mode buttons row */}
            <div className="flex items-center justify-center gap-2 flex-wrap">
              <button
                type="button"
                data-ocid="game.mode_2player.button"
                onClick={() => setGameMode("2player")}
                className="font-display text-xs tracking-widest uppercase px-4 py-2 rounded transition-all"
                style={{
                  fontWeight: 800,
                  letterSpacing: "0.15em",
                  background:
                    gameMode === "2player"
                      ? "oklch(0.88 0.2 95)"
                      : "oklch(0.18 0.03 280)",
                  color:
                    gameMode === "2player"
                      ? "oklch(0.1 0.02 280)"
                      : "oklch(0.6 0.04 280)",
                  border: `2px solid ${gameMode === "2player" ? "oklch(0.88 0.2 95)" : "oklch(0.3 0.04 280)"}`,
                  boxShadow:
                    gameMode === "2player"
                      ? "0 0 16px oklch(0.88 0.2 95 / 0.5)"
                      : "none",
                }}
              >
                👥 2 PLAYER
              </button>
              <button
                type="button"
                data-ocid="game.mode_ai.button"
                onClick={() => setGameMode("vsAI")}
                className="font-display text-xs tracking-widest uppercase px-4 py-2 rounded transition-all"
                style={{
                  fontWeight: 800,
                  letterSpacing: "0.15em",
                  background:
                    gameMode === "vsAI"
                      ? "oklch(0.88 0.2 95)"
                      : "oklch(0.18 0.03 280)",
                  color:
                    gameMode === "vsAI"
                      ? "oklch(0.1 0.02 280)"
                      : "oklch(0.6 0.04 280)",
                  border: `2px solid ${gameMode === "vsAI" ? "oklch(0.88 0.2 95)" : "oklch(0.3 0.04 280)"}`,
                  boxShadow:
                    gameMode === "vsAI"
                      ? "0 0 16px oklch(0.88 0.2 95 / 0.5)"
                      : "none",
                }}
              >
                🤖 VS CPU
              </button>

              {/* BOSS FIGHT button — only when unlocked */}
              {isBossUnlocked && (
                <motion.button
                  type="button"
                  data-ocid="game.mode_boss.button"
                  onClick={() => setGameMode("boss")}
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="font-display text-xs tracking-widest uppercase px-4 py-2 rounded transition-colors"
                  style={{
                    fontWeight: 900,
                    letterSpacing: "0.15em",
                    background:
                      gameMode === "boss"
                        ? "oklch(0.35 0.22 15)"
                        : "oklch(0.22 0.12 15)",
                    color:
                      gameMode === "boss"
                        ? "oklch(0.88 0.2 95)"
                        : "oklch(0.78 0.18 65)",
                    border: `2px solid ${gameMode === "boss" ? "oklch(0.78 0.18 65)" : "oklch(0.55 0.18 35)"}`,
                    boxShadow:
                      gameMode === "boss"
                        ? "0 0 20px oklch(0.78 0.18 65 / 0.7), 0 0 40px oklch(0.45 0.2 15 / 0.5)"
                        : "0 0 10px oklch(0.55 0.18 35 / 0.4)",
                  }}
                >
                  💀 BOSS FIGHT
                </motion.button>
              )}
            </div>

            {/* Difficulty selector — only for VS CPU */}
            {gameMode === "vsAI" && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="flex items-center gap-1"
              >
                {(["easy", "medium", "hard", "extreme"] as Difficulty[]).map(
                  (d) => {
                    const isActive = difficulty === d;
                    const diffColors: Record<
                      Difficulty,
                      { active: string; glow: string; inactive: string }
                    > = {
                      easy: {
                        active: "oklch(0.7 0.28 145)",
                        glow: "oklch(0.7 0.28 145 / 0.5)",
                        inactive: "oklch(0.45 0.12 145)",
                      },
                      medium: {
                        active: "oklch(0.85 0.22 95)",
                        glow: "oklch(0.85 0.22 95 / 0.5)",
                        inactive: "oklch(0.55 0.1 95)",
                      },
                      hard: {
                        active: "oklch(0.72 0.25 40)",
                        glow: "oklch(0.72 0.25 40 / 0.5)",
                        inactive: "oklch(0.48 0.14 40)",
                      },
                      extreme: {
                        active: "oklch(0.62 0.28 15)",
                        glow: "oklch(0.62 0.28 15 / 0.6)",
                        inactive: "oklch(0.4 0.16 15)",
                      },
                    };
                    const col = diffColors[d];
                    return (
                      <button
                        key={d}
                        type="button"
                        data-ocid={`game.difficulty_${d}.button`}
                        onClick={() => setDifficulty(d)}
                        className="font-display uppercase rounded transition-all"
                        style={{
                          fontSize: "0.6rem",
                          fontWeight: 800,
                          letterSpacing: "0.12em",
                          padding: "3px 8px",
                          background: isActive
                            ? col.active
                            : "oklch(0.15 0.02 280)",
                          color: isActive
                            ? "oklch(0.08 0.01 280)"
                            : col.inactive,
                          border: `1.5px solid ${isActive ? col.active : "oklch(0.28 0.03 280)"}`,
                          boxShadow: isActive ? `0 0 12px ${col.glow}` : "none",
                        }}
                      >
                        {d === "easy"
                          ? "EASY"
                          : d === "medium"
                            ? "MEDIUM"
                            : d === "hard"
                              ? "HARD"
                              : "⚡ EXTREME"}
                      </button>
                    );
                  },
                )}
              </motion.div>
            )}

            {/* Boss mode warning */}
            {gameMode === "boss" && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="font-display text-center"
                style={{
                  fontSize: "0.6rem",
                  letterSpacing: "0.15em",
                  color: "oklch(0.78 0.18 65)",
                  textShadow: "0 0 8px oklch(0.78 0.18 65 / 0.5)",
                }}
              >
                ⚠ BOSS DEALS 2× DAMAGE · TAKES 10 HITS TO KO
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── MAIN GAME AREA ── */}
      <main
        className="relative flex-1 flex flex-col items-stretch overflow-hidden"
        style={{ zIndex: 10 }}
      >
        {/* ── BOXING RING ── */}
        <div className="relative flex-1 flex flex-col items-center justify-end pb-2">
          {/* Ring back wall */}
          <div
            className="relative w-full max-w-2xl mx-auto flex flex-col"
            style={{ height: "100%", maxHeight: "360px" }}
          >
            {/* Ropes */}
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="absolute left-0 right-0 ring-rope"
                style={{
                  height: "6px",
                  top: `${18 + i * 14}%`,
                  borderRadius: "3px",
                  zIndex: 1,
                }}
              />
            ))}

            {/* Corner posts */}
            {[0, 1].map((side) => (
              <div
                key={side}
                className="absolute top-0 bottom-0"
                style={{
                  [side === 0 ? "left" : "right"]: "-4px",
                  width: "16px",
                  background:
                    "linear-gradient(to bottom, oklch(0.7 0.1 95) 0%, oklch(0.4 0.06 95) 100%)",
                  borderRadius: "4px",
                  boxShadow: "0 0 12px oklch(0.6 0.12 95 / 0.5)",
                  zIndex: 3,
                }}
              />
            ))}

            {/* Ring floor */}
            <div
              className="ring-floor absolute bottom-0 left-0 right-0 flex items-end justify-around px-8 pb-4"
              style={{
                height: "55%",
                zIndex: 2,
              }}
            >
              {/* Robots on floor */}
              <div
                className="flex items-end justify-between w-full mx-auto"
                style={{ maxWidth: gameMode === "boss" ? "100%" : "24rem" }}
              >
                {/* P1 Robot */}
                <motion.div
                  animate={isKO_p1 ? { x: [-4, 4, -3, 3, -2, 2, 0] } : {}}
                  transition={{ duration: 0.4 }}
                >
                  <RobotBoxer
                    player="p1"
                    hits={game.p1.hits}
                    maxHits={p1MaxHits}
                    isKO={isKO_p1}
                    isPunching={game.p1.isPunching}
                    isHit={game.p1.isHit}
                    isBlack={bossDefeated}
                  />
                </motion.div>

                {/* Center spark zone */}
                <div
                  className="flex flex-col items-center"
                  style={{ width: gameMode === "boss" ? "80px" : "60px" }}
                >
                  <AnimatePresence>
                    {(game.p1.isPunching || game.p2.isPunching) && (
                      <motion.div
                        key="spark"
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{
                          scale: [0, 1.4, 0.8, 1.2, 0],
                          opacity: [0, 1, 0.8, 0.6, 0],
                        }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="font-display font-black"
                        style={{
                          fontSize: gameMode === "boss" ? "40px" : "28px",
                          color:
                            gameMode === "boss"
                              ? "oklch(0.85 0.25 30)"
                              : "oklch(0.88 0.2 95)",
                          textShadow:
                            gameMode === "boss"
                              ? "0 0 16px oklch(0.85 0.25 30)"
                              : "0 0 16px oklch(0.88 0.2 95)",
                        }}
                      >
                        {gameMode === "boss" ? "💥" : "⚡"}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* P2 Robot */}
                <motion.div
                  animate={isKO_p2 ? { x: [-4, 4, -3, 3, -2, 2, 0] } : {}}
                  transition={{ duration: 0.4 }}
                >
                  <RobotBoxer
                    player="p2"
                    hits={game.p2.hits}
                    maxHits={p2MaxHits}
                    isKO={isKO_p2}
                    isPunching={game.p2.isPunching}
                    isHit={game.p2.isHit}
                    isBoss={gameMode === "boss"}
                  />
                </motion.div>
              </div>
            </div>
          </div>
        </div>

        {/* ── CONTROLS ROW ── */}
        <div
          className="flex-shrink-0 flex items-center justify-between px-4 pb-4 gap-2"
          style={{ minHeight: "120px" }}
        >
          {/* P1 Buttons */}
          <div className="flex flex-col items-center gap-2">
            <span
              className="font-display text-xs tracking-widest uppercase font-black"
              style={{
                color: "oklch(0.72 0.28 25)",
                textShadow: "0 0 6px oklch(0.72 0.28 25 / 0.6)",
                letterSpacing: "0.15em",
              }}
            >
              {gameMode === "2player" ? "P1" : "YOU"} · [A] [D]
            </span>
            <div className="flex gap-3">
              <PunchButton
                ocid="game.p1_left.button"
                label="LEFT"
                color="red"
                disabled={gamePhase !== "playing"}
                onPunch={() => triggerPunch("p1", "left")}
              />
              <PunchButton
                ocid="game.p1_right.button"
                label="RIGHT"
                color="red"
                disabled={gamePhase !== "playing"}
                onPunch={() => triggerPunch("p1", "right")}
              />
            </div>
          </div>

          {/* Center: Start / Play Again */}
          <div className="flex flex-col items-center gap-2">
            {gamePhase === "menu" && (
              <motion.button
                data-ocid="game.start.button"
                onClick={startGame}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="font-display font-black tracking-widest uppercase px-8 py-4 rounded"
                style={{
                  fontSize: "clamp(1rem, 3vw, 1.4rem)",
                  letterSpacing: "0.2em",
                  background:
                    gameMode === "boss"
                      ? "oklch(0.35 0.22 15)"
                      : "oklch(0.88 0.2 95)",
                  color:
                    gameMode === "boss"
                      ? "oklch(0.88 0.2 95)"
                      : "oklch(0.1 0.02 280)",
                  border:
                    gameMode === "boss"
                      ? "3px solid oklch(0.78 0.18 65)"
                      : "3px solid oklch(0.95 0.15 95)",
                  boxShadow:
                    gameMode === "boss"
                      ? "0 0 24px oklch(0.62 0.28 15 / 0.6), 0 0 48px oklch(0.45 0.2 15 / 0.3), 0 6px 0 oklch(0.25 0.15 15)"
                      : "0 0 24px oklch(0.88 0.2 95 / 0.6), 0 0 48px oklch(0.88 0.2 95 / 0.3), 0 6px 0 oklch(0.6 0.16 95)",
                }}
              >
                {gameMode === "boss" ? "💀 FIGHT BOSS!" : "▶ FIGHT!"}
              </motion.button>
            )}
            {gamePhase === "playing" && (
              <div
                className="font-display text-center text-xs uppercase tracking-widest"
                style={{
                  color: "oklch(0.45 0.04 280)",
                  letterSpacing: "0.1em",
                }}
              >
                {gameMode === "2player" ? "A/D · ←/→" : "A/D to punch"}
              </div>
            )}
          </div>

          {/* P2 Buttons */}
          <div className="flex flex-col items-center gap-2">
            <span
              className="font-display text-xs tracking-widest uppercase font-black"
              style={{
                color:
                  gameMode === "boss"
                    ? "oklch(0.65 0.28 300)"
                    : "oklch(0.65 0.25 250)",
                textShadow:
                  gameMode === "boss"
                    ? "0 0 6px oklch(0.65 0.28 300 / 0.6)"
                    : "0 0 6px oklch(0.65 0.25 250 / 0.6)",
                letterSpacing: "0.15em",
              }}
            >
              {gameMode === "2player"
                ? "P2 · [←] [→]"
                : gameMode === "boss"
                  ? "BOSS"
                  : "CPU"}
            </span>
            <div className="flex gap-3">
              <PunchButton
                ocid="game.p2_left.button"
                label="LEFT"
                color="blue"
                disabled={
                  gamePhase !== "playing" ||
                  gameMode === "vsAI" ||
                  gameMode === "boss"
                }
                onPunch={() => triggerPunch("p2", "left")}
              />
              <PunchButton
                ocid="game.p2_right.button"
                label="RIGHT"
                color="blue"
                disabled={
                  gamePhase !== "playing" ||
                  gameMode === "vsAI" ||
                  gameMode === "boss"
                }
                onPunch={() => triggerPunch("p2", "right")}
              />
            </div>
          </div>
        </div>
      </main>

      {/* ── KO OVERLAY ── */}
      <AnimatePresence>
        {gamePhase === "ko" && (
          <motion.div
            data-ocid="game.knockout.panel"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="absolute inset-0 flex flex-col items-center justify-center"
            style={{
              background: "oklch(0.05 0.02 280 / 0.88)",
              zIndex: 50,
            }}
          >
            {/* Boss Unlock announcement */}
            <AnimatePresence>
              {showBossUnlock && (
                <motion.div
                  data-ocid="game.boss_unlock.panel"
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 1.1, opacity: 0 }}
                  transition={{ type: "spring", stiffness: 200, damping: 15 }}
                  className="absolute font-display font-black tracking-widest text-center uppercase"
                  style={{
                    fontSize: "clamp(1.2rem, 5vw, 2rem)",
                    letterSpacing: "0.15em",
                    color: "oklch(0.88 0.2 65)",
                    textShadow:
                      "0 0 20px oklch(0.88 0.2 65 / 0.9), 0 0 60px oklch(0.78 0.18 65 / 0.6), 0 0 100px oklch(0.65 0.2 65 / 0.3)",
                    top: "12%",
                    padding: "12px 24px",
                    background: "oklch(0.18 0.08 15 / 0.85)",
                    border: "2px solid oklch(0.78 0.18 65)",
                    borderRadius: "8px",
                    boxShadow: "0 0 40px oklch(0.65 0.2 65 / 0.4)",
                  }}
                >
                  💀 BOSS UNLOCKED! 💀
                </motion.div>
              )}
            </AnimatePresence>

            {/* Black Robot Unlock announcement */}
            <AnimatePresence>
              {showBlackUnlock && (
                <motion.div
                  data-ocid="game.black_unlock.panel"
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 1.1, opacity: 0 }}
                  transition={{
                    type: "spring",
                    stiffness: 200,
                    damping: 15,
                    delay: 0.15,
                  }}
                  className="absolute font-display font-black tracking-widest text-center uppercase"
                  style={{
                    fontSize: "clamp(1rem, 4vw, 1.6rem)",
                    letterSpacing: "0.15em",
                    color: "oklch(0.82 0.01 280)",
                    textShadow:
                      "0 0 16px oklch(0.9 0.01 280 / 0.9), 0 0 40px oklch(0.7 0.01 280 / 0.5), 0 0 80px oklch(0.5 0.01 280 / 0.3)",
                    top: "22%",
                    padding: "10px 22px",
                    background: "oklch(0.1 0.01 280 / 0.92)",
                    border: "2px solid oklch(0.55 0.01 280)",
                    borderRadius: "8px",
                    boxShadow:
                      "0 0 30px oklch(0.4 0.01 280 / 0.5), inset 0 1px 0 oklch(0.5 0.01 280 / 0.3)",
                  }}
                >
                  ⬛ BLACK ROBOT UNLOCKED! ⬛
                </motion.div>
              )}
            </AnimatePresence>

            {/* Big KO text */}
            <motion.div
              className="ko-burst"
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "16px",
              }}
            >
              <div
                className="font-display font-black tracking-widest text-center"
                style={{
                  fontSize: "clamp(3rem, 12vw, 6rem)",
                  letterSpacing: "0.08em",
                  lineHeight: 1,
                  color: "oklch(0.88 0.2 95)",
                  textShadow:
                    "0 0 20px oklch(0.88 0.2 95 / 0.9), 0 0 60px oklch(0.88 0.2 95 / 0.5), 0 0 100px oklch(0.88 0.2 95 / 0.3)",
                  WebkitTextStroke: "2px oklch(0.6 0.16 95)",
                }}
              >
                K.O.!
              </div>

              <div
                className="font-display font-black tracking-widest text-center"
                style={{
                  fontSize: "clamp(1.4rem, 5vw, 2.4rem)",
                  letterSpacing: "0.15em",
                  color:
                    winner === "p1"
                      ? "oklch(0.72 0.28 25)"
                      : gameMode === "boss"
                        ? "oklch(0.65 0.28 300)"
                        : "oklch(0.65 0.25 250)",
                  textShadow:
                    winner === "p1"
                      ? "0 0 16px oklch(0.72 0.28 25 / 0.8)"
                      : gameMode === "boss"
                        ? "0 0 16px oklch(0.65 0.28 300 / 0.8)"
                        : "0 0 16px oklch(0.65 0.25 250 / 0.8)",
                }}
              >
                {koText}
              </div>

              {/* Scores summary */}
              <div
                className="flex items-center gap-6 font-display font-black"
                style={{ fontSize: "1.2rem" }}
              >
                <span style={{ color: "oklch(0.72 0.28 25)" }}>
                  {gameMode === "2player" ? "P1" : "YOU"} {localWins.p1}
                </span>
                <span style={{ color: "oklch(0.4 0.04 280)" }}>—</span>
                <span
                  style={{
                    color:
                      gameMode === "boss"
                        ? "oklch(0.65 0.28 300)"
                        : "oklch(0.65 0.25 250)",
                  }}
                >
                  {localWins.p2}{" "}
                  {gameMode === "2player"
                    ? "P2"
                    : gameMode === "boss"
                      ? "BOSS"
                      : "CPU"}
                </span>
              </div>

              {/* Extreme wins tracker — shown for VS CPU extreme */}
              {gameMode === "vsAI" && difficulty === "extreme" && (
                <motion.div
                  data-ocid="game.extreme_wins.panel"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="font-display text-center flex flex-col items-center gap-2"
                >
                  {/* +1 HP gained notification */}
                  {justGainedHealth && winner === "p1" && (
                    <motion.div
                      data-ocid="game.health_gained.panel"
                      initial={{ scale: 0.7, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{
                        type: "spring",
                        stiffness: 260,
                        damping: 14,
                        delay: 0.1,
                      }}
                      className="font-display font-black tracking-widest uppercase"
                      style={{
                        fontSize: "clamp(1rem, 4vw, 1.5rem)",
                        letterSpacing: "0.15em",
                        color: "oklch(0.75 0.28 145)",
                        textShadow:
                          "0 0 16px oklch(0.75 0.28 145 / 0.8), 0 0 40px oklch(0.75 0.28 145 / 0.4)",
                        padding: "6px 18px",
                        borderRadius: "6px",
                        background: "oklch(0.14 0.06 145 / 0.85)",
                        border: "2px solid oklch(0.55 0.22 145)",
                        boxShadow: "0 0 20px oklch(0.55 0.22 145 / 0.3)",
                      }}
                    >
                      ❤ +1 HEALTH POINT!
                    </motion.div>
                  )}

                  <div
                    style={{
                      fontSize: "0.8rem",
                      letterSpacing: "0.1em",
                      padding: "5px 14px",
                      borderRadius: "6px",
                      background: "oklch(0.15 0.06 15 / 0.8)",
                      border: "1.5px solid oklch(0.45 0.18 35)",
                    }}
                  >
                    {isBossUnlocked ? (
                      <span
                        style={{
                          color: "oklch(0.88 0.2 65)",
                          textShadow: "0 0 10px oklch(0.88 0.2 65 / 0.6)",
                          fontWeight: 900,
                        }}
                      >
                        💀 BOSS FIGHT UNLOCKED!
                      </span>
                    ) : (
                      <span style={{ color: "oklch(0.72 0.2 65)" }}>
                        Extreme Wins:{" "}
                        <span
                          style={{
                            color: "oklch(0.88 0.2 65)",
                            fontWeight: 900,
                          }}
                        >
                          {extremeWins}
                        </span>{" "}
                        / {EXTREME_WINS_REQUIRED}
                      </span>
                    )}
                  </div>

                  {/* Current bonus health display */}
                  {bonusHealth > 0 && (
                    <div
                      style={{
                        fontSize: "0.75rem",
                        letterSpacing: "0.08em",
                        padding: "4px 12px",
                        borderRadius: "6px",
                        background: "oklch(0.14 0.06 145 / 0.7)",
                        border: "1.5px solid oklch(0.4 0.18 145)",
                        color: "oklch(0.72 0.22 145)",
                      }}
                    >
                      Your Max Health:{" "}
                      <span
                        style={{
                          color: "oklch(0.82 0.25 145)",
                          fontWeight: 900,
                        }}
                      >
                        {MAX_HITS + bonusHealth}
                      </span>{" "}
                      <span style={{ color: "oklch(0.55 0.15 145)" }}>
                        (+{bonusHealth} bonus)
                      </span>
                    </div>
                  )}
                </motion.div>
              )}

              {/* Play Again + Back to Menu */}
              <div className="flex flex-col items-center gap-2 mt-2">
                <motion.button
                  data-ocid="game.play_again.button"
                  onClick={playAgain}
                  whileHover={{ scale: 1.06 }}
                  whileTap={{ scale: 0.94 }}
                  className="font-display font-black tracking-widest uppercase px-10 py-4 rounded"
                  style={{
                    fontSize: "1.1rem",
                    letterSpacing: "0.2em",
                    background:
                      gameMode === "boss"
                        ? "oklch(0.35 0.22 15)"
                        : "oklch(0.88 0.2 95)",
                    color:
                      gameMode === "boss"
                        ? "oklch(0.88 0.2 95)"
                        : "oklch(0.1 0.02 280)",
                    border:
                      gameMode === "boss"
                        ? "3px solid oklch(0.78 0.18 65)"
                        : "3px solid oklch(0.95 0.15 95)",
                    boxShadow:
                      gameMode === "boss"
                        ? "0 0 24px oklch(0.62 0.28 15 / 0.6), 0 6px 0 oklch(0.25 0.15 15)"
                        : "0 0 24px oklch(0.88 0.2 95 / 0.6), 0 6px 0 oklch(0.6 0.16 95)",
                  }}
                >
                  ↺ PLAY AGAIN
                </motion.button>
                <button
                  type="button"
                  data-ocid="game.back_menu.button"
                  onClick={backToMenu}
                  className="font-display uppercase tracking-widest"
                  style={{
                    fontSize: "0.7rem",
                    fontWeight: 700,
                    letterSpacing: "0.15em",
                    color: "oklch(0.45 0.04 280)",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    padding: "4px 8px",
                  }}
                >
                  ← BACK TO MENU
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── FOOTER ── */}
      <footer
        className="relative flex-shrink-0 flex items-center justify-center py-1"
        style={{
          zIndex: 10,
          borderTop: "1px solid oklch(0.22 0.03 280)",
        }}
      >
        <p
          className="text-center font-body"
          style={{
            fontSize: "0.65rem",
            color: "oklch(0.38 0.03 280)",
            letterSpacing: "0.05em",
          }}
        >
          © {new Date().getFullYear()}. Built with ♥ using{" "}
          <a
            href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(typeof window !== "undefined" ? window.location.hostname : "")}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "oklch(0.55 0.08 280)" }}
          >
            caffeine.ai
          </a>
        </p>
      </footer>
    </div>
  );
}

// ── PUNCH BUTTON COMPONENT ─────────────────────────────────────
interface PunchButtonProps {
  ocid: string;
  label: string;
  color: "red" | "blue";
  disabled: boolean;
  onPunch: () => void;
}

function PunchButton({
  ocid,
  label,
  color,
  disabled,
  onPunch,
}: PunchButtonProps) {
  const [pressing, setPressing] = useState(false);

  const isRed = color === "red";
  const mainColor = isRed ? "oklch(0.6 0.26 25)" : "oklch(0.5 0.25 255)";
  const brightColor = isRed ? "oklch(0.72 0.28 25)" : "oklch(0.65 0.25 250)";
  const darkColor = isRed ? "oklch(0.35 0.2 25)" : "oklch(0.3 0.2 255)";

  const handleActivate = useCallback(() => {
    if (disabled) return;
    setPressing(true);
    onPunch();
    setTimeout(() => setPressing(false), 120);
  }, [disabled, onPunch]);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      handleActivate();
    },
    [handleActivate],
  );

  return (
    <button
      type="button"
      data-ocid={ocid}
      className="punch-btn relative select-none rounded-lg flex flex-col items-center justify-center gap-1"
      disabled={disabled}
      onPointerDown={handlePointerDown}
      style={{
        width: "68px",
        height: "68px",
        background: disabled
          ? "oklch(0.18 0.02 280)"
          : pressing
            ? darkColor
            : `radial-gradient(ellipse at 40% 35%, ${brightColor} 0%, ${mainColor} 50%, ${darkColor} 100%)`,
        border: `3px solid ${disabled ? "oklch(0.25 0.02 280)" : pressing ? darkColor : brightColor}`,
        boxShadow: disabled
          ? "none"
          : pressing
            ? "none"
            : isRed
              ? `0 0 16px oklch(0.72 0.28 25 / 0.6), 0 0 32px oklch(0.72 0.28 25 / 0.2), 0 5px 0 ${darkColor}`
              : `0 0 16px oklch(0.65 0.25 250 / 0.6), 0 0 32px oklch(0.65 0.25 250 / 0.2), 0 5px 0 ${darkColor}`,
        transform: pressing
          ? "scale(0.9) translateY(3px)"
          : "scale(1) translateY(0)",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.4 : 1,
        transition: "transform 80ms, box-shadow 80ms, background 80ms",
      }}
    >
      {/* Glove icon */}
      <span style={{ fontSize: "22px", lineHeight: 1 }}>🥊</span>
      <span
        className="font-display font-black uppercase"
        style={{
          fontSize: "0.6rem",
          letterSpacing: "0.1em",
          color: disabled ? "oklch(0.4 0.03 280)" : "oklch(0.95 0.02 90)",
          textShadow: disabled ? "none" : "0 1px 2px oklch(0 0 0 / 0.6)",
        }}
      >
        {label}
      </span>
    </button>
  );
}
