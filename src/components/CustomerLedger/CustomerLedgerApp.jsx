import { useState } from 'react';

// ─── Constants ────────────────────────────────────────────────────────────────
const PASSCODE = 'Ledg3r43lb@';

const STATE_TAXES = {
  AK:   { taxRate: 0.027,   secondary: 0.01,    secondaryType: 'Filing Fee',             rounding: 'penny', flatFee: false },
  AL:   { taxRate: 0.06,    secondary: 0,       secondaryType: null,                     rounding: 'penny', flatFee: false },
  AR:   { taxRate: 0.04,    secondary: 0,       secondaryType: null,                     rounding: 'penny', flatFee: false },
  AZ:   { taxRate: 0.03,    secondary: 0.002,   secondaryType: 'Stamping Fee',           rounding: 'penny', flatFee: false },
  CA:   { taxRate: 0.03,    secondary: 0.0018,  secondaryType: 'Stamping Fee',           rounding: 'penny', flatFee: false },
  CO:   { taxRate: 0.03,    secondary: 0.00175, secondaryType: 'SLAS Clearinghouse Fee', rounding: 'penny', flatFee: false },
  CT:   { taxRate: 0.04,    secondary: 0,       secondaryType: null,                     rounding: 'penny', flatFee: false },
  DC:   { taxRate: 0.03,    secondary: 0,       secondaryType: null,                     rounding: 'penny', flatFee: false },
  DE:   { taxRate: 0.04,    secondary: 0,       secondaryType: null,                     rounding: 'penny', flatFee: false },
  FL:   { taxRate: 0.05,    secondary: 0,       secondaryType: null,                     rounding: 'penny', flatFee: false },
  GA:   { taxRate: 0.04,    secondary: 0,       secondaryType: null,                     rounding: 'penny', flatFee: false },
  HI:   { taxRate: 0.0468,  secondary: 0,       secondaryType: null,                     rounding: 'penny', flatFee: false },
  IA:   { taxRate: 0.01,    secondary: 0,       secondaryType: null,                     rounding: 'penny', flatFee: false },
  ID:   { taxRate: 0.015,   secondary: 0.005,   secondaryType: 'Stamping Fee',           rounding: 'dollar', flatFee: false },
  IL:   { taxRate: 0.045,   secondary: 0.0004,  secondaryType: 'Stamping Fee',           rounding: 'dollar', flatFee: false },
  IN:   { taxRate: 0.025,   secondary: 0,       secondaryType: null,                     rounding: 'penny', flatFee: false },
  KS:   { taxRate: 0.03,    secondary: 0,       secondaryType: null,                     rounding: 'penny', flatFee: false },
  KY:   { taxRate: 0.048,   secondary: 0,       secondaryType: null,                     rounding: 'penny', flatFee: false },
  LA:   { taxRate: 0.0485,  secondary: 0,       secondaryType: null,                     rounding: 'penny', flatFee: false },
  MA:   { taxRate: 0.04,    secondary: 0,       secondaryType: null,                     rounding: 'penny', flatFee: false },
  MD:   { taxRate: 0.03,    secondary: 0,       secondaryType: null,                     rounding: 'penny', flatFee: false },
  ME:   { taxRate: 0.03,    secondary: 0,       secondaryType: null,                     rounding: 'penny', flatFee: false },
  MI:   { taxRate: 0.025,   secondary: 0,       secondaryType: null,                     rounding: 'penny', flatFee: false },
  MN:   { taxRate: 0.03,    secondary: 0.0004,  secondaryType: 'Stamping Fee',           rounding: 'penny', flatFee: false },
  MO:   { taxRate: 0.05,    secondary: 0,       secondaryType: null,                     rounding: 'penny', flatFee: false },
  MS:   { taxRate: 0.07,    secondary: 0.0025,  secondaryType: 'Stamping Fee',           rounding: 'penny', flatFee: false },
  MT:   { taxRate: 0.0275,  secondary: 0,       secondaryType: null,                     rounding: 'penny', flatFee: false },
  NC:   { taxRate: 0.05,    secondary: 0.003,   secondaryType: 'Stamping Fee',           rounding: 'penny', flatFee: false },
  ND:   { taxRate: 0.0175,  secondary: 0,       secondaryType: null,                     rounding: 'penny', flatFee: false },
  NE:   { taxRate: 0.03,    secondary: 0,       secondaryType: null,                     rounding: 'penny', flatFee: false },
  NH:   { taxRate: 0.03,    secondary: 0,       secondaryType: null,                     rounding: 'penny', flatFee: false },
  NJ:   { taxRate: 0.05,    secondary: 0,       secondaryType: null,                     rounding: 'penny', flatFee: false },
  NM:   { taxRate: 0.03003, secondary: 0,       secondaryType: null,                     rounding: 'penny', flatFee: false },
  NV:   { taxRate: 0.035,   secondary: 0.004,   secondaryType: 'Stamping Fee',           rounding: 'penny', flatFee: false },
  NY:   { taxRate: 0.036,   secondary: 0.0015,  secondaryType: 'Stamping Fee',           rounding: 'dollar', flatFee: false },
  OH:   { taxRate: 0.05,    secondary: 0,       secondaryType: null,                     rounding: 'penny', flatFee: false },
  OK:   { taxRate: 0.06,    secondary: 0,       secondaryType: null,                     rounding: 'penny', flatFee: false },
  OR:   { taxRate: 0.023,   secondary: 10,      secondaryType: 'Filing Fee',             rounding: 'penny', flatFee: true  },
  PA:   { taxRate: 0.03,    secondary: 20,      secondaryType: 'Filing Fee',             rounding: 'penny', flatFee: true  },
  PR:   { taxRate: 0.09,    secondary: 0,       secondaryType: null,                     rounding: 'penny', flatFee: false },
  RI:   { taxRate: 0.04,    secondary: 0,       secondaryType: null,                     rounding: 'penny', flatFee: false },
  SC:   { taxRate: 0.06,    secondary: 0,       secondaryType: null,                     rounding: 'penny', flatFee: false },
  SD:   { taxRate: 0.025,   secondary: 0.00175, secondaryType: 'SLAS Clearinghouse Fee', rounding: 'penny', flatFee: false },
  TN:   { taxRate: 0.05,    secondary: 0.00175, secondaryType: 'SLAS Clearinghouse Fee', rounding: 'penny', flatFee: false },
  TX:   { taxRate: 0.0485,  secondary: 0.00075, secondaryType: 'Stamping Fee',           rounding: 'penny', flatFee: false },
  UT:   { taxRate: 0.0425,  secondary: 0.0018,  secondaryType: 'Stamping Fee',           rounding: 'penny', flatFee: false },
  USVI: { taxRate: 0.05,    secondary: 0,       secondaryType: null,                     rounding: 'penny', flatFee: false },
  VA:   { taxRate: 0.0225,  secondary: 0,       secondaryType: null,                     rounding: 'penny', flatFee: false },
  VT:   { taxRate: 0.03,    secondary: 0,       secondaryType: null,                     rounding: 'penny', flatFee: false },
  WA:   { taxRate: 0.02,    secondary: 0.001,   secondaryType: 'Stamping Fee',           rounding: 'penny', flatFee: false },
  WI:   { taxRate: 0.03,    secondary: 0,       secondaryType: null,                     rounding: 'penny', flatFee: false },
  WV:   { taxRate: 0.0455,  secondary: 0,       secondaryType: null,                     rounding: 'penny', flatFee: false },
  WY:   { taxRate: 0.03,    secondary: 0.00175, secondaryType: 'SLAS Clearinghouse Fee', rounding: 'penny', flatFee: false },
};

