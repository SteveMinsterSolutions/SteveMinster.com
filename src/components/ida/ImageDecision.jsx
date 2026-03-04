import { useState, useMemo } from "react";

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
  procTeal: "#0EA5A0",
  procTealBg: "#EFFBFB",
  designPurple: "#7C5CFC",
  designPurpleBg: "#F5F2FF",
  successGreen: "#16A34A",
  successBg: "#F0FDF4",
  amber: "#D4940A",
  amberBg: "#FFF8EE",
};

const SUBMIT_EMAIL = "steve@minstersolutions.com";

function RadioOption({ label, sublabel, selected, onClick }) {
  return (
    <label
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 10,
        padding: "12px 14px",
        borderRadius: 10,
        border: `1.5px solid ${selected ? COLORS.procTeal : COLORS.faintBorder}`,
        background: selected ? COLORS.procTealBg : COLORS.white,
        cursor: "pointer",
        transition: "all 0.15s ease",
        marginBottom: 6,
      }}
    >
      <span
        style={{
          width: 18,
          height: 18,
          borderRadius: 9,
          border: `2px solid ${selected ? COLORS.procTeal : COLORS.faintBorder}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          marginTop: 1,
          transition: "all 0.15s ease",
        }}
      >
        {selected && <span style={{ width: 8, height: 8, borderRadius: 4, background: COLORS.procTeal }} />}
      </span>
      <div>
        <div style={{ fontSize: 13, fontWeight: selected ? 600 : 400, color: COLORS.darkText, lineHeight: 1.4 }}>{label}</div>
        {sublabel && <div style={{ fontSize: 11, color: COLORS.midText, marginTop: 2, lineHeight: 1.5 }}>{sublabel}</div>}
      </div>
    </label>
  );
}

function CheckboxOption({ label, checked, onClick }) {
  return (
    <label
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "10px 14px",
        borderRadius: 8,
        border: `1.5px solid ${checked ? COLORS.procTeal : COLORS.faintBorder}`,
        background: checked ? COLORS.procTealBg : COLORS.white,
        cursor: "pointer",
        transition: "all 0.15s ease",
        marginBottom: 5,
      }}
    >
      <span
        style={{
          width: 18,
          height: 18,
          borderRadius: 5,
          border: `2px solid ${checked ? COLORS.procTeal : COLORS.faintBorder}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          transition: "all 0.15s ease",
          background: checked ? COLORS.procTeal : "transparent",
        }}
      >
        {checked && <span style={{ color: COLORS.white, fontSize: 11, fontWeight: 800 }}>✓</span>}
      </span>
      <span style={{ fontSize: 12, color: COLORS.darkText, lineHeight: 1.4 }}>{label}</span>
    </label>
  );
}

function QuestionCard({ number, total, question, children }) {
  return (
    <div style={{ background: COLORS.white, border: `1px solid ${COLORS.faintBorder}`, borderRadius: 12, padding: "20px 18px", marginBottom: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: COLORS.procTeal, background: COLORS.procTealBg, padding: "3px 8px", borderRadius: 5 }}>
          {number} of {total}
        </span>
      </div>
      <div style={{ fontSize: 14, fontWeight: 600, color: COLORS.darkText, lineHeight: 1.5, marginBottom: 14 }}>
        {question}
      </div>
      {children}
    </div>
  );
}

function evaluateAnswers(answers) {
  let operationalScore = 0;
  let niceToHaveScore = 0;

  // Q1: frequency
  if (answers.q1 === "most" || answers.q1 === "some") operationalScore += 2;
  if (answers.q1 === "rarely" || answers.q1 === "never") niceToHaveScore += 2;

  // Q2: usage - check for operational indicators
  const operationalUses = ["confirm", "vendor_questions", "internal_questions", "client_check", "match_orders"];
  const niceUses = ["just_context"];
  const q2 = answers.q2 || [];
  operationalUses.forEach((u) => { if (q2.includes(u)) operationalScore += 1; });
  niceUses.forEach((u) => { if (q2.includes(u)) niceToHaveScore += 1; });

  // Q3: impact of removing
  if (answers.q3 === "break" || answers.q3 === "friction") operationalScore += 2;
  if (answers.q3 === "wouldnt_notice" || answers.q3 === "prefer_without") niceToHaveScore += 2;

  // Q4: where it should live
  if (answers.q4 === "linked") operationalScore += 2;
  if (answers.q4 === "folder" || answers.q4 === "email") niceToHaveScore += 1;
  if (answers.q4 === "dont_need") niceToHaveScore += 2;

  // Q5: COM/COL importance
  if (answers.q5 === "yes") operationalScore += 1;
  if (answers.q5 === "no") niceToHaveScore += 1;

  const total = operationalScore + niceToHaveScore;
  if (total === 0) return null;

  return {
    operational: operationalScore,
    niceToHave: niceToHaveScore,
    recommendation: operationalScore > niceToHaveScore ? "operational" : "nice-to-have",
    confidence: Math.abs(operationalScore - niceToHaveScore) >= 3 ? "high" : "moderate",
  };
}

