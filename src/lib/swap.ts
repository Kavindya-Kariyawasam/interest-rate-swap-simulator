/**
 * Plain vanilla interest rate swap engine.
 * Pure, framework-free functions. All rates passed in are annual percentages
 * (e.g. 5 means 5%) unless a name ends in "Decimal". Full precision is kept in
 * every calculation; rounding happens only at display time.
 */

export type Frequency = 1 | 2 | 4 | 12;
export type Position = "payFixed" | "receiveFixed";
export type ScenarioKind = "flat" | "rising" | "falling" | "volatile" | "custom";
export type GeneratedScenarioKind = Exclude<ScenarioKind, "custom">;
export type UserAction = "pays" | "receives" | "none";
export type FlowDirection = "floatingPaysFixed" | "fixedPaysFloating" | "none";

export const FREQUENCIES: readonly Frequency[] = [1, 2, 4, 12];

export const FREQUENCY_LABELS: Record<Frequency, string> = {
  1: "Annual",
  2: "Semi-annual",
  4: "Quarterly",
  12: "Monthly",
};

/** Net amounts smaller than this (in currency units) are treated as zero. */
const ZERO_TOLERANCE = 1e-6;

export interface SwapInputs {
  notional: number;
  fixedRatePct: number;
  tenorYears: number;
  frequency: Frequency;
  position: Position;
  /** Floating index rate per period, annual %, before the spread. */
  floatingIndexPct: number[];
  spreadBps: number;
  /** Flat annual discount rate % used for the optional valuation. */
  discountRatePct: number;
}

export interface Period {
  index: number;
  startYear: number;
  endYear: number;
  startMonth: number;
  endMonth: number;
}

export interface CashFlowRow extends Period {
  /** Index + spread, annual %. */
  floatingRatePct: number;
  fixedPayment: number;
  floatingPayment: number;
  /** Net amount received (+) or paid (-) by the fixed-rate payer. */
  netToFixedPayer: number;
  /** Net amount received (+) or paid (-) by the user's chosen position. */
  net: number;
  cumulativeNet: number;
  userAction: UserAction;
  direction: FlowDirection;
}

export interface SwapTotals {
  totalFixed: number;
  totalFloating: number;
  totalNet: number;
  averageFloatingRatePct: number;
  breakEvenFloatingRatePct: number;
  periodsPaying: number;
  periodsReceiving: number;
}

export interface SwapResult {
  rows: CashFlowRow[];
  totals: SwapTotals;
}

export interface ValuationResult {
  discountFactors: number[];
  /** PV of the user's net settlements. */
  presentValue: number;
  /** PV of the fixed leg payments (positive amount). */
  pvFixedLeg: number;
  /** PV of the floating leg payments (positive amount). */
  pvFloatingLeg: number;
  parRatePct: number;
  /** Fixed rate minus par rate, in percentage points. */
  fixedMinusParPct: number;
}

export interface ScenarioParams {
  kind: GeneratedScenarioKind;
  periods: number;
  startPct: number;
  endPct: number;
  seed: number;
  /** Standard deviation of the per-period random step, in percentage points. */
  volatilityPct: number;
}

export type FieldErrors = Record<string, string>;

// Number of periods: n = tenor * frequency
export function periodCount(tenorYears: number, frequency: Frequency): number {
  return tenorYears * frequency;
}

// Year fraction per period: tau = 1 / frequency (simple convention)
export function yearFraction(frequency: Frequency): number {
  return 1 / frequency;
}

/** Period i spans months (i-1)*12/f to i*12/f, i.e. years (i-1)/f to i/f. */
export function generateSchedule(tenorYears: number, frequency: Frequency): Period[] {
  const n = periodCount(tenorYears, frequency);
  const monthsPerPeriod = 12 / frequency;
  const tau = yearFraction(frequency);
  return Array.from({ length: n }, (_, k) => ({
    index: k + 1,
    startYear: k * tau,
    endYear: (k + 1) * tau,
    startMonth: k * monthsPerPeriod,
    endMonth: (k + 1) * monthsPerPeriod,
  }));
}

