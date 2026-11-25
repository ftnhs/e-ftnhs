import React, { useState } from "react";
import type { ModuleId } from "../../types";
import { getNavGroupsForRole } from "./navigationData";
import { useAuth } from "../../context/AuthContext";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";

interface DesktopSidebarProps {
  activeModule: ModuleId;
  onSelectModule: (id: ModuleId) => void;
}

interface HoveredTooltip {
  label: string;
  top: number;
  left: number;
}

export const DesktopSidebar: React.FC<DesktopSidebarProps> = ({
  activeModule,
  onSelectModule,
}) => {
  const { profile } = useAuth();
  const navGroups = getNavGroupsForRole(profile?.role);

  // Default sidebar view is icons-only; user can expand/collapse full sidebar
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [hoveredTooltip, setHoveredTooltip] = useState<HoveredTooltip | null>(null);

  const showTooltip = (el: HTMLElement, label: string) => {
    if (isExpanded) return;
    const rect = el.getBoundingClientRect();
    setHoveredTooltip({
      label,
      top: rect.top + rect.height / 2,
      left: rect.right + 10,
    });
  };

  const hideTooltip = () => {
    setHoveredTooltip(null);
  };

  return (
    <>
      <aside
        aria-label="Desktop Navigation"
        className={`print:hidden hidden md:flex flex-col h-full bg-[#0F3D2E] text-[#F4F1EA] shrink-0 border-r border-[#0A2E22] transition-[width] duration-200 ease-out ${
          isExpanded ? "w-60" : "w-16"
        }`}
      >
        {/* Pinned Expand / Collapse Toggle Bar */}
        <div
          className={`shrink-0 flex items-center border-b border-[#18523F] px-2.5 py-2.5 ${
            isExpanded ? "justify-between" : "justify-center"
          }`}
        >
          {isExpanded && (
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#B8CEC5]/80 px-1.5 whitespace-nowrap">
              Navigation
            </span>
          )}
          <button
            type="button"
            onClick={() => {
              setIsExpanded((prev) => !prev);
              setHoveredTooltip(null);
            }}
            onMouseEnter={(e) =>
              showTooltip(e.currentTarget, isExpanded ? "Collapse sidebar" : "Expand sidebar")
            }
            onMouseLeave={hideTooltip}
            onFocus={(e) =>
              showTooltip(e.currentTarget, isExpanded ? "Collapse sidebar" : "Expand sidebar")
            }
            onBlur={hideTooltip}
            className="p-2 rounded-lg text-[#B8CEC5] hover:bg-[#18523F] hover:text-[#F4F1EA] transition-colors cursor-pointer"
            aria-label={isExpanded ? "Collapse sidebar" : "Expand sidebar"}
            aria-expanded={isExpanded}
          >
            {isExpanded ? (
              <PanelLeftClose className="w-4 h-4" />
            ) : (
              <PanelLeftOpen className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* Independently Scrollable Nav Area (hidden scrollbar) */}
        <div
          onScroll={hideTooltip}
          className={`flex-1 min-h-0 overflow-y-auto overflow-x-hidden no-scrollbar py-4 space-y-5 ${
            isExpanded ? "px-3" : "px-2"
          }`}
        >
          {navGroups.map((group, groupIndex) => (
            <div key={group.title}>
              {isExpanded ? (
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[#B8CEC5]/70 px-3 block mb-2 whitespace-nowrap">
                  {group.title}
                </span>
              ) : (
                groupIndex > 0 && (
                  <div
                    className="mx-2 mb-3 border-t border-[#18523F]"
                    aria-hidden="true"
                  />
                )
              )}

              <nav className="space-y-1">
                {group.modules.map((mod) => {
                  const isActive = activeModule === mod.id;
                  return (
                    <button
                      key={mod.id}
                      type="button"
                      onClick={() => onSelectModule(mod.id)}
                      onMouseEnter={(e) => showTooltip(e.currentTarget, mod.name)}
                      onMouseLeave={hideTooltip}
                      onFocus={(e) => showTooltip(e.currentTarget, mod.name)}
                      onBlur={hideTooltip}
                      aria-label={mod.name}
                      aria-current={isActive ? "page" : undefined}
                      className={`w-full relative flex items-center rounded-lg text-sm font-medium transition-colors cursor-pointer whitespace-nowrap ${
                        isExpanded
                          ? "gap-3 px-3 py-2.5 text-left"
                          : "justify-center p-2.5"
                      } ${
                        isActive
                          ? "bg-[#18523F] text-[#F4F1EA] font-semibold"
                          : "text-[#B8CEC5] hover:bg-[#18523F]/60 hover:text-[#F4F1EA]"
                      }`}
                    >
                      {isActive && (
                        <span
                          className={`rounded-full bg-[#9E1B32] shrink-0 ${
                            isExpanded
                              ? "w-1.5 h-1.5"
                              : "absolute left-1 top-1/2 -translate-y-1/2 w-1 h-4"
                          }`}
                          aria-hidden="true"
                        />
                      )}
                      <span
                        className={`shrink-0 ${
                          isActive ? "text-[#F4F1EA]" : "text-[#B8CEC5]"
                        }`}
                      >
                        {mod.icon}
                      </span>
                      {isExpanded && (
                        <span className="whitespace-nowrap">{mod.name}</span>
                      )}
                    </button>
                  );
                })}
              </nav>
            </div>
          ))}
        </div>
      </aside>

      {/* Fixed Floating Tooltip for Icons-Only Mode (avoids scroll clipping) */}
      {!isExpanded && hoveredTooltip && (
        <div
          role="tooltip"
          style={{
            top: hoveredTooltip.top,
            left: hoveredTooltip.left,
          }}
          className="hidden md:flex fixed -translate-y-1/2 z-50 pointer-events-none items-center px-2.5 py-1.5 rounded-lg bg-[#0F3D2E] text-[#F4F1EA] border border-[#18523F] shadow-lg text-xs font-medium whitespace-nowrap"
        >
          {hoveredTooltip.label}
        </div>
      )}
    </>
  );
};
