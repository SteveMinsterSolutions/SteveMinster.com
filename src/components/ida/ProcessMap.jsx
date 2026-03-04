import { useState } from "react";

const COLORS = {
  navy: "#1B2A4A",
  blue: "#2D7DD2",
  lime: "#97D700",
  white: "#FFFFFF",
  offWhite: "#F7F8FA",
  warmGray: "#E8E6E3",
  red: "#E54B4B",
  amber: "#F0A830",
  darkText: "#1B2A4A",
  midText: "#5A6577",
  faintBorder: "#D9DCE1",
};

const painPoints = {
  "pdf-handoff": {
    title: "Unstructured Handoff",
    desc: "PDFs contain specs, but there's no standard format. Procurement has to hunt for item details, finishes, quantities, and room assignments across multiple pages and formats.",
    impact: "High",
  },
  "manual-entry": {
    title: "Manual Re-Keying",
    desc: "Every line item is typed by hand into FileMaker — SKUs, descriptions, quantities, finishes, vendor info. One project can mean hundreds of entries.",
    impact: "High",
  },
  "error-risk": {
    title: "Error-Prone Process",
    desc: "Wrong SKU, wrong finish, wrong quantity, wrong room. Each manual entry is a chance for a mistake that cascades into wrong orders and project delays.",
    impact: "High",
  },
  "no-visibility": {
    title: "Limited Visibility",
    desc: "Design has no easy way to see what's been ordered, what's pending, or what's changed. Status lives in Brandy's head and FileMaker.",
    impact: "Medium",
  },
};

const improvements = {
  "structured-export": {
    title: "Structured Bluebeam Export",
    desc: "Bluebeam's markup/schedule export features produce Excel files with item data already structured — no more reading PDFs line by line.",
    benefit: "Eliminates the PDF interpretation step entirely.",
  },
  "standard-template": {
    title: "FF&E Spreadsheet Standard",
    desc: "A shared, agreed-upon spreadsheet template becomes the 'contract' between Design and Procurement. Same columns, same format, every time.",
    benefit: "Both teams speak the same data language.",
  },
  "clean-import": {
    title: "Streamlined Entry",
    desc: "With structured data in a standard format, Procurement can work from a clean spreadsheet instead of interpreting PDFs. Future state: direct CSV import into FileMaker.",
    benefit: "Dramatically reduces manual keying and errors.",
  },
  "shared-status": {
    title: "Shared Visibility",
    desc: "The standardized spreadsheet becomes a living document both teams can reference for what's specified, what's ordered, and what's outstanding.",
    benefit: "No more 'did we order that?' conversations.",
  },
};

function StepCard({ step, isActive, onClick, variant }) {
  const isPain = variant === "current" && step.painId;
  const isImprove = variant === "target" && step.improveId;
  const isNew = variant === "target" && step.isNew;
  const detailKey = variant === "current" ? "painId" : "improveId";

  return (
    <div
      onClick={onClick}
      style={{
        position: "relative",
        background: isActive
          ? variant === "current" ? "#FFF5F5" : "#F4FBE8"
          : COLORS.white,
        border: `1.5px solid ${
          isActive
            ? variant === "current" ? COLORS.red : COLORS.lime
            : COLORS.faintBorder
        }`,
        borderRadius: 12,
        padding: "16px 18px",
        cursor: isPain || isImprove ? "pointer" : "default",
        transition: "all 0.2s ease",
        boxShadow: isActive
          ? `0 4px 16px ${variant === "current" ? "rgba(229,75,75,0.12)" : "rgba(151,215,0,0.15)"}`
          : "0 1px 3px rgba(0,0,0,0.04)",
        minHeight: 72,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        gap: 6,
      }}
    >
      {isNew && (
        <span style={{ position: "absolute", top: -9, right: 12, background: COLORS.lime, color: COLORS.navy, fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 6, letterSpacing: "0.05em", textTransform: "uppercase" }}>
          New
        </span>
      )}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ width: 28, height: 28, borderRadius: 8, background: variant === "current" ? (isPain ? `${COLORS.red}15` : `${COLORS.blue}12`) : (isNew ? `${COLORS.lime}25` : `${COLORS.blue}12`), display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0 }}>
          {step.icon}
        </div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: COLORS.darkText, lineHeight: 1.3 }}>{step.label}</div>
          <div style={{ fontSize: 11, color: COLORS.midText, lineHeight: 1.4, marginTop: 2 }}>{step.who}</div>
        </div>
      </div>
      {isPain && (
        <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 2 }}>
          <span style={{ fontSize: 10, color: COLORS.red }}>⚠</span>
          <span style={{ fontSize: 10, color: COLORS.red, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>Pain Point — tap for details</span>
        </div>
      )}
      {isImprove && (
        <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 2 }}>
          <span style={{ fontSize: 10 }}>✦</span>
          <span style={{ fontSize: 10, color: "#5A8A00", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>Improvement — tap for details</span>
        </div>
      )}
    </div>
  );
}

