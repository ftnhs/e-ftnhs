import React from "react";

interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  accent?: "default" | "green" | "crimson";
}

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  icon,
  accent = "default",
}) => {
  const valueColor =
    accent === "crimson"
      ? "text-[#9E1B32]"
      : accent === "green"
      ? "text-[#0F3D2E]"
      : "text-[#1C2420]";

  const iconColor =
    accent === "crimson"
      ? "text-[#9E1B32]"
      : accent === "green"
      ? "text-[#0F3D2E]"
      : "text-[#5C6660]";

  return (
    <div className="bg-[#FFFFFF] border border-[#E3DDD1] rounded-xl p-4">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[13px] font-medium text-[#5C6660] truncate">
          {label}
        </span>
        <span className={`shrink-0 w-4 h-4 flex items-center justify-center ${iconColor}`} aria-hidden="true">
          {icon}
        </span>
      </div>
      <div className={`text-[28px] leading-tight font-semibold tabular-nums mt-2 ${valueColor}`}>
        {value}
      </div>
    </div>
  );
};
