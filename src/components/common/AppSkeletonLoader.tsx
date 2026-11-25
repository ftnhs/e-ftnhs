import React from"react";

/**
 * Accessible Skeleton Loader used for route-level Suspense fallbacks (CLS Prevention)
 */
export const AppSkeletonLoader: React.FC = () => {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className="p-6 max-w-7xl mx-auto space-y-6 animate-pulse"
    >
      <span className="sr-only">Loading content, please wait...</span>

      {/* Header bar placeholder */}
      <div className="h-10 bg-sand-200 rounded-lg w-1/3 mb-8"></div>

      {/* Top metrics row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="h-28 bg-white border border-sand-200 rounded-xl p-4 space-y-3"
          >
            <div className="h-4 bg-sand-200 rounded w-1/2"></div>
            <div className="h-8 bg-sand-200 rounded w-1/3"></div>
          </div>
        ))}
      </div>

      {/* Main content block */}
      <div className="h-96 bg-white border border-sand-200 rounded-xl p-6 space-y-4">
        <div className="h-6 bg-sand-200 rounded w-1/4"></div>
        <div className="h-4 bg-sand-200 rounded w-full"></div>
        <div className="h-4 bg-sand-200 rounded w-5/6"></div>
        <div className="h-4 bg-sand-200 rounded w-3/4"></div>
      </div>
    </div>
  );
};
