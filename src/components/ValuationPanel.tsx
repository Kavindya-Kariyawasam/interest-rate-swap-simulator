import { formatMoney, formatRate } from "@/lib/format";
import type { CurrencyCode } from "@/lib/form";
import type { ValuationResult } from "@/lib/swap";

interface ValuationPanelProps {
  valuation: ValuationResult;
  fixedRatePct: number;
  discountRatePct: number;
  currency: CurrencyCode;
}

export function ValuationPanel({ valuation, fixedRatePct, discountRatePct, currency }: ValuationPanelProps) {
  const { presentValue, parRatePct, fixedMinusParPct } = valuation;
  const atPar = Math.abs(fixedMinusParPct) < 0.0005;
  const parText = atPar
    ? "The fixed rate equals the par rate."
    : fixedMinusParPct > 0
      ? `The fixed rate is ${formatRate(fixedMinusParPct)} above par.`
      : `The fixed rate is ${formatRate(-fixedMinusParPct)} below par.`;
  const pvTone =
    Math.abs(presentValue) < 0.005 ? "text-slate-900" : presentValue > 0 ? "text-green-800" : "text-red-800";
  return (
    <section aria-labelledby="valuation-heading" className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 id="valuation-heading" className="text-lg font-semibold text-slate-900">
        Optional: valuation
      </h2>
      <p className="mb-3 text-xs text-slate-600">
        Flat discount rate {formatRate(discountRatePct)}, compounded at the payment frequency.
      </p>
      <dl className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-slate-600">PV of net settlements</dt>
          <dd className={`text-lg font-semibold tabular-nums ${pvTone}`}>{formatMoney(presentValue, currency, true)}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-slate-600">PV fixed leg</dt>
          <dd className="text-lg font-semibold tabular-nums text-slate-900">{formatMoney(valuation.pvFixedLeg, currency)}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-slate-600">PV floating leg</dt>
          <dd className="text-lg font-semibold tabular-nums text-slate-900">{formatMoney(valuation.pvFloatingLeg, currency)}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-slate-600">Par swap rate</dt>
          <dd className="text-lg font-semibold tabular-nums text-slate-900">{formatRate(parRatePct, 4)}</dd>
        </div>
      </dl>
      <p className="mt-3 text-sm text-slate-800">
        Your fixed rate is {formatRate(fixedRatePct)}. {parText}
      </p>
      <p className="mt-2 text-xs text-slate-600">
        This treats the simulated floating path as the expected path, so it is an illustration, not a market
        valuation.
      </p>
    </section>
  );
}
