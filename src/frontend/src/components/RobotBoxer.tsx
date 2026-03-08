import type React from "react";

type Player = "p1" | "p2";

interface RobotBoxerProps {
  player: Player;
  hits: number;
  maxHits: number;
  isKO: boolean;
  isPunching: "left" | "right" | null;
  isHit: boolean;
  isBoss?: boolean;
  isBoss2?: boolean;
  isBlack?: boolean;
  isGold?: boolean;
}

const RobotBoxer: React.FC<RobotBoxerProps> = ({
  player,
  hits,
  maxHits,
  isKO,
  isPunching,
  isHit,
  isBoss = false,
  isBoss2 = false,
  isBlack = false,
  isGold = false,
}) => {
  const isRed = player === "p1";

  // Colors — priority: isBoss2 → isBoss → isGold && isRed → isBlack && isRed → normal red/blue
  const bodyColor = isBoss2
    ? "oklch(0.62 0.25 55)"
    : isBoss
      ? "oklch(0.45 0.28 300)"
      : isGold && isRed
        ? "oklch(0.72 0.24 75)"
        : isBlack && isRed
          ? "oklch(0.18 0.01 280)"
          : isRed
            ? "oklch(0.6 0.26 25)"
            : "oklch(0.5 0.25 255)";

  const bodyColorDark = isBoss2
    ? "oklch(0.42 0.22 55)"
    : isBoss
      ? "oklch(0.3 0.22 300)"
      : isGold && isRed
        ? "oklch(0.50 0.20 70)"
        : isBlack && isRed
          ? "oklch(0.10 0.01 280)"
          : isRed
            ? "oklch(0.4 0.22 25)"
            : "oklch(0.35 0.22 255)";

  const bodyColorLight = isBoss2
    ? "oklch(0.80 0.26 65)"
    : isBoss
      ? "oklch(0.6 0.3 300)"
      : isGold && isRed
        ? "oklch(0.88 0.22 80)"
        : isBlack && isRed
          ? "oklch(0.35 0.02 280)"
          : isRed
            ? "oklch(0.75 0.28 25)"
            : "oklch(0.65 0.25 250)";

  const glowColor = isBoss2
    ? "oklch(0.75 0.28 65 / 0.9)"
    : isBoss
      ? "oklch(0.6 0.3 300 / 0.9)"
      : isGold && isRed
        ? "oklch(0.80 0.26 75 / 0.8)"
        : isBlack && isRed
          ? "oklch(0.6 0.0 0 / 0.5)"
          : isRed
            ? "oklch(0.72 0.28 25 / 0.8)"
            : "oklch(0.7 0.25 250 / 0.8)";

  const eyeColor = isBoss2
    ? "oklch(0.98 0.18 95)"
    : isBoss
      ? "oklch(0.85 0.25 30)"
      : isGold && isRed
        ? "oklch(0.98 0.18 95)"
        : isBlack && isRed
          ? "oklch(0.9 0.01 280)"
          : "oklch(0.88 0.2 95)";

  const antColor = isBoss2
    ? "oklch(0.95 0.2 75)"
    : isBoss
      ? "oklch(0.85 0.25 30)"
      : isGold && isRed
        ? "oklch(0.95 0.2 75)"
        : isBlack && isRed
          ? "oklch(0.8 0.01 280)"
          : isRed
            ? "oklch(0.85 0.2 95)"
            : "oklch(0.82 0.18 195)";

  // P2 is mirrored facing left
  const flip = !isRed ? "scaleX(-1)" : "scaleX(1)";

  const leftArmClass =
    isPunching === "left"
      ? isRed
        ? "robot-punch-left"
        : "robot-punch-right"
      : "";

  const rightArmClass =
    isPunching === "right"
      ? isRed
        ? "robot-punch-right"
        : "robot-punch-left"
      : "";

  const bodyClass = isHit ? "body-hit" : "";
  const koBodyClass = isKO ? "robot-ko" : "";
  const headClass = isKO ? "head-ko" : "";

  // Scale wrapper — Boss2 is biggest, Boss1 is large
  const scaleTransform = isBoss2
    ? "scale(2.2)"
    : isBoss
      ? "scale(1.6)"
      : undefined;
  const bossMargin = isBoss2
    ? "0 36px 52px 36px"
    : isBoss
      ? "0 20px 32px 20px"
      : undefined;

  // Health pip dimensions — boss2 needs very small pips to fit 20
  const pipSize = isBoss2 ? "7px" : isBoss ? "10px" : "12px";

  // Health pip active color
  const pipColor = isBoss2
    ? "oklch(0.80 0.26 65)"
    : isBoss
      ? "oklch(0.65 0.28 300)"
      : isGold && isRed
        ? "oklch(0.80 0.24 75)"
        : isBlack && isRed
          ? "oklch(0.7 0.01 280)"
          : isRed
            ? "oklch(0.72 0.28 25)"
            : "oklch(0.65 0.25 250)";

  // Belt buckle color
  const beltColor = isBoss2
    ? "oklch(0.95 0.2 75)"
    : isBoss
      ? "oklch(0.85 0.25 30)"
      : isGold && isRed
        ? "oklch(0.95 0.2 75)"
        : isBlack && isRed
          ? "oklch(0.75 0.01 280)"
          : isRed
            ? "oklch(0.88 0.2 95)"
            : "oklch(0.82 0.18 195)";

  return (
    <div
      style={{
        transform: scaleTransform,
        transformOrigin: "bottom center",
        margin: bossMargin,
        display: "inline-block",
      }}
    >
      <div
        className={`relative flex flex-col items-center select-none ${koBodyClass}`}
        style={{ transform: flip }}
      >
        {/* Health pips */}
        <div
          className="flex gap-1 mb-2 flex-wrap justify-center"
          style={{
            transform: isRed ? "scaleX(1)" : "scaleX(-1)",
            maxWidth: isBoss2 ? "120px" : undefined,
          }}
        >
          {Array.from({ length: maxHits }).map((_, i) => {
            const isActive = i < maxHits - hits;
            return (
              <div
                // biome-ignore lint/suspicious/noArrayIndexKey: static fixed-length array, index is stable
                key={i}
                className="health-pip rounded-sm border border-white/20"
                style={{
                  width: pipSize,
                  height: pipSize,
                  background: isActive ? pipColor : "oklch(0.2 0.02 280)",
                  boxShadow: isActive ? `0 0 6px ${pipColor}` : "none",
                }}
              />
            );
          })}
        </div>

        {/* Head */}
        <div className={`relative ${headClass}`} style={{ zIndex: 3 }}>
          {/* Antenna */}
          <div
            className="absolute left-1/2 -top-5"
            style={{
              transform: "translateX(-50%)",
              width: "4px",
              height: "20px",
              background: antColor,
              borderRadius: "2px",
              boxShadow: `0 0 8px ${antColor}`,
            }}
          />
          <div
            className="absolute left-1/2"
            style={{
              transform: "translateX(-50%)",
              top: "-26px",
              width: "10px",
              height: "10px",
              borderRadius: "50%",
              background: antColor,
              boxShadow: `0 0 10px ${antColor}, 0 0 20px ${antColor}`,
            }}
          />

          {/* Head block */}
          <div
            className={`relative ${bodyClass}`}
            style={{
              width: "72px",
              height: "56px",
              background: `linear-gradient(135deg, ${bodyColorLight} 0%, ${bodyColor} 50%, ${bodyColorDark} 100%)`,
              borderRadius: "6px 6px 4px 4px",
              border: `3px solid ${bodyColorLight}`,
              boxShadow: `0 0 16px ${glowColor}, 0 4px 0 ${bodyColorDark}, inset 0 2px 4px oklch(1 0 0 / 0.15)`,
            }}
          >
            {/* Eyes */}
            <div className="absolute top-3 left-2 right-2 flex justify-between">
              {[0, 1].map((i) => (
                <div
                  key={i}
                  style={{
                    width: "20px",
                    height: "16px",
                    background: isKO ? "oklch(0.3 0.02 280)" : eyeColor,
                    borderRadius: "3px",
                    boxShadow: isKO
                      ? "none"
                      : `0 0 8px ${eyeColor}, 0 0 16px ${eyeColor}`,
                    transition: "all 200ms",
                  }}
                />
              ))}
            </div>

            {/* Mouth grille */}
            <div
              className="absolute bottom-2 left-3 right-3"
              style={{
                height: "10px",
                borderRadius: "2px",
                overflow: "hidden",
                background: bodyColorDark,
                display: "flex",
                gap: "2px",
                padding: "2px",
              }}
            >
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  style={{
                    flex: 1,
                    background: isKO
                      ? "oklch(0.3 0.02 280)"
                      : "oklch(0.88 0.2 95 / 0.5)",
                    borderRadius: "1px",
                  }}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Neck */}
        <div
          style={{
            width: "24px",
            height: "10px",
            background: bodyColorDark,
            margin: "0 auto",
            borderLeft: `3px solid ${bodyColorLight}`,
            borderRight: `3px solid ${bodyColorLight}`,
          }}
        />

        {/* Body + Arms row */}
        <div className="relative flex items-center" style={{ gap: "0px" }}>
          {/* Left Arm (punches toward opponent = right for P1) */}
          <div
            className={`flex flex-col items-center ${leftArmClass}`}
            style={{ transformOrigin: "right center" }}
          >
            {/* Upper arm */}
            <div
              style={{
                width: "18px",
                height: "36px",
                background: `linear-gradient(to right, ${bodyColorDark}, ${bodyColor})`,
                borderRadius: "4px",
                border: `2px solid ${bodyColorDark}`,
                boxShadow: "2px 0 4px oklch(0 0 0 / 0.4)",
              }}
            />
            {/* Glove */}
            <div
              style={{
                width: "28px",
                height: "24px",
                background: `linear-gradient(135deg, ${bodyColorLight} 0%, ${bodyColor} 100%)`,
                borderRadius: "4px 4px 8px 8px",
                border: `3px solid ${bodyColorLight}`,
                boxShadow: `0 0 10px ${glowColor}`,
                marginTop: "-2px",
                marginLeft: "-4px",
              }}
            />
          </div>

          {/* Torso */}
          <div
            className={bodyClass}
            style={{
              width: "80px",
              height: "72px",
              background: `linear-gradient(160deg, ${bodyColorLight} 0%, ${bodyColor} 40%, ${bodyColorDark} 100%)`,
              borderRadius: "6px",
              border: `3px solid ${bodyColorLight}`,
              boxShadow: `0 0 20px ${glowColor}, 0 6px 0 ${bodyColorDark}, inset 0 3px 6px oklch(1 0 0 / 0.1)`,
              position: "relative",
              zIndex: 2,
            }}
          >
            {/* Chest plate detail */}
            <div
              style={{
                position: "absolute",
                top: "8px",
                left: "8px",
                right: "8px",
                height: "28px",
                background: bodyColorDark,
                borderRadius: "4px",
                border: `2px solid ${bodyColor}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "4px",
                padding: "4px",
              }}
            >
              {/* Chest lights */}
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  style={{
                    width: "8px",
                    height: "8px",
                    borderRadius: "50%",
                    background: isKO
                      ? "oklch(0.3 0.02 280)"
                      : i === 1
                        ? eyeColor
                        : bodyColorLight,
                    boxShadow: isKO
                      ? "none"
                      : i === 1
                        ? `0 0 6px ${eyeColor}`
                        : `0 0 4px ${bodyColorLight}`,
                  }}
                />
              ))}
            </div>

            {/* Belt */}
            <div
              style={{
                position: "absolute",
                bottom: "0",
                left: "0",
                right: "0",
                height: "16px",
                background: bodyColorDark,
                borderRadius: "0 0 3px 3px",
                borderTop: `2px solid ${bodyColor}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <div
                style={{
                  width: "20px",
                  height: "10px",
                  background: beltColor,
                  borderRadius: "2px",
                  boxShadow: `0 0 6px ${beltColor}`,
                }}
              />
            </div>
          </div>

          {/* Right Arm */}
          <div
            className={`flex flex-col items-center ${rightArmClass}`}
            style={{ transformOrigin: "left center" }}
          >
            {/* Upper arm */}
            <div
              style={{
                width: "18px",
                height: "36px",
                background: `linear-gradient(to left, ${bodyColorDark}, ${bodyColor})`,
                borderRadius: "4px",
                border: `2px solid ${bodyColorDark}`,
                boxShadow: "-2px 0 4px oklch(0 0 0 / 0.4)",
              }}
            />
            {/* Glove */}
            <div
              style={{
                width: "28px",
                height: "24px",
                background: `linear-gradient(225deg, ${bodyColorLight} 0%, ${bodyColor} 100%)`,
                borderRadius: "4px 4px 8px 8px",
                border: `3px solid ${bodyColorLight}`,
                boxShadow: `0 0 10px ${glowColor}`,
                marginTop: "-2px",
                marginRight: "-4px",
              }}
            />
          </div>
        </div>

        {/* Legs */}
        <div
          style={{
            display: "flex",
            gap: "12px",
            marginTop: "4px",
          }}
        >
          {[0, 1].map((i) => (
            <div key={i} className="flex flex-col items-center">
              {/* Upper leg */}
              <div
                style={{
                  width: "22px",
                  height: "28px",
                  background: `linear-gradient(to bottom, ${bodyColor}, ${bodyColorDark})`,
                  borderRadius: "3px",
                  border: `2px solid ${bodyColor}`,
                }}
              />
              {/* Foot */}
              <div
                style={{
                  width: "30px",
                  height: "14px",
                  background: bodyColorDark,
                  borderRadius: "2px 2px 4px 4px",
                  border: `2px solid ${bodyColor}`,
                  marginTop: "0",
                }}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default RobotBoxer;
