import { useState } from "react";
import Introduction from "./Introduction";
import ProcessMap from "./ProcessMap";
import SchemaExplorer from "./SchemaExplorer";
import BluebeamGuide from "./BluebeamGuide";
import ImageDecision from "./ImageDecision";
import PilotFeedback from "./PilotFeedback";

const COLORS = {
  navy: "#1B2A4A",
  blue: "#2D7DD2",
  lime: "#97D700",
  white: "#FFFFFF",
  offWhite: "#F7F8FA",
  warmGray: "#E8E6E3",
  darkText: "#1B2A4A",
  midText: "#5A6577",
  lightText: "#8C95A6",
  faintBorder: "#D9DCE1",
};

const tabs = [
  {
    id: "intro",
    label: "Introduction",
    icon: "👋",
    shortLabel: "Intro",
    description: "What we're trying to solve, what we're proposing, and what the pilot looks like.",
  },
  {
    id: "images",
    label: "Image Decision",
    icon: "📸",
    shortLabel: "Images",
    description: "Quick questionnaire: do product images need per-item tracking, or can they stay informal?",
  },
  {
    id: "process",
    label: "Process Map",
    icon: "🔄",
    shortLabel: "Process",
    description: "See how data flows from Design to Procurement today, and what changes with the new approach.",
  },
  {
    id: "schema",
    label: "FF&E Fields",
    icon: "📋",
    shortLabel: "Fields",
    description: "Explore every field in the FF&E template — who fills it, whether it's required, and why it matters.",
  },
  {
    id: "bluebeam",
    label: "Bluebeam Guide",
    icon: "📐",
    shortLabel: "Bluebeam",
    description: "How to export FF&E markups from Bluebeam Revu 21 into the standard spreadsheet template.",
  },
  {
    id: "feedback",
    label: "Pilot Feedback",
    icon: "💬",
    shortLabel: "Feedback",
    description: "After running the pilot, share your experience here. Your honest input shapes what happens next.",
  },
];

export default function IDAProcurementHub() {
  const [activeTab, setActiveTab] = useState("intro");

  const currentTab = tabs.find((t) => t.id === activeTab);

  const navigateToTab = (tabId) => {
    setActiveTab(tabId);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div
      style={{
        fontFamily: "'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        background: COLORS.offWhite,
        minHeight: "100vh",
      }}
    >
      <link
        href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&family=DM+Mono:wght@400;500&display=swap"
        rel="stylesheet"
      />

      {/* ── Header ── */}
      <div style={{ background: COLORS.navy, padding: "32px 24px 20px", color: COLORS.white }}>
        <div style={{ maxWidth: 540, margin: "0 auto" }}>
          <div
            style={{
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: COLORS.lime,
              marginBottom: 8,
            }}
          >
            SteveMinster.com · Sandbox
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0, lineHeight: 1.3 }}>
            IDA Procurement
          </h1>
          <p style={{ fontSize: 13, color: "#A0AABB", margin: "8px 0 0 0", lineHeight: 1.5 }}>
            Streamlining the Design → Procurement handoff
            <br />
            for interior design FF&E ordering.
          </p>

          {/* ── Tab bar ── */}
          <div
            style={{
              display: "flex",
              gap: 2,
              marginTop: 20,
              background: "rgba(255,255,255,0.06)",
              borderRadius: 10,
              padding: 3,
              overflowX: "auto",
              WebkitOverflowScrolling: "touch",
            }}
          >
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => navigateToTab(tab.id)}
                  style={{
                    flex: "1 0 auto",
                    minWidth: 50,
                    padding: "10px 4px 8px",
                    borderRadius: 8,
                    border: "none",
                    cursor: "pointer",
                    fontFamily: "inherit",
                    background: isActive ? "rgba(255,255,255,0.12)" : "transparent",
                    transition: "all 0.2s ease",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 3,
                  }}
                >
                  <span style={{ fontSize: 15 }}>{tab.icon}</span>
                  <span
                    style={{
                      fontSize: 9,
                      fontWeight: isActive ? 700 : 500,
                      color: isActive ? COLORS.white : "#7A8699",
                      letterSpacing: "0.01em",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {tab.shortLabel}
                  </span>
                  {isActive && (
                    <div
                      style={{
                        width: 14,
                        height: 2,
                        borderRadius: 1,
                        background: COLORS.lime,
                        marginTop: 1,
                      }}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Section header ── */}
      <div style={{ maxWidth: 540, margin: "0 auto", padding: "20px 24px 0" }}>
        <div style={{ marginBottom: 20, paddingBottom: 16, borderBottom: `1px solid ${COLORS.faintBorder}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 18 }}>{currentTab.icon}</span>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: COLORS.darkText, margin: 0 }}>
              {currentTab.label}
            </h2>
          </div>
          <p style={{ fontSize: 13, color: COLORS.midText, margin: 0, lineHeight: 1.5 }}>
            {currentTab.description}
          </p>
        </div>

        {/* ── Content ── */}
        <div style={{ paddingBottom: 60 }}>
          {activeTab === "intro" && <Introduction onNavigateToTab={navigateToTab} />}
          {activeTab === "process" && <ProcessMap />}
          {activeTab === "schema" && <SchemaExplorer />}
          {activeTab === "bluebeam" && <BluebeamGuide />}
          {activeTab === "images" && <ImageDecision />}
          {activeTab === "feedback" && <PilotFeedback />}
        </div>
      </div>
    </div>
  );
}
