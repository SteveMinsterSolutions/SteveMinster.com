import { useState } from "react";

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
  designPurple: "#7C5CFC",
  designPurpleBg: "#F5F2FF",
  procTeal: "#0EA5A0",
  procTealBg: "#EFFBFB",
  bbBlue: "#1E6FD9",
  bbBlueBg: "#EFF6FF",
  successGreen: "#16A34A",
  successBg: "#F0FDF4",
};

const steps = [
  {
    number: 1, title: "Set Up Your FF&E Markups as Data", who: "Lauren", whoIcon: "🎨", when: "While working in Revu 21",
    summary: "Configure your markup tools so every FF&E callout becomes a structured row of data — not just a bubble on a drawing.",
    tasks: [
      { label: "Open the Markups List panel", detail: "Go to Window → Panels → Markups, or click the Markups List icon at the bottom of the screen, or press Alt + L.", tip: null },
      { label: "Use consistent Subjects for FF&E markups", detail: "In your Tool Chest, set up FF&E tools with clear Subject names: Furniture, Lighting, Rug, Casework, Window Treatment, Art, Accessory, Appliance, Plumbing Fixture.", tip: "These Subject names should match the Item_Type dropdown values in the FF&E template — that way the export maps directly." },
      { label: "Pack item details into the Label or Comments field", detail: "For each FF&E markup, include key details in a consistent format. Example:", code: "LR-SF-01 | RH | RH-98765-LIN | Linen, off-white | Qty 1", tip: "The pipe-separated format makes it easy to split into columns later in Excel. Order: Item ID | Manufacturer | SKU | Finish | Quantity." },
      { label: "(Optional) Use Spaces for room names", detail: "If your drawings have Spaces defined, each markup will automatically show a Space value in the Markups List. This maps directly to the Room_Area field in the template.", tip: "Nice-to-have for the pilot. If your drawings already use Spaces, great. If not, you can enter Room_Area manually in the spreadsheet." },
    ],
    nextStepPreview: "Now that your markups carry structured data, let's make sure the right columns are visible before exporting.",
  },
  {
    number: 2, title: "Configure the Markups List Columns", who: "Lauren", whoIcon: "🎨", when: "Before exporting",
    summary: "Clean up what the Markups List shows so your export only includes useful data — no noise.",
    tasks: [
      { label: "Open the Columns manager", detail: "In the Markups List header row, click the Columns dropdown (small gear/funnel icon) and choose Columns… (Manage Columns).", tip: null },
      { label: "Turn ON the columns you need", detail: "Enable: Page, Space (if using Spaces), Subject, Label, Comments, and any custom columns you've set up.", tip: null },
      { label: "Turn OFF the noise", detail: "Disable columns like Author, Layer, Action, Date — unless you have a specific reason to include them.", tip: "Fewer columns = cleaner export = less cleanup in Excel." },
      { label: "Filter to FF&E items only", detail: "In the Markups List header for Subject, click the filter icon. Check only the FF&E-relevant subjects (Furniture, Lighting, Rug, etc.).", tip: "This keeps non-FF&E markups (dimensions, general notes, RFIs) out of your export." },
    ],
    nextStepPreview: "Your Markups List should now look like a clean table of just FF&E items. Time to export.",
  },
  {
    number: 3, title: "Export to CSV", who: "Lauren", whoIcon: "🎨", when: "When items are ready for Procurement",
    summary: "Generate a CSV file from the Markups List — one row per FF&E item, ready to open in Excel.",
    tasks: [
      { label: "Click the Summary icon", detail: "In the Markups List toolbar (bottom panel), click the Summary icon — it looks like a clipboard/checklist. Hover text says \"Summary.\"", tip: null },
      { label: "Set the output format to CSV", detail: "In the Markup Summary dialog, under the Output section, choose CSV (Comma Separated Values).", tip: null },
      { label: "Choose a filename and location", detail: "Save to the project folder with a clear name:", code: "IDA-2026-012_SmithResidence_FFE_Markups.csv", tip: "Use the project ID and name so Brandy knows exactly which project and version this belongs to." },
      { label: "Confirm columns and filters", detail: "In the Columns section of the dialog, verify only useful columns are selected. In the Filter and Sort section, confirm your FF&E subject filter is applied.", tip: "Optional but helpful: sort by Space then Page so the output is grouped by room." },
      { label: "Click OK to generate", detail: "Revu will create the CSV file. If you have CSV associated with Excel, it'll usually open automatically.", tip: null },
    ],
    nextStepPreview: "You now have a CSV with one row per item. Next, map it into the FF&E template.",
  },
  {
    number: 4, title: "Map the Export into the FF&E Template", who: "Lauren", whoIcon: "🎨", when: "In Excel, after export",
    summary: "Copy data from the Bluebeam CSV into the standard FF&E template. This is where raw markup data becomes a structured handoff.",
    tasks: [
      { label: "Open both files in Excel", detail: "Open the exported CSV and the FFE_Line_Items_Template.xlsx side by side in the same Excel window.", tip: null },
      { label: "Map the direct columns", detail: "Copy and paste columns that map cleanly:", mapping: [{ from: "Space", to: "Room_Area" }, { from: "Page / Page Label", to: "Room_Tag_on_Drawing" }, { from: "Subject", to: "Item_Type" }], tip: null },
      { label: "Break out the Label/Comments data", detail: "If you used the pipe-separated format in Labels, split the data into the right template columns:", mapping: [{ from: "Label segment 1", to: "Item_Internal_ID" }, { from: "Label segment 2", to: "Manufacturer" }, { from: "Label segment 3", to: "Manufacturer_SKU" }, { from: "Label segment 4", to: "Finish_Color" }, { from: "Label segment 5", to: "Quantity" }], tip: "Excel tip: use Data → Text to Columns with pipe (|) as the delimiter to split these automatically." },
      { label: "Fill in what Bluebeam doesn't know", detail: "Add the fields that come from your project knowledge, not the drawings: Project_ID, Project_Name, Client_Name, Client_Approved, Required_Onsite_Date, Install_Phase, any internal notes.", tip: "Project-level fields (ID, Name, Client) are the same for every row — fill one row and drag down." },
    ],
    nextStepPreview: "Template is filled. One last step — save and hand off to Brandy.",
  },
  {
    number: 5, title: "Save and Hand Off to Procurement", who: "Lauren", whoIcon: "🎨", secondaryWho: "Brandy", secondaryIcon: "📋", when: "Handoff point",
    summary: "Save the completed template with a versioned filename and let Brandy know it's ready.",
    tasks: [
      { label: "Save with a clear, versioned filename", detail: "Save the completed template as:", code: "IDA-2026-012_SmithResidence_FFE_Line_Items_v01.xlsx", tip: "Increment the version number (v01, v02, v03) any time changes are made. Never overwrite — Brandy needs to know which version she's working from." },
      { label: "Drop it in the agreed project folder", detail: "Put the file in the shared project folder that both Design and Procurement can access.", tip: null },
      { label: "Let Brandy know what she's getting", detail: "Include two key pieces of info: which drawing set / date this corresponds to, and whether any items are still pending client approval.", tip: "A quick Slack or email: \"Smith Residence FF&E is ready — v01, based on the 4/10 drawing set. 2 items still pending client approval (flagged in the sheet).\"" },
    ],
    nextStepPreview: null,
  },
];

