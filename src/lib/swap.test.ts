import { describe, expect, it } from "vitest";
import {
  FREQUENCIES,
  computeSwap,
  computeValuation,
  generateScenario,
  generateSchedule,
  toCsv,
  validateInputs,
  type Frequency,
  type ScenarioParams,
  type SwapInputs,
} from "./swap";

const workedExample: SwapInputs = {
  notional: 10_000_000,
  fixedRatePct: 5,
  tenorYears: 2,
  frequency: 2,
  position: "payFixed",
  floatingIndexPct: [4.5, 5.0, 5.5, 6.0],
  spreadBps: 0,
  discountRatePct: 5,
};

const volatileParams: ScenarioParams = {
  kind: "volatile",
  periods: 40,
  startPct: 3,
  endPct: 3,
  seed: 42,
  volatilityPct: 1.5,
};

describe("worked example", () => {
  const { rows, totals } = computeSwap(workedExample);

  it("computes fixed and floating payments", () => {
    rows.forEach((r) => expect(r.fixedPayment).toBeCloseTo(250_000, 6));
    expect(rows.map((r) => r.floatingPayment)).toEqual([225_000, 250_000, 275_000, 300_000].map((v) => expect.closeTo(v, 6)));
  });

  it("computes net and cumulative settlements for the fixed payer", () => {
    expect(rows.map((r) => r.net)).toEqual([-25_000, 0, 25_000, 50_000].map((v) => expect.closeTo(v, 6)));
    expect(rows.map((r) => r.cumulativeNet)).toEqual([-25_000, -25_000, 0, 50_000].map((v) => expect.closeTo(v, 6)));
    expect(totals.totalNet).toBeCloseTo(50_000, 6);
  });

  it("labels who pays whom", () => {
    expect(rows.map((r) => r.userAction)).toEqual(["pays", "none", "receives", "receives"]);
    expect(rows[0].direction).toBe("fixedPaysFloating");
    expect(rows[1].direction).toBe("none");
    expect(rows[3].direction).toBe("floatingPaysFixed");
    expect(totals.periodsPaying).toBe(1);
    expect(totals.periodsReceiving).toBe(2);
    expect(totals.averageFloatingRatePct).toBeCloseTo(5.25, 9);
    expect(totals.breakEvenFloatingRatePct).toBe(5);
  });

  it("is reproduced exactly by the rising scenario 4.5% to 6.0%", () => {
    const path = generateScenario({ kind: "rising", periods: 4, startPct: 4.5, endPct: 6, seed: 1, volatilityPct: 0 });
    expect(path).toEqual([4.5, 5, 5.5, 6]);
  });
});

describe("positions", () => {
  it("receive-fixed is the exact negative of pay-fixed", () => {
    const pay = computeSwap(workedExample);
    const receive = computeSwap({ ...workedExample, position: "receiveFixed" });
    pay.rows.forEach((r, i) => {
      expect(receive.rows[i].net).toBeCloseTo(-r.net, 9);
      expect(receive.rows[i].cumulativeNet).toBeCloseTo(-r.cumulativeNet, 9);
      expect(receive.rows[i].netToFixedPayer).toBeCloseTo(r.netToFixedPayer, 9);
    });
    expect(receive.totals.totalNet).toBeCloseTo(-pay.totals.totalNet, 9);
  });

  it("flat floating equal to the fixed rate gives zero net", () => {
    const result = computeSwap({ ...workedExample, floatingIndexPct: [5, 5, 5, 5] });
    result.rows.forEach((r) => {
      expect(r.net).toBe(0);
      expect(r.userAction).toBe("none");
    });
    expect(result.totals.totalNet).toBe(0);
  });

  it("applies the spread to every floating rate", () => {
    const result = computeSwap({ ...workedExample, spreadBps: 50 });
    expect(result.rows[0].floatingRatePct).toBeCloseTo(5.0, 9);
    expect(result.rows[0].net).toBeCloseTo(0, 6);
  });
});

