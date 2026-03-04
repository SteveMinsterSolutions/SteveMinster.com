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
  sharedBg: "#FFF8EE",
  sharedAmber: "#D4940A",
};

const OWNER_LABELS = {
  design: { label: "Design", color: COLORS.designPurple, bg: COLORS.designPurpleBg, icon: "🎨" },
  procurement: { label: "Procurement", color: COLORS.procTeal, bg: COLORS.procTealBg, icon: "📋" },
  shared: { label: "Shared", color: COLORS.sharedAmber, bg: COLORS.sharedBg, icon: "🤝" },
};

const fields = [
  { name: "Project_ID", friendly: "Project ID", group: "Project & Location", owner: "design", core: true, type: "Text", example: "IDA-2026-012", desc: "Unique identifier for the project. Use the IDA project numbering convention.", whyItMatters: "Links every line item back to the right project in FileMaker." },
  { name: "Project_Name", friendly: "Project Name", group: "Project & Location", owner: "design", core: true, type: "Text", example: "Smith Residence – Lake House", desc: "Descriptive project name as it appears on project documents.", whyItMatters: "Human-readable reference so Procurement doesn't have to look up project IDs." },
  { name: "Client_Name", friendly: "Client Name", group: "Project & Location", owner: "design", core: true, type: "Text", example: "John & Emily Smith", desc: "Client name(s) as used in contracts and correspondence.", whyItMatters: "Required for PO headers and vendor communications." },
  { name: "Room_Area", friendly: "Room / Area", group: "Project & Location", owner: "design", core: true, type: "Text", example: "Living Room", desc: "Room or area where this item will be installed. Use consistent naming across the project.", whyItMatters: "Tells Procurement and vendors where items go — critical for delivery coordination and install scheduling." },
  { name: "Room_Tag_on_Drawing", friendly: "Room Tag (Drawing)", group: "Project & Location", owner: "design", core: false, type: "Text", example: "L1-101", desc: "The tag or code used on the Bluebeam drawings to identify this room/area.", whyItMatters: "Cross-references the spreadsheet to the actual drawing set. Helpful when resolving discrepancies." },
  { name: "Item_Internal_ID", friendly: "Item ID", group: "Item Identification", owner: "design", core: true, type: "Text", example: "LR-SF-01", desc: "Internal item code assigned by Design. Format: Room abbreviation + item type + sequence number.", whyItMatters: "The unique key for every line item. Procurement uses this to track the item from order through delivery." },
  { name: "Item_Type", friendly: "Item Type", group: "Item Identification", owner: "design", core: true, type: "Dropdown", example: "Furniture", desc: "Category of the item. Values: Furniture, Lighting, Rug, Casework, Window Treatment, Art, Accessory, Appliance, Plumbing Fixture, Other.", whyItMatters: "Helps Procurement sort and batch POs by category. Different item types often go to different vendors." },
  { name: "Item_Description", friendly: "Description", group: "Item Identification", owner: "design", core: true, type: "Text", example: "Track arm sofa, 90\", bench seat", desc: "Clear, concise description of the item. Include key distinguishing details (size, style, configuration).", whyItMatters: "This is what appears on the PO. If it's vague, Procurement has to go back to the PDF to figure out what it is." },
  { name: "Manufacturer", friendly: "Manufacturer", group: "Specs & Finish", owner: "design", core: true, type: "Text", example: "Restoration Hardware", desc: "Manufacturer or maker name.", whyItMatters: "Required for POs. Procurement needs to know who makes it to route the order correctly." },
  { name: "Manufacturer_SKU", friendly: "Manufacturer SKU", group: "Specs & Finish", owner: "design", core: true, type: "Text", example: "RH-98765-LIN", desc: "The manufacturer's product number or SKU. Include finish/color suffix if applicable.", whyItMatters: "The single most important field for accurate ordering. Wrong SKU = wrong item delivered." },
  { name: "Finish_Color", friendly: "Finish / Color", group: "Specs & Finish", owner: "design", core: true, type: "Text", example: "Linen, off-white", desc: "Finish, color, or material selection. Be specific — use the manufacturer's finish name when possible.", whyItMatters: "\"White\" vs. \"off-white\" vs. \"linen\" are different things. Specificity prevents costly mistakes." },
  { name: "Dimensions", friendly: "Dimensions", group: "Specs & Finish", owner: "design", core: false, type: "Text", example: "90\" W x 38\" D x 32\" H", desc: "Item dimensions in the format W x D x H. Include units.", whyItMatters: "Useful for delivery planning and verifying the right item was ordered. Not always needed for POs." },
  { name: "COM_COL", friendly: "COM / COL?", group: "Specs & Finish", owner: "design", core: false, type: "Yes/No", example: "No", desc: "Does this item require Customer's Own Material (COM) or Customer's Own Leather (COL)?", whyItMatters: "If yes, Procurement needs to coordinate a separate fabric/leather PO and shipping to the manufacturer." },
  { name: "Fabric_Leather_Spec", friendly: "Fabric / Leather Spec", group: "Specs & Finish", owner: "design", core: false, type: "Text", example: "Client's own pattern – see separate fabric PO", desc: "If COM/COL, specify the fabric or leather details and any reference to a separate PO.", whyItMatters: "Prevents the \"we shipped the frame but forgot to send the fabric\" problem." },
  { name: "Quantity", friendly: "Quantity", group: "Quantity & Cost", owner: "design", core: true, type: "Number", example: "1", desc: "How many of this item to order.", whyItMatters: "Seems obvious, but wrong quantities are one of the most common errors in re-keying from PDFs." },
  { name: "Unit_of_Measure", friendly: "Unit of Measure", group: "Quantity & Cost", owner: "design", core: true, type: "Dropdown", example: "ea", desc: "Unit for the quantity. Values: ea, pair, set, lf (linear foot), sf (square foot), roll, yard, box.", whyItMatters: "\"2 ea\" vs. \"2 pair\" vs. \"2 set\" are very different order quantities." },
  { name: "Est_Unit_Cost", friendly: "Est. Unit Cost", group: "Quantity & Cost", owner: "shared", core: true, type: "Currency", example: "$2,450", desc: "Estimated cost per unit. Design provides the initial estimate; Procurement confirms or updates with actual vendor pricing.", whyItMatters: "Budget tracking and PO accuracy. Flags items that come in over budget before they're ordered." },
  { name: "Currency", friendly: "Currency", group: "Quantity & Cost", owner: "procurement", core: false, type: "Text", example: "USD", desc: "Currency for the cost. Default is USD.", whyItMatters: "Only relevant for international vendors. Safe to default to USD for most IDA projects." },
  { name: "Install_Phase", friendly: "Install Phase", group: "Scheduling", owner: "design", core: true, type: "Dropdown", example: "FF&E", desc: "When this item is needed on-site. Values: Rough-In, FF&E, Final, Punch, Other.", whyItMatters: "Procurement needs to prioritize orders by phase. Rough-in items must be ordered first." },
  { name: "Required_Onsite_Date", friendly: "Required On-Site Date", group: "Scheduling", owner: "design", core: true, type: "Date", example: "2026-09-15", desc: "The date the item must arrive at the job site or warehouse.", whyItMatters: "Procurement works backward from this date to determine when to place the order." },
  { name: "Desired_Ship_Date", friendly: "Desired Ship Date", group: "Scheduling", owner: "procurement", core: false, type: "Date", example: "2026-08-25", desc: "When the item should ship from the vendor. Calculated by Procurement based on the on-site date and transit time.", whyItMatters: "Procurement-owned field — they know transit times and warehouse schedules." },
  { name: "Lead_Time_Weeks", friendly: "Lead Time (Weeks)", group: "Scheduling", owner: "procurement", core: false, type: "Number", example: "8", desc: "Vendor's stated lead time in weeks. Procurement fills this in from the vendor quote or catalog.", whyItMatters: "Combined with on-site date, tells you the latest you can place the order." },
  { name: "Client_Approved", friendly: "Client Approved?", group: "Approval & Tracking", owner: "design", core: true, type: "Dropdown", example: "Yes", desc: "Has the client approved this specific item? Values: Yes, No, Pending.", whyItMatters: "Procurement should not order items that haven't been approved. This field is the gate." },
  { name: "Client_Approval_Date", friendly: "Approval Date", group: "Approval & Tracking", owner: "design", core: false, type: "Date", example: "2026-04-10", desc: "Date the client approved this item.", whyItMatters: "Useful for audit trail and resolving disputes about when an item was cleared for ordering." },
  { name: "Alt_Option_ID", friendly: "Alternate Option ID", group: "Approval & Tracking", owner: "design", core: false, type: "Text", example: "", desc: "If this item has an alternate or backup, reference the alternate item's Internal ID here.", whyItMatters: "Helps Procurement quickly find the backup if the primary item is backordered or discontinued." },
  { name: "Vendor_Name", friendly: "Vendor Name", group: "Vendor Info", owner: "procurement", core: true, type: "Text", example: "Restoration Hardware Trade", desc: "The vendor or dealer Procurement will order from. May differ from manufacturer (e.g., trade accounts, showrooms).", whyItMatters: "Required for the PO. The vendor is who gets the order — not always the same as the manufacturer." },
  { name: "Vendor_Contact_Name", friendly: "Vendor Contact", group: "Vendor Info", owner: "procurement", core: false, type: "Text", example: "Sarah Johnson", desc: "Name of the specific vendor contact or sales rep.", whyItMatters: "Helpful for follow-ups and relationship tracking, but not required for every PO." },
  { name: "Vendor_Contact_Email", friendly: "Vendor Email", group: "Vendor Info", owner: "procurement", core: false, type: "Email", example: "sarah.johnson@rhtrade.com", desc: "Email address for the vendor contact.", whyItMatters: "Where FileMaker sends the PO email. Procurement usually has this in their contacts already." },
  { name: "Notes_Internal", friendly: "Internal Notes", group: "Notes", owner: "shared", core: false, type: "Text", example: "Confirm delivery to warehouse, not job site", desc: "Notes visible only to the IDA team. Coordination details, flags, reminders.", whyItMatters: "Free-form communication channel between Design and Procurement without cluttering the PO." },
  { name: "Notes_to_Vendor", friendly: "Notes to Vendor", group: "Notes", owner: "shared", core: false, type: "Text", example: "Ship blanket-wrapped, signature required", desc: "Notes that will appear on the PO sent to the vendor. Shipping instructions, special handling, etc.", whyItMatters: "Goes directly on the PO. This is how you tell the vendor \"don't fold the rug\" before it's too late." },
];

