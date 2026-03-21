import { useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell, ReferenceLine, Legend
} from "recharts";

// ─── Brand tokens ────────────────────────────────────────────────────────────
const NAVY   = "#1B2A4A";
const BLUE   = "#2D7DD2";
const LIME   = "#97D700";
const SLATE  = "#8896AA";
const CARD   = "#1E3057";

// ─── Data ────────────────────────────────────────────────────────────────────
const efficiencyData = [
  { leg: "MJ → LOU", planned: 2.6, outbound: 3.40 },
  { leg: "LOU → FLO", planned: 2.6, outbound: 2.76 },
  { leg: "FLO → COL", planned: 2.6, outbound: 2.35 },
  { leg: "COL → Dest", planned: 2.6, outbound: 2.71 },
];

const returnEffData = [
  { leg: "Dest → COL", outbound: 2.71, return: 2.37 },
  { leg: "COL → FLO",  outbound: 2.35, return: 2.08 },
  { leg: "FLO → LOU",  outbound: 2.76, return: 2.05 },
  { leg: "LOU → SG",   outbound: null, return: 2.44 },
  { leg: "SG → MJ",    outbound: null, return: 2.84 },
];

const costData = [
  { phase: "Outbound",    cost: 62.10,  kwh: 125.33, sessions: 3, color: BLUE },
  { phase: "Destination", cost: 52.88,  kwh: 89.66,  sessions: 2, color: "#F59E0B" },
  { phase: "Return",      cost: 92.54,  kwh: 193.61, sessions: 4, color: "#EF4444" },
];

const allSessions = [
  { time: "3/11 12:03p", loc: "Louisville, KY",      min: 21, kwh: 42.01, cost: 18.90, rate: 0.45, phase: "out",  arrPct: 44,   depPct: 81  },
  { time: "3/11 2:01p",  loc: "Florence, KY",        min: 18, kwh: 34.51, cost: 15.87, rate: 0.46, phase: "out",  arrPct: 49,   depPct: 80  },
  { time: "3/11 5:23p",  loc: "Columbus, OH",        min: 25, kwh: 48.81, cost: 27.33, rate: 0.56, phase: "out",  arrPct: 33,   depPct: 80  },
  { time: "3/12 10:23a", loc: "Twinsburg Sheetz",    min: 31, kwh: 55.69, cost: 32.85, rate: 0.59, phase: "dest", arrPct: null, depPct: null },
  { time: "3/14 3:13p",  loc: "Twinsburg Sheetz",    min: 46, kwh: 33.97, cost: 20.03, rate: 0.59, phase: "dest", arrPct: null, depPct: null },
  { time: "3/15 9:57a",  loc: "Columbus, OH",        min: 23, kwh: 41.81, cost: 23.41, rate: 0.56, phase: "ret",  arrPct: 40,   depPct: 80  },
  { time: "3/15 12:26p", loc: "Florence, KY",        min: 29, kwh: 58.56, cost: 26.93, rate: 0.46, phase: "ret",  arrPct: 27,   depPct: 80  },
  { time: "3/15 2:32p",  loc: "Louisville, KY",      min: 51, kwh: 68.25, cost: 30.71, rate: 0.45, phase: "ret",  arrPct: 37,   depPct: 100 },
  { time: "3/15 3:47p",  loc: "Smiths Grove, KY ⚡", min: 13, kwh: 24.99, cost: 11.49, rate: 0.46, phase: "emrg", arrPct: 61,   depPct: 83  },
];

const outboundLegs = [
  { from: "Mt Juliet, TN",    to: "Louisville, KY",    dist: 190, battUsed: 56, eff: 3.40, driveTime: "3h 00m", note: "Best leg of the trip; Buc-ee's rest stop" },
  { from: "Louisville, KY",   to: "Florence, KY",      dist: 88,  battUsed: 32, eff: 2.76, driveTime: "1h 35m", note: "Solid performance" },
  { from: "Florence, KY",     to: "Columbus, OH",      dist: 110, battUsed: 47, eff: 2.35, driveTime: "3h 01m", note: "I-75 standstill; rerouted via I-275; Columbus rush hour" },
  { from: "Columbus, OH",     to: "Sagamore Hills, OH", dist: 130, battUsed: 48, eff: 2.71, driveTime: "2h 04m", note: "Arrived 32% / 87 mi est." },
];

