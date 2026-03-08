import { useState, useEffect, useCallback } from "react";

const PASSCODE = "EV9TRIP";
const AUTH_KEY = "ev-trip-auth";

const BRAND = {
  navy: "#1B2A4A",
  blue: "#2D7DD2",
  lime: "#97D700",
  white: "#FFFFFF",
  bg: "#0F1A2E",
  card: "#162236",
  cardHover: "#1C2D45",
  border: "#253550",
  muted: "#8899B0",
  input: "#1A2840",
  red: "#E74C3C",
};

const STORAGE_KEYS = {
  outLogs: "ev-trip-outbound-logs",
  retLogs: "ev-trip-return-logs",
  outChecklist: "ev-trip-outbound-checklist",
  retChecklist: "ev-trip-return-checklist",
  activeTrip: "ev-trip-active",
};

function loadFromStorage(key, fallback) {
  try {
    const stored = localStorage.getItem(key);
    if (stored) return JSON.parse(stored);
  } catch (e) {
    // Silent fail — return fallback
  }
  return fallback;
}

function saveToStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    // Silent fail
  }
}

const outboundStops = [
  {
    id: "start-out",
    type: "start",
    label: "Departure",
    location: "260 Cobblestone Landing, Mt Juliet, TN 37122",
    shortName: "Mt Juliet, TN",
    charger: null,
    notes: "Home charger — depart at 100%",
    legDistance: null,
    legDistanceMi: null,
    nextDistance: "~190 mi to Stop 1",
    planned: { departureBattery: "100" },
  },
  {
    id: "stop1-out",
    type: "charge",
    label: "Stop 1",
    location: "9500 Preston Highway, Louisville, KY 40229",
    shortName: "Louisville, KY — Meijer",
    charger: "Tesla Supercharger V3 — 12 stalls, up to 250 kW",
    chargerCompat: "NACS Partner Site (direct plug-in)",
    amenities: "Burger King, Meijer deli & snacks, restrooms",
    legDistance: "~190 mi",
    legDistanceMi: 190,
    nextDistance: "~88 mi to Stop 2",
    targetCharge: "85%",
    estChargeTime: "~25–30 min",
    costEst: "~$0.34–$0.46/kWh",
    planned: { arrivalBattery: "22", departureBattery: "85", chargeTimeMin: "25-30" },
  },
  {
    id: "stop2-out",
    type: "charge",
    label: "Stop 2",
    location: "4990 Houston Road, Florence, KY 41042",
    shortName: "Florence, KY — Meijer",
    charger: "Tesla Supercharger V3 — 12 stalls, up to 250 kW",
    chargerCompat: "NACS Partner Site (direct plug-in)",
    amenities: "Chick-fil-A nearby, Meijer deli & snacks",
    legDistance: "~88 mi",
    legDistanceMi: 88,
    nextDistance: "~110 mi to Stop 3",
    targetCharge: "80%",
    estChargeTime: "~15–20 min",
    costEst: "~$0.48/kWh",
    planned: { arrivalBattery: "50", departureBattery: "80", chargeTimeMin: "15-20" },
  },
  {
    id: "stop3-out",
    type: "charge",
    label: "Stop 3",
    location: "179 E Campus View Blvd, Columbus, OH 43235",
    shortName: "Columbus, OH — E Campus View",
    charger: "Tesla Supercharger V3 — 16 stalls, up to 250 kW, pull-through",
    chargerCompat: "NACS Partner Site (direct plug-in)",
    amenities: "Chipotle, Starbucks, Chinese restaurant",
    legDistance: "~110 mi",
    legDistanceMi: 110,
    nextDistance: "~130 mi to destination",
    targetCharge: "80%",
    estChargeTime: "~20–25 min",
    costEst: "~$0.40–$0.57/kWh",
    planned: { arrivalBattery: "35", departureBattery: "80", chargeTimeMin: "20-25" },
  },
  {
    id: "dest-out",
    type: "destination",
    label: "Destination",
    location: "375 Lynnwood Drive, Sagamore Hills, OH 44067",
    shortName: "Sagamore Hills, OH",
    charger: null,
    notes: "Nearest DC fast charger: Sheetz, 2495 E Aurora Rd, Twinsburg (~5 mi)",
    legDistance: "~130 mi",
    legDistanceMi: 130,
    nextDistance: null,
    planned: { arrivalBattery: "26" },
  },
];

