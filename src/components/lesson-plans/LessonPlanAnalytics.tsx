import React from "react";
import type { LessonPlanAnalyticsData } from "../../types";
import { StatCard } from "../common/StatCard";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import {
  FileCheck2,
  Clock,
  AlertTriangle,
  Award,
  TrendingUp,
  BarChart3,
  PieChart as PieIcon,
  AlertCircle,
} from "lucide-react";

interface LessonPlanAnalyticsProps {
  data: LessonPlanAnalyticsData;
  isPrivileged?: boolean;
}

export const LessonPlanAnalytics: React.FC<LessonPlanAnalyticsProps> = ({
  data,
  isPrivileged = true,
}) => {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label={isPrivileged ? "Total Submissions" : "My Submissions"}
          value={data.totalSubmissions}
          icon={<FileCheck2 className="w-4 h-4" />}
        />
        <StatCard
          label={isPrivileged ? "On-Time Rate" : "My On-Time Rate"}
          value={`${data.onTimeRate}%`}
          icon={<Clock className="w-4 h-4" />}
          accent="green"
        />
        <StatCard
          label={isPrivileged ? "Pending Review" : "Awaiting Review"}
          value={data.pendingReviewCount}
          icon={<AlertTriangle className="w-4 h-4" />}
        />
        <StatCard
          label={data.needsRevisionCount > 0 ? "Needs Revision" : "Noted & Verified"}
          value={data.needsRevisionCount > 0 ? data.needsRevisionCount : data.approvedCount}
          icon={
            data.needsRevisionCount > 0 ? (
              <AlertCircle className="w-4 h-4" />
            ) : (
              <Award className="w-4 h-4" />
            )
          }
          accent={data.needsRevisionCount > 0 ? "crimson" : "green"}
        />
      </div>

      {/* Visual Charts */}
      <div className={`grid grid-cols-1 ${data.statusDistribution.length > 0 ? "lg:grid-cols-3" : ""} gap-6`}>
        <div className={`${data.statusDistribution.length > 0 ? "lg:col-span-2" : "w-full"} bg-[#FFFFFF] p-5 rounded-xl border border-[#E3DDD1]`}>
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-4 h-4 text-[#0F3D2E]" />
            <h2 className="text-sm font-semibold text-[#1C2420] font-display">
              {isPrivileged ? "10-Week Submission Trend" : "My Submission Trend"}
            </h2>
          </div>

          <div className="h-64 sm:h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.weeklyTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="submittedGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0F3D2E" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#0F3D2E" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="approvedGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#18523F" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#18523F" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E3DDD1" />
                <XAxis dataKey="week" tick={{ fontSize: 11, fill: "#5C6660" }} stroke="#E3DDD1" />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#5C6660" }} stroke="#E3DDD1" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#FFFFFF",
                    borderColor: "#E3DDD1",
                    borderRadius: "8px",
                    color: "#1C2420",
                    fontSize: "12px",
                  }}
                />
                <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "8px" }} />
                <Area
                  type="monotone"
                  dataKey="submitted"
                  name={isPrivileged ? "Submitted DLLs" : "My Submissions"}
                  stroke="#0F3D2E"
                  fillOpacity={1}
                  fill="url(#submittedGrad)"
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="approved"
                  name="Noted by School Head"
                  stroke="#18523F"
                  fillOpacity={1}
                  fill="url(#approvedGrad)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {data.statusDistribution.length > 0 && (
          <div className="bg-[#FFFFFF] p-5 rounded-xl border border-[#E3DDD1] flex flex-col justify-between">
            <div className="flex items-center gap-2 mb-2">
              <PieIcon className="w-4 h-4 text-[#9E1B32]" />
              <h2 className="text-sm font-semibold text-[#1C2420] font-display">
                Review Status
              </h2>
            </div>

            <div className="h-56 w-full my-auto">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.statusDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {data.statusDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#FFFFFF",
                      borderColor: "#E3DDD1",
                      borderRadius: "8px",
                      color: "#1C2420",
                      fontSize: "12px",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="space-y-1.5 pt-3 border-t border-[#E3DDD1]">
              {data.statusDistribution.map((item) => (
                <div key={item.name} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-[#5C6660]">{item.name}</span>
                  </div>
                  <span className="font-semibold text-[#1C2420] tabular-nums">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {isPrivileged && data.departmentCompliance.length > 0 && (
        <div className="bg-[#FFFFFF] p-5 rounded-xl border border-[#E3DDD1]">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-4 h-4 text-[#0F3D2E]" />
            <h2 className="text-sm font-semibold text-[#1C2420] font-display">
              Department Compliance
            </h2>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data.departmentCompliance}
                margin={{ top: 10, right: 10, left: -20, bottom: 25 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#E3DDD1" />
                <XAxis
                  dataKey="department"
                  tick={{ fontSize: 10, fill: "#5C6660" }}
                  interval={0}
                  angle={-15}
                  textAnchor="end"
                  stroke="#E3DDD1"
                />
                <YAxis
                  unit="%"
                  domain={[0, 100]}
                  tick={{ fontSize: 11, fill: "#5C6660" }}
                  stroke="#E3DDD1"
                />
                <Tooltip
                  formatter={(val) => [`${val}%`, "Compliance"]}
                  contentStyle={{
                    backgroundColor: "#FFFFFF",
                    borderColor: "#E3DDD1",
                    borderRadius: "8px",
                    color: "#1C2420",
                    fontSize: "12px",
                  }}
                />
                <Bar dataKey="submissionRate" name="Compliance %" fill="#0F3D2E" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
};
