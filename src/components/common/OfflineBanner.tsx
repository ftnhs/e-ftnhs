import React, { useState, useEffect } from "react";
import { WifiOff, RefreshCw } from "lucide-react";

/**
 * Accessible Offline / Reconnecting Status Banner (WCAG 2.2 AA & PWA Resilience)
 */
export const OfflineBanner: React.FC = () => {
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [showReconnected, setShowReconnected] = useState<boolean>(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowReconnected(true);
      const timer = setTimeout(() => setShowReconnected(false), 4000);
      return () => clearTimeout(timer);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowReconnected(false);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  if (isOnline && !showReconnected) {
    return null;
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-16 sm:bottom-4 right-4 z-50 flex items-center gap-2.5 px-4 py-2.5 rounded-lg shadow-xl text-xs sm:text-sm font-medium transition-all duration-300"
      style={{
        backgroundColor: isOnline ? "#047857" : "#d97706",
        color: "#ffffff",
      }}
    >
      {isOnline ? (
        <>
          <RefreshCw className="w-4 h-4 animate-spin" aria-hidden="true" />
          <span>Reconnected — Syncing latest timetables and memos</span>
        </>
      ) : (
        <>
          <WifiOff className="w-4 h-4" aria-hidden="true" />
          <span>Offline Mode — Viewing cached schedules & memos</span>
        </>
      )}
    </div>
  );
};