const returnStops = [
  {
    id: "start-ret",
    type: "start",
    label: "Departure",
    location: "375 Lynnwood Drive, Sagamore Hills, OH 44067",
    shortName: "Sagamore Hills, OH",
    charger: null,
    notes: "Top off at Sheetz Twinsburg (2495 E Aurora Rd, ~5 mi) before departure if needed",
    legDistance: null,
    legDistanceMi: null,
    nextDistance: "~130 mi to Stop 1",
    planned: { departureBattery: "100" },
  },
  {
    id: "stop1-ret",
    type: "charge",
    label: "Stop 1",
    location: "179 E Campus View Blvd, Columbus, OH 43235",
    shortName: "Columbus, OH — E Campus View",
    charger: "Tesla Supercharger V3 — 16 stalls, up to 250 kW, pull-through",
    chargerCompat: "NACS Partner Site (direct plug-in)",
    amenities: "Chipotle, Starbucks, Chinese restaurant",
    legDistance: "~130 mi",
    legDistanceMi: 130,
    nextDistance: "~110 mi to Stop 2",
    targetCharge: "80%",
    estChargeTime: "~20–25 min",
    costEst: "~$0.40–$0.57/kWh",
    planned: { arrivalBattery: "26", departureBattery: "80", chargeTimeMin: "20-25" },
  },
  {
    id: "stop2-ret",
    type: "charge",
    label: "Stop 2",
    location: "4990 Houston Road, Florence, KY 41042",
    shortName: "Florence, KY — Meijer",
    charger: "Tesla Supercharger V3 — 12 stalls, up to 250 kW",
    chargerCompat: "NACS Partner Site (direct plug-in)",
    amenities: "Chick-fil-A nearby, Meijer deli & snacks",
    legDistance: "~110 mi",
    legDistanceMi: 110,
    nextDistance: "~88 mi to Stop 3",
    targetCharge: "80%",
    estChargeTime: "~15–20 min",
    costEst: "~$0.48/kWh",
    planned: { arrivalBattery: "35", departureBattery: "80", chargeTimeMin: "15-20" },
  },
  {
    id: "stop3-ret",
    type: "charge",
    label: "Stop 3",
    location: "9500 Preston Highway, Louisville, KY 40229",
    shortName: "Louisville, KY — Meijer",
    charger: "Tesla Supercharger V3 — 12 stalls, up to 250 kW",
    chargerCompat: "NACS Partner Site (direct plug-in)",
    amenities: "Burger King, Meijer deli & snacks, restrooms",
    legDistance: "~88 mi",
    legDistanceMi: 88,
    nextDistance: "~190 mi to home",
    targetCharge: "85%",
    estChargeTime: "~25–30 min",
    costEst: "~$0.34–$0.46/kWh",
    planned: { arrivalBattery: "50", departureBattery: "85", chargeTimeMin: "25-30" },
  },
  {
    id: "dest-ret",
    type: "destination",
    label: "Home",
    location: "260 Cobblestone Landing, Mt Juliet, TN 37122",
    shortName: "Mt Juliet, TN",
    charger: null,
    notes: "Home Level 2 charger — plug in on arrival",
    legDistance: "~190 mi",
    legDistanceMi: 190,
    nextDistance: null,
    planned: { arrivalBattery: "22" },
  },
];

const defaultChecklist = {
  chargeLimit100: false,
  teslaApp: false,
  precondition: false,
  nacsAdapters: false,
  snacksKids: false,
};

const defaultStopLog = {
  arrivalTime: "",
  arrivalBattery: "",
  arrivalMilesEst: "",
  departureTime: "",
  departureBattery: "",
  notes: "",
};

function initLogs(stops) {
  const logs = {};
  stops.forEach((s) => {
    if (s.type === "start") {
      logs[s.id] = { departureTime: "", departureBattery: "", notes: "" };
    } else if (s.type === "destination") {
      logs[s.id] = { arrivalTime: "", arrivalBattery: "", arrivalMilesEst: "", notes: "" };
    } else {
      logs[s.id] = { ...defaultStopLog };
    }
  });
  return logs;
}

function buildExportData(stops, logs, checklist, tripLabel) {
  const stopsData = stops.map((stop) => {
    const log = logs[stop.id] || {};
    const planned = stop.planned || {};

    const entry = {
      stopId: stop.id,
      label: stop.label,
      location: stop.shortName,
      address: stop.location,
      type: stop.type,
      legDistance: stop.legDistance || null,
    };

    if (stop.type === "start") {
      entry.planned = { departureBattery: planned.departureBattery ? `${planned.departureBattery}%` : null };
      entry.actual = {
        departureTime: log.departureTime || null,
        departureBattery: log.departureBattery ? `${log.departureBattery}%` : null,
      };
      entry.delta = {};
      if (planned.departureBattery && log.departureBattery) {
        entry.delta.departureBattery = `${Number(log.departureBattery) - Number(planned.departureBattery)}%`;
      }
    } else if (stop.type === "destination") {
      entry.planned = { arrivalBattery: planned.arrivalBattery ? `${planned.arrivalBattery}%` : null };
      entry.actual = {
        arrivalTime: log.arrivalTime || null,
        arrivalBattery: log.arrivalBattery ? `${log.arrivalBattery}%` : null,
        arrivalMilesEst: log.arrivalMilesEst ? `${log.arrivalMilesEst} mi` : null,
      };
      entry.delta = {};
      if (planned.arrivalBattery && log.arrivalBattery) {
        entry.delta.arrivalBattery = `${Number(log.arrivalBattery) - Number(planned.arrivalBattery)}%`;
      }
    } else {
      entry.charger = stop.charger;
      entry.planned = {
        arrivalBattery: planned.arrivalBattery ? `${planned.arrivalBattery}%` : null,
        departureBattery: planned.departureBattery ? `${planned.departureBattery}%` : null,
        estChargeTime: stop.estChargeTime || null,
      };
      entry.actual = {
        arrivalTime: log.arrivalTime || null,
        arrivalBattery: log.arrivalBattery ? `${log.arrivalBattery}%` : null,
        arrivalMilesEst: log.arrivalMilesEst ? `${log.arrivalMilesEst} mi` : null,
        departureTime: log.departureTime || null,
        departureBattery: log.departureBattery ? `${log.departureBattery}%` : null,
      };
      entry.delta = {};
      if (planned.arrivalBattery && log.arrivalBattery) {
        entry.delta.arrivalBattery = `${Number(log.arrivalBattery) - Number(planned.arrivalBattery)}%`;
      }
      if (planned.departureBattery && log.departureBattery) {
        entry.delta.departureBattery = `${Number(log.departureBattery) - Number(planned.departureBattery)}%`;
      }
      if (log.arrivalTime && log.departureTime) {
        const [aH, aM] = log.arrivalTime.split(":").map(Number);
        const [dH, dM] = log.departureTime.split(":").map(Number);
        const mins = (dH * 60 + dM) - (aH * 60 + aM);
        if (mins > 0) {
          entry.actual.chargeTimeMin = mins;
        }
      }
    }

    entry.notes = log.notes || null;
    return entry;
  });

  const legs = [];
  for (let i = 0; i < stops.length - 1; i++) {
    const fromStop = stops[i];
    const toStop = stops[i + 1];
    const fromLog = logs[fromStop.id] || {};
    const toLog = logs[toStop.id] || {};

    const depBatt = Number(fromLog.departureBattery);
    const arrBatt = Number(toLog.arrivalBattery);
    const dist = toStop.legDistanceMi;

    if (depBatt && arrBatt && dist) {
      const battUsed = depBatt - arrBatt;
      const kwhUsed = (battUsed / 100) * 99.8;
      const efficiency = dist / kwhUsed;

      legs.push({
        from: fromStop.shortName,
        to: toStop.shortName,
        distance: `~${dist} mi`,
        batteryUsed: `${battUsed}%`,
        kwhEstimated: `${kwhUsed.toFixed(1)} kWh`,
        efficiencyMiPerKwh: `${efficiency.toFixed(2)} mi/kWh`,
        departureTime: fromLog.departureTime || null,
        arrivalTime: toLog.arrivalTime || null,
      });
    }
  }

  return {
    trip: tripLabel,
    vehicle: "2026 Kia EV9 GT-Line AWD Long Range",
    battery: "99.8 kWh",
    epaRange: "280 mi",
    realWorldEstimate: "~240 mi at 100%",
    exportedAt: new Date().toISOString(),
    preDepartureChecklist: { ...checklist },
    stops: stopsData,
    legEfficiency: legs,
  };
}

const CheckIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <path d="M3 7L6 10L11 4" stroke={BRAND.lime} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const BoltIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path d="M9 1L3 9H8L7 15L13 7H8L9 1Z" fill={BRAND.lime} />
  </svg>
);

const CarIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={BRAND.blue} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 17h2m10 0h2M3 11l1.5-5A2 2 0 016.4 4.5h11.2a2 2 0 011.9 1.5L21 11" />
    <rect x="3" y="11" width="18" height="6" rx="2" />
    <circle cx="7" cy="17" r="1.5" />
    <circle cx="17" cy="17" r="1.5" />
  </svg>
);

const FlagIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path d="M3 2V14" stroke={BRAND.lime} strokeWidth="1.5" strokeLinecap="round" />
    <path d="M3 2H12L10 5.5L12 9H3" fill={BRAND.lime} fillOpacity="0.3" stroke={BRAND.lime} strokeWidth="1.5" strokeLinejoin="round" />
  </svg>
);

const MapPinIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <path d="M7 1C4.79 1 3 2.79 3 5C3 8 7 13 7 13C7 13 11 8 11 5C11 2.79 9.21 1 7 1Z" fill={BRAND.blue} fillOpacity="0.3" stroke={BRAND.blue} strokeWidth="1.2" />
    <circle cx="7" cy="5" r="1.5" fill={BRAND.blue} />
  </svg>
);

