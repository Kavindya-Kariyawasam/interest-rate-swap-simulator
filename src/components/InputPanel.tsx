"use client";

import type { ReactNode } from "react";
import { CURRENCIES, type CurrencyCode, type FormState } from "@/lib/form";
import {
  FREQUENCIES,
  FREQUENCY_LABELS,
  type FieldErrors,
  type Frequency,
  type Position,
  type ScenarioKind,
} from "@/lib/swap";

interface InputPanelProps {
  form: FormState;
  errors: FieldErrors;
  onChange: (patch: Partial<FormState>) => void;
  onReset: () => void;
  onLoadExample: () => void;
}

const SCENARIOS: { value: ScenarioKind; label: string }[] = [
  { value: "flat", label: "Flat" },
  { value: "rising", label: "Rising" },
  { value: "falling", label: "Falling" },
  { value: "volatile", label: "Volatile" },
  { value: "custom", label: "Custom" },
];

const POSITIONS: { value: Position; label: string }[] = [
  { value: "payFixed", label: "Pay Fixed / Receive Floating" },
  { value: "receiveFixed", label: "Receive Fixed / Pay Floating" },
];

const inputClass =
  "w-full rounded-md border bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-600";

interface FieldProps {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  children: (describedBy: string | undefined) => ReactNode;
}