describe("schedule", () => {
  const expected: Record<Frequency, number> = { 1: 5, 2: 10, 4: 20, 12: 60 };

  it.each(FREQUENCIES)("has tenor x frequency periods for frequency %i", (frequency) => {
    const schedule = generateSchedule(5, frequency);
    expect(schedule).toHaveLength(expected[frequency]);
    expect(schedule[0].startYear).toBe(0);
    expect(schedule[schedule.length - 1].endYear).toBeCloseTo(5, 9);
    expect(schedule[0].endMonth - schedule[0].startMonth).toBe(12 / frequency);
  });
});

describe("valuation", () => {
  it.each(FREQUENCIES)("par rate gives zero net PV when floating equals the discount rate (frequency %i)", (frequency) => {
    const periods = 3 * frequency;
    const base: SwapInputs = {
      ...workedExample,
      tenorYears: 3,
      frequency,
      discountRatePct: 4.2,
      floatingIndexPct: Array<number>(periods).fill(4.2),
    };
    const parRate = computeValuation(base, computeSwap(base)).parRatePct;
    const atPar: SwapInputs = { ...base, fixedRatePct: parRate };
    const valuation = computeValuation(atPar, computeSwap(atPar));
    expect(valuation.presentValue).toBeCloseTo(0, 4);
    expect(valuation.pvFixedLeg).toBeCloseTo(valuation.pvFloatingLeg, 4);
    expect(parRate).toBeCloseTo(4.2, 9);
  });

  it("reports the fixed rate relative to par", () => {
    const valuation = computeValuation(workedExample, computeSwap(workedExample));
    expect(valuation.fixedMinusParPct).toBeCloseTo(workedExample.fixedRatePct - valuation.parRatePct, 12);
    expect(valuation.parRatePct).toBeCloseTo(5, 9);
  });

  it("handles a zero discount rate", () => {
    const inputs = { ...workedExample, discountRatePct: 0 };
    const valuation = computeValuation(inputs, computeSwap(inputs));
    expect(valuation.parRatePct).toBe(0);
    expect(valuation.presentValue).toBeCloseTo(50_000, 6);
  });
});

describe("scenarios", () => {
  it("is deterministic for a given seed and differs across seeds", () => {
    const a = generateScenario(volatileParams);
    const b = generateScenario(volatileParams);
    const c = generateScenario({ ...volatileParams, seed: 43 });
    expect(a).toEqual(b);
    expect(a).not.toEqual(c);
    expect(a).toHaveLength(40);
  });

  it("floors the random walk at zero", () => {
    const path = generateScenario({ ...volatileParams, startPct: 0.2, volatilityPct: 5, periods: 200 });
    expect(Math.min(...path)).toBeGreaterThanOrEqual(0);
    expect(path).toContain(0);
  });

  it("generates flat and falling paths", () => {
    expect(generateScenario({ ...volatileParams, kind: "flat", periods: 3, startPct: 4 })).toEqual([4, 4, 4]);
    expect(generateScenario({ ...volatileParams, kind: "falling", periods: 3, startPct: 6, endPct: 4 })).toEqual([6, 5, 4]);
  });
});

describe("validation and export", () => {
  it("flags invalid inputs without throwing", () => {
    const errors = validateInputs({
      ...workedExample,
      notional: 0,
      fixedRatePct: 101,
      tenorYears: 2.5,
      floatingIndexPct: [4.5, Number.NaN, 5.5, 6],
    });
    expect(Object.keys(errors).sort()).toEqual(["fixedRate", "notional", "rate-1", "tenor"]);
    expect(validateInputs(workedExample)).toEqual({});
  });

  it("exports a CSV with header, one row per period and a totals row", () => {
    const lines = toCsv(computeSwap(workedExample)).split("\r\n");
    expect(lines).toHaveLength(6);
    expect(lines[1]).toBe("1,0,6,4.5000,250000.00,225000.00,-25000.00,Fixed payer pays floating payer,-25000.00");
    expect(lines[5].startsWith("Total,")).toBe(true);
  });
});
