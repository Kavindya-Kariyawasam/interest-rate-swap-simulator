import {
  generateScenario,
  validateInputs,
  validateScenarioParams,
  type FieldErrors,
  type Frequency,
  type GeneratedScenarioKind,
  type Position,
  type ScenarioKind,
  type SwapInputs,
} from "./swap";

export type CurrencyCode = "USD" | "LKR" | "EUR" | "GBP";
export const CURRENCIES: readonly CurrencyCode[] = ["USD", "LKR", "EUR", "GBP"];

/** Raw form state: numeric fields stay strings so users can type freely. */
export interface FormState {
  notional: string;
  fixedRate: string;
  tenor: string;
  frequency: Frequency;
  position: Position;
  spread: string;
  /** Empty means "use the fixed rate". */
  discount: string;
  currency: CurrencyCode;
  scenario: ScenarioKind;
  startRate: string;
  endRate: string;
  seed: string;
  volatility: string;
  rates: string[];
}

export const WORKED_EXAMPLE: FormState = {
  notional: "10000000",
  fixedRate: "5",
  tenor: "2",
  frequency: 2,
  position: "payFixed",
  spread: "0",
  discount: "",
  currency: "USD",
  scenario: "rising",
  startRate: "4.5",
  endRate: "6",
  seed: "42",
  volatility: "0.5",
  rates: ["4.5", "5", "5.5", "6"],
};

export interface ParsedForm {
  inputs: SwapInputs | null;
  errors: FieldErrors;
}

function toNumber(raw: string): number {
  return raw.trim() === "" ? Number.NaN : Number(raw);
}

/** Valid period count for the form's tenor and frequency, or null while the tenor is invalid. */
function periodsOf(form: FormState): number | null {
  const tenor = toNumber(form.tenor);
  return Number.isInteger(tenor) && tenor >= 1 && tenor <= 30 ? tenor * form.frequency : null;
}

export function parseForm(form: FormState): ParsedForm {
  const fixedRatePct = toNumber(form.fixedRate);
  const inputs: SwapInputs = {
    notional: toNumber(form.notional),
    fixedRatePct,
    tenorYears: toNumber(form.tenor),
    frequency: form.frequency,
    position: form.position,
    floatingIndexPct: form.rates.map(toNumber),
    spreadBps: toNumber(form.spread),
    discountRatePct: form.discount.trim() === "" ? fixedRatePct : toNumber(form.discount),
  };
  const errors = validateInputs(inputs);
  if (form.discount.trim() === "" && errors.fixedRate) delete errors.discount;
  if (form.scenario !== "custom") {
    Object.assign(
      errors,
      validateScenarioParams({
        kind: form.scenario,
        startPct: toNumber(form.startRate),
        endPct: toNumber(form.endRate),
        seed: toNumber(form.seed),
        volatilityPct: toNumber(form.volatility),
      }),
    );
  }
  if (periodsOf(form) !== null && form.rates.length !== periodsOf(form)) {
    errors.rates = "Floating rates do not match the number of periods.";
  }
  return { inputs: Object.keys(errors).length === 0 ? inputs : null, errors };
}

function regenerateRates(form: FormState): string[] {
  const periods = periodsOf(form);
  if (periods === null) return form.rates;
  if (form.scenario === "custom") {
    // Keep what the user has; pad with the last value or truncate to the new length.
    const last = form.rates[form.rates.length - 1] ?? form.startRate;
    return Array.from({ length: periods }, (_, i) => form.rates[i] ?? last);
  }
  const kind: GeneratedScenarioKind = form.scenario;
  const params = {
    kind,
    startPct: toNumber(form.startRate),
    endPct: toNumber(form.endRate),
    seed: toNumber(form.seed),
    volatilityPct: toNumber(form.volatility),
  };
  if (Object.keys(validateScenarioParams(params)).length > 0) return form.rates;
  return generateScenario({ ...params, periods }).map(String);
}

const SCENARIO_FIELDS: (keyof FormState)[] = [
  "scenario",
  "tenor",
  "frequency",
  "startRate",
  "endRate",
  "seed",
  "volatility",
];

/** Applies a change and refreshes the floating rate path when the scenario or period count changes. */
export function updateForm(form: FormState, patch: Partial<FormState>): FormState {
  const next = { ...form, ...patch };
  if (patch.scenario === "rising" || patch.scenario === "falling") {
    const start = toNumber(next.startRate);
    const end = toNumber(next.endRate);
    const wrongWay = patch.scenario === "rising" ? start > end : start < end;
    if (wrongWay) {
      next.startRate = form.endRate;
      next.endRate = form.startRate;
    }
  }
  if (SCENARIO_FIELDS.some((key) => key in patch)) next.rates = regenerateRates(next);
  return next;
}