function Field({ id, label, error, hint, children }: FieldProps) {
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-medium text-slate-700">
        {label}
      </label>
      {children(describedBy)}
      {error ? (
        <p id={`${id}-error`} role="alert" className="mt-1 text-xs font-medium text-red-700">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="mt-1 text-xs text-slate-600">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

interface NumberFieldProps {
  id: string;
  label: string;
  value: string;
  error?: string;
  hint?: string;
  step?: string;
  placeholder?: string;
  onChange: (value: string) => void;
}

function NumberField({ id, label, value, error, hint, step = "any", placeholder, onChange }: NumberFieldProps) {
  return (
    <Field id={id} label={label} error={error} hint={hint}>
      {(describedBy) => (
        <input
          id={id}
          type="number"
          inputMode="decimal"
          step={step}
          value={value}
          placeholder={placeholder}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          onChange={(e) => onChange(e.target.value)}
          className={`${inputClass} ${error ? "border-red-600" : "border-slate-300"}`}
        />
      )}
    </Field>
  );
}

export function InputPanel({ form, errors, onChange, onReset, onLoadExample }: InputPanelProps) {
  const isGenerated = form.scenario !== "custom";
  const rateErrorCount = Object.keys(errors).filter((k) => k.startsWith("rate-")).length;

  // Editing any period switches to Custom and keeps the values currently shown.
  const setRate = (index: number, value: string) => {
    onChange({ scenario: "custom", rates: form.rates.map((r, i) => (i === index ? value : r)) });
  };

  return (
    <section aria-labelledby="inputs-heading" className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 id="inputs-heading" className="text-lg font-semibold text-slate-900">
          Swap inputs
        </h2>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onLoadExample}
            className="rounded-md bg-blue-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2"
          >
            Load worked example
          </button>
          <button
            type="button"
            onClick={onReset}
            className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-800 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2"
          >
            Reset
          </button>
        </div>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-2">
            <NumberField
              id="notional"
              label="Notional principal"
              value={form.notional}
              error={errors.notional}
              hint="Reference amount only. Never exchanged."
              onChange={(notional) => onChange({ notional })}
            />
          </div>
          <Field id="currency" label="Currency">
            {() => (
              <select
                id="currency"
                value={form.currency}
                onChange={(e) => onChange({ currency: e.target.value as CurrencyCode })}
                className={`${inputClass} border-slate-300`}
              >
                {CURRENCIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            )}
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <NumberField
            id="fixedRate"
            label="Fixed rate K (% per year)"
            value={form.fixedRate}
            error={errors.fixedRate}
            step="0.01"
            onChange={(fixedRate) => onChange({ fixedRate })}
          />
          <NumberField
            id="tenor"
            label="Tenor (years, 1 to 30)"
            value={form.tenor}
            error={errors.tenor}
            step="1"
            onChange={(tenor) => onChange({ tenor })}
          />
        </div>

        <Field id="frequency" label="Payment frequency">
          {() => (
            <select
              id="frequency"
              value={form.frequency}
              onChange={(e) => onChange({ frequency: Number(e.target.value) as Frequency })}
              className={`${inputClass} border-slate-300`}
            >
              {FREQUENCIES.map((f) => (
                <option key={f} value={f}>
                  {FREQUENCY_LABELS[f]} ({f} per year)
                </option>
              ))}
            </select>
          )}
        </Field>

        <fieldset>
          <legend className="mb-1 text-sm font-medium text-slate-700">Your position</legend>
          <div className="space-y-1">
            {POSITIONS.map(({ value, label }) => (
              <label key={value} className="flex items-center gap-2 text-sm text-slate-800">
                <input
                  type="radio"
                  name="position"
                  value={value}
                  checked={form.position === value}
                  onChange={() => onChange({ position: value })}
                  className="h-4 w-4 accent-blue-700"
                />
                {label}
              </label>
            ))}
          </div>
        </fieldset>

        <div className="grid grid-cols-2 gap-3">
          <NumberField
            id="spread"
            label="Floating spread (bps)"
            value={form.spread}
            error={errors.spread}
            step="1"
            onChange={(spread) => onChange({ spread })}
          />
          <NumberField
            id="discount"
            label="Discount rate (% per year)"
            value={form.discount}
            error={errors.discount}
            step="0.01"
            placeholder={form.fixedRate}
            hint="Blank = fixed rate. Valuation only."
            onChange={(discount) => onChange({ discount })}
          />
        </div>

        <div className="border-t border-slate-200 pt-4">
          <h3 className="mb-2 text-sm font-semibold text-slate-900">Floating rate scenario</h3>
          <div role="radiogroup" aria-label="Floating rate scenario" className="mb-3 flex flex-wrap gap-1.5">
            {SCENARIOS.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={form.scenario === value}
                onClick={() => onChange({ scenario: value })}
                className={`rounded-md border px-3 py-1.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-600 ${
                  form.scenario === value
                    ? "border-blue-700 bg-blue-700 text-white"
                    : "border-slate-300 bg-white text-slate-800 hover:bg-slate-50"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {isGenerated ? (
            <div className="grid grid-cols-2 gap-3">
              <NumberField
                id="startRate"
                label={form.scenario === "flat" ? "Floating rate (%)" : "Start rate (%)"}
                value={form.startRate}
                error={errors.startRate}
                step="0.01"
                onChange={(startRate) => onChange({ startRate })}
              />
              {(form.scenario === "rising" || form.scenario === "falling") && (
                <NumberField
                  id="endRate"
                  label="End rate (%)"
                  value={form.endRate}
                  error={errors.endRate}
                  step="0.01"
                  onChange={(endRate) => onChange({ endRate })}
                />
              )}
              {form.scenario === "volatile" && (
                <>
                  <NumberField
                    id="volatility"
                    label="Volatility (pp per period)"
                    value={form.volatility}
                    error={errors.volatility}
                    step="0.05"
                    onChange={(volatility) => onChange({ volatility })}
                  />
                  <NumberField
                    id="seed"
                    label="Random seed"
                    value={form.seed}
                    error={errors.seed}
                    step="1"
                    hint="Same seed, same path."
                    onChange={(seed) => onChange({ seed })}
                  />
                </>
              )}
            </div>
          ) : (
            <p className="text-xs text-slate-600">Custom keeps the last generated path. Edit any period below.</p>
          )}

          <details className="mt-3" open={!isGenerated}>
            <summary className="cursor-pointer text-sm font-medium text-blue-800">
              Floating rate per period (% per year, before spread)
              {rateErrorCount > 0 && <span className="ml-2 text-red-700">({rateErrorCount} invalid)</span>}
            </summary>
            <div className="mt-2 grid max-h-64 grid-cols-2 gap-2 overflow-y-auto pr-1">
              {form.rates.map((rate, i) => (
                <div key={i}>
                  <label htmlFor={`rate-${i}`} className="block text-xs text-slate-700">
                    Period {i + 1}
                  </label>
                  <input
                    id={`rate-${i}`}
                    type="number"
                    step="0.01"
                    value={rate}
                    aria-invalid={errors[`rate-${i}`] ? true : undefined}
                    aria-describedby={errors[`rate-${i}`] ? `rate-${i}-error` : undefined}
                    onChange={(e) => setRate(i, e.target.value)}
                    className={`${inputClass} ${errors[`rate-${i}`] ? "border-red-600" : "border-slate-300"}`}
                  />
                  {errors[`rate-${i}`] && (
                    <p id={`rate-${i}-error`} role="alert" className="text-xs font-medium text-red-700">
                      {errors[`rate-${i}`]}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </details>
        </div>
      </div>
    </section>
  );
}
