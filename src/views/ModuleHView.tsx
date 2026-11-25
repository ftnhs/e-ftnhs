import React, { useState, useEffect, useCallback } from"react";
import { useAuth } from"../context/AuthContext";
import { supabase } from"../lib/supabase";
import {
  fetchCOTObservations,
  fetchRPMSPortfolio,
} from"../services/rpmsCotService";
import type {
  COTObservation,
  RPMSPortfolioItem,
  Profile,
  Subject,
  Section,
  AcademicTerm,
} from"../types";
import { PageHeader } from"../components/common/PageHeader";
import { NewCOTObservationModal } from"../components/rpms/NewCOTObservationModal";
import {
  Award,
  PlusCircle,
  RefreshCw,
  Layers,
} from"lucide-react";

export const ModuleHView: React.FC = () => {
  const { profile, isAdmin, isSchoolHead } = useAuth();
  const isPrivileged = isAdmin || isSchoolHead;

  // Dual role support: allows Super Admin who also teaches to access personal RPMS portfolio & MOVs
  const [viewMode, setViewMode] = useState<"supervisor" |"my-portfolio">(
    isAdmin ?"my-portfolio" : isPrivileged ?"supervisor" :"my-portfolio"
  );
  const effectivePrivileged = isPrivileged && viewMode ==="supervisor";

  const [activeTab, setActiveTab] = useState<"cot" |"portfolio">("cot");
  const [observations, setObservations] = useState<COTObservation[]>([]);
  const [portfolioItems, setPortfolioItems] = useState<RPMSPortfolioItem[]>([]);
  const [selectedObservation, setSelectedObservation] = useState<COTObservation | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Aux catalogs
  const [teachers, setTeachers] = useState<Profile[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [activeTerm, setActiveTerm] = useState<AcademicTerm | null>(null);

  // Modal
  const [isNewObsModalOpen, setIsNewObsModalOpen] = useState<boolean>(false);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data: termData } = await supabase
        .from("academic_terms")
        .select("*")
        .eq("is_active", true)
        .single();

      if (termData) setActiveTerm(termData);

      let sectionsQuery = supabase.from("sections").select("*").order("grade_level").order("section_name");
      if (termData?.id) {
        sectionsQuery = sectionsQuery.eq("term_id", termData.id);
      }

      const [obsList, portList, teachersRes, subjectsRes, sectionsRes] = await Promise.all([
        fetchCOTObservations(termData?.id, effectivePrivileged ? undefined : profile?.id),
        fetchRPMSPortfolio(termData?.id, effectivePrivileged ? undefined : profile?.id),
        supabase.from("profiles").select("*").eq("status","Approved").order("full_name"),
        supabase.from("subjects_catalog").select("*").order("subject_name"),
        sectionsQuery,
      ]);

      setObservations(obsList);
      setPortfolioItems(portList);
      if (teachersRes.data) setTeachers(teachersRes.data);
      if (subjectsRes.data) setSubjects(subjectsRes.data);
      if (sectionsRes.data) setSections(sectionsRes.data);

      if (obsList.length > 0 && !selectedObservation) {
        setSelectedObservation(obsList[0] || null);
      }
    } catch (err) {
      console.error("Error loading COT/RPMS data:", err);
    } finally {
      setIsLoading(false);
    }
  }, [effectivePrivileged, profile?.id, selectedObservation]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleObservationCreated = (newObs: COTObservation) => {
    setObservations((prev) => [newObs, ...prev]);
    setSelectedObservation(newObs);
  };

  // KRA descriptions
  const KRA_TITLES: Record<number, string> = {
    1:"Content Knowledge & Pedagogy",
    2:"Learning Environment & Diversity",
    3:"Curriculum and Planning & Assessment",
    4:"Personal Growth & Professional Development",
    5:"Plus Factor (Coordinatorships & Services)",
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <PageHeader
        title="RPMS & COT"
        onRefresh={loadData}
        isRefreshing={isLoading}
        primaryAction={
          effectivePrivileged
            ? {
                label:"Log Observation",
                icon: <PlusCircle className="w-4 h-4" />,
                onClick: () => setIsNewObsModalOpen(true),
              }
            : undefined
        }
      />

      {/* Tabs + Inline Dual-Role Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1 p-1 bg-[#FFFFFF] border border-[#E3DDD1] rounded-xl">
          <button
            type="button"
            onClick={() => setActiveTab("cot")}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
              activeTab ==="cot"
                ?"bg-[#E6EFEA] text-[#0F3D2E]"
                :"text-[#5C6660] hover:text-[#1C2420]"
            }`}
          >
            <Award className="w-4 h-4" />
            <span>COT Observations ({observations.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("portfolio")}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
              activeTab ==="portfolio"
                ?"bg-[#E6EFEA] text-[#0F3D2E]"
                :"text-[#5C6660] hover:text-[#1C2420]"
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>RPMS Portfolio ({portfolioItems.length})</span>
          </button>
        </div>

        {isPrivileged && (
          <div className="flex items-center p-1 bg-[#FFFFFF] border border-[#E3DDD1] rounded-xl text-xs font-semibold">
            <button
              type="button"
              onClick={() => setViewMode("my-portfolio")}
              className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors cursor-pointer ${
                viewMode ==="my-portfolio"
                  ?"bg-[#0F3D2E] text-[#FFFFFF]"
                  :"text-[#5C6660] hover:text-[#1C2420]"
              }`}
            >
              My Teacher Portfolio
            </button>
            <button
              type="button"
              onClick={() => setViewMode("supervisor")}
              className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors cursor-pointer ${
                viewMode ==="supervisor"
                  ?"bg-[#0F3D2E] text-[#FFFFFF]"
                  :"text-[#5C6660] hover:text-[#1C2420]"
              }`}
            >
              School COT Observer
            </button>
          </div>
        )}
      </div>

      {/* 3. Main Views */}
      {isLoading ? (
        <div className="py-16 text-center text-sand-500 space-y-2">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto text-cyprus-800" />
          <p className="text-xs">Loading RPMS-PPST observation records...</p>
        </div>
      ) : activeTab ==="cot" ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Observation Sessions List */}
          <div className="lg:col-span-1 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-sand-600">
              Observation Cycles
            </h3>

            {observations.length === 0 ? (
              <div className="p-6 rounded-2xl bg-white border border-sand-200 text-center text-xs text-sand-500">
                No classroom observations recorded yet.
              </div>
            ) : (
              observations.map((obs) => (
                <div
                  key={obs.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelectedObservation(obs)}
                  onKeyDown={(e) => {
                    if (e.key ==="Enter" || e.key ==="") {
                      e.preventDefault();
                      setSelectedObservation(obs);
                    }
                  }}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer space-y-2 ${
                    selectedObservation?.id === obs.id
                      ?"bg-white border-cyprus-900 shadow-sm"
                      :"bg-white/60 border-sand-200 hover:border-sand-300"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-xs text-cyprus-900">
                      {obs.observation_period}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#E6EFEA] text-[#0F3D2E] border border-[#B8CEC5]">
                      Rating: {Number(obs.average_rating).toFixed(2)}
                    </span>
                  </div>

                  <div>
                    <h4 className="text-xs font-semibold text-cyprus-900">
                      {obs.teacher?.full_name ||"Faculty Member"}
                    </h4>
                    <p className="text-[11px] text-sand-600 mt-0.5">
                      {obs.subject?.subject_name} • Gr. {obs.section?.grade_level}-{obs.section?.section_name}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-sand-100 flex items-center justify-between text-[11px] text-sand-500">
                    <span>{obs.observation_date}</span>
                    <span className="font-medium text-teal-600">
                      {obs.status}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Detailed Selected Observation Card */}
          <div className="lg:col-span-2">
            {selectedObservation ? (
              <div className="bg-white rounded-3xl border border-sand-200 p-6 shadow-xs space-y-6">
                <div className="flex items-start justify-between pb-4 border-b border-sand-200 gap-4">
                  <div>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-cyprus-900 text-white shadow-xs">
                      {selectedObservation.observation_period}
                    </span>
                    <h2 className="text-lg font-bold text-cyprus-900 font-display mt-1">
                      {selectedObservation.teacher?.full_name}
                    </h2>
                    <p className="text-xs text-sand-600 mt-0.5">
                      Observer: {selectedObservation.observer?.full_name ||"School Head"} • Date: {selectedObservation.observation_date}
                    </p>
                  </div>

                  <div className="text-right">
                    <div className="text-[10px] uppercase font-bold text-sand-600">
                      PPST Composite Rating
                    </div>
                    <div className="text-2xl font-black text-crimson-600 font-display">
                      {Number(selectedObservation.average_rating).toFixed(2)}
                      <span className="text-xs font-normal text-sand-500"> / 7.00</span>
                    </div>
                  </div>
                </div>

                {/* 9 Indicators Rubric Grid */}
                <div className="space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-cyprus-900">
                    9 PPST Observable Indicators Rating
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {Object.entries(selectedObservation.indicator_ratings || {}).map(([ind, rating]) => (
                      <div
                        key={ind}
                        className="p-3 rounded-xl bg-sand-50 border border-sand-200 flex items-center justify-between"
                      >
                        <span className="text-xs font-semibold text-sand-800">
                          Indicator {ind}
                        </span>
                        <span className="w-7 h-7 rounded-lg bg-cyprus-900 text-white font-bold text-xs flex items-center justify-center">
                          {rating}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Qualitative Feedback */}
                <div className="space-y-3 pt-2">
                  {selectedObservation.strengths && (
                    <div className="p-4 rounded-2xl bg-teal-50/70 border border-teal-200 space-y-1">
                      <h4 className="text-xs font-bold text-teal-900 uppercase tracking-wide">
                        Commendable Strengths
                      </h4>
                      <p className="text-xs text-teal-800 leading-relaxed">
                        {selectedObservation.strengths}
                      </p>
                    </div>
                  )}

                  {selectedObservation.areas_for_improvement && (
                    <div className="p-4 rounded-2xl bg-[#FBECEF]/60 border border-[#F3B8C2] space-y-1">
                      <h4 className="text-xs font-bold text-[#9E1B32] uppercase tracking-wide">
                        Instructional Growth Recommendations
                      </h4>
                      <p className="text-xs text-[#1C2420] leading-relaxed">
                        {selectedObservation.areas_for_improvement}
                      </p>
                    </div>
                  )}

                  {selectedObservation.post_conference_notes && (
                    <div className="p-4 rounded-2xl bg-sand-50 border border-sand-200 space-y-1">
                      <h4 className="text-xs font-bold text-cyprus-900 uppercase tracking-wide">
                        Post-Conference Agreement Notes
                      </h4>
                      <p className="text-xs text-sand-700 leading-relaxed">
                        {selectedObservation.post_conference_notes}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="p-12 text-center text-sand-500">
                Select an observation session to view rubric ratings and post-conference notes.
              </div>
            )}
          </div>
        </div>
      ) : (
        /* RPMS-PPST Portfolio Vault */
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5].map((kra) => {
              const kraItems = portfolioItems.filter((i) => i.kra_number === kra);

              return (
                <div
                  key={kra}
                  className="bg-white rounded-2xl border border-sand-200 p-5 shadow-xs space-y-3 flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-cyprus-900 text-white">
                        KRA {kra}
                      </span>
                      <span className="text-xs text-sand-600 font-semibold">
                        {kraItems.length} MOVs
                      </span>
                    </div>

                    <h3 className="text-sm font-bold text-cyprus-900 font-display">
                      {KRA_TITLES[kra]}
                    </h3>
                  </div>

                  <div className="space-y-2 pt-2 border-t border-sand-100">
                    {kraItems.length === 0 ? (
                      <p className="text-[11px] text-sand-500 italic">No MOVs indexed yet.</p>
                    ) : (
                      kraItems.map((mov) => (
                        <div
                          key={mov.id}
                          className="p-2.5 rounded-xl bg-sand-50 border border-sand-200 space-y-1 text-xs"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-cyprus-900 text-[11px]">
                              Obj. {mov.objective_number}
                            </span>
                            <span className="text-[10px] px-1.5 py-0.2 rounded font-semibold bg-teal-100 text-teal-800">
                              {mov.status}
                            </span>
                          </div>
                          <p className="text-[11px] text-sand-700 line-clamp-2">
                            {mov.objective_description}
                          </p>
                          <span className="text-[10px] text-sand-500 italic block">
                            MOV: {mov.mov_type}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Modal */}
      {isNewObsModalOpen && activeTerm && profile && (
        <NewCOTObservationModal
          isOpen={isNewObsModalOpen}
          onClose={() => setIsNewObsModalOpen(false)}
          termId={activeTerm.id}
          observerId={profile.id}
          teachers={teachers}
          subjects={subjects}
          sections={sections}
          onObservationCreated={handleObservationCreated}
        />
      )}
    </div>
  );
};
