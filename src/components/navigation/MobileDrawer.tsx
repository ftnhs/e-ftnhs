import React from "react";
import type { ModuleId } from "../../types";
import { getNavGroupsForRole } from "./navigationData";
import { useAuth } from "../../context/AuthContext";
import { motion, AnimatePresence } from "motion/react";
import { useReducedMotion } from "../../hooks/useReducedMotion";
import { X, LogOut, Home } from "lucide-react";

interface MobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  activeModule: ModuleId;
  onSelectModule: (id: ModuleId) => void;
  onGoHome?: () => void;
}

export const MobileDrawer: React.FC<MobileDrawerProps> = ({
  isOpen,
  onClose,
  activeModule,
  onSelectModule,
  onGoHome,
}) => {
  const { profile, logout } = useAuth();
  const shouldReduceMotion = useReducedMotion();

  const handleItemClick = (id: ModuleId) => {
    onSelectModule(id);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={shouldReduceMotion ? { duration: 0.05 } : { duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-[#1C2420]/50 backdrop-blur-xs"
            aria-hidden="true"
          />

          <motion.div
            initial={shouldReduceMotion ? { opacity: 0 } : { x: "-100%" }}
            animate={shouldReduceMotion ? { opacity: 1 } : { x: 0 }}
            exit={shouldReduceMotion ? { opacity: 0 } : { x: "-100%" }}
            transition={
              shouldReduceMotion
                ? { duration: 0.05 }
                : { type: "spring", stiffness: 300, damping: 30 }
            }
            className="relative w-4/5 max-w-xs bg-[#0F3D2E] text-[#F4F1EA] h-full shadow-2xl flex flex-col z-10"
            role="dialog"
            aria-modal="true"
            aria-label="Navigation Drawer"
          >
            {/* Header */}
            <div className="p-4 border-b border-[#18523F] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-[#F4F1EA] p-0.5 flex items-center justify-center shrink-0">
                  <img
                    src="/images/Official Logos/Fermin_logo.png"
                    alt="Fermin Tayabas National High School Seal"
                    className="w-full h-full object-contain"
                  />
                </div>
                <span className="font-bold text-sm text-[#F4F1EA] font-display">
                  e-FTNHS
                </span>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-lg text-[#B8CEC5] hover:bg-[#18523F] hover:text-[#F4F1EA] cursor-pointer"
                aria-label="Close navigation drawer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Grouped Module List */}
            <nav className="flex-1 overflow-y-auto p-3 space-y-5">
              {getNavGroupsForRole(profile?.role).map((group) => (
                <div key={group.title}>
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-[#B8CEC5]/70 px-3 block mb-1.5">
                    {group.title}
                  </span>
                  <div className="space-y-1">
                    {group.modules.map((mod) => {
                      const isActive = activeModule === mod.id;
                      return (
                        <button
                          key={mod.id}
                          type="button"
                          onClick={() => handleItemClick(mod.id)}
                          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium cursor-pointer text-left transition-colors whitespace-nowrap ${
                            isActive
                              ? "bg-[#18523F] text-[#F4F1EA] font-semibold"
                              : "text-[#B8CEC5] hover:bg-[#18523F]/60 hover:text-[#F4F1EA]"
                          }`}
                          aria-current={isActive ? "page" : undefined}
                        >
                          {isActive && (
                            <span className="w-1.5 h-1.5 rounded-full bg-[#9E1B32] shrink-0" aria-hidden="true" />
                          )}
                          <span className="shrink-0">{mod.icon}</span>
                          <span className="whitespace-nowrap">{mod.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </nav>

            {/* Drawer Footer */}
            <div className="p-4 border-t border-[#18523F] space-y-2">
              {onGoHome && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onGoHome();
                  }}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs font-semibold text-[#F4F1EA] bg-[#18523F] hover:bg-[#1F664F] border border-[#246A52] transition-colors cursor-pointer"
                >
                  <Home className="w-4 h-4" />
                  <span>Public Home</span>
                </button>
              )}
              <button
                type="button"
                onClick={logout}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs font-semibold text-[#F4F1EA] bg-[#9E1B32] hover:bg-[#7F1528] transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out</span>
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