/** Deterministic mulberry32 generator returning uniform values in [0, 1). */
export function createRng(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Standard normal draw from two uniforms (Box-Muller transform). */
function gaussian(rng: () => number): number {
  const u1 = 1 - rng(); // in (0, 1], avoids log(0)
  const u2 = rng();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

/** Removes binary floating-point noise (1e-6 percentage points) from generated rates. */
function tidy(ratePct: number): number {
  return Math.round(ratePct * 1e6) / 1e6;
}

export function generateScenario(params: ScenarioParams): number[] {
  const { kind, periods, startPct, endPct, seed, volatilityPct } = params;
  switch (kind) {
    case "flat":
      return Array.from({ length: periods }, () => tidy(startPct));
    case "rising":
    case "falling":
      // L_i = start + (end - start) * i / (n - 1), i = 0..n-1
      return Array.from({ length: periods }, (_, i) =>
        tidy(periods === 1 ? startPct : startPct + ((endPct - startPct) * i) / (periods - 1)),
      );
    case "volatile": {
      // L_0 = start; L_i = max(0, L_{i-1} + volatility * Z_i), Z_i ~ N(0, 1)
      const rng = createRng(seed);
      const path: number[] = [];
      let level = Math.max(0, startPct);
      for (let i = 0; i < periods; i++) {
        if (i > 0) level = Math.max(0, level + volatilityPct * gaussian(rng));
        path.push(tidy(level));
      }
      return path;
    }
  }
}

function sideSign(position: Position): 1 | -1 {
  return position === "payFixed" ? 1 : -1;
}

export function computeSwap(inputs: SwapInputs): SwapResult {
  const { notional, fixedRatePct, tenorYears, frequency, position, floatingIndexPct, spreadBps } =
    inputs;
  const schedule = generateSchedule(tenorYears, frequency);
  const tau = yearFraction(frequency);
  const fixedRate = fixedRatePct / 100;
  const sign = sideSign(position);

  // Fixed payment_i = N * K * tau
  const fixedPayment = notional * fixedRate * tau;

  let cumulativeNet = 0;
  const rows: CashFlowRow[] = schedule.map((period, k) => {
    // Floating rate_i = index_i + spread (set at period start, paid at period end)
    const floatingRatePct = floatingIndexPct[k] + spreadBps / 100;
    // Floating payment_i = N * L_i * tau
    const floatingPayment = notional * (floatingRatePct / 100) * tau;
    // Net to fixed payer_i = Floating payment_i - Fixed payment_i = N * (L_i - K) * tau
    const netToFixedPayer = floatingPayment - fixedPayment;
    // Fixed receiver's net is the exact opposite of the fixed payer's net
    const net = sign * netToFixedPayer;
    // Cumulative net_i = sum of net_j for j <= i
    cumulativeNet += net;

    const direction: FlowDirection =
      Math.abs(netToFixedPayer) < ZERO_TOLERANCE
        ? "none"
        : netToFixedPayer > 0
          ? "floatingPaysFixed"
          : "fixedPaysFloating";
    const userAction: UserAction =
      Math.abs(net) < ZERO_TOLERANCE ? "none" : net > 0 ? "receives" : "pays";

    return {
      ...period,
      floatingRatePct,
      fixedPayment,
      floatingPayment,
      netToFixedPayer,
      net,
      cumulativeNet,
      userAction,
      direction,
    };
  });

  const n = rows.length;
  const totalFloating = rows.reduce((sum, r) => sum + r.floatingPayment, 0);
  return {
    rows,
    totals: {
      totalFixed: fixedPayment * n,
      totalFloating,
      totalNet: cumulativeNet,
      averageFloatingRatePct: n === 0 ? 0 : rows.reduce((s, r) => s + r.floatingRatePct, 0) / n,
      breakEvenFloatingRatePct: fixedRatePct,
      periodsPaying: rows.filter((r) => r.userAction === "pays").length,
      periodsReceiving: rows.filter((r) => r.userAction === "receives").length,
    },
  };
}

/** Optional, illustrative valuation on a flat curve using the simulated floating path. */
export function computeValuation(inputs: SwapInputs, result: SwapResult): ValuationResult {
  const { frequency, discountRatePct, fixedRatePct } = inputs;
  const n = result.rows.length;
  const tau = yearFraction(frequency);

  // DF_i = 1 / (1 + r / f)^i
  const discountFactors = result.rows.map(
    (row) => 1 / Math.pow(1 + discountRatePct / 100 / frequency, row.index),
  );
  const sumDf = discountFactors.reduce((s, df) => s + df, 0);

  // PV = sum of net_i * DF_i
  const presentValue = result.rows.reduce((s, row, k) => s + row.net * discountFactors[k], 0);
  const pvFixedLeg = result.rows.reduce((s, row, k) => s + row.fixedPayment * discountFactors[k], 0);
  const pvFloatingLeg = result.rows.reduce(
    (s, row, k) => s + row.floatingPayment * discountFactors[k],
    0,
  );

  // K_par = (1 - DF_n) / (tau * sum of DF_i)
  const parRate = (1 - discountFactors[n - 1]) / (tau * sumDf);

  return {
    discountFactors,
    presentValue,
    pvFixedLeg,
    pvFloatingLeg,
    parRatePct: parRate * 100,
    fixedMinusParPct: fixedRatePct - parRate * 100,
  };
}

const CSV_HEADER = [
  "Period",
  "Start (months)",
  "End (months)",
  "Floating rate (%)",
  "Fixed payment",
  "Floating payment",
  "Net settlement",
  "Who pays whom",
  "Cumulative net",
];

export function describeFlow(direction: FlowDirection): string {
  switch (direction) {
    case "floatingPaysFixed":
      return "Floating payer pays fixed payer";
    case "fixedPaysFloating":
      return "Fixed payer pays floating payer";
    case "none":
      return "No payment";
  }
}

function csvCell(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

export function toCsv(result: SwapResult): string {
  const lines = result.rows.map((r) =>
    [
      String(r.index),
      String(r.startMonth),
      String(r.endMonth),
      r.floatingRatePct.toFixed(4),
      r.fixedPayment.toFixed(2),
      r.floatingPayment.toFixed(2),
      r.net.toFixed(2),
      describeFlow(r.direction),
      r.cumulativeNet.toFixed(2),
    ].map(csvCell),
  );
  const t = result.totals;
  lines.push(
    [
      "Total",
      "",
      "",
      t.averageFloatingRatePct.toFixed(4),
      t.totalFixed.toFixed(2),
      t.totalFloating.toFixed(2),
      t.totalNet.toFixed(2),
      "",
      t.totalNet.toFixed(2),
    ].map(csvCell),
  );
  return [CSV_HEADER.map(csvCell), ...lines].map((cells) => cells.join(",")).join("\r\n");
}

function isIntegerInRange(value: number, min: number, max: number): boolean {
  return Number.isInteger(value) && value >= min && value <= max;
}

export function validateInputs(inputs: SwapInputs): FieldErrors {
  const errors: FieldErrors = {};
  if (!Number.isFinite(inputs.notional) || inputs.notional <= 0) {
    errors.notional = "Notional must be a number greater than 0.";
  }
  if (!Number.isFinite(inputs.fixedRatePct) || inputs.fixedRatePct < 0 || inputs.fixedRatePct > 100) {
    errors.fixedRate = "Fixed rate must be between 0 and 100.";
  }
  if (!isIntegerInRange(inputs.tenorYears, 1, 30)) {
    errors.tenor = "Tenor must be a whole number of years from 1 to 30.";
  }
  if (!Number.isFinite(inputs.spreadBps) || inputs.spreadBps < -1000 || inputs.spreadBps > 1000) {
    errors.spread = "Spread must be between -1000 and 1000 bps.";
  }
  if (
    !Number.isFinite(inputs.discountRatePct) ||
    inputs.discountRatePct < 0 ||
    inputs.discountRatePct > 100
  ) {
    errors.discount = "Discount rate must be between 0 and 100.";
  }
  inputs.floatingIndexPct.forEach((rate, i) => {
    if (!Number.isFinite(rate) || rate < 0 || rate > 100) {
      errors[`rate-${i}`] = "Rate must be between 0 and 100.";
    }
  });
  return errors;
}

export function validateScenarioParams(
  params: Omit<ScenarioParams, "periods">,
): FieldErrors {
  const errors: FieldErrors = {};
  const inRange = (v: number) => Number.isFinite(v) && v >= 0 && v <= 100;
  if (!inRange(params.startPct)) errors.startRate = "Start rate must be between 0 and 100.";
  if (params.kind === "rising" || params.kind === "falling") {
    if (!inRange(params.endPct)) errors.endRate = "End rate must be between 0 and 100.";
  }
  if (params.kind === "volatile") {
    if (!Number.isInteger(params.seed) || params.seed < 0 || params.seed > 4294967295) {
      errors.seed = "Seed must be a whole number from 0 to 4294967295.";
    }
    if (!Number.isFinite(params.volatilityPct) || params.volatilityPct < 0 || params.volatilityPct > 20) {
      errors.volatility = "Volatility must be between 0 and 20 percentage points.";
    }
  }
  return errors;
}
