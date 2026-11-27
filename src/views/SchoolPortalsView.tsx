import React, { useState } from "react";
import { PageHeader } from "../components/common/PageHeader";
import {
  ExternalLink,
  RefreshCw,
  Maximize2,
  Minimize2,
  Copy,
  Check,
  Globe,
  ClipboardCheck,
  Boxes,
  ArrowUpRight,
} from "lucide-react";

interface ExternalPortalDef {
  id: "exam" | "inventory";
  name: string;
  tagline: string;
  description: string;
  url: string;
  highlights: string[];
  accentBg: string;
  accentText: string;
  accentBorder: string;
  buttonBg: string;
  buttonHoverBg: string;
  icon: React.ReactNode;
}

const EXTERNAL_PORTALS: ExternalPortalDef[] = [
  {
    id: "exam",
    name: "FTNHS Online Exam Portal",
    tagline: "Assessment & Automated Grading",
    description:
      "Digital examination, automated grading, and student assessment web application.",
    url: "https://ferminexam.onrender.com",
    highlights: [
      "Digital examinations & timed online student assessments",
      "Automated score computation and instant item exports",
      "Ready for Item Analysis (MPS) and E-Class Record import",
    ],
    accentBg: "bg-[#E6EFEA]",
    accentText: "text-[#0F3D2E]",
    accentBorder: "border-[#B8CEC5]",
    buttonBg: "bg-[#0F3D2E]",
    buttonHoverBg: "hover:bg-[#0A2E22]",
    icon: <ClipboardCheck className="w-5 h-5" />,
  },
  {
    id: "inventory",
    name: "Smart FTNHS Inventory",
    tagline: "Supply & Equipment Operations",
    description: "Comprehensive school inventory operations hub.",
    url: "https://smartftnhs.onrender.com",
    highlights: [
      "Centralized school property, equipment, and supply tracking",
      "Classroom asset monitoring, issuance, and custodian records",
      "Real-time stock visibility and operational inventory reports",
    ],
    accentBg: "bg-[#FBECEF]",
    accentText: "text-[#9E1B32]",
    accentBorder: "border-[#F3B8C2]",
    buttonBg: "bg-[#9E1B32]",
    buttonHoverBg: "hover:bg-[#7D1527]",
    icon: <Boxes className="w-5 h-5" />,
  },
];