function Checkbox({ checked, onChange, label }) {
  return (
    <label
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        cursor: "pointer",
        padding: "8px 12px",
        borderRadius: 8,
        background: checked ? `${BRAND.lime}12` : "transparent",
        border: `1px solid ${checked ? BRAND.lime + "40" : BRAND.border}`,
        transition: "all 0.2s ease",
        fontSize: 14,
        color: checked ? BRAND.lime : BRAND.muted,
        userSelect: "none",
      }}
    >
      <span
        style={{
          width: 20,
          height: 20,
          borderRadius: 5,
          border: `2px solid ${checked ? BRAND.lime : BRAND.muted}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: checked ? `${BRAND.lime}20` : "transparent",
          transition: "all 0.2s ease",
          flexShrink: 0,
        }}
      >
        {checked && <CheckIcon />}
      </span>
      <span style={{ lineHeight: 1.3 }}>{label}</span>
    </label>
  );
}

function InputField({ label, value, onChange, type = "text", placeholder, unit }) {
  return (
    <div style={{ flex: 1, minWidth: type === "time" ? 130 : 100 }}>
      <label style={{ fontSize: 11, color: BRAND.muted, display: "block", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600 }}>
        {label}
      </label>
      <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          style={{
            width: "100%",
            padding: "8px 10px",
            paddingRight: unit ? 30 : 10,
            borderRadius: 6,
            border: `1px solid ${BRAND.border}`,
            background: BRAND.input,
            color: BRAND.white,
            fontSize: 14,
            outline: "none",
            fontFamily: "'Space Grotesk', sans-serif",
            transition: "border-color 0.2s",
            boxSizing: "border-box",
          }}
          onFocus={(e) => (e.target.style.borderColor = BRAND.blue)}
          onBlur={(e) => (e.target.style.borderColor = BRAND.border)}
        />
        {unit && (
          <span style={{ position: "absolute", right: 8, fontSize: 12, color: BRAND.muted, pointerEvents: "none" }}>
            {unit}
          </span>
        )}
      </div>
    </div>
  );
}

function NotesField({ value, onChange }) {
  return (
    <div style={{ marginTop: 8 }}>
      <label style={{ fontSize: 11, color: BRAND.muted, display: "block", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600 }}>
        Notes
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Weather, road conditions, observations..."
        style={{
          width: "100%",
          padding: "8px 10px",
          borderRadius: 6,
          border: `1px solid ${BRAND.border}`,
          background: BRAND.input,
          color: BRAND.white,
          fontSize: 13,
          outline: "none",
          fontFamily: "'Inter', sans-serif",
          transition: "border-color 0.2s",
          boxSizing: "border-box",
        }}
        onFocus={(e) => (e.target.style.borderColor = BRAND.blue)}
        onBlur={(e) => (e.target.style.borderColor = BRAND.border)}
      />
    </div>
  );
}

function StopCard({ stop, log, onLogChange, isLast }) {
  const [expanded, setExpanded] = useState(false);
  const isStart = stop.type === "start";
  const isDest = stop.type === "destination";
  const isCharge = stop.type === "charge";

  const iconBg = isStart ? BRAND.blue : isDest ? BRAND.lime : BRAND.navy;
  const icon = isStart ? <CarIcon /> : isDest ? <FlagIcon /> : <BoltIcon />;

  const updateField = (field, val) => {
    onLogChange({ ...log, [field]: val });
  };

  const hasData = log && Object.values(log).some((v) => v && v !== "");

  return (
    <div style={{ display: "flex", gap: 0, position: "relative" }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 40, flexShrink: 0 }}>
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: "50%",
            background: iconBg,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            border: `2px solid ${isCharge ? BRAND.lime : BRAND.blue}`,
            boxShadow: `0 0 12px ${isCharge ? BRAND.lime + "30" : BRAND.blue + "30"}`,
            zIndex: 1,
            flexShrink: 0,
          }}
        >
          {icon}
        </div>
        {!isLast && (
          <div style={{ width: 2, flex: 1, background: `linear-gradient(to bottom, ${BRAND.border}, ${BRAND.border}80)`, minHeight: 20 }} />
        )}
      </div>

      <div
        style={{
          flex: 1,
          marginLeft: 12,
          marginBottom: isLast ? 0 : 16,
          background: BRAND.card,
          borderRadius: 12,
          border: `1px solid ${expanded ? BRAND.blue + "60" : BRAND.border}`,
          overflow: "hidden",
          transition: "border-color 0.3s ease",
        }}
      >
        <div
          onClick={() => setExpanded(!expanded)}
          style={{
            padding: "14px 16px",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: isCharge ? BRAND.lime : BRAND.blue, textTransform: "uppercase", letterSpacing: "0.08em", fontFamily: "'Space Grotesk', sans-serif" }}>
                {stop.label}
              </span>
              {stop.legDistance && (
                <span style={{ fontSize: 11, color: BRAND.muted, background: BRAND.navy, padding: "2px 8px", borderRadius: 20 }}>
                  {stop.legDistance}
                </span>
              )}
              {hasData && (
                <span style={{ fontSize: 9, color: BRAND.lime, background: `${BRAND.lime}20`, padding: "2px 6px", borderRadius: 20, fontWeight: 600 }}>
                  LOGGED
                </span>
              )}
            </div>
            <div style={{ fontSize: 15, fontWeight: 600, color: BRAND.white, fontFamily: "'Space Grotesk', sans-serif" }}>
              {stop.shortName}
            </div>
            <div style={{ fontSize: 12, color: BRAND.muted, marginTop: 2, display: "flex", alignItems: "center", gap: 4 }}>
              <MapPinIcon /> {stop.location}
            </div>
          </div>
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: "50%",
              background: BRAND.navy,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
              transition: "transform 0.3s ease",
              flexShrink: 0,
            }}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M3 4.5L6 7.5L9 4.5" stroke={BRAND.muted} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </div>

        {expanded && (
          <div style={{ padding: "0 16px 16px", borderTop: `1px solid ${BRAND.border}` }}>
            {isCharge && (
              <div style={{ padding: "12px 0", marginBottom: 8, borderBottom: `1px solid ${BRAND.border}20` }}>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, fontSize: 12, color: BRAND.muted }}>
                  <span style={{ background: `${BRAND.lime}15`, color: BRAND.lime, padding: "3px 8px", borderRadius: 6, fontWeight: 600, fontSize: 11 }}>
                    {stop.chargerCompat}
                  </span>
                  <span style={{ background: `${BRAND.blue}15`, color: BRAND.blue, padding: "3px 8px", borderRadius: 6, fontSize: 11 }}>
                    Target: {stop.targetCharge}
                  </span>
                  <span style={{ background: `${BRAND.blue}15`, color: BRAND.blue, padding: "3px 8px", borderRadius: 6, fontSize: 11 }}>
                    Est: {stop.estChargeTime}
                  </span>
                  <span style={{ padding: "3px 8px", borderRadius: 6, fontSize: 11, background: BRAND.navy }}>
                    {stop.costEst}
                  </span>
                </div>
                <div style={{ fontSize: 12, color: BRAND.muted, marginTop: 6 }}>{stop.charger}</div>
                <div style={{ fontSize: 12, color: BRAND.muted, marginTop: 3 }}>{stop.amenities}</div>
              </div>
            )}

            {stop.notes && !isCharge && (
              <div style={{ padding: "10px 0 8px", fontSize: 13, color: BRAND.muted, fontStyle: "italic" }}>
                {stop.notes}
              </div>
            )}

            <div style={{ paddingTop: 8 }}>
              {isStart && (
                <>
                  <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                    <InputField label="Departure Time" value={log.departureTime} onChange={(v) => updateField("departureTime", v)} type="time" />
                    <InputField label="Battery at Departure" value={log.departureBattery} onChange={(v) => updateField("departureBattery", v)} placeholder="100" unit="%" />
                  </div>
                  <NotesField value={log.notes} onChange={(v) => updateField("notes", v)} />
                </>
              )}

              {isDest && (
                <>
                  <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                    <InputField label="Arrival Time" value={log.arrivalTime} onChange={(v) => updateField("arrivalTime", v)} type="time" />
                    <InputField label="Battery on Arrival" value={log.arrivalBattery} onChange={(v) => updateField("arrivalBattery", v)} placeholder="25" unit="%" />
                    <InputField label="Est. Miles Remaining" value={log.arrivalMilesEst} onChange={(v) => updateField("arrivalMilesEst", v)} placeholder="60" unit="mi" />
                  </div>
                  <NotesField value={log.notes} onChange={(v) => updateField("notes", v)} />
                </>
              )}

              {isCharge && (
                <>
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: BRAND.blue, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>Arrival</div>
                    <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                      <InputField label="Arrival Time" value={log.arrivalTime} onChange={(v) => updateField("arrivalTime", v)} type="time" />
                      <InputField label="Battery Level" value={log.arrivalBattery} onChange={(v) => updateField("arrivalBattery", v)} placeholder="30" unit="%" />
                      <InputField label="Est. Miles Remaining" value={log.arrivalMilesEst} onChange={(v) => updateField("arrivalMilesEst", v)} placeholder="45" unit="mi" />
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: BRAND.lime, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>Departure</div>
                    <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                      <InputField label="Departure Time" value={log.departureTime} onChange={(v) => updateField("departureTime", v)} type="time" />
                      <InputField label="Battery Level" value={log.departureBattery} onChange={(v) => updateField("departureBattery", v)} placeholder="80" unit="%" />
                    </div>
                  </div>
                  <NotesField value={log.notes} onChange={(v) => updateField("notes", v)} />
                </>
              )}
            </div>

            {stop.nextDistance && (
              <div style={{ marginTop: 12, padding: "8px 10px", background: BRAND.navy, borderRadius: 6, fontSize: 12, color: BRAND.muted, display: "flex", alignItems: "center", gap: 6 }}>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M7 2V12M7 12L4 9M7 12L10 9" stroke={BRAND.blue} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Next: {stop.nextDistance}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function PreDepartureChecklist({ checklist, onChange, stops }) {
  const toggle = (key) => {
    onChange({ ...checklist, [key]: !checklist[key] });
  };

  const checklistItems = [
    { key: "chargeLimit100", label: "Set EV9 charge limit to 100% on Level 2 home charger" },
    { key: "teslaApp", label: "Tesla app installed with payment method for Supercharger access" },
    { key: "precondition", label: "Pre-condition battery before departure (route to first charger in nav)" },
    { key: "nacsAdapters", label: "NACS backup adapters packed in vehicle" },
    { key: "snacksKids", label: "Snacks & entertainment packed for charging stop breaks" },
  ];

  const completed = Object.values(checklist).filter(Boolean).length;
  const total = checklistItems.length;

  return (
    <div style={{ background: BRAND.card, borderRadius: 12, border: `1px solid ${BRAND.border}`, padding: 20, marginBottom: 20 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <rect x="2" y="2" width="14" height="14" rx="3" stroke={BRAND.blue} strokeWidth="1.5" />
            <path d="M6 9L8 11L12 7" stroke={BRAND.lime} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span style={{ fontSize: 14, fontWeight: 700, color: BRAND.white, textTransform: "uppercase", letterSpacing: "0.05em", fontFamily: "'Space Grotesk', sans-serif" }}>
            Pre-Departure Checklist
          </span>
        </div>
        <span style={{ fontSize: 12, color: completed === total ? BRAND.lime : BRAND.muted, fontWeight: 600 }}>
          {completed}/{total}
        </span>
      </div>
      <div style={{ height: 4, background: BRAND.navy, borderRadius: 2, marginBottom: 14, overflow: "hidden" }}>
        <div
          style={{
            height: "100%",
            width: `${(completed / total) * 100}%`,
            background: completed === total ? BRAND.lime : BRAND.blue,
            borderRadius: 2,
            transition: "width 0.4s ease, background 0.4s ease",
          }}
        />
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {checklistItems.map((item) => (
          <Checkbox key={item.key} checked={checklist[item.key]} onChange={() => toggle(item.key)} label={item.label} />
        ))}
      </div>
      <LaunchNavButton stops={stops} />
    </div>
  );
}

function TripSummaryBar({ stops, logs }) {
  const chargeStops = stops.filter((s) => s.type === "charge");
  const loggedCount = chargeStops.filter((s) => {
    const log = logs[s.id];
    return log && log.arrivalTime && log.departureBattery;
  }).length;

  return (
    <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 20 }}>
      <div style={{ flex: 1, minWidth: 120, background: BRAND.navy, borderRadius: 8, padding: "10px 14px", textAlign: "center" }}>
        <div style={{ fontSize: 11, color: BRAND.muted, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 2 }}>Total Distance</div>
        <div style={{ fontSize: 20, fontWeight: 700, color: BRAND.white, fontFamily: "'Space Grotesk', sans-serif" }}>~515 mi</div>
      </div>
      <div style={{ flex: 1, minWidth: 120, background: BRAND.navy, borderRadius: 8, padding: "10px 14px", textAlign: "center" }}>
        <div style={{ fontSize: 11, color: BRAND.muted, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 2 }}>Charge Stops</div>
        <div style={{ fontSize: 20, fontWeight: 700, color: BRAND.lime, fontFamily: "'Space Grotesk', sans-serif" }}>3</div>
      </div>
      <div style={{ flex: 1, minWidth: 120, background: BRAND.navy, borderRadius: 8, padding: "10px 14px", textAlign: "center" }}>
        <div style={{ fontSize: 11, color: BRAND.muted, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 2 }}>Stops Logged</div>
        <div style={{ fontSize: 20, fontWeight: 700, color: loggedCount === 3 ? BRAND.lime : BRAND.blue, fontFamily: "'Space Grotesk', sans-serif" }}>{loggedCount}/3</div>
      </div>
      <div style={{ flex: 1, minWidth: 120, background: BRAND.navy, borderRadius: 8, padding: "10px 14px", textAlign: "center" }}>
        <div style={{ fontSize: 11, color: BRAND.muted, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 2 }}>Est. Drive Time</div>
        <div style={{ fontSize: 20, fontWeight: 700, color: BRAND.white, fontFamily: "'Space Grotesk', sans-serif" }}>~8.5 hr</div>
      </div>
    </div>
  );
}

function RangeTips({ isOpen, onToggle }) {
  return (
    <div style={{ background: BRAND.card, borderRadius: 12, border: `1px solid ${BRAND.border}`, marginBottom: 20, overflow: "hidden" }}>
      <div
        onClick={onToggle}
        style={{ padding: "14px 16px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between" }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <circle cx="8" cy="8" r="6.5" stroke={BRAND.blue} strokeWidth="1.5" />
            <path d="M8 5V8.5L10.5 10" stroke={BRAND.blue} strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <span style={{ fontSize: 14, fontWeight: 600, color: BRAND.white, fontFamily: "'Space Grotesk', sans-serif" }}>
            Range Tips & Vehicle Info
          </span>
        </div>
        <div style={{ transform: isOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.3s ease" }}>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M3 4.5L6 7.5L9 4.5" stroke={BRAND.muted} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </div>
      {isOpen && (
        <div style={{ padding: "0 16px 16px", borderTop: `1px solid ${BRAND.border}`, fontSize: 13, color: BRAND.muted, lineHeight: 1.6 }}>
          <div style={{ padding: "12px 0" }}>
            <div style={{ fontWeight: 600, color: BRAND.white, marginBottom: 4 }}>2026 Kia EV9 GT-Line AWD Long Range</div>
            <div>99.8 kWh battery | Built-in NACS port | EPA: 280 mi (real-world highway: ~240 mi at 100%)</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, paddingTop: 4 }}>
            {[
              "Keep highway speed at or below 70 mph — range drops noticeably above 75",
              "Use Eco mode for highway legs to maximize efficiency",
              "Heated seats use less energy than the cabin heater",
              "Use regen braking paddles (i-Pedal or Level 3) on Kentucky hills",
              "If range is tight, reduce to 65 mph — adds 15–20 miles effective range",
            ].map((tip, i) => (
              <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                <span style={{ color: BRAND.lime, flexShrink: 0, marginTop: 1 }}>▸</span>
                <span>{tip}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function DataToolbar({ onExport, onExportAll, onReset }) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [saveFlash, setSaveFlash] = useState(false);

  const handleReset = () => {
    if (!showConfirm) {
      setShowConfirm(true);
      return;
    }
    onReset();
    setShowConfirm(false);
  };

  const btnBase = {
    padding: "8px 14px",
    borderRadius: 8,
    border: "none",
    cursor: "pointer",
    fontSize: 13,
    fontWeight: 600,
    fontFamily: "'Space Grotesk', sans-serif",
    display: "flex",
    alignItems: "center",
    gap: 6,
    transition: "all 0.2s ease",
  };

  return (
    <div style={{ background: BRAND.card, borderRadius: 12, border: `1px solid ${BRAND.border}`, padding: 16, marginBottom: 20 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M2 10V13H14V10" stroke={BRAND.blue} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M8 2V10M8 10L5 7M8 10L11 7" stroke={BRAND.blue} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span style={{ fontSize: 14, fontWeight: 600, color: BRAND.white, fontFamily: "'Space Grotesk', sans-serif" }}>
            Trip Data
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: saveFlash ? BRAND.lime : BRAND.muted, transition: "background 0.3s" }} />
          <span style={{ fontSize: 11, color: saveFlash ? BRAND.lime : BRAND.muted, transition: "color 0.3s" }}>
            {saveFlash ? "Saved!" : "Auto-saving"}
          </span>
        </div>
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button
          onClick={() => {
            onExport();
            setSaveFlash(true);
            setTimeout(() => setSaveFlash(false), 2000);
          }}
          style={{ ...btnBase, background: BRAND.blue, color: BRAND.white }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M2 9V12H12V9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M7 2V9M7 9L4 6M7 9L10 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Export This Trip
        </button>
        <button
          onClick={() => {
            onExportAll();
            setSaveFlash(true);
            setTimeout(() => setSaveFlash(false), 2000);
          }}
          style={{ ...btnBase, background: BRAND.navy, color: BRAND.blue, border: `1px solid ${BRAND.border}` }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M2 9V12H12V9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M7 2V9M7 9L4 6M7 9L10 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Export Both Trips
        </button>
        {!showConfirm ? (
          <button
            onClick={handleReset}
            style={{ ...btnBase, background: "transparent", color: BRAND.muted, border: `1px solid ${BRAND.border}`, marginLeft: "auto" }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M2 4H12M5 4V2H9V4M3 4V12H11V4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Reset
          </button>
        ) : (
          <div style={{ display: "flex", gap: 6, marginLeft: "auto", alignItems: "center", flexWrap: "wrap" }}>
            <span style={{ fontSize: 12, color: BRAND.red }}>Clear all data?</span>
            <button
              onClick={handleReset}
              style={{ ...btnBase, background: BRAND.red, color: BRAND.white, padding: "6px 12px", fontSize: 12 }}
            >
              Yes, Reset
            </button>
            <button
              onClick={() => setShowConfirm(false)}
              style={{ ...btnBase, background: "transparent", color: BRAND.muted, padding: "6px 12px", fontSize: 12, border: `1px solid ${BRAND.border}` }}
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function buildGoogleMapsUrl(stops) {
  const addresses = stops.map((s) => encodeURIComponent(s.location));
  const origin = addresses[0];
  const destination = addresses[addresses.length - 1];
  const waypoints = addresses.slice(1, -1).join("|");
  return `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&waypoints=${waypoints}&travelmode=driving`;
}

function LaunchNavButton({ stops }) {
  const url = buildGoogleMapsUrl(stops);
  const stopCount = stops.filter((s) => s.type === "charge").length;

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
        width: "100%",
        padding: "14px 20px",
        borderRadius: 10,
        border: "none",
        background: `linear-gradient(135deg, #34A853 0%, #1E8E3E 100%)`,
        color: BRAND.white,
        cursor: "pointer",
        fontFamily: "'Space Grotesk', sans-serif",
        fontWeight: 700,
        fontSize: 15,
        textDecoration: "none",
        transition: "all 0.2s ease",
        boxShadow: "0 4px 16px rgba(52, 168, 83, 0.3)",
        boxSizing: "border-box",
        marginTop: 16,
        letterSpacing: "0.02em",
      }}
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" fill="white" fillOpacity="0.9"/>
        <circle cx="12" cy="9" r="2.5" fill="#34A853"/>
        <path d="M3 11l2-2 3 3 5-5 3 3 5-5" stroke="white" strokeWidth="0" fill="none"/>
      </svg>
      Launch Route in Google Maps
      <span style={{ fontSize: 11, fontWeight: 400, opacity: 0.85, marginLeft: 2 }}>
        ({stopCount} stops)
      </span>
    </a>
  );
}

