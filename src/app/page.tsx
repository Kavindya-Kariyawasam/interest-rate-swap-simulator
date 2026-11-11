"use client";

import { useMemo, useState } from "react";
import { CashFlowTable } from "@/components/CashFlowTable";
import { Charts } from "@/components/Charts";
import { InputPanel } from "@/components/InputPanel";
import { SummaryCards } from "@/components/SummaryCards";
import { SwapDiagram } from "@/components/SwapDiagram";
import { ValuationPanel } from "@/components/ValuationPanel";
import { WORKED_EXAMPLE, parseForm, updateForm, type FormState } from "@/lib/form";
import { computeSwap, computeValuation } from "@/lib/swap";

export default function Home() {
  const [form, setForm] = useState<FormState>(WORKED_EXAMPLE);

  const { inputs, errors } = useMemo(() => parseForm(form), [form]);
  const result = useMemo(() => (inputs ? computeSwap(inputs) : null), [inputs]);
  const valuation = useMemo(() => (inputs && result ? computeValuation(inputs, result) : null), [inputs, result]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-screen-2xl px-6 py-5">
          <h1 className="text-2xl font-bold tracking-tight">Interest Rate Swap Cash-Flow Simulator</h1>
          <p className="mt-1 text-sm text-slate-700">
            Compare fixed and floating interest payments period by period and see who pays whom on a net basis.
          </p>
        </div>
      </header>

      <main className="mx-auto grid max-w-screen-2xl gap-6 px-6 py-6 lg:grid-cols-[400px_minmax(0,1fr)]">
        <div className="lg:sticky lg:top-6 lg:max-h-[calc(100vh-3rem)] lg:self-start lg:overflow-y-auto">
          <InputPanel
            form={form}
            errors={errors}
            onChange={(patch) => setForm((current) => updateForm(current, patch))}
            onReset={() => setForm(WORKED_EXAMPLE)}
            onLoadExample={() => setForm(WORKED_EXAMPLE)}
          />
        </div>

        <div className="space-y-6">
          {inputs && result && valuation ? (
            <>
              <SummaryCards
                totals={result.totals}
                currency={form.currency}
                position={form.position}
                periods={result.rows.length}
              />
              <SwapDiagram position={form.position} />
              <Charts result={result} fixedRatePct={inputs.fixedRatePct} currency={form.currency} />
              <CashFlowTable result={result} currency={form.currency} />
              <ValuationPanel
                valuation={valuation}
                fixedRatePct={inputs.fixedRatePct}
                discountRatePct={inputs.discountRatePct}
                currency={form.currency}
              />
            </>
          ) : (
            <div role="status" className="rounded-xl border border-red-300 bg-white p-6 text-sm text-red-800">
              <p className="font-semibold">Results are paused.</p>
              <p className="mt-1">Fix the highlighted inputs and the cash flows will update automatically.</p>
            </div>
          )}

          <footer className="rounded-xl border border-slate-200 bg-white p-5 text-xs text-slate-700">
            <h2 className="mb-1 text-sm font-semibold text-slate-900">Assumptions</h2>
            <ul className="list-disc space-y-0.5 pl-5">
              <li>Simple year fraction per period, tau = 1 / frequency. No day-count conventions.</li>
              <li>Floating rate is set at the start of each period (reset in advance) and paid at its end (pay in arrears).</li>
              <li>Settlement is net only: one party pays the difference. No principal is exchanged.</li>
              <li>No credit risk or collateral.</li>
            </ul>
          </footer>
        </div>
      </main>
    </div>
  );
}