function formatSubmission(answers, evaluation) {
  const lines = [];
  lines.push("IMAGE HANDLING DECISION — BRANDY'S RESPONSES");
  lines.push("=".repeat(50));
  lines.push(`Date: ${new Date().toLocaleDateString()}`);
  lines.push("");

  const q1Map = { most: "Most items", some: "Some items", rarely: "Rarely", never: "Never" };
  lines.push(`Q1. How often open images: ${q1Map[answers.q1] || "(no answer)"}`);
  lines.push("");

  const q2Map = { confirm: "Visually confirm right thing", vendor_questions: "Answer vendor questions", internal_questions: "Answer internal questions", client_check: "Check against client approval", match_orders: "Match to past orders/alternates", just_context: "Just for context" };
  const q2Labels = (answers.q2 || []).map((k) => q2Map[k] || k);
  lines.push(`Q2. What images are used for: ${q2Labels.join("; ") || "(no answer)"}`);
  if (answers.q2other) lines.push(`   Other: ${answers.q2other}`);
  lines.push("");

  const q3Map = { break: "Would break workflow", friction: "Would cause friction", wouldnt_notice: "Wouldn't notice much", prefer_without: "Would prefer less clutter" };
  lines.push(`Q3. If we stopped sending images: ${q3Map[answers.q3] || "(no answer)"}`);
  lines.push("");

  const q4Map = { linked: "Linked to each line item", folder: "Shared folder by project", email: "Email/handoff package", dont_need: "Don't need access" };
  lines.push(`Q4. Where images should live: ${q4Map[answers.q4] || "(no answer)"}`);
  lines.push("");

  const q5Map = { yes: "Yes – custom items need images", no: "No – rely on written specs equally", sometimes: "Sometimes – depends on vendor/complexity" };
  lines.push(`Q5. Custom/COM items more important: ${q5Map[answers.q5] || "(no answer)"}`);
  if (answers.q5notes) lines.push(`   Notes: ${answers.q5notes}`);
  lines.push("");

  if (evaluation) {
    lines.push("─".repeat(50));
    lines.push(`RECOMMENDATION: ${evaluation.recommendation === "operational" ? "ADD IMAGE TRACKING TO SPREADSHEET" : "KEEP IMAGES INFORMAL"}`);
    lines.push(`Confidence: ${evaluation.confidence}`);
    lines.push(`Score: Operational ${evaluation.operational} vs Nice-to-have ${evaluation.niceToHave}`);
  }

  return lines.join("\n");
}

