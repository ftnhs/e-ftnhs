import React from"react";
import type { CoordinatorshipUnit } from"../../types";
import {
  ShieldAlert,
  Users,
  HeartHandshake,
  Compass,
  Newspaper,
  Laptop,
  Leaf,
  Trophy,
  Briefcase,
  UserCheck,
  FolderOpen,
  UserPlus,
} from"lucide-react";

interface UnitCardProps {
  unit: CoordinatorshipUnit;
  onSelect: (unit: CoordinatorshipUnit) => void;
  onAssignCoordinator?: (unit: CoordinatorshipUnit) => void;
  isPrivileged: boolean;
}

export const UnitCard: React.FC<UnitCardProps> = ({
  unit,
  onSelect,
  onAssignCoordinator,
  isPrivileged,
}) => {
  const getUnitIcon = (code: string) => {
    switch (code) {
      case"DRRM":
        return <ShieldAlert className="w-6 h-6 text-crimson-600" />;
      case"BRIGADA":
        return <Users className="w-6 h-6 text-teal-600" />;
      case"GUIDANCE":
        return <HeartHandshake className="w-6 h-6 text-amber-600" />;
      case"SCOUTING":
        return <Compass className="w-6 h-6 text-emerald-600" />;
      case"JOURNALISM":
        return <Newspaper className="w-6 h-6 text-cyprus-800" />;
      case"ICT":
        return <Laptop className="w-6 h-6 text-sky-600" />;
      case"YES-O":
        return <Leaf className="w-6 h-6 text-green-600" />;
      case"SPORTS":
        return <Trophy className="w-6 h-6 text-amber-600" />;
      default:
        return <Briefcase className="w-6 h-6 text-cyprus-800" />;
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSelect(unit)}
      onKeyDown={(e) => {
        if (e.key ==="Enter" || e.key ==="") {
          e.preventDefault();
          onSelect(unit);
        }
      }}
      className="group bg-white rounded-2xl border border-sand-200 p-5 shadow-xs hover:border-cyprus-400 transition-all cursor-pointer flex flex-col justify-between gap-4 focus:outline-hidden focus:ring-2 focus:ring-cyprus-700"
    >
      <div className="space-y-3">
        {/* Header Icon & Code */}
        <div className="flex items-start justify-between gap-2">
          <div className="w-12 h-12 rounded-2xl bg-sand-100 flex items-center justify-center border border-sand-200 shrink-0 group-hover:scale-105 transition-transform">
            {getUnitIcon(unit.unit_code)}
          </div>
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-cyprus-900 text-white shadow-xs">
            {unit.unit_code}
          </span>
        </div>

        {/* Title & Description */}
        <div>
          <h3 className="text-base font-bold text-cyprus-900 font-display group-hover:text-crimson-600 transition-colors line-clamp-2">
            {unit.unit_name}
          </h3>
          <p className="mt-1 text-xs text-sand-700 line-clamp-2 leading-relaxed">
            {unit.description}
          </p>
        </div>
      </div>

      {/* Footer Info & Coordinator */}
      <div className="pt-3 border-t border-sand-200 space-y-2 text-xs">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <UserCheck className="w-3.5 h-3.5 text-sand-500 shrink-0" />
            <span className="truncate text-sand-800 font-medium">
              {unit.coordinator?.full_name ||"Unassigned Coordinator"}
            </span>
          </div>

          {isPrivileged && onAssignCoordinator && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onAssignCoordinator(unit);
              }}
              title="Assign Coordinator"
              aria-label="Assign Coordinator"
              className="p-1 rounded-lg text-sand-500 hover:text-cyprus-900 hover:bg-sand-100 transition-colors cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center justify-between text-[11px] text-sand-600">
          <span className="flex items-center gap-1">
            <FolderOpen className="w-3.5 h-3.5 text-cyprus-700" />
            <span>{unit.file_count || 0} documents</span>
          </span>
          <span className="text-crimson-600 font-semibold group-hover:translate-x-0.5 transition-transform inline-flex items-center gap-0.5">
            <span>Open Vault</span>
            <span>&rarr;</span>
          </span>
        </div>
      </div>
    </div>
  );
};