const STATES = Object.keys(STATE_TAXES).sort();

const PAY_PLAN_OPTIONS = [
  { label: 'Paid in Full',              downPct: 1.00, installments: 0 },
  { label: '20% Down, 8 Installments', downPct: 0.20, installments: 8 },
  { label: '25% Down, 3 Installments', downPct: 0.25, installments: 3 },
  { label: '25% Down, 5 Installments', downPct: 0.25, installments: 5 },
  { label: '25% Down, 8 Installments', downPct: 0.25, installments: 8 },
  { label: '33% Down, 2 Installments', downPct: 0.33, installments: 2 },
  { label: '40% Down, 2 Installments', downPct: 0.40, installments: 2 },
  { label: '50% Down, 1 Installment',  downPct: 0.50, installments: 1 },
];

const CHANGE_TYPES = ['Premium Endorsement', 'Administrative Endorsement', 'Cancellation'];

// ─── Math Helpers ─────────────────────────────────────────────────────────────
const r2 = (x) => Math.round((x + Number.EPSILON) * 100) / 100;
const ceilPenny = (x) => Math.ceil(x * 100) / 100;
const ceilDollar = (x) => Math.max(1, Math.ceil(x));

function calcTaxes(premium, state, isSurplusLines = true) {
  if (!isSurplusLines) return { surplusTax: 0, stampingFee: 0 };
  const sd = STATE_TAXES[state];
  if (!sd || !premium) return { surplusTax: 0, stampingFee: 0 };
  const abs = Math.abs(premium);
  const sign = premium >= 0 ? 1 : -1;
  const round = sd.rounding === 'dollar' ? ceilDollar : ceilPenny;
  const surplusTax = r2(round(r2(abs * sd.taxRate)) * sign);
  let stampingFee = 0;
  if (sd.secondary > 0) {
    stampingFee = sd.flatFee
      ? r2(sd.secondary * sign)
      : r2(round(r2(abs * sd.secondary)) * sign);
  }
  return { surplusTax, stampingFee };
}

function addMonthsToDate(dateStr, months) {
  if (!dateStr) return null;
  const d = new Date(dateStr + 'T00:00:00');
  d.setMonth(d.getMonth() + months);
  return d;
}

function addYearsToDate(dateStr, years) {
  if (!dateStr) return null;
  const d = new Date(dateStr + 'T00:00:00');
  d.setFullYear(d.getFullYear() + years);
  return d;
}

function toJSDate(dateStr) {
  if (!dateStr) return null;
  return new Date(dateStr + 'T00:00:00');
}