export default function ImageDecision() {
  const [answers, setAnswers] = useState({ q2: [] });
  const [submitted, setSubmitted] = useState(false);
  const [copied, setCopied] = useState(false);

  const set = (key, val) => setAnswers((prev) => ({ ...prev, [key]: val }));

  const toggleQ2 = (val) => {
    setAnswers((prev) => {
      const current = prev.q2 || [];
      return { ...prev, q2: current.includes(val) ? current.filter((v) => v !== val) : [...current, val] };
    });
  };

  const evaluation = useMemo(() => evaluateAnswers(answers), [answers]);

  const answeredCount = [
    answers.q1,
    (answers.q2 || []).length > 0,
    answers.q3,
    answers.q4,
    answers.q5,
  ].filter(Boolean).length;

  const handleSubmitEmail = () => {
    const body = formatSubmission(answers, evaluation);
    const subject = encodeURIComponent("IDA Pilot — Image Handling Decision (Brandy's Responses)");
    window.open(`mailto:${SUBMIT_EMAIL}?subject=${subject}&body=${encodeURIComponent(body)}`, "_blank");
    setSubmitted(true);
  };

  const handleCopy = () => {
    const body = formatSubmission(answers, evaluation);
    navigator.clipboard.writeText(body).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    });
  };

  if (submitted) {
    return (
      <div style={{ textAlign: "center", padding: "60px 20px" }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>📸</div>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: COLORS.darkText, marginBottom: 8 }}>Thanks, Brandy!</h2>
        <p style={{ fontSize: 14, color: COLORS.midText, lineHeight: 1.7, maxWidth: 360, margin: "0 auto" }}>
          Your answers have been submitted. We'll use this to decide whether to add image columns to the FF&E template or keep images as informal reference materials.
        </p>
        <button
          onClick={() => { setSubmitted(false); setAnswers({ q2: [] }); }}
          style={{ marginTop: 20, padding: "10px 20px", borderRadius: 8, border: `1.5px solid ${COLORS.faintBorder}`, background: COLORS.white, color: COLORS.midText, fontSize: 12, fontWeight: 600, fontFamily: "inherit", cursor: "pointer" }}
        >
          Submit another response
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* Context */}
      <div style={{ background: COLORS.white, border: `1px solid ${COLORS.faintBorder}`, borderRadius: 12, padding: "20px 18px", marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 5, background: COLORS.procTealBg, color: COLORS.procTeal, fontSize: 11, fontWeight: 600, padding: "4px 9px", borderRadius: 6 }}>
            📋 For Brandy
          </span>
          <span style={{ fontSize: 11, color: COLORS.lightText }}>· ~2 minutes</span>
        </div>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: COLORS.darkText, margin: "0 0 6px 0" }}>
          Do We Need Product Images in the FF&E Sheet?
        </h2>
        <p style={{ fontSize: 13, color: COLORS.midText, margin: 0, lineHeight: 1.6 }}>
          Help us decide whether product images should be formally tracked per item in the spreadsheet, or if they can stay as informal reference materials in project folders. Your answers drive the decision.
        </p>
      </div>

      {/* Progress */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20, padding: "0 2px" }}>
        <div style={{ flex: 1, height: 4, borderRadius: 2, background: COLORS.warmGray, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${(answeredCount / 5) * 100}%`, background: COLORS.procTeal, borderRadius: 2, transition: "width 0.3s ease" }} />
        </div>
        <span style={{ fontSize: 11, color: COLORS.midText, fontWeight: 600, whiteSpace: "nowrap" }}>{answeredCount}/5</span>
      </div>

      {/* Q1 */}
      <QuestionCard number={1} total={5} question="How often do you actually open the images we send?">
        <RadioOption label="Most items" sublabel="I open images for most items when creating POs or answering questions" selected={answers.q1 === "most"} onClick={() => set("q1", "most")} />
        <RadioOption label="Some items" sublabel="Mainly for tricky or feature pieces — custom items, unique finishes" selected={answers.q1 === "some"} onClick={() => set("q1", "some")} />
        <RadioOption label="Rarely" sublabel="I rarely open the images once the email/handoff is done" selected={answers.q1 === "rarely"} onClick={() => set("q1", "rarely")} />
        <RadioOption label="Never" sublabel="I never look at the images; the written specs are enough" selected={answers.q1 === "never"} onClick={() => set("q1", "never")} />
      </QuestionCard>

      {/* Q2 */}
      <QuestionCard number={2} total={5} question="What do you use the images FOR when you do open them? (Check all that apply)">
        <CheckboxOption label="Visually confirm I'm ordering the right thing (finish, shape, scale)" checked={(answers.q2 || []).includes("confirm")} onClick={() => toggleQ2("confirm")} />
        <CheckboxOption label="Answer vendor questions when the written spec is unclear" checked={(answers.q2 || []).includes("vendor_questions")} onClick={() => toggleQ2("vendor_questions")} />
        <CheckboxOption label="Answer internal questions from designers/PMs" checked={(answers.q2 || []).includes("internal_questions")} onClick={() => toggleQ2("internal_questions")} />
        <CheckboxOption label="Double-check against what the client approved" checked={(answers.q2 || []).includes("client_check")} onClick={() => toggleQ2("client_check")} />
        <CheckboxOption label="Match the item to similar past orders or alternates" checked={(answers.q2 || []).includes("match_orders")} onClick={() => toggleQ2("match_orders")} />
        <CheckboxOption label="Just for context; written spec and SKU are enough to place the order" checked={(answers.q2 || []).includes("just_context")} onClick={() => toggleQ2("just_context")} />
        <div style={{ marginTop: 8 }}>
          <input
            type="text"
            value={answers.q2other || ""}
            onChange={(e) => set("q2other", e.target.value)}
            placeholder="Other (describe)..."
            style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: `1.5px solid ${COLORS.faintBorder}`, fontSize: 12, fontFamily: "inherit", color: COLORS.darkText, background: COLORS.white, outline: "none", boxSizing: "border-box" }}
          />
        </div>
      </QuestionCard>

      {/* Q3 */}
      <QuestionCard number={3} total={5} question="If we STOPPED sending images for a test project, what would happen?">
        <RadioOption label="Would break workflow" sublabel="I'd be nervous placing orders without images; I rely on them to avoid mistakes" selected={answers.q3 === "break"} onClick={() => set("q3", "break")} />
        <RadioOption label="Would cause friction" sublabel="I'd be slightly slower or need more clarification emails, but we'd survive" selected={answers.q3 === "friction"} onClick={() => set("q3", "friction")} />
        <RadioOption label="Wouldn't notice much" sublabel="Honestly, I probably wouldn't notice; written specs are my main reference" selected={answers.q3 === "wouldnt_notice"} onClick={() => set("q3", "wouldnt_notice")} />
        <RadioOption label="Would prefer it" sublabel="Less clutter; I rarely use them anyway" selected={answers.q3 === "prefer_without"} onClick={() => set("q3", "prefer_without")} />
      </QuestionCard>

      {/* Q4 */}
      <QuestionCard number={4} total={5} question="When you DO need an image, where should it live?">
        <RadioOption label="Linked to each line item" sublabel="I need a reliable link or filename in the spreadsheet tied to each FF&E row" selected={answers.q4 === "linked"} onClick={() => set("q4", "linked")} />
        <RadioOption label="Shared folder by project" sublabel="It's enough if images are in a project folder I can browse when needed" selected={answers.q4 === "folder"} onClick={() => set("q4", "folder")} />
        <RadioOption label="Email/handoff package" sublabel="I'm fine if images come in the original email or PDF; I can find them if needed" selected={answers.q4 === "email"} onClick={() => set("q4", "email")} />
        <RadioOption label="Don't need access" sublabel="I don't need images tied to anything; written specs are sufficient" selected={answers.q4 === "dont_need"} onClick={() => set("q4", "dont_need")} />
      </QuestionCard>

      {/* Q5 */}
      <QuestionCard number={5} total={5} question="For custom or COM/COL items specifically, are images more important?">
        <RadioOption label="Yes" sublabel="Custom items absolutely need images; standard catalog items don't" selected={answers.q5 === "yes"} onClick={() => set("q5", "yes")} />
        <RadioOption label="No" sublabel="I rely on written specs equally for custom and catalog items" selected={answers.q5 === "no"} onClick={() => set("q5", "no")} />
        <RadioOption label="Sometimes" sublabel="Depends on the vendor and complexity" selected={answers.q5 === "sometimes"} onClick={() => set("q5", "sometimes")} />
        <textarea
          value={answers.q5notes || ""}
          onChange={(e) => set("q5notes", e.target.value)}
          placeholder="Any notes on when images matter most..."
          rows={2}
          style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: `1.5px solid ${COLORS.faintBorder}`, fontSize: 12, fontFamily: "inherit", color: COLORS.darkText, background: COLORS.white, outline: "none", resize: "vertical", lineHeight: 1.6, boxSizing: "border-box", marginTop: 8 }}
        />
      </QuestionCard>

      {/* Live evaluation */}
      {evaluation && (
        <div
          style={{
            background: evaluation.recommendation === "operational" ? COLORS.procTealBg : COLORS.amberBg,
            border: `1.5px solid ${evaluation.recommendation === "operational" ? COLORS.procTeal + "30" : COLORS.amber + "30"}`,
            borderRadius: 12,
            padding: "20px 18px",
            marginBottom: 16,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <span style={{ fontSize: 18 }}>{evaluation.recommendation === "operational" ? "📊" : "📁"}</span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: evaluation.recommendation === "operational" ? COLORS.procTeal : COLORS.amber }}>
                {evaluation.recommendation === "operational"
                  ? "Leaning: Add Image Tracking to Spreadsheet"
                  : "Leaning: Keep Images Informal"
                }
              </div>
              <div style={{ fontSize: 11, color: COLORS.midText, marginTop: 2 }}>
                {evaluation.confidence === "high" ? "Strong signal" : "Moderate signal"} · Updates as you answer
              </div>
            </div>
          </div>

          {/* Score bars */}
          <div style={{ marginTop: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <span style={{ fontSize: 10, fontWeight: 600, color: COLORS.procTeal, width: 80 }}>Operational</span>
              <div style={{ flex: 1, height: 8, borderRadius: 4, background: `${COLORS.procTeal}15`, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${Math.min((evaluation.operational / 10) * 100, 100)}%`, background: COLORS.procTeal, borderRadius: 4, transition: "width 0.3s ease" }} />
              </div>
              <span style={{ fontSize: 11, fontWeight: 700, color: COLORS.procTeal, width: 20, textAlign: "right" }}>{evaluation.operational}</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 10, fontWeight: 600, color: COLORS.amber, width: 80 }}>Nice-to-have</span>
              <div style={{ flex: 1, height: 8, borderRadius: 4, background: `${COLORS.amber}15`, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${Math.min((evaluation.niceToHave / 10) * 100, 100)}%`, background: COLORS.amber, borderRadius: 4, transition: "width 0.3s ease" }} />
              </div>
              <span style={{ fontSize: 11, fontWeight: 700, color: COLORS.amber, width: 20, textAlign: "right" }}>{evaluation.niceToHave}</span>
            </div>
          </div>

          {evaluation.recommendation === "operational" ? (
            <div style={{ marginTop: 14, padding: "10px 14px", background: COLORS.white, borderRadius: 8, border: `1px solid ${COLORS.procTeal}20` }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: COLORS.procTeal, marginBottom: 4 }}>If confirmed →</div>
              <div style={{ fontSize: 12, color: COLORS.midText, lineHeight: 1.6 }}>
                Add <span style={{ fontFamily: "monospace", background: COLORS.procTealBg, padding: "1px 5px", borderRadius: 3, fontSize: 11 }}>Image_File_Name</span> and <span style={{ fontFamily: "monospace", background: COLORS.procTealBg, padding: "1px 5px", borderRadius: 3, fontSize: 11 }}>Image_URL_or_Path</span> columns to the FF&E template. Standardize naming: <span style={{ fontFamily: "monospace", fontSize: 11 }}>ProjectID_ItemID_ShortDesc.ext</span>
              </div>
            </div>
          ) : (
            <div style={{ marginTop: 14, padding: "10px 14px", background: COLORS.white, borderRadius: 8, border: `1px solid ${COLORS.amber}20` }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: COLORS.amber, marginBottom: 4 }}>If confirmed →</div>
              <div style={{ fontSize: 12, color: COLORS.midText, lineHeight: 1.6 }}>
                No schema changes needed. Optionally add a single <span style={{ fontFamily: "monospace", background: COLORS.amberBg, padding: "1px 5px", borderRadius: 3, fontSize: 11 }}>Image_Notes</span> column for references like "See moodboard slide 8." Continue current practice of sharing images in project folders.
              </div>
            </div>
          )}
        </div>
      )}

      {/* Submit */}
      {answeredCount >= 3 && (
        <div style={{ background: COLORS.white, border: `1px solid ${COLORS.faintBorder}`, borderRadius: 12, padding: "20px 18px", marginTop: 8 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.darkText, marginBottom: 6 }}>
            Ready to submit?
          </div>
          <p style={{ fontSize: 12, color: COLORS.midText, lineHeight: 1.6, marginBottom: 16 }}>
            Your answers and the recommendation will be sent to Steve. He'll confirm the decision with you and Lauren before making any template changes.
          </p>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button
              onClick={handleSubmitEmail}
              style={{ padding: "12px 24px", borderRadius: 8, border: "none", background: COLORS.navy, color: COLORS.white, fontSize: 13, fontWeight: 700, fontFamily: "inherit", cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}
            >
              📧 Submit via Email
            </button>
            <button
              onClick={handleCopy}
              style={{ padding: "12px 24px", borderRadius: 8, border: `1.5px solid ${COLORS.faintBorder}`, background: COLORS.white, color: COLORS.darkText, fontSize: 13, fontWeight: 600, fontFamily: "inherit", cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}
            >
              {copied ? "✅ Copied!" : "📋 Copy to Clipboard"}
            </button>
          </div>
        </div>
      )}

      {answeredCount < 3 && (
        <div style={{ textAlign: "center", padding: "16px", fontSize: 12, color: COLORS.lightText }}>
          Answer at least 3 questions to see submit options
        </div>
      )}
    </div>
  );
}
