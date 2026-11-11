"use client";

import { formatMoney, formatRate } from "@/lib/format";
import type { CurrencyCode } from "@/lib/form";
import { describeFlow, toCsv, type SwapResult, type UserAction } from "@/lib/swap";

interface CashFlowTableProps {
  result: SwapResult;
  currency: CurrencyCode;
}

const ACTION_TEXT: Record<UserAction, string> = {
  receives: "Receives",
  pays: "Pays",
  none: "No payment",
};

const ACTION_COLOR: Record<UserAction, string> = {
  receives: "text-green-800",
  pays: "text-red-800",
  none: "text-slate-700",
};

function cumulativeColor(value: number): string {
  return Math.abs(value) < 0.005 ? "text-slate-700" : value > 0 ? "text-green-800" : "text-red-800";
}

function downloadCsv(result: SwapResult): void {
  const blob = new Blob([toCsv(result)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "swap-cash-flows.csv";
  link.click();
  URL.revokeObjectURL(url);
}

export function CashFlowTable({ result, currency }: CashFlowTableProps) {
  const { rows, totals } = result;
  const th = "px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-700";
  const td = "px-3 py-2 text-sm tabular-nums text-slate-900";
  return (
    <section aria-labelledby="table-heading" className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div>
          <h2 id="table-heading" className="text-lg font-semibold text-slate-900">
            Cash flows
          </h2>
          <p className="text-xs text-slate-600">
            Net settlement is shown for your position. Positive means you receive, negative means you pay.
          </p>
        </div>
        <button
          type="button"
          onClick={() => downloadCsv(result)}
          className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-800 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2"
        >
          Export CSV
        </button>
      </div>
      <div className="max-h-[28rem] overflow-auto rounded-md border border-slate-200">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="sticky top-0 bg-slate-100">
            <tr>
              <th scope="col" className={th}>Period</th>
              <th scope="col" className={th}>Start to end</th>
              <th scope="col" className={`${th} text-right`}>Floating rate</th>
              <th scope="col" className={`${th} text-right`}>Fixed payment</th>
              <th scope="col" className={`${th} text-right`}>Floating payment</th>
              <th scope="col" className={`${th} text-right`}>Net settlement</th>
              <th scope="col" className={th}>Who pays whom</th>
              <th scope="col" className={`${th} text-right`}>Cumulative net</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((r) => (
              <tr key={r.index}>
                <td className={td}>{r.index}</td>
                <td className={td}>
                  Month {r.startMonth} to {r.endMonth}
                  <span className="text-slate-600"> ({r.startYear.toFixed(2)} to {r.endYear.toFixed(2)} y)</span>
                </td>
                <td className={`${td} text-right`}>{formatRate(r.floatingRatePct)}</td>
                <td className={`${td} text-right`}>{formatMoney(r.fixedPayment, currency)}</td>
                <td className={`${td} text-right`}>{formatMoney(r.floatingPayment, currency)}</td>
                <td className={`${td} text-right font-semibold ${ACTION_COLOR[r.userAction]}`}>
                  {formatMoney(r.net, currency, true)}
                  <span className="block text-xs font-medium">{ACTION_TEXT[r.userAction]}</span>
                </td>
                <td className={`${td} text-xs`}>{describeFlow(r.direction)}</td>
                <td className={`${td} text-right ${cumulativeColor(r.cumulativeNet)}`}>
                  {formatMoney(r.cumulativeNet, currency, true)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="sticky bottom-0 bg-slate-100">
            <tr>
              <th scope="row" colSpan={2} className={`${th} normal-case`}>Total</th>
              <td className={`${td} text-right font-semibold`}>{formatRate(totals.averageFloatingRatePct)} avg</td>
              <td className={`${td} text-right font-semibold`}>{formatMoney(totals.totalFixed, currency)}</td>
              <td className={`${td} text-right font-semibold`}>{formatMoney(totals.totalFloating, currency)}</td>
              <td
                className={`${td} text-right font-semibold ${
                  cumulativeColor(totals.totalNet)
                }`}
              >
                {formatMoney(totals.totalNet, currency, true)}
              </td>
              <td className={td} />
              <td className={`${td} text-right font-semibold ${cumulativeColor(totals.totalNet)}`}>
                {formatMoney(totals.totalNet, currency, true)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </section>
  );
}
