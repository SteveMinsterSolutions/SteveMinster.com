import { useState } from 'react';

// ─── Constants ────────────────────────────────────────────────────────────────
const PASSCODE = 'Ledg3r43lb@';

const STATE_TAXES = {
  AK:   { taxRate: 0.027,   secondary: 0,       secondaryType: 'Filing Fee',             rounding: 'penny', flatFee: false },
  AL:   { taxRate: 0.06,    secondary: 0,       secondaryType: null,                     rounding: 'penny', flatFee: false },
  AR:   { taxRate: 0.04,    secondary: 0,       secondaryType: null,                     rounding: 'penny', flatFee: false },
  AZ:   { taxRate: 0.03,    secondary: 0,       secondaryType: 'Stamping Fee',           rounding: 'penny', flatFee: false },
  CA:   { taxRate: 0.03,    secondary: 0.0018,  secondaryType: 'Stamping Fee',           rounding: 'penny', flatFee: false },
  CO:   { taxRate: 0.03,    secondary: 0.00175, secondaryType: 'SLAS Clearinghouse Fee', rounding: 'penny', flatFee: false },
  CT:   { taxRate: 0.04,    secondary: 0,       secondaryType: null,                     rounding: 'penny', flatFee: false },
  DC:   { taxRate: 0.03,    secondary: 0,       secondaryType: null,                     rounding: 'penny', flatFee: false },
  DE:   { taxRate: 0.04,    secondary: 0,       secondaryType: null,                     rounding: 'penny', flatFee: false },
  FL:   { taxRate: 0.05,    secondary: 0,       secondaryType: null,                     rounding: 'penny', flatFee: false },
  GA:   { taxRate: 0.04,    secondary: 0,       secondaryType: null,                     rounding: 'penny', flatFee: false },
  HI:   { taxRate: 0.0468,  secondary: 0,       secondaryType: null,                     rounding: 'penny', flatFee: false },
  IA:   { taxRate: 0.01,    secondary: 0,       secondaryType: null,                     rounding: 'penny', flatFee: false },
  ID:   { taxRate: 0.015,   secondary: 0,       secondaryType: 'Stamping Fee',           rounding: 'dollar', flatFee: false },
  IL:   { taxRate: 0.045,   secondary: 0,       secondaryType: 'Stamping Fee',           rounding: 'dollar', flatFee: false },
  IN:   { taxRate: 0.025,   secondary: 0,       secondaryType: null,                     rounding: 'penny', flatFee: false },
  KS:   { taxRate: 0.03,    secondary: 0,       secondaryType: null,                     rounding: 'penny', flatFee: false },
  KY:   { taxRate: 0.048,   secondary: 0,       secondaryType: null,                     rounding: 'penny', flatFee: false },
  LA:   { taxRate: 0.0485,  secondary: 0,       secondaryType: null,                     rounding: 'penny', flatFee: false },
  MA:   { taxRate: 0.04,    secondary: 0,       secondaryType: null,                     rounding: 'penny', flatFee: false },
  MD:   { taxRate: 0.03,    secondary: 0,       secondaryType: null,                     rounding: 'penny', flatFee: false },
  ME:   { taxRate: 0.03,    secondary: 0,       secondaryType: null,                     rounding: 'penny', flatFee: false },
  MI:   { taxRate: 0.025,   secondary: 0,       secondaryType: null,                     rounding: 'penny', flatFee: false },
  MN:   { taxRate: 0.03,    secondary: 0,       secondaryType: 'Stamping Fee',           rounding: 'penny', flatFee: false },
  MO:   { taxRate: 0.05,    secondary: 0,       secondaryType: null,                     rounding: 'penny', flatFee: false },
  MS:   { taxRate: 0.07,    secondary: 0,       secondaryType: 'Stamping Fee',           rounding: 'penny', flatFee: false },
  MT:   { taxRate: 0.0275,  secondary: 0,       secondaryType: null,                     rounding: 'penny', flatFee: false },
  NC:   { taxRate: 0.05,    secondary: 0,       secondaryType: 'Stamping Fee',           rounding: 'penny', flatFee: false },
  ND:   { taxRate: 0.0175,  secondary: 0,       secondaryType: null,                     rounding: 'penny', flatFee: false },
  NE:   { taxRate: 0.03,    secondary: 0,       secondaryType: null,                     rounding: 'penny', flatFee: false },
  NH:   { taxRate: 0.03,    secondary: 0,       secondaryType: null,                     rounding: 'penny', flatFee: false },
  NJ:   { taxRate: 0.05,    secondary: 0,       secondaryType: null,                     rounding: 'penny', flatFee: false },
  NM:   { taxRate: 0.03003, secondary: 0,       secondaryType: null,                     rounding: 'penny', flatFee: false },
  NV:   { taxRate: 0.035,   secondary: 0,       secondaryType: 'Stamping Fee',           rounding: 'penny', flatFee: false },
  NY:   { taxRate: 0.036,   secondary: 0,       secondaryType: 'Stamping Fee',           rounding: 'dollar', flatFee: false },
  OH:   { taxRate: 0.05,    secondary: 0,       secondaryType: null,                     rounding: 'penny', flatFee: false },
  OK:   { taxRate: 0.06,    secondary: 0,       secondaryType: null,                     rounding: 'penny', flatFee: false },
  OR:   { taxRate: 0.023,   secondary: 10,      secondaryType: 'Filing Fee',             rounding: 'penny', flatFee: true  },
  PA:   { taxRate: 0.03,    secondary: 20,      secondaryType: 'Filing Fee',             rounding: 'penny', flatFee: true  },
  PR:   { taxRate: 0.09,    secondary: 0,       secondaryType: null,                     rounding: 'penny', flatFee: false },
  RI:   { taxRate: 0.04,    secondary: 0,       secondaryType: null,                     rounding: 'penny', flatFee: false },
  SC:   { taxRate: 0.06,    secondary: 0,       secondaryType: null,                     rounding: 'penny', flatFee: false },
  SD:   { taxRate: 0.025,   secondary: 0.00175, secondaryType: 'SLAS Clearinghouse Fee', rounding: 'penny', flatFee: false },
  TN:   { taxRate: 0.05,    secondary: 0.00175, secondaryType: 'SLAS Clearinghouse Fee', rounding: 'penny', flatFee: false },
  TX:   { taxRate: 0.0485,  secondary: 0,       secondaryType: 'Stamping Fee',           rounding: 'penny', flatFee: false },
  UT:   { taxRate: 0.0425,  secondary: 0,       secondaryType: 'Stamping Fee',           rounding: 'penny', flatFee: false },
  USVI: { taxRate: 0.05,    secondary: 0,       secondaryType: null,                     rounding: 'penny', flatFee: false },
  VA:   { taxRate: 0.0225,  secondary: 0,       secondaryType: null,                     rounding: 'penny', flatFee: false },
  VT:   { taxRate: 0.03,    secondary: 0,       secondaryType: null,                     rounding: 'penny', flatFee: false },
  WA:   { taxRate: 0.02,    secondary: 0,       secondaryType: 'Stamping Fee',           rounding: 'penny', flatFee: false },
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
    'Technology Fee 1 (vQuip)', 'Technology Fee 2', 'Technology Fee 3',
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
    let accInstPrem     = 0;

    for (let i = 1; i <= planObj.installments; i++) {
      const isLast    = i === planObj.installments;
      const instPrem  = isLast ? r2(remainingPrem - accInstPrem) : instPremBase;
      accInstPrem     = r2(accInstPrem + instPremBase);

      const instEffDate  = addMonthsToDate(form.policyEffDate, i);
      const instInvId    = `${form.policyNumber}-INST${i}`;
      const instLabel    = `Installment ${i}`;

      // PremiumBilled
      clRows.push([
        ...baseFields(0, 0, 0, 0, instEffDate, addMonthsToDate(form.policyEffDate, i - 1)),
        instLabel, form.payPlan, planObj.downPct,
        instInvId, 'PremiumBilled',
        instEffDate, addMonthsToDate(form.policyEffDate, i - 1),
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
        premBal  = r2(premBal - instCollected);
        totalBal = r2(totalBal - instCollected);
      }

      clRows.push([
        ...baseFields(0, 0, 0, 0, instEffDate, instPay ? toJSDate(instPay.date) : instEffDate),
        instLabel, form.payPlan, planObj.downPct,
        instPay ? instPay.invoiceNumber || instInvId : instInvId,
        'PremiumCollected',
        instEffDate, instPay ? toJSDate(instPay.date) : instEffDate,
        0, instPay ? -instCollected : 0, premBal,
        0, 0, taxBal,
        0, 0, stampBal,
        0, 0, feeBal,
        0, 0, 0,
        0, 0, 0,
        0, instPay ? -instCollected : 0, totalBal,
      ]);
    }
  }

  // ── Policy Change Rows ────────────────────────────────────────────────────────
  form.changes.forEach((chg, idx) => {
    const chgPrem  = r2(parseFloat(chg.premiumImpact) || 0);
    const { surplusTax: cTax, stampingFee: cStamp } = calcTaxes(chgPrem, form.policyState, isSL);
    const chgTotal = r2(chgPrem + cTax + cStamp);
    const chgEffDate  = toJSDate(chg.changeEffDate);
    const chgTypeLabel = chg.changeType;
    const isCancOrCredit = chgTotal < 0;

    const suffix = chg.changeType === 'Cancellation'
      ? `CANC${idx + 1}`
      : `ENDR${idx + 1}`;
    const chgInvId = `${form.policyNumber}-${suffix}`;

    // Record row — update running exposure
    premBal  = r2(premBal + chgPrem);
    taxBal   = r2(taxBal + cTax);
    stampBal = r2(stampBal + cStamp);
    if (isCancOrCredit) totalBal = r2(totalBal + chgTotal); // refunds reduce balance immediately

    clRows.push([
      ...baseFields(chgPrem, cTax, cStamp, 0, chgEffDate, chgEffDate),
      chgTypeLabel, form.payPlan, planObj.downPct,
      null, `${chgTypeLabel} Issued`,
      chgEffDate, chgEffDate,
      0, 0, premBal,
      0, 0, taxBal,
      0, 0, stampBal,
      0, 0, feeBal,
      0, 0, 0,
      0, 0, 0,
      0, 0, totalBal,
    ]);

    // PremiumBilled
    clRows.push([
      ...baseFields(0, 0, 0, 0, chgEffDate, chgEffDate),
      chgTypeLabel, form.payPlan, planObj.downPct,
      chgInvId, 'PremiumBilled',
      chgEffDate, chgEffDate,
      chgPrem > 0 ? chgPrem : 0, 0, premBal,
      cTax > 0 ? cTax : 0, 0, taxBal,
      cStamp > 0 ? cStamp : 0, 0, stampBal,
      0, 0, feeBal,
      0, 0, 0,
      0, 0, 0,
      chgTotal > 0 ? chgTotal : 0, 0, totalBal,
    ]);

    // PremiumCollected
    const chgPay = !isCancOrCredit ? nextPayment() : null;
    const chgCollected = chgPay ? r2(parseFloat(chgPay.amount)) : 0;
    if (chgPay) {
      premBal  = r2(premBal - chgCollected);
      totalBal = r2(totalBal - chgCollected);
    }

    clRows.push([
      ...baseFields(0, 0, 0, 0, chgEffDate, chgPay ? toJSDate(chgPay.date) : chgEffDate),
      chgTypeLabel, form.payPlan, planObj.downPct,
      chgPay ? chgPay.invoiceNumber || chgInvId : chgInvId,
      'PremiumCollected',
      chgEffDate, chgPay ? toJSDate(chgPay.date) : chgEffDate,
      0, chgPay ? -chgCollected : (isCancOrCredit ? chgPrem : 0), premBal,
      0, isCancOrCredit ? cTax : 0, taxBal,
      0, isCancOrCredit ? cStamp : 0, stampBal,
      0, 0, feeBal,
      0, 0, 0,
      0, 0, 0,
      0, isCancOrCredit ? chgTotal : (chgPay ? -chgCollected : 0), totalBal,
    ]);
  });

  // Any remaining unmatched payments
  while (payIdx < payQueue.length) {
    const p = payQueue[payIdx++];
    const amt = r2(parseFloat(p.amount));
    premBal  = r2(premBal - amt);
    totalBal = r2(totalBal - amt);
    clRows.push([
      '', form.policyNumber, form.customerName,
      0, 0, 0, 0, 0, 0,
      toJSDate(form.policyEffDate), policyExpDate,
      toJSDate(p.date), toJSDate(p.date),
      'Payment Applied', form.payPlan, planObj.downPct,
      p.invoiceNumber || '', 'PremiumCollected',
      toJSDate(p.date), toJSDate(p.date),
      0, -amt, premBal,
      0, 0, taxBal,
      0, 0, stampBal,
      0, 0, feeBal,
      0, 0, 0,
      0, 0, 0,
      0, -amt, totalBal,
    ]);
  }

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
    ['vQuip Technology Fee', totalFeeBilled, '', totalFeeBilled],
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

// ─── Shared Input Styles ──────────────────────────────────────────────────────
const inputCls  = 'w-full bg-[#0D1B35] border border-[#2D7DD2]/40 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#2D7DD2] focus:ring-1 focus:ring-[#2D7DD2] placeholder-white/30';
const selectCls = `${inputCls} cursor-pointer`;
const labelCls  = 'block text-xs font-semibold uppercase tracking-widest text-[#97D700] mb-1';

// ─── Sub-components ───────────────────────────────────────────────────────────
function FormField({ label, children }) {
  return (
    <div>
      <label className={labelCls}>{label}</label>
      {children}
    </div>
  );
}

function SectionHeader({ icon, title, subtitle }) {
  return (
    <div className="flex items-start gap-3 mb-5">
      <div className="w-8 h-8 rounded-lg bg-[#2D7DD2]/20 border border-[#2D7DD2]/30 flex items-center justify-center flex-shrink-0 mt-0.5">
        <span className="text-[#2D7DD2] text-sm">{icon}</span>
      </div>
      <div>
        <h3 className="text-white font-semibold text-base leading-tight">{title}</h3>
        {subtitle && <p className="text-white/40 text-xs mt-0.5">{subtitle}</p>}
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
    <div className="min-h-screen bg-[#0B1525] flex items-center justify-center px-4">
      {/* Background grid */}
      <div className="fixed inset-0 opacity-5 pointer-events-none"
        style={{
          backgroundImage: 'linear-gradient(#2D7DD2 1px, transparent 1px), linear-gradient(90deg, #2D7DD2 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }} />
      <div className="relative z-10 w-full max-w-md">
        {/* Logo / Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#2D7DD2] to-[#1B2A4A] border border-[#2D7DD2]/40 flex items-center justify-center">
              <span className="text-[#97D700] font-bold text-lg" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>L</span>
            </div>
            <span className="text-white/60 text-sm tracking-widest uppercase font-medium" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>vQuip</span>
          </div>
          <h1 className="text-2xl font-bold text-white mb-1" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
            Customer Ledger
          </h1>
          <p className="text-white/40 text-sm">Authorized access only</p>
        </div>

        {/* Card */}
        <div className="bg-[#1B2A4A]/80 border border-[#2D7DD2]/20 rounded-2xl p-8 backdrop-blur-sm">
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
            />
          </FormField>

          {error && (
            <p className="mt-3 text-red-400 text-xs bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <button
            onClick={handleSubmit}
            className="mt-5 w-full bg-[#2D7DD2] hover:bg-[#2D7DD2]/80 text-white font-semibold py-2.5 px-4 rounded-lg transition-all text-sm tracking-wide"
            style={{ fontFamily: 'Space Grotesk, sans-serif' }}
          >
            Access Ledger Tool →
          </button>
        </div>

        <p className="text-center text-white/20 text-xs mt-6" style={{ fontFamily: 'Inter, sans-serif' }}>
          This tool is for authorized vQuip accounting team use only.
        </p>
      </div>
    </div>
  );
}

// ─── Change Row ───────────────────────────────────────────────────────────────
function ChangeRow({ chg, idx, onChange, onRemove }) {
  return (
    <div className="bg-[#0D1B35]/60 border border-[#2D7DD2]/20 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[#97D700] text-xs font-bold uppercase tracking-widest">
          Change #{idx + 1}
        </span>
        <button
          onClick={onRemove}
          className="text-white/30 hover:text-red-400 transition-colors text-xs"
        >
          ✕ Remove
        </button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <FormField label="Change Type">
          <select value={chg.changeType} onChange={e => onChange('changeType', e.target.value)} className={selectCls}>
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
          />
        </FormField>
        <FormField label="Change Effective Date">
          <input
            type="date"
            value={chg.changeEffDate}
            onChange={e => onChange('changeEffDate', e.target.value)}
            className={inputCls}
          />
        </FormField>
      </div>
    </div>
  );
}

// ─── Payment Row ──────────────────────────────────────────────────────────────
function PaymentRow({ pay, idx, onChange, onRemove }) {
  return (
    <div className="bg-[#0D1B35]/60 border border-[#97D700]/20 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[#97D700] text-xs font-bold uppercase tracking-widest">
          Payment #{idx + 1}
        </span>
        <button
          onClick={onRemove}
          className="text-white/30 hover:text-red-400 transition-colors text-xs"
        >
          ✕ Remove
        </button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <FormField label="Payment Received Date">
          <input
            type="date"
            value={pay.date}
            onChange={e => onChange('date', e.target.value)}
            className={inputCls}
          />
        </FormField>
        <FormField label="Invoice Number">
          <input
            type="text"
            value={pay.invoiceNumber}
            onChange={e => onChange('invoiceNumber', e.target.value)}
            placeholder="e.g. in_1SfPSO..."
            className={inputCls}
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
    <div className="mt-3 bg-[#0D1B35]/60 border border-[#97D700]/20 rounded-lg p-3 text-xs">
      <p className="text-[#97D700] font-semibold uppercase tracking-widest mb-2">Tax Preview — {state}</p>
      <p className="text-white/60">Not a surplus lines policy — no SL taxes or stamping fees apply.</p>
    </div>
  );
  const { surplusTax, stampingFee } = calcTaxes(p, state, true);
  const sd = STATE_TAXES[state];
  return (
    <div className="mt-3 bg-[#0D1B35]/60 border border-[#97D700]/20 rounded-lg p-3 text-xs">
      <p className="text-[#97D700] font-semibold uppercase tracking-widest mb-2">Tax Preview — {state}</p>
      <div className="space-y-1 text-white/60">
        <div className="flex justify-between">
          <span>Surplus Lines Tax ({(sd.taxRate * 100).toFixed(4)}%)</span>
          <span className="text-white font-medium">${surplusTax.toFixed(2)}</span>
        </div>
        {stampingFee !== 0 && (
          <div className="flex justify-between">
            <span>{sd.secondaryType}{sd.flatFee ? ' (flat)' : ` (${(sd.secondary * 100).toFixed(4)}%)`}</span>
            <span className="text-white font-medium">${Math.abs(stampingFee).toFixed(2)}</span>
          </div>
        )}
        <div className="flex justify-between border-t border-white/10 pt-1 mt-1">
          <span className="text-white/80">Total Taxes & Fees</span>
          <span className="text-[#97D700] font-bold">${r2(surplusTax + stampingFee).toFixed(2)}</span>
        </div>
        <div className="text-white/30 mt-1">
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
    <div className="min-h-screen bg-[#0B1525] px-4 py-10" style={{ fontFamily: 'Inter, sans-serif' }}>
      {/* Background grid */}
      <div className="fixed inset-0 opacity-5 pointer-events-none"
        style={{
          backgroundImage: 'linear-gradient(#2D7DD2 1px, transparent 1px), linear-gradient(90deg, #2D7DD2 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }} />

      <div className="relative z-10 max-w-4xl mx-auto">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-[#97D700] text-xs font-bold uppercase tracking-widest">vQuip</span>
            <span className="text-white/20 text-xs">›</span>
            <span className="text-white/40 text-xs uppercase tracking-widest">Customer Ledger Tool</span>
          </div>
          <h1 className="text-3xl font-bold text-white" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
            Generate Policy Ledger
          </h1>
          <p className="text-white/40 text-sm mt-1">
            Enter policy details below to generate a downloadable Excel ledger with Summary, Policy Ledger, and Customer Ledger tabs.
          </p>
        </div>

        {/* ── Section 1: Policy Information ────────────────────────────────── */}
        <div className="bg-[#1B2A4A]/60 border border-[#2D7DD2]/20 rounded-2xl p-6 mb-5">
          <SectionHeader icon="📋" title="Policy Information" subtitle="Core policy details and initial billing setup" />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Customer Name *">
              <input type="text" value={form.customerName} onChange={e => setField('customerName', e.target.value)}
                placeholder="e.g. Acme Rentals LLC" className={inputCls} />
            </FormField>
            <FormField label="Policy Number *">
              <input type="text" value={form.policyNumber} onChange={e => setField('policyNumber', e.target.value)}
                placeholder="e.g. AABA30000001-00" className={inputCls} />
            </FormField>
            <FormField label="Policy Effective Date *">
              <input type="date" value={form.policyEffDate} onChange={e => setField('policyEffDate', e.target.value)}
                className={inputCls} />
            </FormField>
            <FormField label="Initial Annual Premium ($) *">
              <input type="number" step="0.01" min="0" value={form.initialPremium}
                onChange={e => setField('initialPremium', e.target.value)}
                placeholder="0.00" className={inputCls} />
            </FormField>
            <FormField label="Policy State *">
              <select value={form.policyState} onChange={e => setField('policyState', e.target.value)} className={selectCls}>
                {STATES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </FormField>
            <FormField label="vQuip Fee — Total ($) *">
              <input type="number" step="0.01" min="0" value={form.vquipFee}
                onChange={e => setField('vquipFee', e.target.value)}
                placeholder="0.00" className={inputCls} />
            </FormField>
            <FormField label="Initial Pay Plan *">
              <select value={form.payPlan} onChange={e => setField('payPlan', e.target.value)} className={selectCls}>
                {PAY_PLAN_OPTIONS.map(p => <option key={p.label} value={p.label}>{p.label}</option>)}
              </select>
            </FormField>
            <FormField label="Is the Policy Surplus Lines? *">
              <select value={form.isSurplusLines} onChange={e => setField('isSurplusLines', e.target.value)} className={selectCls}>
                <option value="Yes">Yes</option>
                <option value="No">No</option>
              </select>
            </FormField>
          </div>

          {/* Live tax preview */}
          <TaxPreview premium={form.initialPremium} state={form.policyState} isSurplusLines={form.isSurplusLines !== 'No'} />
        </div>

        {/* ── Section 2: Policy Changes ─────────────────────────────────────── */}
        <div className="bg-[#1B2A4A]/60 border border-[#2D7DD2]/20 rounded-2xl p-6 mb-5">
          <SectionHeader icon="📝" title="Policy Changes" subtitle="Endorsements and cancellations after the initial issuance" />

          <div className="space-y-3">
            {changes.length === 0 && (
              <p className="text-white/30 text-sm text-center py-4 border border-dashed border-white/10 rounded-xl">
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
            className="mt-4 flex items-center gap-2 text-[#2D7DD2] hover:text-[#97D700] text-sm font-semibold transition-colors"
          >
            <span className="w-5 h-5 rounded-full border border-current flex items-center justify-center text-xs leading-none">+</span>
            Add Policy Change
          </button>
        </div>

        {/* ── Section 3: Payments Received ──────────────────────────────────── */}
        <div className="bg-[#1B2A4A]/60 border border-[#97D700]/20 rounded-2xl p-6 mb-5">
          <SectionHeader icon="💳" title="Payments Received" subtitle="Record payments collected from the customer. Applied in chronological order to billing events." />

          <div className="space-y-3">
            {payments.length === 0 && (
              <p className="text-white/30 text-sm text-center py-4 border border-dashed border-white/10 rounded-xl">
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
            className="mt-4 flex items-center gap-2 text-[#97D700] hover:text-white text-sm font-semibold transition-colors"
          >
            <span className="w-5 h-5 rounded-full border border-current flex items-center justify-center text-xs leading-none">+</span>
            Add Payment Received
          </button>

          {payments.length > 0 && (
            <div className="mt-4 pt-4 border-t border-white/10">
              <div className="flex justify-between text-sm">
                <span className="text-white/50">Total Payments Entered:</span>
                <span className="text-[#97D700] font-bold">
                  ${r2(payments.reduce((s, p) => s + (parseFloat(p.amount) || 0), 0)).toFixed(2)}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* ── Error ────────────────────────────────────────────────────────────── */}
        {error && (
          <div className="mb-4 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* ── Submit ───────────────────────────────────────────────────────────── */}
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full bg-[#97D700] hover:bg-[#97D700]/90 disabled:opacity-50 disabled:cursor-not-allowed text-[#0B1525] font-bold py-4 px-6 rounded-xl transition-all text-base tracking-wide shadow-lg shadow-[#97D700]/20"
          style={{ fontFamily: 'Space Grotesk, sans-serif' }}
        >
          {loading ? '⏳ Generating Ledger...' : '⬇ Submit for Ledger'}
        </button>

        <p className="text-center text-white/20 text-xs mt-4" style={{ fontFamily: 'Inter, sans-serif' }}>
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
    return <AuthGate onSuccess={() => setAuthed(true)} />;
  }

  return <LedgerForm />;
}
