import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { Clock, RefreshCw, LogOut, ShieldAlert, CheckCircle2 } from "lucide-react";

export const PendingVerificationView: React.FC = () => {
  const { profile, user, logout, refreshProfile } = useAuth();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshedNotice, setRefreshedNotice] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refreshProfile();
    setIsRefreshing(false);
    setRefreshedNotice(true);
    setTimeout(() => setRefreshedNotice(false), 3000);
  };

  return (
    <div className="min-h-screen bg-linen-textured flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-[#FFFFFF] py-10 px-6 sm:px-8 shadow-sm rounded-2xl border border-[#E3DDD1] text-center space-y-6">
          <div className="mx-auto w-16 h-16 rounded-full bg-[#FAF8F5] flex items-center justify-center border border-[#E3DDD1]">
            <Clock className="w-8 h-8 text-[#9E1B32]" aria-hidden="true" />
          </div>

          <div>
            <h1 className="text-xl font-semibold text-[#1C2420] font-display">
              Account Awaiting Verification
            </h1>
            <p className="mt-1.5 text-sm text-[#5C6660]">
              {profile?.full_name || user?.email || "Teacher"}
            </p>
          </div>

          <div className="p-4 bg-[#FAF8F5] border border-[#E3DDD1] rounded-xl text-xs text-left text-[#1C2420] space-y-2">
            <div className="flex items-center gap-2 font-semibold text-[#9E1B32]">
              <ShieldAlert className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>Administrative Approval Required</span>
            </div>
            <p className="text-[#5C6660]">
              Newly registered accounts require approval from the Super Admin or School Head before accessing school modules.
            </p>
            <div className="pt-2 border-t border-[#E3DDD1] text-[11px] text-[#5C6660]">
              Email: <span className="font-mono font-medium text-[#1C2420]">{profile?.email || user?.email}</span>
            </div>
          </div>

          {refreshedNotice && (
            <div
              role="status"
              className="p-2.5 bg-[#E6EFEA] border border-[#B8CEC5] text-[#0F3D2E] text-xs rounded-lg flex items-center justify-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>Still awaiting administrative approval.</span>
            </div>
          )}

          <div className="space-y-2.5 pt-2">
            <button
              type="button"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-medium text-[#FFFFFF] bg-[#0F3D2E] hover:bg-[#0A2E22] transition-colors disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`} />
              <span>{isRefreshing ? "Checking..." : "Check Approval Status"}</span>
            </button>

            <button
              type="button"
              onClick={logout}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-medium text-[#5C6660] hover:bg-[#FAF8F5] hover:text-[#1C2420] transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
