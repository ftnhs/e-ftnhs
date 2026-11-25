import React from "react";
import { RefreshCw } from "lucide-react";

interface PrimaryActionProps {
  label: string;
  onClick: () => void;
  icon?: React.ReactNode;
  disabled?: boolean;
}

interface PageHeaderProps {
  title: string;
  primaryAction?: PrimaryActionProps;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  extraActions?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  primaryAction,
  onRefresh,
  isRefreshing = false,
  extraActions,
}) => {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <h1 className="text-[22px] sm:text-2xl font-semibold tracking-tight text-[#1C2420] font-display">
        {title}
      </h1>

      {(primaryAction || onRefresh || extraActions) && (
        <div className="flex items-center gap-2.5 flex-wrap">
          {extraActions}

          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              disabled={isRefreshing}
              className="p-2 rounded-lg bg-[#FFFFFF] border border-[#E3DDD1] text-[#5C6660] hover:text-[#1C2420] hover:bg-[#FAF8F5] transition-colors cursor-pointer disabled:opacity-50"
              aria-label="Refresh data"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`} />
            </button>
          )}

          {primaryAction && (
            <button
              type="button"
              onClick={primaryAction.onClick}
              disabled={primaryAction.disabled}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#0F3D2E] hover:bg-[#0A2E22] text-[#FFFFFF] text-sm font-medium whitespace-nowrap transition-colors cursor-pointer disabled:opacity-50"
            >
              {primaryAction.icon}
              <span>{primaryAction.label}</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};