const groups = [...new Set(fields.map((f) => f.group))];

function OwnerBadge({ owner, size = "normal" }) {
  const o = OWNER_LABELS[owner];
  const isSmall = size === "small";
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: isSmall ? 3 : 5, background: o.bg, color: o.color, fontSize: isSmall ? 10 : 11, fontWeight: 600, padding: isSmall ? "2px 6px" : "3px 9px", borderRadius: 6, letterSpacing: "0.02em", whiteSpace: "nowrap" }}>
      <span style={{ fontSize: isSmall ? 10 : 12 }}>{o.icon}</span>
      {o.label}
    </span>
  );
}

function CoreBadge({ core }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: 10, fontWeight: 600, padding: "2px 7px", borderRadius: 5, background: core ? "#E8F5E9" : COLORS.warmGray, color: core ? "#2E7D32" : COLORS.lightText, letterSpacing: "0.03em", textTransform: "uppercase" }}>
      {core ? "Core" : "Extended"}
    </span>
  );
}

function FieldCard({ field, isExpanded, onToggle }) {
  const ownerInfo = OWNER_LABELS[field.owner];
  return (
    <div onClick={onToggle} style={{ background: isExpanded ? ownerInfo.bg : COLORS.white, border: `1.5px solid ${isExpanded ? ownerInfo.color + "40" : COLORS.faintBorder}`, borderRadius: 12, padding: "14px 16px", cursor: "pointer", transition: "all 0.2s ease", boxShadow: isExpanded ? `0 4px 16px ${ownerInfo.color}12` : "0 1px 3px rgba(0,0,0,0.03)" }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: COLORS.darkText }}>{field.friendly}</span>
            <CoreBadge core={field.core} />
            <OwnerBadge owner={field.owner} size="small" />
          </div>
          <div style={{ fontSize: 12, color: COLORS.midText, marginTop: 4, lineHeight: 1.5 }}>{field.desc}</div>
        </div>
        <div style={{ fontSize: 16, color: COLORS.lightText, transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s ease", flexShrink: 0, marginTop: 2 }}>▾</div>
      </div>
      {isExpanded && (
        <div style={{ marginTop: 14, paddingTop: 14, borderTop: `1px solid ${ownerInfo.color}20` }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 600, color: COLORS.lightText, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 3 }}>Field Name</div>
              <div style={{ fontSize: 12, color: COLORS.darkText, fontFamily: "monospace" }}>{field.name}</div>
            </div>
            <div>
              <div style={{ fontSize: 10, fontWeight: 600, color: COLORS.lightText, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 3 }}>Data Type</div>
              <div style={{ fontSize: 12, color: COLORS.darkText }}>{field.type}</div>
            </div>
          </div>
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 10, fontWeight: 600, color: COLORS.lightText, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 3 }}>Example Value</div>
            <div style={{ fontSize: 12, color: COLORS.darkText, background: COLORS.white, border: `1px solid ${COLORS.faintBorder}`, borderRadius: 6, padding: "6px 10px", fontFamily: "monospace" }}>{field.example || "—"}</div>
          </div>
          <div style={{ background: `${ownerInfo.color}08`, border: `1px solid ${ownerInfo.color}18`, borderRadius: 8, padding: "10px 12px" }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: ownerInfo.color, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>Why It Matters</div>
            <div style={{ fontSize: 12, color: COLORS.darkText, lineHeight: 1.6 }}>{field.whyItMatters}</div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function SchemaExplorer() {
  const [expandedField, setExpandedField] = useState(null);
  const [ownerFilter, setOwnerFilter] = useState("all");
  const [coreFilter, setCoreFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  const filtered = fields.filter((f) => {
    if (ownerFilter !== "all" && f.owner !== ownerFilter) return false;
    if (coreFilter === "core" && !f.core) return false;
    if (coreFilter === "extended" && f.core) return false;
    if (searchTerm) {
      const s = searchTerm.toLowerCase();
      return f.friendly.toLowerCase().includes(s) || f.name.toLowerCase().includes(s) || f.desc.toLowerCase().includes(s);
    }
    return true;
  });

  const coreCount = fields.filter((f) => f.core).length;
  const extCount = fields.filter((f) => !f.core).length;
  const designCount = fields.filter((f) => f.owner === "design").length;
  const procCount = fields.filter((f) => f.owner === "procurement").length;
  const sharedCount = fields.filter((f) => f.owner === "shared").length;

  return (
    <div>
      {/* Summary cards */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 16 }}>
        {[
          { key: "design", count: designCount },
          { key: "procurement", count: procCount },
          { key: "shared", count: sharedCount },
        ].map(({ key, count }) => {
          const o = OWNER_LABELS[key];
          return (
            <div key={key} onClick={() => setOwnerFilter(ownerFilter === key ? "all" : key)} style={{ background: ownerFilter === key ? o.bg : COLORS.white, border: `1.5px solid ${ownerFilter === key ? o.color + "50" : COLORS.faintBorder}`, borderRadius: 10, padding: "12px 10px", textAlign: "center", cursor: "pointer", transition: "all 0.2s ease" }}>
              <div style={{ fontSize: 20, marginBottom: 4 }}>{o.icon}</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: o.color }}>{count}</div>
              <div style={{ fontSize: 10, fontWeight: 600, color: COLORS.midText, textTransform: "uppercase", letterSpacing: "0.04em" }}>{o.label}</div>
            </div>
          );
        })}
      </div>

      {/* Core/Extended filter */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
        {[
          { value: "all", label: `All (${fields.length})` },
          { value: "core", label: `Core (${coreCount})` },
          { value: "extended", label: `Extended (${extCount})` },
        ].map((opt) => (
          <button key={opt.value} onClick={() => setCoreFilter(opt.value)} style={{ padding: "6px 14px", borderRadius: 8, border: `1.5px solid ${coreFilter === opt.value ? COLORS.blue : COLORS.faintBorder}`, background: coreFilter === opt.value ? `${COLORS.blue}10` : COLORS.white, color: coreFilter === opt.value ? COLORS.blue : COLORS.midText, fontSize: 12, fontWeight: 600, fontFamily: "inherit", cursor: "pointer", transition: "all 0.15s ease" }}>
            {opt.label}
          </button>
        ))}
      </div>

      {/* Search */}
      <div style={{ position: "relative", marginBottom: 20 }}>
        <input type="text" placeholder="Search fields..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={{ width: "100%", padding: "10px 14px 10px 36px", borderRadius: 10, border: `1.5px solid ${COLORS.faintBorder}`, fontSize: 13, fontFamily: "inherit", color: COLORS.darkText, background: COLORS.white, outline: "none", boxSizing: "border-box" }} />
        <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", fontSize: 14, color: COLORS.lightText }}>🔍</span>
        {searchTerm && <button onClick={() => setSearchTerm("")} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", fontSize: 14, color: COLORS.lightText, cursor: "pointer", padding: 4 }}>✕</button>}
      </div>

      {(searchTerm || ownerFilter !== "all" || coreFilter !== "all") && (
        <div style={{ fontSize: 12, color: COLORS.midText, marginBottom: 12, paddingLeft: 2 }}>
          Showing {filtered.length} of {fields.length} fields
        </div>
      )}

      {/* Legend */}
      <div style={{ marginBottom: 20, padding: "18px 20px", background: COLORS.white, borderRadius: 12, border: `1px solid ${COLORS.faintBorder}` }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: COLORS.darkText, marginBottom: 10 }}>How to Read This</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 12, color: COLORS.midText }}><OwnerBadge owner="design" size="small" /><span>Lauren's team fills this field</span></div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 12, color: COLORS.midText }}><OwnerBadge owner="procurement" size="small" /><span>Brandy's team fills this field</span></div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 12, color: COLORS.midText }}><OwnerBadge owner="shared" size="small" /><span>Either team may fill or update</span></div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 12, color: COLORS.midText, marginTop: 4 }}><CoreBadge core={true} /><span>Required — minimum for a PO</span></div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 12, color: COLORS.midText }}><CoreBadge core={false} /><span>Helpful but not blocking</span></div>
        </div>
      </div>

      {/* Grouped fields */}
      {groups.map((group) => {
        const groupFields = filtered.filter((f) => f.group === group);
        if (groupFields.length === 0) return null;
        return (
          <div key={group} style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: COLORS.navy, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10, paddingLeft: 2, paddingBottom: 6, borderBottom: `2px solid ${COLORS.navy}15` }}>{group}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {groupFields.map((f) => (
                <FieldCard key={f.name} field={f} isExpanded={expandedField === f.name} onToggle={() => setExpandedField(expandedField === f.name ? null : f.name)} />
              ))}
            </div>
          </div>
        );
      })}

      {filtered.length === 0 && (
        <div style={{ textAlign: "center", padding: "40px 20px", color: COLORS.midText }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>🔍</div>
          <div style={{ fontSize: 14, fontWeight: 500 }}>No fields match your filters</div>
        </div>
      )}

    </div>
  );
}
