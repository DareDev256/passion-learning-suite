"use client";

interface XPBarProps {
  xp: number;
  level: number;
}

export function XPBar({ xp, level }: XPBarProps) {
  const xpInLevel = xp % 100;

  return (
    <div className="w-full max-w-md mx-auto mb-6">
      <div className="flex justify-between items-center mb-1">
        <span className="font-pixel text-[10px] text-game-accent">
          LVL {level}
        </span>
        <span className="font-pixel text-[10px] text-game-accent">
          {xpInLevel}/100 XP
        </span>
      </div>
      <div className="h-3 bg-game-dark border border-game-primary/30">
        <div
          className="h-full bg-game-primary xp-fill"
          style={{ width: `${xpInLevel}%` }}
        />
      </div>
    </div>
  );
}