function TaskItem({ task, index }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ background: COLORS.white, border: `1px solid ${COLORS.faintBorder}`, borderRadius: 10, overflow: "hidden" }}>
      <div onClick={() => setOpen(!open)} style={{ padding: "12px 14px", cursor: "pointer", display: "flex", alignItems: "flex-start", gap: 10 }}>
        <div style={{ width: 22, height: 22, borderRadius: 6, background: open ? COLORS.bbBlue : `${COLORS.bbBlue}12`, color: open ? COLORS.white : COLORS.bbBlue, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, flexShrink: 0, marginTop: 1, transition: "all 0.15s ease" }}>
          {String.fromCharCode(97 + index)}
        </div>
        <div style={{ flex: 1, fontSize: 13, fontWeight: 600, color: COLORS.darkText, lineHeight: 1.4 }}>{task.label}</div>
        <div style={{ fontSize: 14, color: COLORS.lightText, transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s ease", flexShrink: 0 }}>▾</div>
      </div>
      {open && (
        <div style={{ padding: "0 14px 14px 46px" }}>
          <div style={{ fontSize: 12, color: COLORS.midText, lineHeight: 1.7 }}>{task.detail}</div>
          {task.code && (
            <div style={{ marginTop: 8, background: COLORS.navy, color: COLORS.lime, padding: "10px 14px", borderRadius: 8, fontSize: 12, fontFamily: "monospace", lineHeight: 1.5, overflowX: "auto" }}>{task.code}</div>
          )}
          {task.mapping && (
            <div style={{ marginTop: 10 }}>
              {task.mapping.map((m, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0", borderBottom: i < task.mapping.length - 1 ? `1px solid ${COLORS.faintBorder}` : "none" }}>
                  <span style={{ fontSize: 11, color: COLORS.bbBlue, fontFamily: "monospace", background: COLORS.bbBlueBg, padding: "2px 8px", borderRadius: 5, fontWeight: 500, whiteSpace: "nowrap" }}>{m.from}</span>
                  <span style={{ fontSize: 12, color: COLORS.lightText }}>→</span>
                  <span style={{ fontSize: 11, color: "#7C5CFC", fontFamily: "monospace", background: "#F5F2FF", padding: "2px 8px", borderRadius: 5, fontWeight: 500, whiteSpace: "nowrap" }}>{m.to}</span>
                </div>
              ))}
            </div>
          )}
          {task.tip && (
            <div style={{ marginTop: 10, background: "#FFFBEB", border: "1px solid #FDE68A", borderRadius: 8, padding: "8px 12px", display: "flex", gap: 8, alignItems: "flex-start" }}>
              <span style={{ fontSize: 12, flexShrink: 0, marginTop: 1 }}>💡</span>
              <span style={{ fontSize: 11, color: "#92400E", lineHeight: 1.6 }}>{task.tip}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function StepSection({ step, isActive, onToggle }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div onClick={onToggle} style={{ background: isActive ? COLORS.bbBlueBg : COLORS.white, border: `1.5px solid ${isActive ? COLORS.bbBlue + "40" : COLORS.faintBorder}`, borderRadius: isActive ? "12px 12px 0 0" : 12, padding: "16px 18px", cursor: "pointer", transition: "all 0.2s ease", boxShadow: isActive ? `0 4px 16px ${COLORS.bbBlue}10` : "0 1px 3px rgba(0,0,0,0.03)" }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: isActive ? COLORS.bbBlue : `${COLORS.bbBlue}12`, color: isActive ? COLORS.white : COLORS.bbBlue, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 800, flexShrink: 0, transition: "all 0.2s ease" }}>{step.number}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: COLORS.darkText, marginBottom: 4 }}>{step.title}</div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: 10, fontWeight: 600, background: "#F5F2FF", color: "#7C5CFC", padding: "2px 7px", borderRadius: 5 }}>{step.whoIcon} {step.who}</span>
              {step.secondaryWho && <span style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: 10, fontWeight: 600, background: "#EFFBFB", color: "#0EA5A0", padding: "2px 7px", borderRadius: 5 }}>{step.secondaryIcon} {step.secondaryWho}</span>}
              <span style={{ fontSize: 11, color: COLORS.lightText }}>· {step.when}</span>
            </div>
            {!isActive && <div style={{ fontSize: 12, color: COLORS.midText, marginTop: 6, lineHeight: 1.5 }}>{step.summary}</div>}
          </div>
          <div style={{ fontSize: 16, color: COLORS.lightText, transform: isActive ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s ease", flexShrink: 0, marginTop: 4 }}>▾</div>
        </div>
      </div>
      {isActive && (
        <div style={{ background: COLORS.offWhite, border: `1.5px solid ${COLORS.bbBlue}40`, borderTop: "none", borderRadius: "0 0 12px 12px", padding: "16px 18px" }}>
          <div style={{ fontSize: 12, color: COLORS.midText, lineHeight: 1.6, marginBottom: 14 }}>{step.summary}</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {step.tasks.map((task, i) => <TaskItem key={i} task={task} index={i} />)}
          </div>
          {step.nextStepPreview && (
            <div style={{ marginTop: 14, padding: "10px 14px", background: `${COLORS.bbBlue}08`, borderRadius: 8, border: `1px dashed ${COLORS.bbBlue}30`, display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 12, color: COLORS.bbBlue }}>→</span>
              <span style={{ fontSize: 12, color: COLORS.bbBlue, fontWeight: 500 }}>{step.nextStepPreview}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function BluebeamGuide() {
  const [activeStep, setActiveStep] = useState(null);

  const flowSteps = [
    { icon: "📐", label: "Revu 21 Markups", color: COLORS.bbBlue },
    { icon: "📊", label: "CSV Export", color: COLORS.bbBlue },
    { icon: "📋", label: "FF&E Template", color: "#7C5CFC" },
    { icon: "📧", label: "Handoff", color: "#0EA5A0" },
    { icon: "🗄️", label: "FileMaker", color: "#0EA5A0" },
  ];

  return (
    <div>
      {/* Flow diagram */}
      <div style={{ background: COLORS.white, border: `1px solid ${COLORS.faintBorder}`, borderRadius: 12, padding: "16px 14px", marginBottom: 20 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: COLORS.lightText, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12, textAlign: "center" }}>The Full Flow</div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 4, flexWrap: "wrap" }}>
          {flowSteps.map((s, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3, padding: "6px 8px", borderRadius: 8, background: `${s.color}08` }}>
                <span style={{ fontSize: 16 }}>{s.icon}</span>
                <span style={{ fontSize: 9, fontWeight: 600, color: s.color, textAlign: "center", lineHeight: 1.2, maxWidth: 64 }}>{s.label}</span>
              </div>
              {i < flowSteps.length - 1 && <span style={{ fontSize: 11, color: COLORS.lightText, margin: "0 1px" }}>→</span>}
            </div>
          ))}
        </div>
      </div>

      {/* Who badge */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", background: "#F5F2FF", borderRadius: 10, border: "1px solid #7C5CFC20", marginBottom: 20 }}>
        <span style={{ fontSize: 20 }}>🎨</span>
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#7C5CFC" }}>Primarily Lauren's workflow</div>
          <div style={{ fontSize: 11, color: COLORS.midText, marginTop: 2, lineHeight: 1.5 }}>Steps 1–4 happen in Bluebeam and Excel before the handoff. Step 5 is where Brandy picks it up.</div>
        </div>
      </div>

      {/* Steps */}
      {steps.map((step) => (
        <StepSection key={step.number} step={step} isActive={activeStep === step.number} onToggle={() => setActiveStep(activeStep === step.number ? null : step.number)} />
      ))}

      {/* Completion banner */}
      <div style={{ background: COLORS.successBg, border: `1.5px solid ${COLORS.successGreen}30`, borderRadius: 12, padding: "18px 20px", marginTop: 8, marginBottom: 20, display: "flex", gap: 12, alignItems: "flex-start" }}>
        <span style={{ fontSize: 22, flexShrink: 0 }}>✅</span>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.successGreen, marginBottom: 4 }}>That's the loop</div>
          <div style={{ fontSize: 12, color: COLORS.midText, lineHeight: 1.7 }}>Revu 21 Markups List → CSV Summary → Excel → FF&E Template → Brandy → FileMaker. Each cycle gets faster as the markup conventions become habit.</div>
        </div>
      </div>

      {/* Future optimization */}
      <div style={{ background: COLORS.white, border: `1px solid ${COLORS.faintBorder}`, borderRadius: 12, padding: "18px 20px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
          <span style={{ fontSize: 16 }}>🚀</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: COLORS.darkText }}>Next-Level Optimization</span>
        </div>
        <div style={{ fontSize: 12, color: COLORS.midText, lineHeight: 1.7, marginBottom: 10 }}>
          Once the basic flow is comfortable, Lauren can set up custom columns in Revu 21's Tool Chest — dedicated fields like Item_ID, SKU, Finish, and Qty instead of packing everything into the Comments field. This makes the export map almost 1:1 to the FF&E template with minimal manual cleanup.
        </div>
        <div style={{ fontSize: 11, fontWeight: 600, color: COLORS.bbBlue, background: COLORS.bbBlueBg, display: "inline-block", padding: "4px 10px", borderRadius: 6 }}>
          Save this for after the pilot — get the basic flow working first.
        </div>
      </div>
    </div>
  );
}