const returnLegs = [
  { from: "Sagamore Hills, OH", to: "Columbus, OH",    dist: 130, battUsed: 55, eff: 2.37, driveTime: "1h 57m", note: "Arrived 40% / 96 mi est." },
  { from: "Columbus, OH",       to: "Florence, KY",    dist: 110, battUsed: 53, eff: 2.08, driveTime: "2h 07m", note: "Arrived 27% / 63 mi est." },
  { from: "Florence, KY",       to: "Louisville, KY",  dist: 88,  battUsed: 43, eff: 2.05, driveTime: "1h 36m", note: "Arrived 37% / 84 mi est." },
  { from: "Louisville, KY",     to: "Smiths Grove, KY", dist: 95, battUsed: 39, eff: 2.44, driveTime: "~23m*",  note: "Emergency stop triggered; charged to 100%" },
  { from: "Smiths Grove, KY",   to: "Mt Juliet, TN",   dist: 119, battUsed: 42, eff: 2.84, driveTime: "1h 24m", note: "Arrived 41% / 100 mi est." },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────
const phaseColor: Record<string, string> = { out: BLUE, dest: "#F59E0B", ret: "#EF4444", emrg: "#FF6B35" };
const phaseLabel: Record<string, string> = { out: "Outbound", dest: "Destination", ret: "Return", emrg: "Emergency" };

const Stat = ({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: string }) => (
  <div style={{ textAlign: "center", padding: "1rem" }}>
    <div style={{ fontSize: "2.2rem", fontWeight: 800, color: accent || LIME, fontFamily: "'Space Grotesk', sans-serif", lineHeight: 1 }}>{value}</div>
    {sub && <div style={{ fontSize: "0.75rem", color: SLATE, marginTop: "0.2rem" }}>{sub}</div>}
    <div style={{ fontSize: "0.8rem", color: "#8896AA", marginTop: "0.4rem", textTransform: "uppercase", letterSpacing: "0.08em" }}>{label}</div>
  </div>
);

const SectionTitle = ({ children, accent }: { children: React.ReactNode; accent?: string }) => (
  <h2 style={{
    fontFamily: "'Space Grotesk', sans-serif",
    fontSize: "1.5rem", fontWeight: 700,
    color: "white", marginBottom: "1.5rem",
    borderLeft: `4px solid ${accent || LIME}`,
    paddingLeft: "0.75rem"
  }}>{children}</h2>
);

const Badge = ({ children, color }: { children: React.ReactNode; color: string }) => (
  <span style={{
    background: color + "22", color: color, border: `1px solid ${color}44`,
    borderRadius: "4px", padding: "2px 8px", fontSize: "0.7rem",
    fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em"
  }}>{children}</span>
);

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: NAVY, border: `1px solid #2D7DD233`, borderRadius: 8, padding: "0.75rem 1rem" }}>
      <div style={{ color: "white", fontWeight: 700, marginBottom: 4, fontFamily: "'Space Grotesk', sans-serif" }}>{label}</div>
      {payload.map((p: any, i: number) => (
        <div key={i} style={{ color: p.color, fontSize: "0.85rem" }}>{p.name}: <b>{typeof p.value === "number" ? p.value.toFixed(2) : p.value}</b></div>
      ))}
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
export default function RoadTripResults() {
  const [activeTab, setActiveTab] = useState("outbound");

  return (
    <div style={{
      fontFamily: "'Inter', sans-serif",
      background: NAVY, color: "white",
      minHeight: "100vh", maxWidth: 900, margin: "0 auto", padding: "0 1rem 4rem"
    }}>
      <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;600;700;800&family=Inter:wght@400;500;600&display=swap" rel="stylesheet" />

      {/* ── HERO ── */}
      <div style={{
        background: `linear-gradient(135deg, #0D1B35 0%, #1B2A4A 50%, #152240 100%)`,
        borderBottom: `3px solid ${LIME}`,
        padding: "3rem 1.5rem 2rem",
        textAlign: "center",
        position: "relative", overflow: "hidden"
      }}>
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, background: "radial-gradient(ellipse at 70% 20%, #2D7DD215 0%, transparent 60%)", pointerEvents: "none" }} />
        <div style={{ fontSize: "0.8rem", color: LIME, textTransform: "uppercase", letterSpacing: "0.2em", marginBottom: "0.75rem", fontWeight: 600 }}>
          2026 Kia EV9 GT-Line AWD Long Range
        </div>
        <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: "clamp(1.8rem, 5vw, 2.8rem)", fontWeight: 800, lineHeight: 1.1, margin: "0 0 0.5rem" }}>
          Mt Juliet, TN ↔ Sagamore Hills, OH
        </h1>
        <div style={{ color: SLATE, fontSize: "0.9rem", marginBottom: "2rem" }}>
          March 11–15, 2026 &nbsp;·&nbsp; ~1,060 miles round trip &nbsp;·&nbsp; 4 passengers
        </div>
        <div style={{
          display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
          gap: "0.5rem", background: "#ffffff08", borderRadius: 12, border: "1px solid #ffffff10",
          padding: "0.5rem"
        }}>
          <Stat label="Round Trip" value="~1,060" sub="miles" />
          <Stat label="Charging Sessions" value="9" sub="stops" />
          <Stat label="Total Charge Time" value="257" sub="minutes" />
          <Stat label="Energy Used" value="408.6" sub="kWh" />
          <Stat label="Total Charging Cost" value="$207.52" accent={BLUE} />
          <Stat label="Outbound Efficiency" value="2.84" sub="mi/kWh" accent={LIME} />
          <Stat label="Return Efficiency" value="2.22" sub="mi/kWh" accent="#EF4444" />
        </div>
      </div>

      <div style={{ padding: "2rem 0" }}>

        {/* ── STORY ── */}
        <div style={{ background: CARD, borderRadius: 12, padding: "1.5rem", marginBottom: "2rem", borderLeft: `4px solid ${BLUE}` }}>
          <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: "1.2rem", fontWeight: 700, color: LIME, marginBottom: "0.75rem" }}>
            The 30-Second Version
          </h2>
          <p style={{ color: "#CBD5E1", lineHeight: 1.7, margin: 0, fontSize: "0.95rem" }}>
            We drove a 2026 Kia EV9 from Mt Juliet, TN to Sagamore Hills, OH and back — 1,060 miles — with four people and a full trunk.
            The <strong style={{ color: "white" }}>outbound trip was a win</strong>: we beat our planned 2.6 mi/kWh efficiency target by 9%, cruised into three
            Supercharger stops with plenty of buffer, and arrived with 32% left. The <strong style={{ color: "#EF4444" }}>return trip was a lesson</strong>:
            high headwinds, a battery thermally stressed from 8 DC fast-charge sessions in 5 days, and one charge-to-100% decision
            turned a planned 9-hour drive into an unplanned 4-stop odyssey. Total charging cost: $207.52 — about $80 more than
            a comparable gas SUV, though with overnight Level 2 charging at the destination, that gap nearly disappears.
          </p>
        </div>

        {/* ── ROUTE MAP ── */}
        <SectionTitle>The Route</SectionTitle>
        <div style={{ background: CARD, borderRadius: 12, padding: "1.5rem", marginBottom: "2rem", overflowX: "auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0", minWidth: 500, flexWrap: "nowrap" }}>
            {[
              { name: "Mt Juliet, TN",      sub: "Start / End",  color: LIME,      icon: "🏠" },
              { dist: "190 mi", time: "3h",    arrow: true },
              { name: "Louisville, KY",     sub: "Stop 1",       color: BLUE,      icon: "⚡" },
              { dist: "88 mi",  time: "1.5h",  arrow: true },
              { name: "Florence, KY",       sub: "Stop 2",       color: BLUE,      icon: "⚡" },
              { dist: "110 mi", time: "1.75h", arrow: true },
              { name: "Columbus, OH",       sub: "Stop 3",       color: BLUE,      icon: "⚡" },
              { dist: "130 mi", time: "2h",    arrow: true },
              { name: "Sagamore Hills, OH", sub: "Destination",  color: "#F59E0B", icon: "🎯" },
            ].map((item: any, i) => item.arrow ? (
              <div key={i} style={{ flex: 1, textAlign: "center", position: "relative" }}>
                <div style={{ height: 2, background: `linear-gradient(90deg, ${BLUE}44, ${BLUE})`, margin: "0 -4px" }} />
                <div style={{ fontSize: "0.65rem", color: SLATE, marginTop: "0.3rem" }}>{item.dist}</div>
                <div style={{ fontSize: "0.6rem", color: SLATE }}>{item.time}</div>
              </div>
            ) : (
              <div key={i} style={{ textAlign: "center", minWidth: 80 }}>
                <div style={{ width: 36, height: 36, borderRadius: "50%", background: item.color + "22", border: `2px solid ${item.color}`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 0.3rem", fontSize: "1rem" }}>{item.icon}</div>
                <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "white", lineHeight: 1.2 }}>{item.name}</div>
                <div style={{ fontSize: "0.6rem", color: item.color, marginTop: 2 }}>{item.sub}</div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: "1rem", display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            <Badge color={LIME}>🔋 Start: 100%</Badge>
            <Badge color={LIME}>🏁 Arrived: 32% (87 mi est.)</Badge>
            <Badge color="#F59E0B">📍 Twinsburg Sheetz for local charging</Badge>
            <Badge color="#EF4444">⚠ Return: Emergency stop added at Smiths Grove</Badge>
          </div>
        </div>

        {/* ── TAB NAV ── */}
        <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.5rem" }}>
          {["outbound", "return", "allsessions"].map(t => (
            <button key={t} onClick={() => setActiveTab(t)} style={{
              background: activeTab === t ? BLUE : "#ffffff10",
              color: activeTab === t ? "white" : SLATE,
              border: "none", borderRadius: 8, padding: "0.5rem 1rem",
              fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600,
              fontSize: "0.85rem", cursor: "pointer", textTransform: "capitalize",
              transition: "all 0.2s"
            }}>
              {t === "allsessions" ? "All Sessions" : t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        {/* ── OUTBOUND TAB ── */}
        {activeTab === "outbound" && (
          <div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.75rem", marginBottom: "1.5rem" }}>
              {[
                { label: "Distance",        value: "~518 mi" },
                { label: "Avg Efficiency",  value: "2.84 mi/kWh", accent: LIME },
                { label: "vs. Plan",        value: "+9.2%",        accent: LIME },
                { label: "Charge Time",     value: "64 min" },
                { label: "Charging Cost",   value: "$62.10" },
                { label: "Door-to-Door",    value: "10h 48m" },
              ].map((s, i) => (
                <div key={i} style={{ background: CARD, borderRadius: 8, padding: "1rem", textAlign: "center" }}>
                  <div style={{ fontSize: "1.5rem", fontWeight: 800, color: s.accent || "white", fontFamily: "'Space Grotesk', sans-serif" }}>{s.value}</div>
                  <div style={{ fontSize: "0.75rem", color: SLATE, textTransform: "uppercase", letterSpacing: "0.06em", marginTop: 4 }}>{s.label}</div>
                </div>
              ))}
            </div>

            <div style={{ background: CARD, borderRadius: 12, padding: "1.5rem", marginBottom: "1.5rem" }}>
              <h3 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: "1rem", fontWeight: 700, color: "white", marginBottom: "1rem" }}>
                Efficiency by Leg — Outbound vs. Plan
              </h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={efficiencyData} barCategoryGap="25%">
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff0f" />
                  <XAxis dataKey="leg" tick={{ fill: SLATE, fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis domain={[0, 4]} tick={{ fill: SLATE, fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <ReferenceLine y={2.6} stroke={SLATE} strokeDasharray="4 2" label={{ value: "2.6 plan", fill: SLATE, fontSize: 10, position: "insideRight" }} />
                  <Bar dataKey="planned" name="Planned" fill={SLATE} opacity={0.3} radius={[4,4,0,0]} />
                  <Bar dataKey="outbound" name="Actual" fill={LIME} radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div style={{ background: CARD, borderRadius: 12, overflow: "hidden", marginBottom: "1.5rem" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
                <thead>
                  <tr style={{ background: "#ffffff08" }}>
                    {["Leg", "Miles", "% Used", "Efficiency", "Drive Time", "Notes"].map(h => (
                      <th key={h} style={{ padding: "0.75rem 1rem", color: SLATE, fontWeight: 600, textAlign: "left", fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: "1px solid #ffffff0f" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {outboundLegs.map((leg, i) => (
                    <tr key={i} style={{ borderBottom: "1px solid #ffffff0a" }}>
                      <td style={{ padding: "0.7rem 1rem", color: "white", fontWeight: 600 }}>{leg.from.split(",")[0]} → {leg.to.split(",")[0]}</td>
                      <td style={{ padding: "0.7rem 0.5rem", color: SLATE }}>{leg.dist}</td>
                      <td style={{ padding: "0.7rem 0.5rem" }}>
                        <div style={{ background: `${BLUE}22`, borderRadius: 4, padding: "1px 6px", color: BLUE, fontWeight: 700, display: "inline-block" }}>{leg.battUsed}%</div>
                      </td>
                      <td style={{ padding: "0.7rem 0.5rem", color: leg.eff >= 2.6 ? LIME : "#F59E0B", fontWeight: 700 }}>{leg.eff}</td>
                      <td style={{ padding: "0.7rem 0.5rem", color: SLATE }}>{leg.driveTime}</td>
                      <td style={{ padding: "0.7rem 1rem", color: SLATE, fontSize: "0.75rem" }}>{leg.note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <h3 style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, marginBottom: "0.75rem" }}>Outbound Charging Stops</h3>
            <div style={{ display: "grid", gap: "0.75rem" }}>
              {allSessions.filter(s => s.phase === "out").map((s, i) => (
                <div key={i} style={{ background: CARD, borderRadius: 10, padding: "1rem 1.25rem", display: "flex", flexWrap: "wrap", gap: "1rem", alignItems: "center", borderLeft: `3px solid ${BLUE}` }}>
                  <div style={{ flex: "1 1 160px" }}>
                    <div style={{ fontWeight: 700, color: "white", fontFamily: "'Space Grotesk', sans-serif" }}>{s.loc}</div>
                    <div style={{ color: SLATE, fontSize: "0.8rem" }}>{s.time}</div>
                  </div>
                  <div style={{ display: "flex", gap: "1.5rem", flexWrap: "wrap" }}>
                    <div style={{ textAlign: "center" }}><div style={{ color: LIME, fontWeight: 800, fontSize: "1.1rem" }}>{s.min} min</div><div style={{ color: SLATE, fontSize: "0.7rem" }}>Duration</div></div>
                    <div style={{ textAlign: "center" }}><div style={{ color: "white", fontWeight: 800, fontSize: "1.1rem" }}>{s.kwh}</div><div style={{ color: SLATE, fontSize: "0.7rem" }}>kWh Added</div></div>
                    <div style={{ textAlign: "center" }}><div style={{ color: BLUE, fontWeight: 800, fontSize: "1.1rem" }}>${s.cost}</div><div style={{ color: SLATE, fontSize: "0.7rem" }}>Cost</div></div>
                    <div style={{ textAlign: "center" }}><div style={{ color: SLATE, fontWeight: 700 }}>{s.arrPct}% → {s.depPct}%</div><div style={{ color: SLATE, fontSize: "0.7rem" }}>Battery</div></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── RETURN TAB ── */}
        {activeTab === "return" && (
          <div>
            <div style={{ background: "#EF444418", border: "1px solid #EF444430", borderRadius: 10, padding: "1rem 1.25rem", marginBottom: "1.5rem", display: "flex", gap: "0.75rem", alignItems: "flex-start" }}>
              <div style={{ fontSize: "1.5rem", flexShrink: 0 }}>⚠️</div>
              <div>
                <div style={{ color: "#EF4444", fontWeight: 700, fontFamily: "'Space Grotesk', sans-serif" }}>Emergency Stop Added</div>
                <div style={{ color: "#CBD5E1", fontSize: "0.85rem", lineHeight: 1.6 }}>
                  High headwinds + cumulative battery thermal stress from 8 DC fast-charge sessions forced an unplanned stop at Smiths Grove, KY.
                  Range estimate at Louisville showed arrival at Mt Juliet with only <strong style={{ color: "white" }}>2 miles to spare</strong>.
                </div>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.75rem", marginBottom: "1.5rem" }}>
              {[
                { label: "Distance",       value: "~542 mi*" },
                { label: "Avg Efficiency", value: "2.22 mi/kWh", accent: "#EF4444" },
                { label: "vs. Outbound",   value: "−22%",        accent: "#EF4444" },
                { label: "Charge Time",    value: "116 min" },
                { label: "Charging Cost",  value: "$92.54" },
                { label: "Door-to-Door",   value: "9h 23m" },
              ].map((s, i) => (
                <div key={i} style={{ background: CARD, borderRadius: 8, padding: "1rem", textAlign: "center" }}>
                  <div style={{ fontSize: "1.5rem", fontWeight: 800, color: s.accent || "white", fontFamily: "'Space Grotesk', sans-serif" }}>{s.value}</div>
                  <div style={{ fontSize: "0.75rem", color: SLATE, textTransform: "uppercase", letterSpacing: "0.06em", marginTop: 4 }}>{s.label}</div>
                </div>
              ))}
            </div>

            <div style={{ background: CARD, borderRadius: 12, padding: "1.5rem", marginBottom: "1.5rem" }}>
              <h3 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: "1rem", fontWeight: 700, color: "white", marginBottom: "1rem" }}>
                Efficiency Comparison — Comparable Legs
              </h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={returnEffData} barCategoryGap="25%">
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff0f" />
                  <XAxis dataKey="leg" tick={{ fill: SLATE, fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis domain={[0, 4]} tick={{ fill: SLATE, fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ color: SLATE, fontSize: "0.8rem" }} />
                  <Bar dataKey="outbound" name="Outbound" fill={BLUE} radius={[4,4,0,0]} />
                  <Bar dataKey="return" name="Return" fill="#EF4444" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div style={{ background: CARD, borderRadius: 12, overflow: "hidden", marginBottom: "1.5rem" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
                <thead>
                  <tr style={{ background: "#ffffff08" }}>
                    {["Leg", "Miles", "% Used", "Efficiency", "Drive Time", "Notes"].map(h => (
                      <th key={h} style={{ padding: "0.75rem 1rem", color: SLATE, fontWeight: 600, textAlign: "left", fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: "1px solid #ffffff0f" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {returnLegs.map((leg, i) => (
                    <tr key={i} style={{ borderBottom: "1px solid #ffffff0a", background: i === 3 ? "#EF444408" : "transparent" }}>
                      <td style={{ padding: "0.7rem 1rem", color: i === 3 ? "#EF4444" : "white", fontWeight: 600 }}>
                        {i === 3 && "⚡ "}{leg.from.split(",")[0]} → {leg.to.split(",")[0]}
                      </td>
                      <td style={{ padding: "0.7rem 0.5rem", color: SLATE }}>{leg.dist}</td>
                      <td style={{ padding: "0.7rem 0.5rem" }}>
                        <div style={{ background: "#EF444422", borderRadius: 4, padding: "1px 6px", color: "#EF4444", fontWeight: 700, display: "inline-block" }}>{leg.battUsed}%</div>
                      </td>
                      <td style={{ padding: "0.7rem 0.5rem", color: leg.eff >= 2.6 ? LIME : "#EF4444", fontWeight: 700 }}>{leg.eff}</td>
                      <td style={{ padding: "0.7rem 0.5rem", color: SLATE }}>{leg.driveTime}</td>
                      <td style={{ padding: "0.7rem 1rem", color: SLATE, fontSize: "0.75rem" }}>{leg.note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <h3 style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, marginBottom: "0.75rem" }}>Why the Return Suffered</h3>
            <div style={{ display: "grid", gap: "0.75rem", marginBottom: "1.5rem" }}>
              {[
                { icon: "💨", title: "Headwinds",                  color: "#F59E0B", body: "Sustained high headwinds significantly increased aerodynamic drag. The EV9's large frontal profile is especially sensitive — a 20+ mph headwind at 70 mph can increase energy use by 20–30% due to exponential drag scaling." },
                { icon: "🔋", title: "Battery Thermal Stress",      color: "#EF4444", body: "Eight DC fast-charge sessions in 5 days with zero Level 2 recovery intervals took a toll. Evidence: Thursday at Twinsburg averaged 108 kW. Saturday at the same station: 44 kW — a 59% reduction from BMS throttling." },
                { icon: "⏱", title: "Charge Curve Penalty",         color: "#8B5CF6", body: "The Louisville 100% charge was operationally necessary but costly: 51 minutes for 68.25 kWh, vs. Florence's 29 min for 58.56 kWh. Above 80%, charging slows dramatically to protect battery chemistry." },
              ].map((item, i) => (
                <div key={i} style={{ background: CARD, borderRadius: 10, padding: "1rem 1.25rem", borderLeft: `3px solid ${item.color}`, display: "flex", gap: "1rem", alignItems: "flex-start" }}>
                  <div style={{ fontSize: "1.5rem", flexShrink: 0 }}>{item.icon}</div>
                  <div>
                    <div style={{ fontWeight: 700, color: item.color, fontFamily: "'Space Grotesk', sans-serif", marginBottom: "0.25rem" }}>{item.title}</div>
                    <div style={{ color: "#CBD5E1", fontSize: "0.85rem", lineHeight: 1.6 }}>{item.body}</div>
                  </div>
                </div>
              ))}
            </div>

            <h3 style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, marginBottom: "0.75rem" }}>Return Charging Stops</h3>
            <div style={{ display: "grid", gap: "0.75rem" }}>
              {allSessions.filter(s => s.phase === "ret" || s.phase === "emrg").map((s, i) => (
                <div key={i} style={{ background: CARD, borderRadius: 10, padding: "1rem 1.25rem", display: "flex", flexWrap: "wrap", gap: "1rem", alignItems: "center", borderLeft: `3px solid ${phaseColor[s.phase]}` }}>
                  <div style={{ flex: "1 1 160px" }}>
                    <div style={{ fontWeight: 700, color: "white", fontFamily: "'Space Grotesk', sans-serif", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      {s.loc}
                      {s.phase === "emrg" && <Badge color="#FF6B35">Emergency</Badge>}
                    </div>
                    <div style={{ color: SLATE, fontSize: "0.8rem" }}>{s.time}</div>
                  </div>
                  <div style={{ display: "flex", gap: "1.5rem", flexWrap: "wrap" }}>
                    <div style={{ textAlign: "center" }}><div style={{ color: s.phase === "emrg" ? "#FF6B35" : "#EF4444", fontWeight: 800, fontSize: "1.1rem" }}>{s.min} min</div><div style={{ color: SLATE, fontSize: "0.7rem" }}>Duration</div></div>
                    <div style={{ textAlign: "center" }}><div style={{ color: "white", fontWeight: 800, fontSize: "1.1rem" }}>{s.kwh}</div><div style={{ color: SLATE, fontSize: "0.7rem" }}>kWh Added</div></div>
                    <div style={{ textAlign: "center" }}><div style={{ color: BLUE, fontWeight: 800, fontSize: "1.1rem" }}>${s.cost}</div><div style={{ color: SLATE, fontSize: "0.7rem" }}>Cost</div></div>
                    <div style={{ textAlign: "center" }}><div style={{ color: SLATE, fontWeight: 700 }}>{s.arrPct}% → {s.depPct}%</div><div style={{ color: SLATE, fontSize: "0.7rem" }}>Battery</div></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── ALL SESSIONS TAB ── */}
        {activeTab === "allsessions" && (
          <div>
            <div style={{ background: CARD, borderRadius: 12, padding: "1.5rem", marginBottom: "1.5rem" }}>
              <h3 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: "1rem", fontWeight: 700, color: "white", marginBottom: "1rem" }}>
                Cost & Energy by Trip Phase
              </h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={costData} layout="vertical" barCategoryGap="30%">
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff0f" horizontal={false} />
                  <XAxis type="number" tick={{ fill: SLATE, fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `$${v}`} />
                  <YAxis type="category" dataKey="phase" tick={{ fill: "white", fontSize: 12, fontWeight: 600 }} axisLine={false} tickLine={false} width={80} />
                  <Tooltip content={({ active, payload, label }: any) => {
                    if (!active || !payload?.length) return null;
                    const d = costData.find(c => c.phase === label);
                    return (
                      <div style={{ background: NAVY, border: `1px solid #2D7DD233`, borderRadius: 8, padding: "0.75rem 1rem" }}>
                        <div style={{ color: "white", fontWeight: 700, marginBottom: 4, fontFamily: "'Space Grotesk', sans-serif" }}>{label}</div>
                        <div style={{ color: LIME, fontSize: "0.85rem" }}>Cost: <b>${d?.cost.toFixed(2)}</b></div>
                        <div style={{ color: BLUE, fontSize: "0.85rem" }}>Energy: <b>{d?.kwh} kWh</b></div>
                        <div style={{ color: SLATE, fontSize: "0.85rem" }}>Sessions: <b>{d?.sessions}</b></div>
                      </div>
                    );
                  }} />
                  <Bar dataKey="cost" radius={[0,4,4,0]}>
                    {costData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div style={{ background: CARD, borderRadius: 12, padding: "1.5rem", marginBottom: "1.5rem", border: `1px solid ${BLUE}30` }}>
              <h3 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: "1rem", fontWeight: 700, color: "white", marginBottom: "1rem" }}>
                EV vs. Gasoline Cost Comparison
              </h3>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem", textAlign: "center", marginBottom: "1rem" }}>
                <div>
                  <div style={{ fontSize: "2rem", fontWeight: 800, color: "#EF4444", fontFamily: "'Space Grotesk', sans-serif" }}>$207.52</div>
                  <div style={{ color: SLATE, fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.06em" }}>Actual EV Cost</div>
                  <div style={{ color: "#CBD5E1", fontSize: "0.75rem", marginTop: 4 }}>DC fast charging only</div>
                </div>
                <div>
                  <div style={{ fontSize: "2rem", fontWeight: 800, color: "#F59E0B", fontFamily: "'Space Grotesk', sans-serif" }}>$127</div>
                  <div style={{ color: SLATE, fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.06em" }}>Estimated Gas Cost</div>
                  <div style={{ color: "#CBD5E1", fontSize: "0.75rem", marginTop: 4 }}>25 MPG @ $3.00/gal</div>
                </div>
                <div>
                  <div style={{ fontSize: "2rem", fontWeight: 800, color: LIME, fontFamily: "'Space Grotesk', sans-serif" }}>$49</div>
                  <div style={{ color: SLATE, fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.06em" }}>EV at Home Rates</div>
                  <div style={{ color: "#CBD5E1", fontSize: "0.75rem", marginTop: 4 }}>408 kWh @ $0.12/kWh</div>
                </div>
              </div>
              <div style={{ background: "#ffffff08", borderRadius: 8, padding: "0.75rem 1rem", fontSize: "0.82rem", color: "#CBD5E1", lineHeight: 1.6 }}>
                <strong style={{ color: "white" }}>The real story:</strong> The $80 DC fast-charging premium vanishes entirely with overnight Level 2 charging at the destination.
                At home rates, EV9 electricity costs 61% less than gasoline — the fast-charger network is simply a convenience tax for not having a plug at the house.
              </div>
            </div>

            <h3 style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, marginBottom: "0.75rem" }}>Complete Charging Log</h3>
            <div style={{ background: CARD, borderRadius: 12, overflow: "hidden" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem" }}>
                <thead>
                  <tr style={{ background: "#ffffff08" }}>
                    {["#", "Date/Time", "Location", "Phase", "Min", "kWh", "Cost", "$/kWh"].map(h => (
                      <th key={h} style={{ padding: "0.75rem 0.75rem", color: SLATE, fontWeight: 600, textAlign: "left", fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: "1px solid #ffffff0f" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {allSessions.map((s, i) => (
                    <tr key={i} style={{ borderBottom: "1px solid #ffffff0a", background: s.phase === "emrg" ? "#FF6B3508" : "transparent" }}>
                      <td style={{ padding: "0.6rem 0.75rem", color: SLATE }}>{i + 1}</td>
                      <td style={{ padding: "0.6rem 0.75rem", color: SLATE }}>{s.time}</td>
                      <td style={{ padding: "0.6rem 0.75rem", color: "white", fontWeight: 600 }}>{s.loc}</td>
                      <td style={{ padding: "0.6rem 0.75rem" }}><Badge color={phaseColor[s.phase]}>{phaseLabel[s.phase]}</Badge></td>
                      <td style={{ padding: "0.6rem 0.75rem", color: SLATE }}>{s.min}</td>
                      <td style={{ padding: "0.6rem 0.75rem", color: SLATE }}>{s.kwh}</td>
                      <td style={{ padding: "0.6rem 0.75rem", color: BLUE, fontWeight: 700 }}>${s.cost}</td>
                      <td style={{ padding: "0.6rem 0.75rem", color: SLATE }}>${s.rate}</td>
                    </tr>
                  ))}
                  <tr style={{ background: "#ffffff08", fontWeight: 700 }}>
                    <td colSpan={4} style={{ padding: "0.7rem 0.75rem", color: "white", fontFamily: "'Space Grotesk', sans-serif" }}>TOTAL (9 sessions)</td>
                    <td style={{ padding: "0.7rem 0.75rem", color: LIME }}>257</td>
                    <td style={{ padding: "0.7rem 0.75rem", color: LIME }}>408.60</td>
                    <td style={{ padding: "0.7rem 0.75rem", color: LIME }}>$207.52</td>
                    <td style={{ padding: "0.7rem 0.75rem", color: SLATE }}>$0.51 avg</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── LESSONS LEARNED ── */}
        <div style={{ marginTop: "2.5rem" }}>
          <SectionTitle accent={LIME}>Lessons Learned</SectionTitle>
          <div style={{ display: "grid", gap: "0.75rem" }}>
            {[
              { n: "1", title: "Secure Level 2 charging at the destination",    color: LIME,      body: "The single biggest improvement. It eliminates the $52.88 destination charging cost AND the cumulative DC thermal stress that crippled return-trip efficiency. A portable EVSE + NEMA 14-50 outlet solves this." },
              { n: "2", title: "Stay at 80% on DC fast chargers. No exceptions.", color: BLUE,     body: "The charge curve above 80% is brutal. Louisville's 100% charge took 51 minutes. Every future stop targets 80% and drives on." },
              { n: "3", title: "Check wind before you leave",                    color: "#F59E0B", body: "A 5 mph reduction (70→65 mph) into a headwind recovers 15–20 miles per leg. The outbound trip may have had a tailwind advantage we didn't account for." },
              { n: "4", title: "After heavy DC charging, allow a full L2 recovery cycle", color: "#8B5CF6", body: "Multiple rapid charge/discharge cycles without a slow AC interval leave the BMS in a degraded state. One L2 cycle before a long return trip allows recalibration." },
              { n: "5", title: "Avoid Columbus during rush hour",                color: "#EF4444", body: "The Florence→Columbus leg was the trip's efficiency low point — traffic rerouting added over an hour and crushed the efficiency number." },
            ].map((item, i) => (
              <div key={i} style={{ background: CARD, borderRadius: 10, padding: "1rem 1.25rem", display: "flex", gap: "1rem", alignItems: "flex-start", borderLeft: `3px solid ${item.color}` }}>
                <div style={{ width: 28, height: 28, borderRadius: "50%", background: item.color + "22", color: item.color, fontWeight: 800, fontFamily: "'Space Grotesk', sans-serif", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: "0.85rem" }}>{item.n}</div>
                <div>
                  <div style={{ fontWeight: 700, color: "white", fontFamily: "'Space Grotesk', sans-serif", marginBottom: "0.25rem" }}>{item.title}</div>
                  <div style={{ color: "#CBD5E1", fontSize: "0.85rem", lineHeight: 1.6 }}>{item.body}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── NEXT TRIP TEASER ── */}
        <div style={{ marginTop: "2.5rem", background: `linear-gradient(135deg, #0D1B35, #1B2A4A)`, border: `1px solid ${LIME}30`, borderRadius: 14, padding: "2rem", textAlign: "center" }}>
          <div style={{ fontSize: "0.75rem", color: LIME, textTransform: "uppercase", letterSpacing: "0.2em", fontWeight: 600, marginBottom: "0.5rem" }}>Coming Soon</div>
          <h3 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: "1.4rem", fontWeight: 700, color: "white", margin: "0 0 0.5rem" }}>
            Next Road Trip — Stay Tuned
          </h3>
          <p style={{ color: SLATE, fontSize: "0.9rem", maxWidth: 420, margin: "0 auto 1.5rem" }}>
            Another trip is on the books. We'll track it in real-time and post the results here when it's done.
          </p>
          <a
            href="/sandbox/road-trip-planner"
            style={{
              display: "inline-block",
              background: LIME, color: NAVY,
              fontFamily: "'Space Grotesk', sans-serif",
              fontWeight: 800, fontSize: "0.9rem",
              padding: "0.7rem 1.75rem", borderRadius: 8,
              textDecoration: "none", letterSpacing: "0.03em"
            }}
          >
            Open Trip Planner →
          </a>
          <div style={{ color: SLATE, fontSize: "0.7rem", marginTop: "0.5rem" }}>Password required</div>
        </div>

      </div>
    </div>
  );
}