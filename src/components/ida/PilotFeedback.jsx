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
  red: "#E54B4B",
  designPurple: "#7C5CFC",
  designPurpleBg: "#F5F2FF",
  procTeal: "#0EA5A0",
  procTealBg: "#EFFBFB",
  successGreen: "#16A34A",
  successBg: "#F0FDF4",
};

// ── Submission email – change this to wherever you want responses sent
const SUBMIT_EMAIL = "steve@minstersolutions.com";

function RadioGroup({ options, value, onChange, name }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 6 }}>
      {options.map((opt) => (
        <label
          key={opt}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "8px 14px",
            borderRadius: 8,
            border: `1.5px solid ${value === opt ? COLORS.blue : COLORS.faintBorder}`,
            background: value === opt ? `${COLORS.blue}08` : COLORS.white,
            cursor: "pointer",
            fontSize: 12,
            fontWeight: value === opt ? 600 : 400,
            color: value === opt ? COLORS.blue : COLORS.midText,
            transition: "all 0.15s ease",
          }}
        >
          <input
            type="radio"
            name={name}
            value={opt}
            checked={value === opt}
            onChange={() => onChange(opt)}
            style={{ display: "none" }}
          />
          <span
            style={{
              width: 14,
              height: 14,
              borderRadius: 7,
              border: `2px solid ${value === opt ? COLORS.blue : COLORS.faintBorder}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            {value === opt && (
              <span style={{ width: 6, height: 6, borderRadius: 3, background: COLORS.blue }} />
            )}
          </span>
          {opt}
        </label>
      ))}
    </div>
  );
}

function RatingScale({ value, onChange, name }) {
  return (
    <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          onClick={() => onChange(n)}
          style={{
            width: 44,
            height: 44,
            borderRadius: 10,
            border: `1.5px solid ${value === n ? COLORS.lime : COLORS.faintBorder}`,
            background: value === n ? `${COLORS.lime}20` : COLORS.white,
            color: value === n ? COLORS.navy : COLORS.midText,
            fontSize: 16,
            fontWeight: value === n ? 800 : 500,
            fontFamily: "inherit",
            cursor: "pointer",
            transition: "all 0.15s ease",
          }}
        >
          {n}
        </button>
      ))}
      <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", marginLeft: 4 }}>
        <span style={{ fontSize: 10, color: COLORS.lightText, lineHeight: 1.3 }}>1 = unlikely</span>
        <span style={{ fontSize: 10, color: COLORS.lightText, lineHeight: 1.3 }}>5 = absolutely</span>
      </div>
    </div>
  );
}

function TextArea({ value, onChange, placeholder, rows = 3 }) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      style={{
        width: "100%",
        padding: "10px 14px",
        borderRadius: 8,
        border: `1.5px solid ${COLORS.faintBorder}`,
        fontSize: 13,
        fontFamily: "inherit",
        color: COLORS.darkText,
        background: COLORS.white,
        outline: "none",
        resize: "vertical",
        lineHeight: 1.6,
        boxSizing: "border-box",
        marginTop: 6,
      }}
    />
  );
}

function NumberInput({ value, onChange, suffix }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6 }}>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        min="0"
        style={{
          width: 80,
          padding: "8px 12px",
          borderRadius: 8,
          border: `1.5px solid ${COLORS.faintBorder}`,
          fontSize: 14,
          fontFamily: "inherit",
          color: COLORS.darkText,
          background: COLORS.white,
          outline: "none",
          textAlign: "center",
        }}
      />
      {suffix && <span style={{ fontSize: 12, color: COLORS.midText }}>{suffix}</span>}
    </div>
  );
}

function Question({ number, text, children, roleColor }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
        <span
          style={{
            fontSize: 10,
            fontWeight: 700,
            color: roleColor || COLORS.blue,
            background: `${roleColor || COLORS.blue}12`,
            padding: "3px 7px",
            borderRadius: 5,
            flexShrink: 0,
            marginTop: 2,
          }}
        >
          Q{number}
        </span>
        <div style={{ fontSize: 13, fontWeight: 600, color: COLORS.darkText, lineHeight: 1.5 }}>
          {text}
        </div>
      </div>
      <div style={{ marginLeft: 36 }}>{children}</div>
    </div>
  );
}

function SectionHeader({ icon, title, subtitle, bg, borderColor }) {
  return (
    <div
      style={{
        background: bg,
        border: `1px solid ${borderColor}`,
        borderRadius: 10,
        padding: "14px 16px",
        marginBottom: 20,
        marginTop: 8,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 18 }}>{icon}</span>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.darkText }}>{title}</div>
          <div style={{ fontSize: 11, color: COLORS.midText, marginTop: 2 }}>{subtitle}</div>
        </div>
      </div>
    </div>
  );
}

function formatResponses(role, projectName, answers) {
  const lines = [];
  lines.push("FF&E DATA HANDOFF PILOT — DEBRIEF RESPONSE");
  lines.push("=".repeat(50));
  lines.push(`Respondent: ${role === "lauren" ? "Lauren (Design)" : "Brandy (Procurement)"}`);
  lines.push(`Project: ${projectName || "(not specified)"}`);
  lines.push(`Date: ${new Date().toLocaleDateString()}`);
  lines.push("");

  lines.push("── OVERALL PILOT EXPERIENCE ──");
  lines.push("");
  lines.push(`Q1. Was this manageable on top of current workload?`);
  lines.push(`   ${answers.q1 || "(no response)"}`);
  lines.push("");
  lines.push(`Q2. Hours spent on FF&E ordering/admin: ${answers.q2 || "?"} hours`);
  lines.push("");
  lines.push(`Q3. Compared to old PDF-only handoff: ${answers.q3 || "(no response)"}`);
  lines.push("");

  if (role === "lauren") {
    lines.push("── DESIGN-SPECIFIC QUESTIONS ──");
    lines.push("");
    lines.push(`Q4a. Fields that felt natural/easy:`);
    lines.push(`   ${answers.q4a || "(no response)"}`);
    lines.push(`Q4b. Fields that felt like extra work or were unclear:`);
    lines.push(`   ${answers.q4b || "(no response)"}`);
    lines.push("");
    lines.push(`Q5. Data source: ${answers.q5 || "(no response)"}`);
    lines.push(`   Notes: ${answers.q5notes || ""}`);
    lines.push("");
    lines.push(`Q6. When items felt "ready to order":`);
    lines.push(`   ${answers.q6 || "(no response)"}`);
    lines.push("");
    lines.push(`Q7. Ease of updating spreadsheet for changes: ${answers.q7 || "(no response)"}`);
    lines.push(`   Notes: ${answers.q7notes || ""}`);
    lines.push("");
  }

  if (role === "brandy") {
    lines.push("── PROCUREMENT-SPECIFIC QUESTIONS ──");
    lines.push("");
    lines.push(`Q8. How used the spreadsheet with FileMaker:`);
    lines.push(`   ${answers.q8 || "(no response)"}`);
    lines.push("");
    lines.push(`Q9a. Critical fields for PO creation:`);
    lines.push(`   ${answers.q9a || "(no response)"}`);
    lines.push(`Q9b. Nice-to-have fields:`);
    lines.push(`   ${answers.q9b || "(no response)"}`);
    lines.push("");
    lines.push(`Q10. Where saved the most time:`);
    lines.push(`   ${answers.q10 || "(no response)"}`);
    lines.push("");
    lines.push(`Q11. Did it reduce clarification emails? ${answers.q11 || "(no response)"}`);
    lines.push(`   Notes: ${answers.q11notes || ""}`);
    lines.push("");
  }

  lines.push("── REFLECTION & NEXT STEPS ──");
  lines.push("");
  lines.push(`Q12. Did this reduce or increase total time? ${answers.q12 || "(no response)"}`);
  lines.push("");
  lines.push(`Q13. Clearer visibility on status?`);
  lines.push(`   ${answers.q13 || "(no response)"}`);
  lines.push("");
  lines.push(`Q14a. Must-keep fields: ${answers.q14a || "(no response)"}`);
  lines.push(`Q14b. Could drop or make optional: ${answers.q14b || "(no response)"}`);
  lines.push("");
  lines.push(`Q15. What metrics would mean "worth rolling out"?`);
  lines.push(`   ${answers.q15 || "(no response)"}`);
  lines.push("");
  lines.push(`Q16. Ready for another pilot? ${answers.q16 || "(no response)"}`);
  lines.push(`   Suggested tweaks: ${answers.q16notes || ""}`);
  lines.push("");

  lines.push("── BOTTOM LINE ──");
  lines.push("");
  lines.push(`Q17. Likelihood to recommend (1-5): ${answers.q17 || "?"}`);
  lines.push("");
  lines.push(`Q18. Other observations:`);
  lines.push(`   ${answers.q18 || "(no response)"}`);

  return lines.join("\n");
}

export default function PilotFeedback() {
  const [role, setRole] = useState(null);
  const [projectName, setProjectName] = useState("");
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [copied, setCopied] = useState(false);

  const set = (key, val) => setAnswers((prev) => ({ ...prev, [key]: val }));

  const handleSubmitEmail = () => {
    const body = formatResponses(role, projectName, answers);
    const subject = encodeURIComponent(
      `IDA Pilot Debrief — ${role === "lauren" ? "Lauren (Design)" : "Brandy (Procurement)"} — ${projectName || "Pilot Project"}`
    );
    const mailtoBody = encodeURIComponent(body);
    window.open(`mailto:${SUBMIT_EMAIL}?subject=${subject}&body=${mailtoBody}`, "_blank");
    setSubmitted(true);
  };

  const handleCopy = () => {
    const body = formatResponses(role, projectName, answers);
    navigator.clipboard.writeText(body).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    });
  };

  if (submitted) {
    return (
      <div style={{ textAlign: "center", padding: "60px 20px" }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🎉</div>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: COLORS.darkText, marginBottom: 8 }}>
          Thank you, {role === "lauren" ? "Lauren" : "Brandy"}!
        </h2>
        <p style={{ fontSize: 14, color: COLORS.midText, lineHeight: 1.7, maxWidth: 360, margin: "0 auto" }}>
          Your feedback has been submitted. This is exactly what makes process improvement actually work — honest input from the people doing the work.
        </p>
        <button
          onClick={() => {
            setSubmitted(false);
            setRole(null);
            setAnswers({});
            setProjectName("");
          }}
          style={{
            marginTop: 20,
            padding: "10px 20px",
            borderRadius: 8,
            border: `1.5px solid ${COLORS.faintBorder}`,
            background: COLORS.white,
            color: COLORS.midText,
            fontSize: 12,
            fontWeight: 600,
            fontFamily: "inherit",
            cursor: "pointer",
          }}
        >
          Submit another response
        </button>
      </div>
    );
  }

  // ── Role selection ──
  if (!role) {
    return (
      <div>
        <div style={{ background: COLORS.white, border: `1px solid ${COLORS.faintBorder}`, borderRadius: 12, padding: "22px 20px", marginBottom: 20 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: COLORS.darkText, margin: "0 0 6px 0" }}>
            FF&E Data Handoff Pilot — Debrief
          </h2>
          <p style={{ fontSize: 13, color: COLORS.midText, margin: 0, lineHeight: 1.6 }}>
            Thanks for being part of this pilot. Your honest feedback is what makes process improvement actually work. 
            This form takes about 10 minutes.
          </p>
        </div>

        <div style={{ fontSize: 14, fontWeight: 600, color: COLORS.darkText, marginBottom: 12 }}>
          Who are you?
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button
            onClick={() => setRole("lauren")}
            style={{
              flex: "1 1 200px",
              padding: "20px",
              borderRadius: 12,
              border: `1.5px solid ${COLORS.designPurple}30`,
              background: COLORS.designPurpleBg,
              cursor: "pointer",
              textAlign: "center",
              fontFamily: "inherit",
              transition: "all 0.15s ease",
            }}
          >
            <div style={{ fontSize: 28, marginBottom: 8 }}>🎨</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: COLORS.designPurple }}>Lauren</div>
            <div style={{ fontSize: 12, color: COLORS.midText, marginTop: 4 }}>Director of Design</div>
          </button>
          <button
            onClick={() => setRole("brandy")}
            style={{
              flex: "1 1 200px",
              padding: "20px",
              borderRadius: 12,
              border: `1.5px solid ${COLORS.procTeal}30`,
              background: COLORS.procTealBg,
              cursor: "pointer",
              textAlign: "center",
              fontFamily: "inherit",
              transition: "all 0.15s ease",
            }}
          >
            <div style={{ fontSize: 28, marginBottom: 8 }}>📋</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: COLORS.procTeal }}>Brandy</div>
            <div style={{ fontSize: 12, color: COLORS.midText, marginTop: 4 }}>Director of Procurement</div>
          </button>
        </div>
      </div>
    );
  }

  const roleColor = role === "lauren" ? COLORS.designPurple : COLORS.procTeal;
  const roleBg = role === "lauren" ? COLORS.designPurpleBg : COLORS.procTealBg;
  const roleName = role === "lauren" ? "Lauren" : "Brandy";

  return (
    <div>
      {/* Who + project */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 5, background: roleBg, color: roleColor, fontSize: 12, fontWeight: 600, padding: "5px 10px", borderRadius: 7 }}>
            {role === "lauren" ? "🎨" : "📋"} {roleName}
          </span>
          <button onClick={() => { setRole(null); setAnswers({}); }} style={{ fontSize: 11, color: COLORS.lightText, background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", textDecoration: "underline" }}>
            switch
          </button>
        </div>
      </div>

      {/* Project name */}
      <div style={{ marginBottom: 24 }}>
        <label style={{ fontSize: 13, fontWeight: 600, color: COLORS.darkText }}>Pilot Project Name</label>
        <input
          type="text"
          value={projectName}
          onChange={(e) => setProjectName(e.target.value)}
          placeholder="e.g., Smith Residence – Lake House"
          style={{
            width: "100%",
            padding: "10px 14px",
            borderRadius: 8,
            border: `1.5px solid ${COLORS.faintBorder}`,
            fontSize: 13,
            fontFamily: "inherit",
            color: COLORS.darkText,
            background: COLORS.white,
            outline: "none",
            boxSizing: "border-box",
            marginTop: 6,
          }}
        />
      </div>

      {/* ── Section 1: Overall ── */}
      <SectionHeader icon="📊" title="Overall Pilot Experience" subtitle="Both teams answer these" bg={`${COLORS.blue}06`} borderColor={`${COLORS.blue}15`} />

      <Question number={1} text="Was this pilot change manageable on top of your current workload, or did something feel too complex?">
        <TextArea value={answers.q1 || ""} onChange={(v) => set("q1", v)} placeholder="Be honest — what felt doable and what felt like too much?" />
      </Question>

      <Question number={2} text="Roughly how many hours did you spend on FF&E ordering/admin for this project?">
        <NumberInput value={answers.q2 || ""} onChange={(v) => set("q2", v)} suffix="hours" />
      </Question>

      <Question number={3} text="How does that compare to a typical project using the old PDF-only handoff?">
        <RadioGroup options={["Less time", "About the same", "More time"]} value={answers.q3} onChange={(v) => set("q3", v)} name="q3" />
      </Question>

      {/* ── Section 2: Role-specific ── */}
      {role === "lauren" && (
        <>
          <SectionHeader icon="🎨" title="For Lauren (Design Team)" subtitle="Questions about your experience filling the template" bg={COLORS.designPurpleBg} borderColor={`${COLORS.designPurple}20`} />

          <Question number={4} text="Which fields in the template felt natural to fill from your existing process, and which felt like extra work?" roleColor={COLORS.designPurple}>
            <div style={{ fontSize: 11, fontWeight: 600, color: COLORS.lightText, textTransform: "uppercase", letterSpacing: "0.04em", marginTop: 8, marginBottom: 4 }}>Natural / Easy fields</div>
            <TextArea value={answers.q4a || ""} onChange={(v) => set("q4a", v)} placeholder="e.g., Manufacturer, SKU, Description were easy because..." rows={2} />
            <div style={{ fontSize: 11, fontWeight: 600, color: COLORS.lightText, textTransform: "uppercase", letterSpacing: "0.04em", marginTop: 10, marginBottom: 4 }}>Extra work or unclear fields</div>
            <TextArea value={answers.q4b || ""} onChange={(v) => set("q4b", v)} placeholder="e.g., Lead Time felt like Procurement's job, Install Phase wasn't clear..." rows={2} />
          </Question>

          <Question number={5} text="Were you able to get most of this data from existing sources (boards, schedules, Bluebeam markups), or did you end up retyping?" roleColor={COLORS.designPurple}>
            <RadioGroup options={["Mostly copy/paste or export", "Some of both", "Mostly retyping"]} value={answers.q5} onChange={(v) => set("q5", v)} name="q5" />
            <TextArea value={answers.q5notes || ""} onChange={(v) => set("q5notes", v)} placeholder="Any notes on what was easy to export vs. what required manual work..." rows={2} />
          </Question>

          <Question number={6} text="At what point in the project did you feel 'these items are ready to order' — design-complete + client-approved — so you could confidently fill the sheet?" roleColor={COLORS.designPurple}>
            <TextArea value={answers.q6 || ""} onChange={(v) => set("q6", v)} placeholder="e.g., After client presentation, after final selections meeting..." />
          </Question>

          <Question number={7} text="When changes happened (alternates, finish changes, quantity tweaks), how easy was it to update the spreadsheet and keep it as the single source of truth?" roleColor={COLORS.designPurple}>
            <RadioGroup options={["Very easy", "Manageable", "Frustrating", "Too time-consuming"]} value={answers.q7} onChange={(v) => set("q7", v)} name="q7" />
            <TextArea value={answers.q7notes || ""} onChange={(v) => set("q7notes", v)} placeholder="What specifically was hard or easy about managing changes?" rows={2} />
          </Question>
        </>
      )}

      {role === "brandy" && (
        <>
          <SectionHeader icon="📋" title="For Brandy (Procurement Team)" subtitle="Questions about your experience using the template for POs" bg={COLORS.procTealBg} borderColor={`${COLORS.procTeal}20`} />

          <Question number={8} text="How did you use the spreadsheet with FileMaker: manual copy/paste row-by-row, or were you able to do semi-bulk entry/import?" roleColor={COLORS.procTeal}>
            <TextArea value={answers.q8 || ""} onChange={(v) => set("q8", v)} placeholder="Describe how you got data from the spreadsheet into FileMaker..." />
          </Question>

          <Question number={9} text="Which fields in the sheet were critical for you to create a PO confidently, and which were 'nice to have'?" roleColor={COLORS.procTeal}>
            <div style={{ fontSize: 11, fontWeight: 600, color: COLORS.lightText, textTransform: "uppercase", letterSpacing: "0.04em", marginTop: 8, marginBottom: 4 }}>Critical fields</div>
            <TextArea value={answers.q9a || ""} onChange={(v) => set("q9a", v)} placeholder="e.g., SKU, Quantity, Vendor Name, Finish were must-haves..." rows={2} />
            <div style={{ fontSize: 11, fontWeight: 600, color: COLORS.lightText, textTransform: "uppercase", letterSpacing: "0.04em", marginTop: 10, marginBottom: 4 }}>Nice to have</div>
            <TextArea value={answers.q9b || ""} onChange={(v) => set("q9b", v)} placeholder="e.g., Dimensions, Alt Option ID were helpful but not blocking..." rows={2} />
          </Question>

          <Question number={10} text="Where did you save the most time compared to the old process: finding info in PDFs, clarifying missing data with Design, or fixing errors after the fact?" roleColor={COLORS.procTeal}>
            <TextArea value={answers.q10 || ""} onChange={(v) => set("q10", v)} placeholder="What was the biggest time-saver?" />
          </Question>

          <Question number={11} text="Did the spreadsheet reduce the number of clarification emails or questions you had to send to Design?" roleColor={COLORS.procTeal}>
            <RadioGroup options={["Yes, significantly fewer", "Yes, somewhat fewer", "About the same", "Actually more questions"]} value={answers.q11} onChange={(v) => set("q11", v)} name="q11" />
            <TextArea value={answers.q11notes || ""} onChange={(v) => set("q11notes", v)} placeholder="Example or notes..." rows={2} />
          </Question>
        </>
      )}

      {/* ── Section 3: Reflection ── */}
      <SectionHeader icon="🔮" title="Reflection & Next Steps" subtitle="Both teams answer these" bg={`${COLORS.blue}06`} borderColor={`${COLORS.blue}15`} />

      <Question number={12} text="Compared to the old way, did this approach reduce or increase your total time spent on FF&E ordering admin for this project?">
        <RadioGroup options={["Reduced", "About the same", "Increased"]} value={answers.q12} onChange={(v) => set("q12", v)} name="q12" />
      </Question>

      <Question number={13} text="Did the spreadsheet make it clearer what was approved, what was ordered, and what was still pending — or did it create new confusion?">
        <TextArea value={answers.q13 || ""} onChange={(v) => set("q13", v)} placeholder="Was it easier to see the full picture, or did it add complexity?" />
      </Question>

      <Question number={14} text="If we were to simplify the template, which 3–5 fields would you absolutely keep, and which could we drop or move to 'optional'?">
        <div style={{ fontSize: 11, fontWeight: 600, color: COLORS.lightText, textTransform: "uppercase", letterSpacing: "0.04em", marginTop: 8, marginBottom: 4 }}>Must keep</div>
        <TextArea value={answers.q14a || ""} onChange={(v) => set("q14a", v)} placeholder="Your top 3–5 essential fields..." rows={2} />
        <div style={{ fontSize: 11, fontWeight: 600, color: COLORS.lightText, textTransform: "uppercase", letterSpacing: "0.04em", marginTop: 10, marginBottom: 4 }}>Could drop or make optional</div>
        <TextArea value={answers.q14b || ""} onChange={(v) => set("q14b", v)} placeholder="Fields that weren't worth the effort to fill..." rows={2} />
      </Question>

      <Question number={15} text="What 2–3 metrics would make you say 'yes, this is worth rolling out to more projects'?">
        <TextArea value={answers.q15 || ""} onChange={(v) => set("q15", v)} placeholder="e.g., time per PO, fewer corrections, fewer clarification emails, fewer order errors..." />
      </Question>

      <Question number={16} text="Would you be willing to run this on one more project without major changes, or do we need to tweak the process/template first?">
        <RadioGroup options={["Ready for another pilot as-is", "Need tweaks first"]} value={answers.q16} onChange={(v) => set("q16", v)} name="q16" />
        <TextArea value={answers.q16notes || ""} onChange={(v) => set("q16notes", v)} placeholder="If tweaks needed, what would you change?" rows={2} />
      </Question>

      {/* ── Section 4: Bottom line ── */}
      <SectionHeader icon="⭐" title="Bottom Line" subtitle="The big question" bg={`${COLORS.lime}10`} borderColor={`${COLORS.lime}30`} />

      <Question number={17} text="On a scale of 1–5, how likely are you to recommend this new handoff approach for IDA's future projects?">
        <RatingScale value={answers.q17} onChange={(v) => set("q17", v)} name="q17" />
      </Question>

      <Question number={18} text="Any other observations, wins, or frustrations we should know about?">
        <TextArea value={answers.q18 || ""} onChange={(v) => set("q18", v)} placeholder="Anything else — the good, the bad, the ugly..." rows={4} />
      </Question>

      {/* ── Submit ── */}
      <div style={{ background: COLORS.white, border: `1px solid ${COLORS.faintBorder}`, borderRadius: 12, padding: "22px 20px", marginTop: 8 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.darkText, marginBottom: 6 }}>
          Ready to submit?
        </div>
        <p style={{ fontSize: 12, color: COLORS.midText, lineHeight: 1.6, marginBottom: 16 }}>
          Your responses will be formatted and sent to Steve. Choose how you'd like to submit:
        </p>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button
            onClick={handleSubmitEmail}
            style={{
              padding: "12px 24px",
              borderRadius: 8,
              border: "none",
              background: COLORS.navy,
              color: COLORS.white,
              fontSize: 13,
              fontWeight: 700,
              fontFamily: "inherit",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            📧 Submit via Email
          </button>
          <button
            onClick={handleCopy}
            style={{
              padding: "12px 24px",
              borderRadius: 8,
              border: `1.5px solid ${COLORS.faintBorder}`,
              background: COLORS.white,
              color: COLORS.darkText,
              fontSize: 13,
              fontWeight: 600,
              fontFamily: "inherit",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            {copied ? "✅ Copied!" : "📋 Copy to Clipboard"}
          </button>
        </div>
      </div>
    </div>
  );
}