function PasscodeGate({ onAuthenticate }) {
  const [code, setCode] = useState("");
  const [error, setError] = useState(false);
  const [shake, setShake] = useState(false);

  const handleSubmit = () => {
    if (code.toUpperCase() === PASSCODE) {
      try {
        sessionStorage.setItem(AUTH_KEY, "true");
      } catch (e) {
        // Silent fail
      }
      onAuthenticate();
    } else {
      setError(true);
      setShake(true);
      setTimeout(() => setShake(false), 500);
      setTimeout(() => setError(false), 3000);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") handleSubmit();
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: BRAND.bg,
      fontFamily: "'Inter', sans-serif",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: 20,
    }}>
      <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Inter:wght@400;500;600&display=swap" rel="stylesheet" />
      <div style={{
        background: BRAND.card,
        borderRadius: 16,
        border: `1px solid ${BRAND.border}`,
        padding: "40px 32px",
        maxWidth: 380,
        width: "100%",
        textAlign: "center",
        animation: shake ? "shake 0.5s ease-in-out" : "none",
      }}>
        <style>{`
          @keyframes shake {
            0%, 100% { transform: translateX(0); }
            10%, 30%, 50%, 70%, 90% { transform: translateX(-6px); }
            20%, 40%, 60%, 80% { transform: translateX(6px); }
          }
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
          }
        `}</style>

        <div style={{ marginBottom: 24, animation: "fadeIn 0.5s ease-out" }}>
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none" style={{ marginBottom: 16 }}>
            <rect width="48" height="48" rx="12" fill={BRAND.navy} stroke={BRAND.lime} strokeWidth="2" />
            <path d="M26 10L14 26H24L22 38L34 22H24L26 10Z" fill={BRAND.lime} />
          </svg>
          <h2 style={{
            fontSize: 20,
            fontWeight: 700,
            fontFamily: "'Space Grotesk', sans-serif",
            color: BRAND.white,
            margin: "0 0 6px",
            letterSpacing: "-0.02em",
          }}>
            EV Road Trip Tracker
          </h2>
          <p style={{ fontSize: 13, color: BRAND.muted, margin: 0 }}>
            Enter the trip passcode to continue
          </p>
        </div>

        <div style={{ position: "relative", marginBottom: 16 }}>
          <input
            type="password"
            value={code}
            onChange={(e) => { setCode(e.target.value); setError(false); }}
            onKeyDown={handleKeyDown}
            placeholder="Passcode"
            autoFocus
            style={{
              width: "100%",
              padding: "14px 16px",
              borderRadius: 10,
              border: `2px solid ${error ? BRAND.red : BRAND.border}`,
              background: BRAND.input,
              color: BRAND.white,
              fontSize: 16,
              outline: "none",
              fontFamily: "'Space Grotesk', sans-serif",
              textAlign: "center",
              letterSpacing: "0.15em",
              transition: "border-color 0.3s ease",
              boxSizing: "border-box",
            }}
            onFocus={(e) => { if (!error) e.target.style.borderColor = BRAND.blue; }}
            onBlur={(e) => { if (!error) e.target.style.borderColor = BRAND.border; }}
          />
        </div>

        {error && (
          <p style={{ fontSize: 13, color: BRAND.red, margin: "0 0 12px", fontWeight: 500 }}>
            Incorrect passcode. Try again.
          </p>
        )}

        <button
          onClick={handleSubmit}
          style={{
            width: "100%",
            padding: "14px 20px",
            borderRadius: 10,
            border: "none",
            background: `linear-gradient(135deg, ${BRAND.blue} 0%, ${BRAND.navy} 100%)`,
            color: BRAND.white,
            cursor: "pointer",
            fontFamily: "'Space Grotesk', sans-serif",
            fontWeight: 700,
            fontSize: 15,
            transition: "all 0.2s ease",
            boxShadow: `0 4px 16px ${BRAND.blue}30`,
            letterSpacing: "0.02em",
          }}
        >
          Access Trip
        </button>
      </div>
    </div>
  );
}

