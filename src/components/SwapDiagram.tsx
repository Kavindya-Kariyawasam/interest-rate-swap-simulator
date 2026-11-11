import type { Position } from "@/lib/swap";

export function SwapDiagram({ position }: { position: Position }) {
  const youAreFixedPayer = position === "payFixed";
  return (
    <details open className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <summary className="cursor-pointer text-lg font-semibold text-slate-900">How this swap works</summary>
      <div className="mt-3 grid items-center gap-4 md:grid-cols-2">
        <svg
          viewBox="0 0 420 170"
          role="img"
          aria-label="The fixed payer sends fixed payments to the floating payer, who sends floating payments back"
          className="w-full"
        >
          <defs>
            <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto">
              <path d="M0 0 L10 5 L0 10 z" fill="#1e293b" />
            </marker>
          </defs>
          <rect x="4" y="45" width="120" height="80" rx="10" fill="#eff6ff" stroke="#1d4ed8" strokeWidth="2" />
          <text x="64" y="82" textAnchor="middle" fontSize="14" fontWeight="600" fill="#1e3a8a">
            Fixed Payer
          </text>
          {youAreFixedPayer && (
            <text x="64" y="102" textAnchor="middle" fontSize="12" fill="#1e3a8a">
              (you)
            </text>
          )}
          <rect x="296" y="45" width="120" height="80" rx="10" fill="#fffbeb" stroke="#b45309" strokeWidth="2" />
          <text x="356" y="82" textAnchor="middle" fontSize="14" fontWeight="600" fill="#78350f">
            Floating Payer
          </text>
          {!youAreFixedPayer && (
            <text x="356" y="102" textAnchor="middle" fontSize="12" fill="#78350f">
              (you)
            </text>
          )}
          <line x1="128" y1="70" x2="292" y2="70" stroke="#1e293b" strokeWidth="2" markerEnd="url(#arrow)" />
          <text x="210" y="60" textAnchor="middle" fontSize="12" fill="#0f172a">
            Fixed leg: N × K × τ
          </text>
          <line
            x1="292"
            y1="102"
            x2="128"
            y2="102"
            stroke="#1e293b"
            strokeWidth="2"
            strokeDasharray="6 4"
            markerEnd="url(#arrow)"
          />
          <text x="210" y="124" textAnchor="middle" fontSize="12" fill="#0f172a">
            Floating leg: N × L × τ
          </text>
          <text x="210" y="158" textAnchor="middle" fontSize="12" fill="#334155">
            Only the difference changes hands
          </text>
        </svg>
        <div className="space-y-2 text-sm text-slate-700">
          <p>
            Two parties agree on a notional amount and swap interest streams. One pays a fixed rate K, the other
            pays a floating rate that resets each period.
          </p>
          <p>
            At each period end the two payments are netted. If floating is above K, the floating payer pays the
            difference to the fixed payer. If floating is below K, the fixed payer pays the difference.
          </p>
          <p className="font-medium text-slate-900">
            No principal is exchanged. The notional is only a reference amount.
          </p>
        </div>
      </div>
    </details>
  );
}