function Arrow() {
  return (
    <div style={{ display: "flex", justifyContent: "center", padding: "4px 0" }}>
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <path d="M10 4 L10 14 M6 11 L10 15 L14 11" stroke={COLORS.faintBorder} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

function DetailPanel({ data, variant, onClose }) {
  const isPain = variant === "current";
  return (
    <div style={{ background: isPain ? "#FFF8F8" : "#F7FCF0", border: `1.5px solid ${isPain ? "#F0C4C4" : "#C8E68A"}`, borderRadius: 12, padding: "20px 22px", marginTop: 8, position: "relative" }}>
      <button onClick={onClose} style={{ position: "absolute", top: 10, right: 12, background: "none", border: "none", fontSize: 16, color: COLORS.midText, cursor: "pointer", padding: 4 }}>✕</button>
      <div style={{ fontSize: 14, fontWeight: 700, color: isPain ? COLORS.red : "#3D6B00", marginBottom: 8 }}>{data.title}</div>
      <div style={{ fontSize: 13, color: COLORS.darkText, lineHeight: 1.6, marginBottom: isPain ? 12 : 10 }}>{data.desc}</div>
      {isPain && data.impact && (
        <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: data.impact === "High" ? "#FDE8E8" : "#FFF3D6", padding: "4px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600, color: data.impact === "High" ? COLORS.red : COLORS.amber }}>
          Impact: {data.impact}
        </div>
      )}
      {!isPain && data.benefit && (
        <div style={{ background: "#E8F5D0", padding: "8px 12px", borderRadius: 8, fontSize: 12, color: "#3D6B00", fontWeight: 500, lineHeight: 1.5 }}>
          → {data.benefit}
        </div>
      )}
    </div>
  );
}

const currentSteps = [
  { icon: "🎨", label: "Design Specifications Created", who: "Lauren's Team · Design tools", painId: null },
  { icon: "📐", label: "Drawings & Markups in Bluebeam", who: "Lauren's Team · Bluebeam", painId: null },
  { icon: "📄", label: "PDFs Exported & Sent to Procurement", who: "Design → Procurement · Email/shared drive", painId: "pdf-handoff" },
  { icon: "👀", label: "Procurement Reads & Interprets PDFs", who: "Brandy's Team · Manual review", painId: "manual-entry" },
  { icon: "⌨️", label: "Line Items Manually Entered in FileMaker", who: "Brandy's Team · FileMaker", painId: "error-risk" },
  { icon: "📧", label: "POs Generated & Emailed to Vendors", who: "FileMaker · Auto-email", painId: null },
  { icon: "❓", label: "Status Lives in Brandy's Head + FileMaker", who: "No shared visibility", painId: "no-visibility" },
];

const targetSteps = [
  { icon: "🎨", label: "Design Specifications Created", who: "Lauren's Team · Design tools", improveId: null, isNew: false },
  { icon: "📐", label: "Markups in Bluebeam (Standardized Tags)", who: "Lauren's Team · Bluebeam", improveId: "structured-export", isNew: false },
  { icon: "📊", label: "Bluebeam → FF&E Spreadsheet Export", who: "Lauren's Team · Bluebeam schedule export", improveId: "structured-export", isNew: true },
  { icon: "📋", label: "Standard FF&E Template Populated", who: "Design → Procurement · Shared spreadsheet", improveId: "standard-template", isNew: true },
  { icon: "✅", label: "Procurement Reviews Structured Data", who: "Brandy's Team · Spreadsheet review", improveId: "clean-import", isNew: false },
  { icon: "⌨️", label: "Data Entered into FileMaker (Future: CSV Import)", who: "Brandy's Team · FileMaker", improveId: "clean-import", isNew: false },
  { icon: "📧", label: "POs Generated & Emailed to Vendors", who: "FileMaker · Auto-email", improveId: null, isNew: false },
  { icon: "👁️", label: "Shared Status via FF&E Tracker", who: "Both teams · Living spreadsheet", improveId: "shared-status", isNew: true },
];

export default function ProcessMap() {
  const [view, setView] = useState("current");
  const [activeDetail, setActiveDetail] = useState(null);

  const steps = view === "current" ? currentSteps : targetSteps;
  const detailKey = view === "current" ? "painId" : "improveId";
  const detailData = view === "current" ? painPoints : improvements;

  const handleStepClick = (step) => {
    const id = step[detailKey];
    if (!id) return;
    setActiveDetail(activeDetail === id ? null : id);
  };

  const currentPainCount = currentSteps.filter((s) => s.painId).length;
  const targetNewCount = targetSteps.filter((s) => s.isNew).length;

  return (
    <div>
      {/* Toggle */}
      <div style={{ display: "flex", background: COLORS.warmGray, borderRadius: 10, padding: 3, gap: 3, marginBottom: 16 }}>
        <button onClick={() => { setView("current"); setActiveDetail(null); }} style={{ flex: 1, padding: "10px 8px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 13, fontWeight: view === "current" ? 600 : 400, fontFamily: "inherit", background: view === "current" ? COLORS.white : "transparent", color: view === "current" ? COLORS.darkText : COLORS.midText, boxShadow: view === "current" ? "0 1px 4px rgba(0,0,0,0.08)" : "none", transition: "all 0.2s ease" }}>
          🔴 Current State
        </button>
        <button onClick={() => { setView("target"); setActiveDetail(null); }} style={{ flex: 1, padding: "10px 8px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 13, fontWeight: view === "target" ? 600 : 400, fontFamily: "inherit", background: view === "target" ? COLORS.white : "transparent", color: view === "target" ? COLORS.darkText : COLORS.midText, boxShadow: view === "target" ? "0 1px 4px rgba(0,0,0,0.08)" : "none", transition: "all 0.2s ease" }}>
          🟢 Target State
        </button>
      </div>

      {/* Summary bar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", background: view === "current" ? "#FFF5F5" : "#F7FCF0", borderRadius: 10, border: `1px solid ${view === "current" ? "#F0C4C4" : "#C8E68A"}`, marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: view === "current" ? COLORS.red : "#3D6B00", textTransform: "uppercase", letterSpacing: "0.04em" }}>
            {view === "current" ? "Current State" : "Target State"}
          </div>
          <div style={{ fontSize: 12, color: COLORS.midText, marginTop: 3 }}>
            {view === "current" ? `${steps.length} steps · ${currentPainCount} pain points identified` : `${steps.length} steps · ${targetNewCount} new process steps`}
          </div>
        </div>
        <div style={{ fontSize: 24 }}>{view === "current" ? "📄→⌨️" : "📊→✅"}</div>
      </div>

      {/* Steps */}
      <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
        {steps.map((step, i) => {
          const id = step[detailKey];
          const isActive = activeDetail === id && id !== null;
          return (
            <div key={i}>
              <StepCard step={step} isActive={isActive} onClick={() => handleStepClick(step)} variant={view} />
              {isActive && detailData[id] && <DetailPanel data={detailData[id]} variant={view} onClose={() => setActiveDetail(null)} />}
              {i < steps.length - 1 && <Arrow />}
            </div>
          );
        })}
      </div>

      {/* Bottom context */}
      <div style={{ marginTop: 28, padding: "18px 20px", background: COLORS.white, borderRadius: 12, border: `1px solid ${COLORS.faintBorder}` }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: COLORS.darkText, marginBottom: 8 }}>
          {view === "current" ? "What stays the same" : "What changes"}
        </div>
        <div style={{ fontSize: 12, color: COLORS.midText, lineHeight: 1.7 }}>
          {view === "current"
            ? "Bluebeam remains the design markup tool. FileMaker remains the procurement system. The core challenge is the gap between them — an unstructured PDF handoff that forces manual re-entry."
            : "Bluebeam and FileMaker both stay. The key change is introducing a standard FF&E spreadsheet as the structured bridge between them. Design exports data from Bluebeam into this template; Procurement works from clean, structured data instead of interpreting PDFs. Future phase: direct CSV import into FileMaker."
          }
        </div>
      </div>
    </div>
  );
}
