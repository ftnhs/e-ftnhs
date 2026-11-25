import React, { useState, useEffect, useCallback, useMemo } from"react";
import { useAuth } from"../context/AuthContext";
import { supabase } from"../lib/supabase";
import {
  fetchCoordinatorshipUnits,
  fetchUnitFiles,
  deleteCoordinatorshipFile,
} from"../services/coordinatorshipService";
import type {
  CoordinatorshipUnit,
  CoordinatorshipFile,
  Profile,
} from"../types";
import { PageHeader } from"../components/common/PageHeader";
import { UnitCard } from"../components/coordinatorship/UnitCard";
import { UploadFileModal } from"../components/coordinatorship/UploadFileModal";
import { AssignCoordinatorModal } from"../components/coordinatorship/AssignCoordinatorModal";
import {
  Search,
  Filter,
  RefreshCw,
  UploadCloud,
  FileDown,
  Trash2,
  ArrowLeft,
  FolderOpen,
  Calendar,
  ShieldCheck,
  Lock,
  Globe,
} from"lucide-react";

export const ModuleFView: React.FC = () => {
  const { profile, isAdmin, isSchoolHead } = useAuth();
  const isPrivileged = isAdmin || isSchoolHead;

  const [units, setUnits] = useState<CoordinatorshipUnit[]>([]);
  const [selectedUnit, setSelectedUnit] = useState<CoordinatorshipUnit | null>(null);
  const [unitFiles, setUnitFiles] = useState<CoordinatorshipFile[]>([]);
  const [teachers, setTeachers] = useState<Profile[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isLoadingFiles, setIsLoadingFiles] = useState<boolean>(false);

  // Modals
  const [isUploadModalOpen, setIsUploadModalOpen] = useState<boolean>(false);
  const [unitToAssign, setUnitToAssign] = useState<CoordinatorshipUnit | null>(null);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [unitsData, teachersRes] = await Promise.all([
        fetchCoordinatorshipUnits(),
        supabase.from("profiles").select("*").eq("status","Approved").order("full_name"),
      ]);

      setUnits(unitsData);
      if (teachersRes.data) setTeachers(teachersRes.data);
    } catch (err) {
      console.error("Error loading coordinatorship units:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSelectUnit = async (unit: CoordinatorshipUnit) => {
    setSelectedUnit(unit);
    setIsLoadingFiles(true);
    try {
      const files = await fetchUnitFiles(unit.id);
      setUnitFiles(files);
    } catch (err) {
      console.error("Error loading unit files:", err);
    } finally {
      setIsLoadingFiles(false);
    }
  };

  const handleFileUploaded = (newFile: CoordinatorshipFile) => {
    setUnitFiles((prev) => [newFile, ...prev]);
    setUnits((prev) =>
      prev.map((u) =>
        u.id === newFile.unit_id ? { ...u, file_count: (u.file_count || 0) + 1 } : u
      )
    );
  };

  const handleDeleteFile = async (fileId: string) => {
    const ok = await deleteCoordinatorshipFile(fileId);
    if (ok) {
      setUnitFiles((prev) => prev.filter((f) => f.id !== fileId));
      if (selectedUnit) {
        setUnits((prev) =>
          prev.map((u) =>
            u.id === selectedUnit.id
              ? { ...u, file_count: Math.max(0, (u.file_count || 1) - 1) }
              : u
          )
        );
      }
    }
  };

  const handleCoordinatorAssigned = (unitId: string, newCoordinatorId: string | null) => {
    const assignedProfile = teachers.find((t) => t.id === newCoordinatorId) || null;
    setUnits((prev) =>
      prev.map((u) =>
        u.id === unitId
          ? {
              ...u,
              coordinator_id: newCoordinatorId,
              coordinator: assignedProfile
                ? {
                    id: assignedProfile.id,
                    full_name: assignedProfile.full_name,
                    email: assignedProfile.email,
                    department: assignedProfile.department,
                  }
                : undefined,
            }
          : u
      )
    );
    if (selectedUnit && selectedUnit.id === unitId) {
      setSelectedUnit({
        ...selectedUnit,
        coordinator_id: newCoordinatorId,
        coordinator: assignedProfile
          ? {
              id: assignedProfile.id,
              full_name: assignedProfile.full_name,
              email: assignedProfile.email,
              department: assignedProfile.department,
            }
          : undefined,
      });
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return"0 B";
    const k = 1024;
    const sizes = ["B","KB","MB","GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  const filteredFiles = useMemo(() => {
    return unitFiles.filter((f) => {
      if (selectedCategory !=="All" && f.category !== selectedCategory) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          f.title.toLowerCase().includes(q) ||
          f.file_name.toLowerCase().includes(q) ||
          f.description?.toLowerCase().includes(q) ||
          f.uploader?.full_name.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [unitFiles, selectedCategory, searchQuery]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <PageHeader
        title={selectedUnit ? selectedUnit.unit_name :"Organizations"}
        onRefresh={!selectedUnit ? loadData : undefined}
        isRefreshing={isLoading}
        extraActions={
          selectedUnit ? (
            <button
              type="button"
              onClick={() => setSelectedUnit(null)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-[#FFFFFF] border border-[#E3DDD1] text-[#1C2420] hover:bg-[#FAF8F5] transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>All Units</span>
            </button>
          ) : undefined
        }
        primaryAction={
          selectedUnit
            ? {
                label:"Upload Document",
                icon: <UploadCloud className="w-4 h-4" />,
                onClick: () => setIsUploadModalOpen(true),
              }
            : undefined
        }
      />

      {/* Main Content Views */}
      {!selectedUnit ? (
        <div className="space-y-4">
          {isLoading ? (
            <div className="py-16 text-center text-[#5C6660] space-y-2">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto text-[#0F3D2E]" />
              <p className="text-xs">Loading units...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {units.map((unit) => (
                <UnitCard
                  key={unit.id}
                  unit={unit}
                  onSelect={handleSelectUnit}
                  onAssignCoordinator={(u) => setUnitToAssign(u)}
                  isPrivileged={isPrivileged}
                />
              ))}
            </div>
          )}
        </div>
      ) : (
        /* Unit File Vault */
        <div className="space-y-6">
          {/* Filters Bar */}
          <div className="bg-white p-4 rounded-2xl border border-sand-200 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-sand-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search documents by title, file name, or uploader..."
                className="w-full pl-9 pr-3 py-2 rounded-xl text-xs border border-sand-300 bg-sand-50/50 text-cyprus-900 focus:outline-hidden focus:ring-2 focus:ring-cyprus-700"
              />
            </div>

            {/* Category Filter */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs font-semibold text-sand-600 mr-1 flex items-center gap-1">
                <Filter className="w-3.5 h-3.5" />
                <span>Category:</span>
              </span>
              {[
"All",
"Action Plan",
"Accomplishment Report",
"Attendance / Minutes",
"Photo Documentation",
"Financial / Inventory",
              ].map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    selectedCategory === cat
                      ?"bg-cyprus-900 text-white shadow-xs"
                      :"bg-sand-100 text-sand-700 hover:text-cyprus-900 border border-sand-200"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Documents Grid */}
          {isLoadingFiles ? (
            <div className="py-16 text-center text-sand-500 space-y-2">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto text-cyprus-800" />
              <p className="text-xs">Loading unit documents...</p>
            </div>
          ) : filteredFiles.length === 0 ? (
            <div className="bg-white rounded-2xl border border-sand-200 p-12 text-center space-y-4">
              <FolderOpen className="w-12 h-12 mx-auto text-sand-400" />
              <div>
                <h3 className="text-sm font-bold text-cyprus-900">
                  No documents in this vault
                </h3>
                <p className="text-xs text-sand-600 mt-1 max-w-md mx-auto">
                  Upload an action plan, project proposal, or accomplishment report to populate this unit's archive.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsUploadModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-crimson-600 hover:bg-crimson-700 text-white shadow-xs transition-colors cursor-pointer"
              >
                <UploadCloud className="w-4 h-4" />
                <span>Upload First Document</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredFiles.map((file) => {
                const canDelete =
                  isPrivileged ||
                  file.uploader_id === profile?.id ||
                  selectedUnit.coordinator_id === profile?.id;

                return (
                  <div
                    key={file.id}
                    className="bg-white rounded-2xl border border-sand-200 p-5 shadow-xs flex flex-col justify-between gap-4 transition-colors"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-sand-100 text-sand-800 border border-sand-200">
                          {file.category}
                        </span>

                        <span
                          className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full border ${
                            file.visibility ==="Public"
                              ?"bg-teal-50 text-teal-800 border-teal-200"
                              : file.visibility ==="Confidential"
                              ?"bg-crimson-50 text-crimson-800 border-crimson-200"
                              :"bg-sand-100 text-sand-800 border-sand-200"
                          }`}
                        >
                          {file.visibility ==="Public" ? (
                            <Globe className="w-3 h-3" />
                          ) : file.visibility ==="Confidential" ? (
                            <Lock className="w-3 h-3" />
                          ) : (
                            <ShieldCheck className="w-3 h-3" />
                          )}
                          <span>{file.visibility}</span>
                        </span>
                      </div>

                      <div>
                        <h4 className="text-sm font-bold text-cyprus-900 font-display line-clamp-2">
                          {file.title}
                        </h4>
                        {file.description && (
                          <p className="mt-1 text-xs text-sand-700 line-clamp-2 leading-relaxed">
                            {file.description}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="pt-3 border-t border-sand-200 space-y-2 text-xs text-sand-600">
                      <div className="flex items-center justify-between">
                        <span className="truncate max-w-[180px] font-mono text-[11px]">
                          {file.file_name}
                        </span>
                        <span className="font-semibold">{formatFileSize(file.file_size)}</span>
                      </div>

                      <div className="flex items-center justify-between gap-2 pt-1">
                        <span className="flex items-center gap-1 text-[11px]">
                          <Calendar className="w-3 h-3" />
                          <span>{new Date(file.created_at ||"").toLocaleDateString()}</span>
                        </span>

                        <div className="flex items-center gap-1">
                          <a
                            href={file.file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 rounded-lg text-cyprus-800 hover:text-cyprus-900 hover:bg-sand-100 transition-colors"
                            title="Download Document"
                          >
                            <FileDown className="w-4 h-4" />
                          </a>

                          {canDelete && (
                            <button
                              type="button"
                              onClick={() => {
                                if (window.confirm(`Delete"${file.title}"?`)) {
                                  handleDeleteFile(file.id);
                                }
                              }}
                              className="p-1.5 rounded-lg text-sand-500 hover:text-crimson-600 hover:bg-crimson-50 transition-colors cursor-pointer"
                              title="Delete File"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Upload Modal */}
      {isUploadModalOpen && selectedUnit && profile && (
        <UploadFileModal
          isOpen={isUploadModalOpen}
          onClose={() => setIsUploadModalOpen(false)}
          unitId={selectedUnit.id}
          unitName={selectedUnit.unit_name}
          uploaderId={profile.id}
          onFileUploaded={handleFileUploaded}
        />
      )}

      {/* Assign Coordinator Modal */}
      {unitToAssign && (
        <AssignCoordinatorModal
          isOpen={Boolean(unitToAssign)}
          onClose={() => setUnitToAssign(null)}
          unit={unitToAssign}
          teachers={teachers}
          onCoordinatorAssigned={handleCoordinatorAssigned}
        />
      )}
    </div>
  );
};
