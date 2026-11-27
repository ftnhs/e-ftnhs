import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useAuth } from "../context/AuthContext";
import { fetchMemos, fetchMemoDetails, deleteMemo } from "../services/memoService";
import type { SchoolMemo } from "../types";
import { PageHeader } from "../components/common/PageHeader";
import { MemoCard } from "../components/memos/MemoCard";
import { CreateMemoModal } from "../components/memos/CreateMemoModal";
import { MemoReaderModal } from "../components/memos/MemoReaderModal";
import {
  Bell,
  Search,
  Filter,
  PlusCircle,
  RefreshCw,
} from "lucide-react";

export const SchoolMemosView: React.FC = () => {
  const { profile, isAdmin, isSchoolHead } = useAuth();
  const isPrivileged = isAdmin || isSchoolHead;

  const [memos, setMemos] = useState<SchoolMemo[]>([]);
  const [selectedMemo, setSelectedMemo] = useState<SchoolMemo | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [isReaderModalOpen, setIsReaderModalOpen] = useState<boolean>(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [priorityFilter, setPriorityFilter] = useState<string>("All");

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await fetchMemos(profile?.id);
      setMemos(data);
    } catch (err) {
      console.error("Error loading memos:", err);
    } finally {
      setIsLoading(false);
    }
  }, [profile?.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSelectMemo = async (memo: SchoolMemo) => {
    const detailed = await fetchMemoDetails(memo.id);
    setSelectedMemo(detailed || memo);
    setIsReaderModalOpen(true);
  };

  const handleDeleteMemo = async (id: string) => {
    const ok = await deleteMemo(id);
    if (ok) {
      setMemos((prev) => prev.filter((m) => m.id !== id));
      if (selectedMemo?.id === id) {
        setSelectedMemo(null);
        setIsReaderModalOpen(false);
      }
    }
  };

  const handleMemoCreated = (newMemo: SchoolMemo) => {
    setMemos((prev) => [newMemo, ...prev]);
  };

  const handleAcknowledged = (memoId: string) => {
    setMemos((prev) =>
      prev.map((m) =>
        m.id === memoId
          ? {
              ...m,
              is_acknowledged: true,
              acknowledgment_count: (m.acknowledgment_count || 0) + 1,
            }
          : m
      )
    );
    if (selectedMemo && selectedMemo.id === memoId) {
      setSelectedMemo({
        ...selectedMemo,
        is_acknowledged: true,
        acknowledgment_count: (selectedMemo.acknowledgment_count || 0) + 1,
      });
    }
  };

  // Filtered memos
  const filteredMemos = useMemo(() => {
    return memos.filter((m) => {
      if (priorityFilter !== "All" && m.priority !== priorityFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          m.title.toLowerCase().includes(q) ||
          m.memo_number.toLowerCase().includes(q) ||
          m.content.toLowerCase().includes(q) ||
          m.target_audience.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [memos, priorityFilter, searchQuery]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <PageHeader
        title="School Memos"
        onRefresh={loadData}
        isRefreshing={isLoading}
        primaryAction={
          isPrivileged
            ? {
                label: "Broadcast Memo",
                icon: <PlusCircle className="w-4 h-4" />,
                onClick: () => setIsCreateModalOpen(true),
              }
            : undefined
        }
      />

      {/* Filters Bar */}
      <div className="bg-[#FFFFFF] p-4 rounded-xl border border-[#E3DDD1] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#5C6660]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search memo number, title, or directives..."
            className="w-full pl-9 pr-3 py-2 rounded-lg text-xs border border-[#E3DDD1] bg-[#FAF8F5] text-[#1C2420]"
          />
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs font-medium text-[#5C6660] mr-1 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" />
            <span>Priority:</span>
          </span>
          {["All", "Urgent", "Standard", "FYI"].map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPriorityFilter(p)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                priorityFilter === p
                  ? "bg-[#0F3D2E] text-[#FFFFFF]"
                  : "bg-[#FAF8F5] text-[#5C6660] hover:text-[#1C2420] border border-[#E3DDD1]"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Memos Grid */}
      {isLoading ? (
        <div className="py-16 text-center text-[#5C6660] space-y-2">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto text-[#0F3D2E]" />
          <p className="text-xs">Loading memoranda...</p>
        </div>
      ) : filteredMemos.length === 0 ? (
        <div className="bg-[#FFFFFF] rounded-xl border border-[#E3DDD1] p-12 text-center space-y-3">
          <Bell className="w-8 h-8 mx-auto text-[#5C6660]" />
          <p className="text-sm font-semibold text-[#1C2420]">No memoranda found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredMemos.map((memo) => (
            <MemoCard
              key={memo.id}
              memo={memo}
              onSelect={handleSelectMemo}
              onDelete={handleDeleteMemo}
              isPrivileged={isPrivileged}
            />
          ))}
        </div>
      )}

      {/* 4. Create Modal */}
      {isCreateModalOpen && profile && (
        <CreateMemoModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          authorId={profile.id}
          onMemoCreated={handleMemoCreated}
        />
      )}

      {/* 5. Reader Modal */}
      {isReaderModalOpen && selectedMemo && (
        <MemoReaderModal
          isOpen={isReaderModalOpen}
          onClose={() => setIsReaderModalOpen(false)}
          memo={selectedMemo}
          currentUser={profile}
          isPrivileged={isPrivileged}
          onAcknowledged={handleAcknowledged}
        />
      )}
    </div>
  );
};
