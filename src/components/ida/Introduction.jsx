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
  red: "#E54B4B",
  successGreen: "#16A34A",
  successBg: "#F0FDF4",
  designPurple: "#7C5CFC",
  designPurpleBg: "#F5F2FF",
  procTeal: "#0EA5A0",
  procTealBg: "#EFFBFB",
};

function SectionBlock({ icon, title, children }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <span style={{ fontSize: 18 }}>{icon}</span>
        <h3 style={{ fontSize: 15, fontWeight: 700, color: COLORS.darkText, margin: 0 }}>{title}</h3>
      </div>
      {children}
    </div>
  );
}

function PainPoint({ text }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "10px 14px", background: "#FFF5F5", border: "1px solid #F0C4C4", borderRadius: 8, marginBottom: 6 }}>
      <span style={{ fontSize: 12, color: COLORS.red, flexShrink: 0, marginTop: 1 }}>⚠</span>
      <span style={{ fontSize: 13, color: COLORS.darkText, lineHeight: 1.5 }}>{text}</span>
    </div>
  );
}

function NotChanging({ text }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "10px 14px", background: COLORS.successBg, border: `1px solid ${COLORS.successGreen}30`, borderRadius: 8, marginBottom: 6 }}>
      <span style={{ fontSize: 12, flexShrink: 0, marginTop: 1 }}>✓</span>
      <span style={{ fontSize: 13, color: COLORS.darkText, lineHeight: 1.5 }}>{text}</span>
    </div>
  );
}