// ─── Excel Generator ──────────────────────────────────────────────────────────
async function generateExcel(form) {
  const XLSX = (await import('xlsx')).default || (await import('xlsx'));

  const premium    = r2(parseFloat(form.initialPremium) || 0);
  const vquipFee   = r2(parseFloat(form.vquipFee) || 0);
  const isSL       = form.isSurplusLines !== 'No';
  const { surplusTax, stampingFee } = calcTaxes(premium, form.policyState, isSL);
  const policyExpDate = addYearsToDate(form.policyEffDate, 1);
  const planObj = PAY_PLAN_OPTIONS.find(p => p.label === form.payPlan) || PAY_PLAN_OPTIONS[0];

  const totalInitialExposure = r2(premium + surplusTax + stampingFee + vquipFee);

  // ── POLICY LEDGER ────────────────────────────────────────────────────────────
  const PL_HEADERS = [
    '', 'Policy Number', 'Policy Activity Type', 'Policy Effective Date',
    'Policy Expiration Date', 'Transaction Processed Date', 'Transaction Effective Date',
    'Annual Written Premium', 'Taxes and Fees', 'Policy Total',
  ];

  const plRows = [];
  let runPrem = 0, runTaxFee = 0;

  // New policy row
  const initTaxFee = r2(surplusTax + stampingFee);
  plRows.push([
    '', form.policyNumber, 'Policy Issued',
    toJSDate(form.policyEffDate), policyExpDate,
    toJSDate(form.policyEffDate), toJSDate(form.policyEffDate),
    premium, initTaxFee, r2(premium + initTaxFee),
  ]);
  runPrem += premium; runTaxFee += initTaxFee;

  // Change rows
  let endorsementIdx = 0;
  form.changes.forEach((chg) => {
    const chgPrem  = r2(parseFloat(chg.premiumImpact) || 0);
    const { surplusTax: cTax, stampingFee: cStamp } = calcTaxes(chgPrem, form.policyState, isSL);
    const chgTaxFee = r2(cTax + cStamp);
    if (chg.changeType !== 'Administrative Endorsement') {
      endorsementIdx++;
    }
    plRows.push([
      '', form.policyNumber, chg.changeType,
      toJSDate(form.policyEffDate), policyExpDate,
      toJSDate(chg.changeEffDate), toJSDate(chg.changeEffDate),
      chgPrem, chgTaxFee, r2(chgPrem + chgTaxFee),
    ]);
    runPrem += chgPrem; runTaxFee += chgTaxFee;
  });

  // Total row
  plRows.push([
    '', '', 'POLICY TOTAL', null, null, null, null,
    r2(runPrem), r2(runTaxFee), r2(runPrem + runTaxFee),
  ]);

  // ── CUSTOMER LEDGER ──────────────────────────────────────────────────────────
  const CL_HEADERS = [
    '', 'Policy Number', 'Insured',
    'Transaction Annual Premium', 'Surplus Lines Tax', 'Stamping Fee',
    'Technology Fee 1 (Bluefields)', 'Technology Fee 2', 'Technology Fee 3',
    'Policy Eff Date', 'Policy Exp Date',
    'Transaction Effective Date', 'Transaction Processed Date',
    'Transaction', 'Pay Plan', 'Down Pay Pct',
    'Invoice ID', 'Invoice Status', 'Invoice Create Date', 'Due Date',
    'Premium Due', 'Premium Received', 'Total Premium Balance',
    'Surplus Lines Tax Due', 'Surplus Lines Tax Received', 'Total Surplus Lines Tax Balance',
    'Stamping Fee Due', 'Stamping Fee Received', 'Total Stamping Fee Balance',
    'Technology Fee 1 Due', 'Technology Fee 1 Received', 'Total Technology Fee 1 Balance',
    'Technology Fee 2 Due', 'Technology Fee 2 Received', 'Total Technology Fee 2 Balance',
    'Technology Fee 3 Due', 'Technology Fee 3 Received', 'Total Technology Fee 3 Balance',
    'Total Due', 'Total Received', 'Total Account Balance',
  ];

  const clRows = [];

  // Running balance trackers
  let premBal   = premium;
  let taxBal    = surplusTax;
  let stampBal  = stampingFee;
  let feeBal    = vquipFee;
  let totalBal  = totalInitialExposure;

  // Payment queue (chronological)
  const payQueue = form.payments
    .filter(p => parseFloat(p.amount) > 0)
    .slice() // copy
    .sort((a, b) => (a.date || '').localeCompare(b.date || ''));

  let payIdx = 0;

  function nextPayment() {
    return payIdx < payQueue.length ? payQueue[payIdx++] : null;
  }

  function baseFields(transPrem, transTax, transStamp, transFee, transEffDate, transProcDate) {
    return [
      '',
      form.policyNumber,
      form.customerName,
      transPrem, transTax, transStamp, transFee, 0, 0,
      toJSDate(form.policyEffDate),
      policyExpDate,
      transEffDate,
      transProcDate,
    ];
  }

  // ── New Policy: Record Row ────────────────────────────────────────────────────
  clRows.push([
    ...baseFields(premium, surplusTax, stampingFee, vquipFee,
      toJSDate(form.policyEffDate), toJSDate(form.policyEffDate)),
    'New Policy', form.payPlan, planObj.downPct,
    null, 'Policy Issued',
    toJSDate(form.policyEffDate), toJSDate(form.policyEffDate),
    0, 0, premBal,
    0, 0, taxBal,
    0, 0, stampBal,
    0, 0, feeBal,
    0, 0, 0,  // Fee 2
    0, 0, 0,  // Fee 3
    0, 0, totalBal,
  ]);

  // ── Down Payment Billing Rows ─────────────────────────────────────────────────
  const downPremDue = r2(premium * planObj.downPct);
  const downTotal   = r2(downPremDue + surplusTax + stampingFee + vquipFee);
  const downInvId   = `${form.policyNumber}-DOWN`;
  const downDate    = toJSDate(form.policyEffDate);

  // PremiumBilled
  clRows.push([
    ...baseFields(0, 0, 0, 0, toJSDate(form.policyEffDate), toJSDate(form.policyEffDate)),
    'Down Payment', form.payPlan, planObj.downPct,
    downInvId, 'PremiumBilled',
    downDate, downDate,
    downPremDue, 0, premBal,
    surplusTax, 0, taxBal,
    stampingFee, 0, stampBal,
    vquipFee, 0, feeBal,
    0, 0, 0,
    0, 0, 0,
    downTotal, 0, totalBal,
  ]);

  // PremiumCollected
  const downPay = nextPayment();
  const downCollected = downPay ? r2(parseFloat(downPay.amount)) : 0;
  // Proportionally split collection across line items
  const downPremRecv  = downPay ? r2(Math.min(downCollected, downPremDue)) : 0;
  const downTaxRecv   = downPay ? r2(-Math.min(Math.abs(surplusTax), Math.max(0, downCollected - downPremDue))) : 0;
  const downStampRecv = downPay ? r2(-Math.min(Math.abs(stampingFee), Math.max(0, downCollected - downPremDue - Math.abs(surplusTax)))) : 0;
  const downFeeRecv   = downPay ? r2(-Math.min(vquipFee, Math.max(0, downCollected - downPremDue - Math.abs(surplusTax) - Math.abs(stampingFee)))) : 0;

  if (downPay) {
    premBal  = r2(premBal - downPremDue);
    taxBal   = r2(taxBal - Math.abs(surplusTax));
    stampBal = r2(stampBal - Math.abs(stampingFee));
    feeBal   = r2(feeBal - vquipFee);
    totalBal = r2(totalBal - downCollected);
  }

  clRows.push([
    ...baseFields(0, 0, 0, 0, toJSDate(form.policyEffDate), downPay ? toJSDate(downPay.date) : toJSDate(form.policyEffDate)),
    'Down Payment', form.payPlan, planObj.downPct,
    downPay ? downPay.invoiceNumber || downInvId : downInvId,
    'PremiumCollected',
    downDate, downPay ? toJSDate(downPay.date) : downDate,
    0, downPay ? -downPremDue : 0, premBal,
    0, downPay ? -Math.abs(surplusTax) : 0, taxBal,
    0, downPay ? -Math.abs(stampingFee) : 0, stampBal,
    0, downPay ? -vquipFee : 0, feeBal,
    0, 0, 0,
    0, 0, 0,
    0, downPay ? -downCollected : 0, totalBal,
  ]);

  // ── Installment Rows ──────────────────────────────────────────────────────────
  if (planObj.installments > 0) {
    const remainingPrem = r2(premium - downPremDue);
    const instPremBase  = r2(remainingPrem / planObj.installments);

    for (let i = 0; i < planObj.installments; i++) {
      const isLast = i === planObj.installments - 1;
      const instPrem = isLast ? r2(remainingPrem - instPremBase * (planObj.installments - 1)) : instPremBase;
      const instDueDate = addMonthsToDate(form.policyEffDate, i + 1);
      const instInvId   = `${form.policyNumber}-INST${i + 1}`;

      // PremiumBilled
      clRows.push([
        ...baseFields(0, 0, 0, 0, toJSDate(form.policyEffDate), instDueDate),
        `Installment ${i + 1}`, form.payPlan, planObj.downPct,
        instInvId, 'PremiumBilled',
        instDueDate, instDueDate,
        instPrem, 0, premBal,
        0, 0, taxBal,
        0, 0, stampBal,
        0, 0, feeBal,
        0, 0, 0,
        0, 0, 0,
        instPrem, 0, totalBal,
      ]);

      // PremiumCollected
      const instPay = nextPayment();
      const instCollected = instPay ? r2(parseFloat(instPay.amount)) : 0;
      if (instPay) {
        premBal  = r2(premBal - instPrem);
        totalBal = r2(totalBal - instCollected);
      }

      clRows.push([
        ...baseFields(0, 0, 0, 0, toJSDate(form.policyEffDate), instPay ? toJSDate(instPay.date) : instDueDate),
        `Installment ${i + 1}`, form.payPlan, planObj.downPct,
        instPay ? instPay.invoiceNumber || instInvId : instInvId,
        'PremiumCollected',
        instDueDate, instPay ? toJSDate(instPay.date) : instDueDate,
        0, instPay ? -instPrem : 0, premBal,
        0, 0, taxBal,
        0, 0, stampBal,
        0, 0, feeBal,
        0, 0, 0,
        0, 0, 0,
        0, instPay ? -instCollected : 0, totalBal,
      ]);
    }
  }

  // ── Change Rows ─────────────────────────────────────────────────────────────
  form.changes.forEach((chg, ci) => {
    const chgPrem  = r2(parseFloat(chg.premiumImpact) || 0);
    const { surplusTax: cTax, stampingFee: cStamp } = calcTaxes(chgPrem, form.policyState, isSL);

    premBal  = r2(premBal + chgPrem);
    taxBal   = r2(taxBal + cTax);
    stampBal = r2(stampBal + cStamp);
    totalBal = r2(totalBal + chgPrem + cTax + cStamp);

    clRows.push([
      ...baseFields(chgPrem, cTax, cStamp, 0,
        toJSDate(chg.changeEffDate), toJSDate(chg.changeEffDate)),
      chg.changeType, form.payPlan, planObj.downPct,
      null, chg.changeType,
      toJSDate(chg.changeEffDate), toJSDate(chg.changeEffDate),
      0, 0, premBal,
      0, 0, taxBal,
      0, 0, stampBal,
      0, 0, feeBal,
      0, 0, 0,
      0, 0, 0,
      0, 0, totalBal,
    ]);

    // Change billing
    const chgTotal = r2(chgPrem + cTax + cStamp);
    const chgInvId = `${form.policyNumber}-CHG${ci + 1}`;
    clRows.push([
      ...baseFields(0, 0, 0, 0, toJSDate(chg.changeEffDate), toJSDate(chg.changeEffDate)),
      chg.changeType, form.payPlan, planObj.downPct,
      chgInvId, 'PremiumBilled',
      toJSDate(chg.changeEffDate), toJSDate(chg.changeEffDate),
      chgPrem, 0, premBal,
      cTax, 0, taxBal,
      cStamp, 0, stampBal,
      0, 0, feeBal,
      0, 0, 0,
      0, 0, 0,
      chgTotal, 0, totalBal,
    ]);

    const chgPay = nextPayment();
    const amt = chgPay ? r2(parseFloat(chgPay.amount)) : 0;
    if (chgPay) {
      premBal  = r2(premBal - chgPrem);
      taxBal   = r2(taxBal - cTax);
      stampBal = r2(stampBal - cStamp);
      totalBal = r2(totalBal - amt);
    }

    clRows.push([
      ...baseFields(0, 0, 0, 0, toJSDate(chg.changeEffDate), chgPay ? toJSDate(chgPay.date) : toJSDate(chg.changeEffDate)),
      chg.changeType, form.payPlan, planObj.downPct,
      chgPay ? chgPay.invoiceNumber || chgInvId : chgInvId,
      'PremiumCollected',
      toJSDate(chg.changeEffDate), chgPay ? toJSDate(chgPay.date) : toJSDate(chg.changeEffDate),
      0, chgPay ? -chgPrem : 0, premBal,
      0, chgPay ? -cTax : 0, taxBal,
      0, chgPay ? -cStamp : 0, stampBal,
      0, 0, feeBal,
      0, 0, 0,
      0, 0, 0,
      0, -amt, totalBal,
    ]);
  });

  // ── SUMMARY SHEET ────────────────────────────────────────────────────────────
  const totalPremBilled  = r2(premium + form.changes.reduce((s, c) => s + (parseFloat(c.premiumImpact) || 0), 0));
  const totalTaxBilled   = r2(surplusTax + form.changes.reduce((s, c) => {
    const cp = parseFloat(c.premiumImpact) || 0;
    return s + calcTaxes(cp, form.policyState, isSL).surplusTax;
  }, 0));
  const totalStampBilled = r2(stampingFee + form.changes.reduce((s, c) => {
    const cp = parseFloat(c.premiumImpact) || 0;
    return s + calcTaxes(cp, form.policyState, isSL).stampingFee;
  }, 0));
  const totalFeeBilled   = vquipFee;
  const totalAllBilled   = r2(totalPremBilled + totalTaxBilled + totalStampBilled + totalFeeBilled);
  const totalAllReceived = r2(form.payments.reduce((s, p) => s + (parseFloat(p.amount) || 0), 0));
  const totalBalance     = r2(totalAllBilled - totalAllReceived);

  const summaryData = [
    ['CUSTOMER LEDGER SUMMARY'],
    [`Generated: ${new Date().toLocaleDateString('en-US')}`],
    [],
    ['Customer:', form.customerName],
    ['Policy Number:', form.policyNumber],
    ['State:', form.policyState],
    ['Policy Effective Date:', toJSDate(form.policyEffDate)],
    ['Policy Expiration Date:', policyExpDate],
    ['Pay Plan:', form.payPlan],
    [],
    ['', 'Total Billed', 'Total Received', 'Balance'],
    ['Net Premium', totalPremBilled, totalAllReceived > 0 ? '(see below)' : 0, totalPremBilled],
    ['Surplus Lines Tax', totalTaxBilled, '', totalTaxBilled],
    ['Stamping Fee', totalStampBilled, '', totalStampBilled],
    ['Bluefields Technology Fee', totalFeeBilled, '', totalFeeBilled],
    ['TOTAL', totalAllBilled, totalAllReceived, totalBalance],
    [],
    ['State Tax Rate:', `${((STATE_TAXES[form.policyState]?.taxRate || 0) * 100).toFixed(4)}%`],
    STATE_TAXES[form.policyState]?.secondary > 0 ? [
      `${STATE_TAXES[form.policyState].secondaryType}:`,
      STATE_TAXES[form.policyState].flatFee
        ? `$${STATE_TAXES[form.policyState].secondary} flat fee per transaction`
        : `${(STATE_TAXES[form.policyState].secondary * 100).toFixed(4)}%`,
    ] : ['Secondary Tax/Fee:', 'None'],
    ['Rounding Rule:', STATE_TAXES[form.policyState]?.rounding === 'dollar' ? 'Round up to dollar (min $1)' : 'Round up to next penny'],
    [],
    ['PAYMENTS RECEIVED'],
    ['Date', 'Invoice Number', 'Amount'],
    ...form.payments
      .filter(p => parseFloat(p.amount) > 0)
      .map(p => [toJSDate(p.date), p.invoiceNumber || '—', r2(parseFloat(p.amount))]),
  ];

  // ── ASSEMBLE WORKBOOK ─────────────────────────────────────────────────────────
  const wb = XLSX.utils.book_new();

  // Summary Sheet
  const summaryWS = XLSX.utils.aoa_to_sheet(summaryData);
  summaryWS['!cols'] = [{ wch: 28 }, { wch: 18 }, { wch: 18 }, { wch: 15 }];
  XLSX.utils.book_append_sheet(wb, summaryWS, 'Summary');

  // Policy Ledger Sheet
  const plData = [PL_HEADERS, ...plRows];
  const plWS   = XLSX.utils.aoa_to_sheet(plData);
  plWS['!cols'] = [
    { wch: 2 }, { wch: 22 }, { wch: 26 }, { wch: 18 }, { wch: 18 },
    { wch: 22 }, { wch: 22 }, { wch: 20 }, { wch: 15 }, { wch: 15 },
  ];
  XLSX.utils.book_append_sheet(wb, plWS, 'Policy Ledger');

  // Customer Ledger Sheet
  const clData = [CL_HEADERS, ...clRows];
  const clWS   = XLSX.utils.aoa_to_sheet(clData);
  const clColWidths = [
    { wch: 2 }, { wch: 20 }, { wch: 30 }, { wch: 22 }, { wch: 18 }, { wch: 14 },
    { wch: 22 }, { wch: 14 }, { wch: 14 }, { wch: 16 }, { wch: 16 }, { wch: 22 },
    { wch: 22 }, { wch: 22 }, { wch: 28 }, { wch: 12 }, { wch: 28 }, { wch: 18 },
    { wch: 18 }, { wch: 14 }, { wch: 12 }, { wch: 16 }, { wch: 20 }, { wch: 20 },
    { wch: 22 }, { wch: 26 }, { wch: 16 }, { wch: 20 }, { wch: 22 }, { wch: 16 },
    { wch: 20 }, { wch: 22 }, { wch: 16 }, { wch: 20 }, { wch: 22 }, { wch: 16 },
    { wch: 20 }, { wch: 22 }, { wch: 12 }, { wch: 16 }, { wch: 20 },
  ];
  clWS['!cols'] = clColWidths;
  XLSX.utils.book_append_sheet(wb, clWS, 'Customer Ledger');

  // Download
  const blob = new Blob(
    [XLSX.write(wb, { bookType: 'xlsx', type: 'array' })],
    { type: 'application/octet-stream' }
  );
  const url  = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href  = url;
  link.download = `${form.customerName.replace(/\s+/g, '_')}_${form.policyNumber}_Ledger_${new Date().toISOString().split('T')[0]}.xlsx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// ─── Warning Banner ──────────────────────────────────────────────────────────
function BFWarningBanner() {
  return (
    <div
      className="bf-warning-banner"
      role="alert"
      aria-live="polite"
      style={{
        backgroundColor: '#0B0E0E',
        color: '#ffffff',
        fontFamily: '"Public Sans", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        fontSize: '0.875rem',
        letterSpacing: '0.04em',
        padding: '0.75rem 1.5rem',
        textAlign: 'center',
        width: '100%',
        boxSizing: 'border-box',
      }}
    >
      <span style={{ fontWeight: 800, textTransform: 'uppercase', marginRight: '0.5rem' }}>
        WARNING:
      </span>
      <span style={{ fontWeight: 500, textTransform: 'none', letterSpacing: '0.01em' }}>
        The items on this page are demonstration-only wireframes and are{' '}
        <strong>not</strong> connected to any Bluefields Specialty Insurance systems
        or data. This page operates entirely outside of any proprietary systems.
        No information used in these examples is stored in any database belonging
        to Bluefields Specialty Insurance or Minster Solutions.
      </span>
    </div>
  );
}

// ─── BF CSS tokens (inline style objects) ─────────────────────────────────────
const bf = {
  backgroundSoft:  '#EDF3F5',
  backgroundAlt:   '#D6E3E8',
  borderSubtle:    '#BDCDD2',
  accentSoft:      '#8FC9D2',
  accentPrimary:   '#00869B',
  accentDark:      '#005367',
  textMuted:       '#516266',
  textBody:        '#31484D',
  textStrong:      '#172D32',
  textInverse:     '#FFFFFF',
  nearBlack:       '#0B0E0E',
  fontDisplay:     '"Public Sans", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  fontBody:        '"Public Sans", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
};

// ─── Shared Input Styles ──────────────────────────────────────────────────────
const inputCls  = 'w-full bg-white border border-[#BDCDD2] text-[#31484D] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#00869B] focus:ring-1 focus:ring-[#00869B] placeholder-[#516266]/50';
const selectCls = `${inputCls} cursor-pointer`;
const labelCls  = 'block text-xs font-semibold uppercase tracking-widest text-[#00869B] mb-1';

// ─── Sub-components ───────────────────────────────────────────────────────────
function FormField({ label, children }) {
  return (
    <div>
      <label className={labelCls} style={{ fontFamily: bf.fontBody }}>{label}</label>
      {children}
    </div>
  );
}

function SectionHeader({ icon, title, subtitle }) {
  return (
    <div className="flex items-start gap-3 mb-5">
      <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
        style={{ backgroundColor: `${bf.accentPrimary}20`, border: `1px solid ${bf.accentPrimary}40` }}>
        <span className="text-sm" style={{ color: bf.accentPrimary }}>{icon}</span>
      </div>
      <div>
        <h3 className="font-semibold text-base leading-tight" style={{ color: bf.textStrong, fontFamily: bf.fontDisplay }}>{title}</h3>
        {subtitle && <p className="text-xs mt-0.5" style={{ color: bf.textMuted }}>{subtitle}</p>}
      </div>
    </div>
  );
}

// ─── Auth Gate ────────────────────────────────────────────────────────────────
function AuthGate({ onSuccess }) {
  const [code, setCode]   = useState('');
  const [error, setError] = useState('');

  const handleSubmit = () => {
    if (code === PASSCODE) {
      sessionStorage.setItem('ledger_auth', 'true');
      onSuccess();
    } else {
      setError('Access denied. Check your passcode and try again.');
      setCode('');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4"
      style={{ background: `linear-gradient(135deg, ${bf.backgroundSoft}, ${bf.backgroundAlt})` }}>
      <div className="relative z-10 w-full max-w-md">
        {/* Logo / Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: `linear-gradient(135deg, ${bf.accentPrimary}, ${bf.accentDark})`, border: `1px solid ${bf.accentPrimary}66` }}>
              <span className="font-bold text-lg" style={{ fontFamily: bf.fontDisplay, color: bf.textInverse }}>B</span>
            </div>
            <span className="text-sm tracking-widest uppercase font-medium" style={{ fontFamily: bf.fontDisplay, color: bf.accentDark }}>Bluefields</span>
          </div>
          <h1 className="text-2xl font-bold mb-1" style={{ fontFamily: bf.fontDisplay, color: bf.textStrong }}>
            Customer Ledger
          </h1>
          <p className="text-sm" style={{ color: bf.textMuted }}>Authorized access only</p>
        </div>

        {/* Card */}
        <div className="rounded-2xl p-8 backdrop-blur-sm"
          style={{ backgroundColor: '#ffffff', border: `1px solid ${bf.borderSubtle}`, boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>
          <FormField label="Access Code">
            <input
              type="password"
              value={code}
              onChange={e => { setCode(e.target.value); setError(''); }}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              maxLength={64}
              autoFocus
              placeholder="Enter passcode"
              className={inputCls}
              style={{ fontFamily: bf.fontBody }}
            />
          </FormField>

          {error && (
            <p className="mt-3 text-xs rounded-lg px-3 py-2"
              style={{ color: '#b91c1c', backgroundColor: '#fef2f2', border: '1px solid #fecaca' }}>
              {error}
            </p>
          )}

          <button
            onClick={handleSubmit}
            className="mt-5 w-full font-semibold py-2.5 px-4 rounded-full transition-all text-sm tracking-wide border-none cursor-pointer"
            style={{
              fontFamily: bf.fontBody,
              backgroundColor: bf.accentPrimary,
              color: bf.textInverse,
            }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor = bf.accentDark}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = bf.accentPrimary}
          >
            Access Ledger Tool
          </button>
        </div>

        <p className="text-center text-xs mt-6" style={{ fontFamily: bf.fontBody, color: bf.textMuted }}>
          This tool is for authorized Bluefields accounting team use only.
        </p>
      </div>
    </div>
  );
}

// ─── Change Row ───────────────────────────────────────────────────────────────
function ChangeRow({ chg, idx, onChange, onRemove }) {
  return (
    <div className="rounded-xl p-4"
      style={{ backgroundColor: bf.backgroundSoft, border: `1px solid ${bf.borderSubtle}` }}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-bold uppercase tracking-widest"
          style={{ color: bf.accentPrimary, fontFamily: bf.fontBody }}>
          Change #{idx + 1}
        </span>
        <button
          onClick={onRemove}
          className="hover:text-red-500 transition-colors text-xs"
          style={{ color: bf.textMuted }}
        >
          Remove
        </button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <FormField label="Change Type">
          <select value={chg.changeType} onChange={e => onChange('changeType', e.target.value)} className={selectCls}
            style={{ fontFamily: bf.fontBody }}>
            {CHANGE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </FormField>
        <FormField label="Annual Premium Impact ($)">
          <input
            type="number"
            step="0.01"
            value={chg.premiumImpact}
            onChange={e => onChange('premiumImpact', e.target.value)}
            placeholder="e.g. -450.00"
            className={inputCls}
            style={{ fontFamily: bf.fontBody }}
          />
        </FormField>
        <FormField label="Change Effective Date">
          <input
            type="date"
            value={chg.changeEffDate}
            onChange={e => onChange('changeEffDate', e.target.value)}
            className={inputCls}
            style={{ fontFamily: bf.fontBody }}
          />
        </FormField>
      </div>
    </div>
  );
}

// ─── Payment Row ──────────────────────────────────────────────────────────────
function PaymentRow({ pay, idx, onChange, onRemove }) {
  return (
    <div className="rounded-xl p-4"
      style={{ backgroundColor: bf.backgroundSoft, border: `1px solid ${bf.accentSoft}` }}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-bold uppercase tracking-widest"
          style={{ color: bf.accentDark, fontFamily: bf.fontBody }}>
          Payment #{idx + 1}
        </span>
        <button
          onClick={onRemove}
          className="hover:text-red-500 transition-colors text-xs"
          style={{ color: bf.textMuted }}
        >
          Remove
        </button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <FormField label="Payment Received Date">
          <input
            type="date"
            value={pay.date}
            onChange={e => onChange('date', e.target.value)}
            className={inputCls}
            style={{ fontFamily: bf.fontBody }}
          />
        </FormField>
        <FormField label="Invoice Number">
          <input
            type="text"
            value={pay.invoiceNumber}
            onChange={e => onChange('invoiceNumber', e.target.value)}
            placeholder="e.g. in_1SfPSO..."
            className={inputCls}
            style={{ fontFamily: bf.fontBody }}
          />
        </FormField>
        <FormField label="Amount Received ($)">
          <input
            type="number"
            step="0.01"
            min="0"
            value={pay.amount}
            onChange={e => onChange('amount', e.target.value)}
            placeholder="0.00"
            className={inputCls}
            style={{ fontFamily: bf.fontBody }}
          />
        </FormField>
      </div>
    </div>
  );
}

// ─── Tax Preview ──────────────────────────────────────────────────────────────
function TaxPreview({ premium, state, isSurplusLines = true }) {
  if (!premium || !state || !STATE_TAXES[state]) return null;
  const p = parseFloat(premium) || 0;
  if (p <= 0) return null;
  if (!isSurplusLines) return (
    <div className="mt-3 rounded-lg p-3 text-xs"
      style={{ backgroundColor: bf.backgroundSoft, border: `1px solid ${bf.borderSubtle}` }}>
      <p className="font-semibold uppercase tracking-widest mb-2" style={{ color: bf.accentPrimary }}>Tax Preview — {state}</p>
      <p style={{ color: bf.textMuted }}>Not a surplus lines policy — no SL taxes or stamping fees apply.</p>
    </div>
  );
  const { surplusTax, stampingFee } = calcTaxes(p, state, true);
  const sd = STATE_TAXES[state];
  return (
    <div className="mt-3 rounded-lg p-3 text-xs"
      style={{ backgroundColor: bf.backgroundSoft, border: `1px solid ${bf.accentSoft}` }}>
      <p className="font-semibold uppercase tracking-widest mb-2" style={{ color: bf.accentPrimary }}>Tax Preview — {state}</p>
      <div className="space-y-1" style={{ color: bf.textMuted }}>
        <div className="flex justify-between">
          <span>Surplus Lines Tax ({(sd.taxRate * 100).toFixed(4)}%)</span>
          <span className="font-medium" style={{ color: bf.textStrong }}>${surplusTax.toFixed(2)}</span>
        </div>
        {stampingFee !== 0 && (
          <div className="flex justify-between">
            <span>{sd.secondaryType}{sd.flatFee ? ' (flat)' : ` (${(sd.secondary * 100).toFixed(4)}%)`}</span>
            <span className="font-medium" style={{ color: bf.textStrong }}>${Math.abs(stampingFee).toFixed(2)}</span>
          </div>
        )}
        <div className="flex justify-between pt-1 mt-1" style={{ borderTop: `1px solid ${bf.borderSubtle}` }}>
          <span style={{ color: bf.textBody }}>Total Taxes & Fees</span>
          <span className="font-bold" style={{ color: bf.accentPrimary }}>${r2(surplusTax + stampingFee).toFixed(2)}</span>
        </div>
        <div className="mt-1" style={{ color: bf.textMuted }}>
          Rounding: {sd.rounding === 'dollar' ? 'Round up to dollar (min $1)' : 'Round up to next penny'}
        </div>
      </div>
    </div>
  );
}

// ─── Main Form ────────────────────────────────────────────────────────────────
function LedgerForm() {
  const [form, setForm] = useState({
    customerName:    '',
    policyNumber:    '',
    policyEffDate:   '',
    initialPremium:  '',
    policyState:     'TN',
    vquipFee:        '',
    payPlan:         'Paid in Full',
    isSurplusLines:  'Yes',
  });

  const [changes,  setChanges]  = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');

  const setField = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  const addChange  = () => setChanges(prev => [...prev, { changeType: 'Premium Endorsement', premiumImpact: '', changeEffDate: '' }]);
  const addPayment = () => setPayments(prev => [...prev, { date: '', invoiceNumber: '', amount: '' }]);

  const updateChange  = (i, k, v) => setChanges(prev => prev.map((c, idx) => idx === i ? { ...c, [k]: v } : c));
  const updatePayment = (i, k, v) => setPayments(prev => prev.map((p, idx) => idx === i ? { ...p, [k]: v } : p));

  const removeChange  = (i) => setChanges(prev => prev.filter((_, idx) => idx !== i));
  const removePayment = (i) => setPayments(prev => prev.filter((_, idx) => idx !== i));

  const handleSubmit = async () => {
    if (!form.customerName || !form.policyNumber || !form.policyEffDate || !form.initialPremium || !form.policyState) {
      setError('Please fill in all required policy fields before generating the ledger.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await generateExcel({ ...form, changes, payments });
    } catch (e) {
      console.error(e);
      setError('An error occurred generating the Excel file. Check the console for details.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen px-4 py-10"
      style={{ fontFamily: bf.fontBody, background: `linear-gradient(135deg, ${bf.backgroundSoft}, ${bf.backgroundAlt})` }}>

      <div className="relative z-10 max-w-4xl mx-auto">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs font-bold uppercase tracking-widest" style={{ color: bf.accentPrimary }}>Bluefields</span>
            <span className="text-xs" style={{ color: bf.borderSubtle }}>&rsaquo;</span>
            <span className="text-xs uppercase tracking-widest" style={{ color: bf.textMuted }}>Customer Ledger Tool</span>
          </div>
          <h1 className="text-3xl font-bold" style={{ fontFamily: bf.fontDisplay, color: bf.textStrong }}>
            Generate Policy Ledger
          </h1>
          <p className="text-sm mt-1" style={{ color: bf.textMuted }}>
            Enter policy details below to generate a downloadable Excel ledger with Summary, Policy Ledger, and Customer Ledger tabs.
          </p>
        </div>

        {/* ── Section 1: Policy Information ────────────────────────────────── */}
        <div className="rounded-2xl p-6 mb-5"
          style={{ backgroundColor: '#ffffff', border: `1px solid ${bf.borderSubtle}`, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <SectionHeader icon="📋" title="Policy Information" subtitle="Core policy details and initial billing setup" />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Customer Name *">
              <input type="text" value={form.customerName} onChange={e => setField('customerName', e.target.value)}
                placeholder="e.g. Acme Rentals LLC" className={inputCls} style={{ fontFamily: bf.fontBody }} />
            </FormField>
            <FormField label="Policy Number *">
              <input type="text" value={form.policyNumber} onChange={e => setField('policyNumber', e.target.value)}
                placeholder="e.g. AABA30000001-00" className={inputCls} style={{ fontFamily: bf.fontBody }} />
            </FormField>
            <FormField label="Policy Effective Date *">
              <input type="date" value={form.policyEffDate} onChange={e => setField('policyEffDate', e.target.value)}
                className={inputCls} style={{ fontFamily: bf.fontBody }} />
            </FormField>
            <FormField label="Initial Annual Premium ($) *">
              <input type="number" step="0.01" min="0" value={form.initialPremium}
                onChange={e => setField('initialPremium', e.target.value)}
                placeholder="0.00" className={inputCls} style={{ fontFamily: bf.fontBody }} />
            </FormField>
            <FormField label="Policy State *">
              <select value={form.policyState} onChange={e => setField('policyState', e.target.value)} className={selectCls}
                style={{ fontFamily: bf.fontBody }}>
                {STATES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </FormField>
            <FormField label="Bluefields Technology Fee — Total ($) *">
              <input type="number" step="0.01" min="0" value={form.vquipFee}
                onChange={e => setField('vquipFee', e.target.value)}
                placeholder="0.00" className={inputCls} style={{ fontFamily: bf.fontBody }} />
            </FormField>
            <FormField label="Initial Pay Plan *">
              <select value={form.payPlan} onChange={e => setField('payPlan', e.target.value)} className={selectCls}
                style={{ fontFamily: bf.fontBody }}>
                {PAY_PLAN_OPTIONS.map(p => <option key={p.label} value={p.label}>{p.label}</option>)}
              </select>
            </FormField>
            <FormField label="Is the Policy Surplus Lines? *">
              <select value={form.isSurplusLines} onChange={e => setField('isSurplusLines', e.target.value)} className={selectCls}
                style={{ fontFamily: bf.fontBody }}>
                <option value="Yes">Yes</option>
                <option value="No">No</option>
              </select>
            </FormField>
          </div>

          {/* Live tax preview */}
          <TaxPreview premium={form.initialPremium} state={form.policyState} isSurplusLines={form.isSurplusLines !== 'No'} />
        </div>

        {/* ── Section 2: Policy Changes ─────────────────────────────────────── */}
        <div className="rounded-2xl p-6 mb-5"
          style={{ backgroundColor: '#ffffff', border: `1px solid ${bf.borderSubtle}`, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <SectionHeader icon="📝" title="Policy Changes" subtitle="Endorsements and cancellations after the initial issuance" />

          <div className="space-y-3">
            {changes.length === 0 && (
              <p className="text-sm text-center py-4 rounded-xl"
                style={{ color: bf.textMuted, border: `1px dashed ${bf.borderSubtle}` }}>
                No changes yet. Add an endorsement or cancellation below.
              </p>
            )}
            {changes.map((chg, i) => (
              <ChangeRow
                key={i} chg={chg} idx={i}
                onChange={(k, v) => updateChange(i, k, v)}
                onRemove={() => removeChange(i)}
              />
            ))}
          </div>

          <button
            onClick={addChange}
            className="mt-4 flex items-center gap-2 text-sm font-semibold transition-colors"
            style={{ color: bf.accentPrimary }}
            onMouseEnter={e => e.currentTarget.style.color = bf.accentDark}
            onMouseLeave={e => e.currentTarget.style.color = bf.accentPrimary}
          >
            <span className="w-5 h-5 rounded-full border border-current flex items-center justify-center text-xs leading-none">+</span>
            Add Policy Change
          </button>
        </div>

        {/* ── Section 3: Payments Received ──────────────────────────────────── */}
        <div className="rounded-2xl p-6 mb-5"
          style={{ backgroundColor: '#ffffff', border: `1px solid ${bf.accentSoft}`, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <SectionHeader icon="💳" title="Payments Received" subtitle="Record payments collected from the customer. Applied in chronological order to billing events." />

          <div className="space-y-3">
            {payments.length === 0 && (
              <p className="text-sm text-center py-4 rounded-xl"
                style={{ color: bf.textMuted, border: `1px dashed ${bf.borderSubtle}` }}>
                No payments entered. Add received payments below.
              </p>
            )}
            {payments.map((pay, i) => (
              <PaymentRow
                key={i} pay={pay} idx={i}
                onChange={(k, v) => updatePayment(i, k, v)}
                onRemove={() => removePayment(i)}
              />
            ))}
          </div>

          <button
            onClick={addPayment}
            className="mt-4 flex items-center gap-2 text-sm font-semibold transition-colors"
            style={{ color: bf.accentDark }}
            onMouseEnter={e => e.currentTarget.style.color = bf.accentPrimary}
            onMouseLeave={e => e.currentTarget.style.color = bf.accentDark}
          >
            <span className="w-5 h-5 rounded-full border border-current flex items-center justify-center text-xs leading-none">+</span>
            Add Payment Received
          </button>

          {payments.length > 0 && (
            <div className="mt-4 pt-4" style={{ borderTop: `1px solid ${bf.borderSubtle}` }}>
              <div className="flex justify-between text-sm">
                <span style={{ color: bf.textMuted }}>Total Payments Entered:</span>
                <span className="font-bold" style={{ color: bf.accentPrimary }}>
                  ${r2(payments.reduce((s, p) => s + (parseFloat(p.amount) || 0), 0)).toFixed(2)}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* ── Error ────────────────────────────────────────────────────────────── */}
        {error && (
          <div className="mb-4 rounded-xl px-4 py-3 text-sm"
            style={{ color: '#b91c1c', backgroundColor: '#fef2f2', border: '1px solid #fecaca' }}>
            {error}
          </div>
        )}

        {/* ── Submit ───────────────────────────────────────────────────────────── */}
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full font-bold py-4 px-6 rounded-full transition-all text-base tracking-wide border-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            fontFamily: bf.fontDisplay,
            backgroundColor: bf.accentPrimary,
            color: bf.textInverse,
            boxShadow: '0 4px 14px rgba(0,134,155,0.3)',
          }}
          onMouseEnter={e => { if (!loading) e.currentTarget.style.backgroundColor = bf.accentDark; }}
          onMouseLeave={e => { if (!loading) e.currentTarget.style.backgroundColor = bf.accentPrimary; }}
        >
          {loading ? 'Generating Ledger...' : 'Submit for Ledger'}
        </button>

        <p className="text-center text-xs mt-4" style={{ fontFamily: bf.fontBody, color: bf.textMuted }}>
          Generates a .xlsx file with Summary, Policy Ledger, and Customer Ledger tabs.
        </p>
      </div>
    </div>
  );
}

// ─── App Shell ────────────────────────────────────────────────────────────────
export default function CustomerLedgerApp() {
  const [authed, setAuthed] = useState(
    typeof sessionStorage !== 'undefined' && sessionStorage.getItem('ledger_auth') === 'true'
  );

  if (!authed) {
    return (
      <div>
        <BFWarningBanner />
        <AuthGate onSuccess={() => setAuthed(true)} />
        <BFWarningBanner />
      </div>
    );
  }

  return (
    <div>
      <BFWarningBanner />
      <LedgerForm />
      <BFWarningBanner />
    </div>
  );
}