export const SchoolPortalsView: React.FC = () => {
  const [expandedPortalId, setExpandedPortalId] = useState<"exam" | "inventory" | null>(null);
  const [reloadKeys, setReloadKeys] = useState<Record<string, number>>({
    exam: 0,
    inventory: 0,
  });
  const [loadedMap, setLoadedMap] = useState<Record<string, boolean>>({
    exam: false,
    inventory: false,
  });
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleReloadPreview = (portalId: "exam" | "inventory") => {
    setLoadedMap((prev) => ({ ...prev, [portalId]: false }));
    setReloadKeys((prev) => ({ ...prev, [portalId]: (prev[portalId] || 0) + 1 }));
  };

  const handleCopyUrl = async (portal: ExternalPortalDef) => {
    try {
      await navigator.clipboard.writeText(portal.url);
      setCopiedId(portal.id);
      window.setTimeout(() => {
        setCopiedId((curr) => (curr === portal.id ? null : curr));
      }, 2000);
    } catch {
      // Clipboard fallback ignored gracefully
    }
  };

  const expandedPortal = expandedPortalId
    ? EXTERNAL_PORTALS.find((p) => p.id === expandedPortalId) || null
    : null;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <PageHeader
        title="School Portals"
        extraActions={
          expandedPortal ? (
            <button
              type="button"
              onClick={() => setExpandedPortalId(null)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#E3DDD1] bg-white hover:bg-[#FAF8F5] text-xs font-semibold text-[#1C2420] cursor-pointer transition-colors"
            >
              <Minimize2 className="w-3.5 h-3.5" />
              <span>View Both Portals</span>
            </button>
          ) : undefined
        }
      />

      {/* Intro Banner */}
      <div className="bg-white rounded-2xl border border-[#E3DDD1] p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#E6EFEA] text-[#0F3D2E] flex items-center justify-center shrink-0">
            <Globe className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-[#1C2420] font-display">
              Connected FTNHS Web Applications
            </h2>
            <p className="text-xs text-[#5C6660] mt-0.5">
              Preview live interfaces below or launch each web portal directly in a dedicated browser
              tab. Note: Render-hosted services may take a few seconds to wake on first load.
            </p>
          </div>
        </div>
      </div>

      {/* Expanded Single-Portal Interactive Preview */}
      {expandedPortal ? (
        <div className="bg-white rounded-2xl border border-[#E3DDD1] shadow-sm overflow-hidden">
          <div className="p-4 border-b border-[#E3DDD1] bg-[#FAF8F5] flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div
                className={`w-9 h-9 rounded-xl ${expandedPortal.accentBg} ${expandedPortal.accentText} flex items-center justify-center shrink-0`}
              >
                {expandedPortal.icon}
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-sm font-bold text-[#1C2420] font-display">
                    {expandedPortal.name}
                  </h3>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${expandedPortal.accentBg} ${expandedPortal.accentText}`}
                  >
                    {expandedPortal.tagline}
                  </span>
                </div>
                <p className="text-xs font-mono text-[#5C6660] mt-0.5">{expandedPortal.url}</p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center rounded-lg border border-[#E3DDD1] bg-white p-0.5">
                {EXTERNAL_PORTALS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setExpandedPortalId(p.id)}
                    className={`px-2.5 py-1 rounded-md text-xs font-semibold cursor-pointer transition-colors ${
                      p.id === expandedPortal.id
                        ? `${p.accentBg} ${p.accentText}`
                        : "text-[#5C6660] hover:text-[#1C2420]"
                    }`}
                  >
                    {p.id === "exam" ? "Exam Portal" : "Smart Inventory"}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={() => handleReloadPreview(expandedPortal.id)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E3DDD1] bg-white hover:bg-[#FAF8F5] text-xs font-medium text-[#1C2420] cursor-pointer"
                title="Reload preview"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Reload</span>
              </button>

              <button
                type="button"
                onClick={() => handleCopyUrl(expandedPortal)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E3DDD1] bg-white hover:bg-[#FAF8F5] text-xs font-medium text-[#1C2420] cursor-pointer"
              >
                {copiedId === expandedPortal.id ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-[#0F3D2E]" />
                    <span className="text-[#0F3D2E]">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Link</span>
                  </>
                )}
              </button>

              <a
                href={expandedPortal.url}
                target="_blank"
                rel="noopener noreferrer"
                className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold text-white transition-colors ${expandedPortal.buttonBg} ${expandedPortal.buttonHoverBg}`}
              >
                <span>Open Portal</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

          <div className="relative w-full h-[640px] bg-[#FAF8F5]">
            {!loadedMap[expandedPortal.id] && (
              <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-[#FAF8F5]/90 z-10 pointer-events-none">
                <RefreshCw className="w-7 h-7 text-[#0F3D2E] animate-spin mb-2" />
                <p className="text-xs font-semibold text-[#1C2420]">
                  Loading live preview for {expandedPortal.name}...
                </p>
                <p className="text-[11px] text-[#5C6660] mt-1 max-w-md">
                  If the preview stays blank due to cold-start wakeup or browser embedding policy,
                  use &ldquo;Open Portal&rdquo; above to launch directly.
                </p>
              </div>
            )}
            <iframe
              key={`${expandedPortal.id}-${reloadKeys[expandedPortal.id] || 0}`}
              src={expandedPortal.url}
              title={`${expandedPortal.name} Live Preview`}
              loading="lazy"
              onLoad={() =>
                setLoadedMap((prev) => ({ ...prev, [expandedPortal.id]: true }))
              }
              className="w-full h-full border-0 bg-white"
            />
          </div>
        </div>
      ) : (
        /* Side-by-Side Portal Cards with Embedded Live Previews */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {EXTERNAL_PORTALS.map((portal) => {
            const isLoaded = Boolean(loadedMap[portal.id]);
            return (
              <article
                key={portal.id}
                className="bg-white rounded-2xl border border-[#E3DDD1] shadow-xs overflow-hidden flex flex-col transition-shadow hover:shadow-md"
              >
                {/* Card Header */}
                <div className="p-5 border-b border-[#E3DDD1] space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div
                        className={`w-11 h-11 rounded-xl ${portal.accentBg} ${portal.accentText} border ${portal.accentBorder} flex items-center justify-center shrink-0`}
                      >
                        {portal.icon}
                      </div>
                      <div>
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${portal.accentBg} ${portal.accentText}`}
                        >
                          {portal.tagline}
                        </span>
                        <h3 className="text-base font-bold text-[#1C2420] font-display mt-1">
                          {portal.name}
                        </h3>
                      </div>
                    </div>

                    <a
                      href={portal.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-white shrink-0 transition-colors ${portal.buttonBg} ${portal.buttonHoverBg}`}
                    >
                      <span>Open</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </a>
                  </div>

                  <p className="text-xs text-[#5C6660] leading-relaxed">{portal.description}</p>

                  <ul className="space-y-1 text-[11px] text-[#404B45]">
                    {portal.highlights.map((item) => (
                      <li key={item} className="flex items-center gap-2">
                        <span
                          className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                            portal.id === "exam" ? "bg-[#0F3D2E]" : "bg-[#9E1B32]"
                          }`}
                          aria-hidden="true"
                        />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Browser Window Live Preview Frame */}
                <div className="p-4 bg-[#FAF8F5] flex-1 flex flex-col gap-3">
                  <div className="rounded-xl border border-[#E3DDD1] bg-white overflow-hidden shadow-xs flex flex-col">
                    {/* Browser Chrome Bar */}
                    <div className="px-3 py-2 bg-[#F4F1EA] border-b border-[#E3DDD1] flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 shrink-0" aria-hidden="true">
                        <span className="w-2.5 h-2.5 rounded-full bg-[#9E1B32]/70" />
                        <span className="w-2.5 h-2.5 rounded-full bg-[#F59E0B]/80" />
                        <span className="w-2.5 h-2.5 rounded-full bg-[#0F3D2E]/75" />
                      </div>

                      <div className="flex-1 min-w-0 px-2.5 py-1 rounded-md bg-white border border-[#E3DDD1] text-[11px] font-mono text-[#5C6660] truncate">
                        {portal.url}
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleReloadPreview(portal.id)}
                          className="p-1.5 rounded-md text-[#5C6660] hover:text-[#1C2420] hover:bg-white cursor-pointer"
                          title={`Reload ${portal.name} preview`}
                          aria-label={`Reload ${portal.name} preview`}
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setExpandedPortalId(portal.id)}
                          className="p-1.5 rounded-md text-[#5C6660] hover:text-[#0F3D2E] hover:bg-white cursor-pointer"
                          title={`Expand ${portal.name} preview`}
                          aria-label={`Expand ${portal.name} preview`}
                        >
                          <Maximize2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Live Iframe Preview Viewport */}
                    <div className="relative w-full h-72 sm:h-80 bg-white overflow-hidden">
                      {!isLoaded && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center bg-[#FAF8F5]/95 z-10 pointer-events-none">
                          <RefreshCw className="w-6 h-6 text-[#0F3D2E] animate-spin mb-2" />
                          <span className="text-xs font-semibold text-[#1C2420]">
                            Connecting to {portal.name}...
                          </span>
                          <span className="text-[11px] text-[#5C6660] mt-1 max-w-xs">
                            Live preview loading. Click &ldquo;Open Portal&rdquo; below anytime to
                            view full screen.
                          </span>
                        </div>
                      )}
                      <iframe
                        key={`${portal.id}-${reloadKeys[portal.id] || 0}`}
                        src={portal.url}
                        title={`${portal.name} Preview`}
                        loading="lazy"
                        onLoad={() =>
                          setLoadedMap((prev) => ({ ...prev, [portal.id]: true }))
                        }
                        className="w-[142%] h-[142%] origin-top-left scale-[0.704] border-0 bg-white"
                      />
                    </div>
                  </div>

                  {/* Card Footer Action Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleCopyUrl(portal)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E3DDD1] bg-white hover:bg-[#F4F1EA] text-xs font-medium text-[#404B45] cursor-pointer transition-colors"
                      >
                        {copiedId === portal.id ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-[#0F3D2E]" />
                            <span className="text-[#0F3D2E] font-semibold">Copied URL</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Copy URL</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => setExpandedPortalId(portal.id)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E3DDD1] bg-white hover:bg-[#F4F1EA] text-xs font-medium text-[#404B45] cursor-pointer transition-colors"
                      >
                        <Maximize2 className="w-3.5 h-3.5" />
                        <span>Expand Preview</span>
                      </button>
                    </div>

                    <a
                      href={portal.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold text-white transition-colors ${portal.buttonBg} ${portal.buttonHoverBg}`}
                    >
                      <span>Open Portal</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
};