export default function RoadTripTracker() {
  const [isAuthed, setIsAuthed] = useState(() => {
    try {
      return sessionStorage.getItem(AUTH_KEY) === "true";
    } catch (e) {
      return false;
    }
  });
  const [activeTrip, setActiveTrip] = useState(() => loadFromStorage(STORAGE_KEYS.activeTrip, "outbound"));
  const [outChecklist, setOutChecklist] = useState(() => loadFromStorage(STORAGE_KEYS.outChecklist, { ...defaultChecklist }));
  const [retChecklist, setRetChecklist] = useState(() => loadFromStorage(STORAGE_KEYS.retChecklist, { ...defaultChecklist }));
  const [outLogs, setOutLogs] = useState(() => loadFromStorage(STORAGE_KEYS.outLogs, initLogs(outboundStops)));
  const [retLogs, setRetLogs] = useState(() => loadFromStorage(STORAGE_KEYS.retLogs, initLogs(returnStops)));
  const [showTips, setShowTips] = useState(false);

  useEffect(() => { saveToStorage(STORAGE_KEYS.outLogs, outLogs); }, [outLogs]);
  useEffect(() => { saveToStorage(STORAGE_KEYS.retLogs, retLogs); }, [retLogs]);
  useEffect(() => { saveToStorage(STORAGE_KEYS.outChecklist, outChecklist); }, [outChecklist]);
  useEffect(() => { saveToStorage(STORAGE_KEYS.retChecklist, retChecklist); }, [retChecklist]);
  useEffect(() => { saveToStorage(STORAGE_KEYS.activeTrip, activeTrip); }, [activeTrip]);

  const isOutbound = activeTrip === "outbound";
  const stops = isOutbound ? outboundStops : returnStops;
  const logs = isOutbound ? outLogs : retLogs;
  const setLogs = isOutbound ? setOutLogs : setRetLogs;
  const checklist = isOutbound ? outChecklist : retChecklist;
  const setChecklist = isOutbound ? setOutChecklist : setRetChecklist;

  const updateLog = (id, log) => {
    setLogs((prev) => ({ ...prev, [id]: log }));
  };

  const downloadJSON = useCallback((data, filename) => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, []);

  const exportCurrentTrip = useCallback(() => {
    const tripLabel = isOutbound ? "Outbound (Mt Juliet → Sagamore Hills)" : "Return (Sagamore Hills → Mt Juliet)";
    const data = buildExportData(stops, logs, checklist, tripLabel);
    const dateStr = new Date().toISOString().split("T")[0];
    downloadJSON(data, `ev-trip-${isOutbound ? "outbound" : "return"}-${dateStr}.json`);
  }, [isOutbound, stops, logs, checklist, downloadJSON]);

  const exportAllTrips = useCallback(() => {
    const outData = buildExportData(outboundStops, outLogs, outChecklist, "Outbound (Mt Juliet → Sagamore Hills)");
    const retData = buildExportData(returnStops, retLogs, retChecklist, "Return (Sagamore Hills → Mt Juliet)");
    const combined = {
      exportedAt: new Date().toISOString(),
      vehicle: "2026 Kia EV9 GT-Line AWD Long Range",
      totalRouteDistance: "~1,030 mi round trip",
      outbound: outData,
      returnTrip: retData,
    };
    const dateStr = new Date().toISOString().split("T")[0];
    downloadJSON(combined, `ev-trip-full-roundtrip-${dateStr}.json`);
  }, [outLogs, retLogs, outChecklist, retChecklist, downloadJSON]);

  const resetCurrentTrip = useCallback(() => {
    if (isOutbound) {
      setOutLogs(initLogs(outboundStops));
      setOutChecklist({ ...defaultChecklist });
    } else {
      setRetLogs(initLogs(returnStops));
      setRetChecklist({ ...defaultChecklist });
    }
  }, [isOutbound]);

  if (!isAuthed) {
    return <PasscodeGate onAuthenticate={() => setIsAuthed(true)} />;
  }

  return (
    <div style={{ minHeight: "100vh", background: BRAND.bg, fontFamily: "'Inter', sans-serif", color: BRAND.white }}>
      <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Inter:wght@400;500;600&display=swap" rel="stylesheet" />

      <div style={{ background: `linear-gradient(135deg, ${BRAND.navy} 0%, ${BRAND.bg} 100%)`, borderBottom: `1px solid ${BRAND.border}`, padding: "24px 20px 20px" }}>
        <div style={{ maxWidth: 640, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
              <rect width="28" height="28" rx="8" fill={BRAND.navy} stroke={BRAND.lime} strokeWidth="1.5" />
              <path d="M15 6L8 15H14L13 22L20 13H14L15 6Z" fill={BRAND.lime} />
            </svg>
            <h1 style={{ fontSize: 22, fontWeight: 700, fontFamily: "'Space Grotesk', sans-serif", margin: 0, letterSpacing: "-0.02em" }}>
              EV Road Trip Tracker
            </h1>
          </div>
          <p style={{ fontSize: 13, color: BRAND.muted, margin: 0 }}>
            Mt Juliet, TN ↔ Sagamore Hills, OH · 2026 Kia EV9 · ~515 mi each way
          </p>

          <div style={{ display: "flex", gap: 4, marginTop: 16, background: BRAND.navy, borderRadius: 10, padding: 4 }}>
            {[
              { key: "outbound", label: "Outbound →", sub: "TN → OH" },
              { key: "return", label: "← Return", sub: "OH → TN" },
            ].map((t) => (
              <button
                key={t.key}
                onClick={() => setActiveTrip(t.key)}
                style={{
                  flex: 1,
                  padding: "10px 8px",
                  borderRadius: 8,
                  border: "none",
                  background: activeTrip === t.key ? BRAND.card : "transparent",
                  color: activeTrip === t.key ? BRAND.white : BRAND.muted,
                  cursor: "pointer",
                  fontFamily: "'Space Grotesk', sans-serif",
                  fontWeight: 600,
                  fontSize: 14,
                  transition: "all 0.2s ease",
                  boxShadow: activeTrip === t.key ? `0 2px 8px ${BRAND.bg}80` : "none",
                }}
              >
                {t.label}
                <span style={{ display: "block", fontSize: 11, fontWeight: 400, color: BRAND.muted, marginTop: 1 }}>{t.sub}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 640, margin: "0 auto", padding: "20px 16px 40px" }}>
        <TripSummaryBar stops={stops} logs={logs} />
        <DataToolbar onExport={exportCurrentTrip} onExportAll={exportAllTrips} onReset={resetCurrentTrip} />
        <RangeTips isOpen={showTips} onToggle={() => setShowTips(!showTips)} />
        <PreDepartureChecklist checklist={checklist} onChange={setChecklist} stops={stops} />

        <div>
          {stops.map((stop, i) => (
            <StopCard
              key={stop.id}
              stop={stop}
              log={logs[stop.id]}
              onLogChange={(log) => updateLog(stop.id, log)}
              isFirst={i === 0}
              isLast={i === stops.length - 1}
            />
          ))}
        </div>

        <div style={{ marginTop: 24, background: BRAND.navy, borderRadius: 12, border: `1px solid ${BRAND.border}`, padding: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <span style={{ fontSize: 16 }}>⚠</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: BRAND.white, fontFamily: "'Space Grotesk', sans-serif" }}>
              Macedonia Supercharger — NOT Compatible
            </span>
          </div>
          <p style={{ fontSize: 12, color: BRAND.muted, margin: 0, lineHeight: 1.5 }}>
            The Tesla Supercharger at 8210 Macedonia Commons Blvd is V2 Tesla-only (120 kW) and does NOT support the Kia EV9. Use the <strong style={{ color: BRAND.lime }}>Twinsburg Sheetz</strong> (2495 E Aurora Rd, ~5 mi away) for DC fast charging near your destination.
          </p>
        </div>

        <div style={{ marginTop: 24, textAlign: "center", fontSize: 11, color: BRAND.muted, opacity: 0.6 }}>
          Data auto-saves to this device. Export before clearing browser data.
        </div>
      </div>
    </div>
  );
}
