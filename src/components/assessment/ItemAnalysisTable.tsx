import React, { useState, useMemo } from"react";
import type { AssessmentItemAnalysis } from"../../types";
import {
  Search,
  Filter,
  ShieldAlert,
  ArrowUpDown,
} from"lucide-react";

interface ItemAnalysisTableProps {
  items: AssessmentItemAnalysis[];
  totalExaminees: number;
}

export const ItemAnalysisTable: React.FC<ItemAnalysisTableProps> = ({
  items,
  totalExaminees,
}) => {
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [filterAction, setFilterAction] = useState<string>("All");
  const [sortBy, setSortBy] = useState<"item" |"difficulty">("item");
  const [sortOrder, setSortOrder] = useState<"asc" |"desc">("asc");

  const filteredAndSortedItems = useMemo(() => {
    let result = [...items];

    // Filter by action or least learned
    if (filterAction ==="Least Learned") {
      result = result.filter((i) => i.is_least_learned);
    } else if (filterAction !=="All") {
      result = result.filter((i) => i.action_recommendation === filterAction);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (i) =>
          i.item_number.toString() === q ||
          i.learning_competency.toLowerCase().includes(q) ||
          i.difficulty_interpretation.toLowerCase().includes(q)
      );
    }

    // Sort
    result.sort((a, b) => {
      let comparison = 0;
      if (sortBy ==="item") {
        comparison = a.item_number - b.item_number;
      } else {
        comparison = a.difficulty_index - b.difficulty_index;
      }
      return sortOrder ==="asc" ? comparison : -comparison;
    });

    return result;
  }, [items, filterAction, searchQuery, sortBy, sortOrder]);

  const getInterpretationBadge = (interp: string) => {
    switch (interp) {
      case"Difficult":
        return"bg-crimson-100 text-crimson-800 border-crimson-300";
      case"Average":
        return"bg-emerald-100 text-emerald-800 border-emerald-300";
      case"Easy":
        return"bg-amber-100 text-amber-800 border-amber-300";
      default:
        return"bg-sand-100 text-sand-800 border-sand-300";
    }
  };

  const getActionBadge = (action: string) => {
    switch (action) {
      case"Retain":
        return"bg-teal-100 text-teal-800 border-teal-300";
      case"Revise":
        return"bg-amber-100 text-amber-800 border-amber-300";
      case"Reject":
        return"bg-crimson-100 text-crimson-800 border-crimson-300";
      default:
        return"bg-sand-100 text-sand-800 border-sand-300";
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-sand-200 p-5 shadow-xs space-y-4 transition-colors">
      {/* Table Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-sand-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search item # or competency..."
            className="w-full pl-9 pr-3 py-1.5 rounded-xl text-xs border border-sand-300 bg-sand-50/50 text-cyprus-900 focus:outline-hidden focus:ring-2 focus:ring-cyprus-700"
          />
        </div>

        {/* Filter Chips */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs font-semibold text-sand-600 mr-1 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" />
            <span>Filter:</span>
          </span>
          {["All","Least Learned","Retain","Revise","Reject"].map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => setFilterAction(opt)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                filterAction === opt
                  ?"bg-cyprus-900 text-white shadow-xs"
                  :"bg-sand-100 text-sand-700 hover:text-cyprus-900 border border-sand-200"
              }`}
            >
              {opt}
            </button>
          ))}
        </div>
      </div>

      {/* Item Analysis Data Table */}
      <div className="overflow-x-auto rounded-xl border border-sand-200">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-sand-100/80 border-b border-sand-200 text-cyprus-900 font-semibold">
              <th className="py-2.5 px-3 w-16 text-center">
                <button
                  type="button"
                  onClick={() => {
                    if (sortBy ==="item") {
                      setSortOrder(sortOrder ==="asc" ?"desc" :"asc");
                    } else {
                      setSortBy("item");
                      setSortOrder("asc");
                    }
                  }}
                  className="inline-flex items-center gap-1 hover:text-crimson-600 transition-colors cursor-pointer"
                >
                  <span>Item</span>
                  <ArrowUpDown className="w-3 h-3" />
                </button>
              </th>
              <th className="py-2.5 px-3">Curriculum Learning Competency</th>
              <th className="py-2.5 px-3 text-center w-28">Correct / Total</th>
              <th className="py-2.5 px-3 text-center w-28">
                <button
                  type="button"
                  onClick={() => {
                    if (sortBy ==="difficulty") {
                      setSortOrder(sortOrder ==="asc" ?"desc" :"asc");
                    } else {
                      setSortBy("difficulty");
                      setSortOrder("asc");
                    }
                  }}
                  className="inline-flex items-center gap-1 hover:text-crimson-600 transition-colors cursor-pointer"
                >
                  <span>Difficulty (Dj)</span>
                  <ArrowUpDown className="w-3 h-3" />
                </button>
              </th>
              <th className="py-2.5 px-3 text-center w-28">Interpretation</th>
              <th className="py-2.5 px-3 text-center w-28">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-sand-200 bg-white">
            {filteredAndSortedItems.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-sand-500">
                  No test items match the selected filter criteria.
                </td>
              </tr>
            ) : (
              filteredAndSortedItems.map((item) => (
                <tr
                  key={item.item_number}
                  className={`hover:bg-sand-50/70 transition-colors ${
                    item.is_least_learned
                      ?"bg-crimson-50/30"
                      :""
                  }`}
                >
                  {/* Item Number */}
                  <td className="py-2.5 px-3 text-center font-bold text-cyprus-900">
                    <div className="flex items-center justify-center gap-1">
                      {item.is_least_learned && (
                        <ShieldAlert
                          className="w-3.5 h-3.5 text-crimson-600 shrink-0"
                          aria-label="Least Learned Competency"
                        />
                      )}
                      <span>#{item.item_number}</span>
                    </div>
                  </td>

                  {/* Learning Competency */}
                  <td className="py-2.5 px-3 text-sand-800">
                    <span className="font-medium">{item.learning_competency}</span>
                    {item.is_least_learned && (
                      <span className="ml-2 px-1.5 py-0.5 rounded text-[10px] font-bold bg-crimson-100 text-crimson-800 border border-crimson-300">
                        Top 3 Least Learned
                      </span>
                    )}
                  </td>

                  {/* Correct / Total */}
                  <td className="py-2.5 px-3 text-center text-sand-700">
                    <span className="font-bold text-cyprus-900">
                      {item.correct_responses_count}
                    </span>
                    <span className="text-sand-500"> / {item.total_examinees || totalExaminees}</span>
                  </td>

                  {/* Difficulty Index */}
                  <td className="py-2.5 px-3 text-center font-mono font-bold text-cyprus-900">
                    {Number(item.difficulty_index).toFixed(3)}
                  </td>

                  {/* Difficulty Interpretation */}
                  <td className="py-2.5 px-3 text-center">
                    <span
                      className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold border ${getInterpretationBadge(
                        item.difficulty_interpretation
                      )}`}
                    >
                      {item.difficulty_interpretation}
                    </span>
                  </td>

                  {/* Action Recommendation */}
                  <td className="py-2.5 px-3 text-center">
                    <span
                      className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${getActionBadge(
                        item.action_recommendation
                      )}`}
                    >
                      {item.action_recommendation}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