export default function Introduction({ onNavigateToTab }) {
  return (
    <div>
      {/* Hero message */}
      <div style={{ background: COLORS.white, border: `1px solid ${COLORS.faintBorder}`, borderRadius: 12, padding: "22px 20px", marginBottom: 24 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: COLORS.darkText, margin: "0 0 8px 0", lineHeight: 1.3 }}>
          Let's Try a Better Way to Hand Off FF&E Data
        </h2>
        <p style={{ fontSize: 13, color: COLORS.midText, margin: 0, lineHeight: 1.7 }}>
          This is a pilot proposal for one project — a process experiment, not a tech overhaul. 
          The goal is to cut down on duplicate work and mistakes in the Design → Procurement handoff 
          while keeping the tools you already use.
        </p>
      </div>

      {/* What we're trying to solve */}
      <SectionBlock icon="🔍" title="What We're Trying to Solve">
        <p style={{ fontSize: 13, color: COLORS.midText, lineHeight: 1.7, marginBottom: 12 }}>
          Right now, when Design finishes selections and markups in Bluebeam, Procurement receives PDFs 
          and has to manually re-type every item detail into FileMaker to create purchase orders. That process:
        </p>
        <PainPoint text="Takes a lot of time — one project can mean hundreds of line items typed by hand" />
        <PainPoint text="Creates opportunities for errors (wrong SKU, finish, quantity, or room)" />
        <PainPoint text="Generates extra back-and-forth emails to clarify missing info" />
        <PainPoint text="Makes it hard to see what's been approved, ordered, or delayed" />
      </SectionBlock>

      {/* What we're proposing */}
      <SectionBlock icon="💡" title="What We're Proposing (Just for One Project)">
        <p style={{ fontSize: 13, color: COLORS.midText, lineHeight: 1.7, marginBottom: 12 }}>
          Instead of handing off only PDFs, Design will also provide a simple spreadsheet with one row 
          per item that needs to be ordered. Think of it as a structured "shopping list" that Procurement 
          can use directly — without having to read and re-type from drawings.
        </p>
        <div style={{ background: COLORS.offWhite, border: `1px solid ${COLORS.faintBorder}`, borderRadius: 10, padding: "16px 18px", marginBottom: 12 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: COLORS.darkText, marginBottom: 10 }}>
            The spreadsheet covers:
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
            {[
              { icon: "📍", label: "Project & room info" },
              { icon: "🏭", label: "Manufacturer, SKU, finish" },
              { icon: "📝", label: "Description & dimensions" },
              { icon: "🔢", label: "Quantity & unit of measure" },
              { icon: "✅", label: "Client approval status" },
              { icon: "📅", label: "Required dates & phase" },
              { icon: "💰", label: "Estimated costs" },
              { icon: "📎", label: "Vendor & internal notes" },
            ].map((item, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 0" }}>
                <span style={{ fontSize: 12 }}>{item.icon}</span>
                <span style={{ fontSize: 12, color: COLORS.darkText }}>{item.label}</span>
              </div>
            ))}
          </div>
          <button
            onClick={() => onNavigateToTab && onNavigateToTab("schema")}
            style={{
              marginTop: 12,
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "8px 14px",
              borderRadius: 8,
              border: `1.5px solid ${COLORS.blue}`,
              background: `${COLORS.blue}08`,
              color: COLORS.blue,
              fontSize: 12,
              fontWeight: 600,
              fontFamily: "inherit",
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
          >
            📋 Explore all 30 fields in detail →
          </button>
        </div>

        {/* Who fills what */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <div style={{ flex: "1 1 200px", background: COLORS.designPurpleBg, border: `1px solid ${COLORS.designPurple}20`, borderRadius: 10, padding: "14px 16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
              <span style={{ fontSize: 14 }}>🎨</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: COLORS.designPurple }}>Lauren's Team Fills</span>
            </div>
            <div style={{ fontSize: 12, color: COLORS.midText, lineHeight: 1.7 }}>
              Item details, specs, finishes, quantities, client approvals — the stuff Design already knows from their selections.
            </div>
          </div>
          <div style={{ flex: "1 1 200px", background: COLORS.procTealBg, border: `1px solid ${COLORS.procTeal}20`, borderRadius: 10, padding: "14px 16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
              <span style={{ fontSize: 14 }}>📋</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: COLORS.procTeal }}>Brandy's Team Fills</span>
            </div>
            <div style={{ fontSize: 12, color: COLORS.midText, lineHeight: 1.7 }}>
              Pricing, lead times, vendor contacts, ship dates — the stuff Procurement confirms with vendors.
            </div>
          </div>
        </div>
      </SectionBlock>

      {/* How it works */}
      <SectionBlock icon="⚙️" title="How It Would Work">
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {[
            { num: "1", text: "Design develops selections and documents them in Bluebeam as usual." },
            { num: "2", text: "Before handing off, Design fills out the FF&E spreadsheet for the project (ideally by exporting from Bluebeam markups, then cleaning it up)." },
            { num: "3", text: "Design confirms client approvals are noted in the spreadsheet." },
            { num: "4", text: "Procurement receives the spreadsheet + the PDFs, and uses the spreadsheet as the single source of truth to create POs in FileMaker." },
            { num: "5", text: "Any changes (substitutions, finish tweaks, quantity adjustments) get updated in the spreadsheet first, then flow into FileMaker." },
          ].map((step) => (
            <div key={step.num} style={{ display: "flex", gap: 12, alignItems: "flex-start", padding: "10px 14px", background: COLORS.white, border: `1px solid ${COLORS.faintBorder}`, borderRadius: 10 }}>
              <div style={{ width: 26, height: 26, borderRadius: 7, background: `${COLORS.blue}12`, color: COLORS.blue, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800, flexShrink: 0 }}>
                {step.num}
              </div>
              <span style={{ fontSize: 13, color: COLORS.darkText, lineHeight: 1.6 }}>{step.text}</span>
            </div>
          ))}
        </div>
        <button
          onClick={() => onNavigateToTab && onNavigateToTab("bluebeam")}
          style={{
            marginTop: 12,
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "8px 14px",
            borderRadius: 8,
            border: `1.5px solid ${COLORS.blue}`,
            background: `${COLORS.blue}08`,
            color: COLORS.blue,
            fontSize: 12,
            fontWeight: 600,
            fontFamily: "inherit",
            cursor: "pointer",
          }}
        >
          📐 See the Bluebeam export guide →
        </button>
      </SectionBlock>

      {/* What we need to test */}
      <SectionBlock icon="🧪" title="What We Need to Test This">
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {[
            { icon: "📁", label: "One willing project", desc: "Mid-sized with a decent FF&E scope — maybe 30–80 line items." },
            { icon: "🎨", label: "A Design lead", desc: "Willing to try filling out the spreadsheet and experimenting with Bluebeam exports." },
            { icon: "📋", label: "A Procurement lead", desc: "To give honest feedback: Does this actually save time? Does it reduce errors?" },
          ].map((item, i) => (
            <div key={i} style={{ display: "flex", gap: 12, alignItems: "flex-start", padding: "12px 14px", background: COLORS.white, border: `1px solid ${COLORS.faintBorder}`, borderRadius: 10 }}>
              <span style={{ fontSize: 18, flexShrink: 0 }}>{item.icon}</span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: COLORS.darkText }}>{item.label}</div>
                <div style={{ fontSize: 12, color: COLORS.midText, marginTop: 2, lineHeight: 1.5 }}>{item.desc}</div>
              </div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 12, background: COLORS.offWhite, border: `1px solid ${COLORS.faintBorder}`, borderRadius: 10, padding: "14px 16px" }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: COLORS.darkText, marginBottom: 8 }}>We'll track a few simple things:</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {[
              "Time to create POs (before vs. after)",
              "Number of clarification emails between Design and Procurement",
              "Number of order mistakes or rework",
            ].map((metric, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: COLORS.midText }}>
                <span style={{ width: 6, height: 6, borderRadius: 3, background: COLORS.lime, flexShrink: 0 }} />
                {metric}
              </div>
            ))}
          </div>
        </div>
      </SectionBlock>

      {/* What this doesn't mean */}
      <SectionBlock icon="🚫" title="What This Doesn't Mean">
        <NotChanging text="We're not changing Bluebeam or FileMaker." />
        <NotChanging text="We're not adding a big new software system." />
        <NotChanging text="We're not creating extra work for Design — we're shifting work from 'Procurement retyping' to 'Design exporting data they already have.'" />
        <div style={{ marginTop: 8, padding: "12px 16px", background: `${COLORS.blue}06`, border: `1px solid ${COLORS.blue}15`, borderRadius: 10 }}>
          <span style={{ fontSize: 13, color: COLORS.blue, fontWeight: 600 }}>This is a process experiment, not a tech overhaul.</span>
        </div>
      </SectionBlock>

      {/* Next steps */}
      <SectionBlock icon="🚀" title="Next Steps (If We're In)">
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {[
            "Pick a pilot project.",
            "Set up the FF&E spreadsheet template (we already have a draft).",
            "Walk through one example item together so everyone sees what \"good\" looks like.",
            "Run the project and compare how it feels versus the old way.",
            "Debrief and decide whether to refine and expand, or pivot.",
          ].map((step, i) => (
            <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10, fontSize: 13, color: COLORS.darkText, lineHeight: 1.6 }}>
              <span style={{ color: COLORS.lime, fontWeight: 700, flexShrink: 0 }}>{i + 1}.</span>
              <span>{step}</span>
            </div>
          ))}
        </div>
      </SectionBlock>

      {/* CTA */}
      <div style={{ background: COLORS.navy, borderRadius: 12, padding: "22px 20px", color: COLORS.white, textAlign: "center" }}>
        <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>Questions or want to chat through this?</div>
        <div style={{ fontSize: 13, color: "#A0AABB", lineHeight: 1.5 }}>
          Let's grab 15 minutes and talk it through before we commit to anything.
        </div>
        <div style={{ marginTop: 14, display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
          <button
            onClick={() => onNavigateToTab && onNavigateToTab("process")}
            style={{ padding: "10px 18px", borderRadius: 8, border: `1.5px solid ${COLORS.lime}`, background: "transparent", color: COLORS.lime, fontSize: 12, fontWeight: 600, fontFamily: "inherit", cursor: "pointer" }}
          >
            🔄 View Process Map
          </button>
          <button
            onClick={() => onNavigateToTab && onNavigateToTab("feedback")}
            style={{ padding: "10px 18px", borderRadius: 8, border: "none", background: COLORS.lime, color: COLORS.navy, fontSize: 12, fontWeight: 700, fontFamily: "inherit", cursor: "pointer" }}
          >
            💬 Give Pilot Feedback
          </button>
        </div>
      </div>

      {/* Footer */}
      <div style={{ marginTop: 20, textAlign: "center", fontSize: 11, color: COLORS.lightText }}>
        Prepared by Steve Minster · March 2026
      </div>
    </div>
  );
}
