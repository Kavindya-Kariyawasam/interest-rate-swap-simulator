import { formatMoney, formatRate } from "@/lib/format";
import type { CurrencyCode } from "@/lib/form";
import type { Position, SwapTotals } from "@/lib/swap";

interface SummaryCardsProps {
  totals: SwapTotals;
  currency: CurrencyCode;
  position: Position;
  periods: number;
}

type Tone = "positive" | "negative" | "neutral";

interface CardProps {
  label: string;
  value: string;
  note?: string;
  tone?: Tone;
}

const TEXT: Record<Tone, string> = {
  positive: "text-green-800",
  negative: "text-red-800",
  neutral: "text-slate-900",
};

const BORDER: Record<Tone, string> = {
  positive: "border-green-300",
  negative: "border-red-300",
  neutral: "border-slate-200",
};

function Card({ label, value, note, tone = "neutral" }: CardProps) {
  return (
    <div className={`rounded-xl border bg-white p-4 shadow-sm ${BORDER[tone]}`}>
      <p className="text-xs font-medium uppercase tracking-wide text-slate-600">{label}</p>
      <p className={`mt-1 text-xl font-semibold tabular-nums ${TEXT[tone]}`}>{value}</p>
      {note && <p className={`mt-1 text-xs font-medium ${tone === "neutral" ? "text-slate-600" : TEXT[tone]}`}>{note}</p>}
    </div>
  );
}

export function SummaryCards({ totals, currency, position, periods }: SummaryCardsProps) {
  const net = totals.totalNet;
  const tone: Tone = Math.abs(net) < 0.005 ? "neutral" : net > 0 ? "positive" : "negative";
  const verdict = tone === "neutral" ? "Nothing owed overall" : net > 0 ? "You receive in total" : "You pay in total";
  const fixedRole = position === "payFixed" ? "you pay" : "you receive";
  const floatingRole = position === "payFixed" ? "you receive" : "you pay";
  const noPayment = periods - totals.periodsPaying - totals.periodsReceiving;
  return (
    <section aria-label="Summary" className="grid grid-cols-2 gap-3 xl:grid-cols-3">
      <Card label="Total net settlement" value={formatMoney(net, currency, true)} note={verdict} tone={tone} />
      <Card label="Fixed leg total" value={formatMoney(totals.totalFixed, currency)} note={`Leg ${fixedRole}`} />
      <Card label="Floating leg total" value={formatMoney(totals.totalFloating, currency)} note={`Leg ${floatingRole}`} />
      <Card label="Average floating rate" value={formatRate(totals.averageFloatingRatePct)} note="Index plus spread" />
      <Card
        label="Break-even floating rate"
        value={formatRate(totals.breakEvenFloatingRatePct)}
        note="Equals the fixed rate K"
      />
      <Card
        label="Periods you pay / receive"
        value={`${totals.periodsPaying} pay / ${totals.periodsReceiving} receive`}
        note={`${periods} periods, ${noPayment} with no payment`}
      />
    </section>
  );
}
