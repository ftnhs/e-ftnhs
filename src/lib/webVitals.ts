import { onCLS, onINP, onLCP, onFCP, onTTFB, type Metric } from "web-vitals";

/**
 * Initializes Core Web Vitals performance telemetry.
 * In development, logs metrics to console.
 * In production, can dispatch metrics to analytics endpoint or Supabase.
 */
export function initPerformanceMonitoring() {
  const reportMetric = (metric: Metric) => {
    if (import.meta.env.DEV) {
      console.log(
        `%c[Core Web Vitals] ${metric.name}: ${metric.value.toFixed(2)} (${metric.rating})`,
        metric.rating === "good"
          ? "color: #10b981; font-weight: bold;"
          : metric.rating === "needs-improvement"
            ? "color: #f59e0b; font-weight: bold;"
            : "color: #ef4444; font-weight: bold;"
      );
    }
  };

  onCLS(reportMetric);
  onINP(reportMetric);
  onLCP(reportMetric);
  onFCP(reportMetric);
  onTTFB(reportMetric);
}
