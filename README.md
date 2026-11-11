# Interest Rate Swap Cash-Flow Simulator

A client-side web app that simulates a plain vanilla interest rate swap. It compares fixed and floating interest payments over multiple periods and computes the net settlement per period and in total. There is no backend, database or external API.

Built with Next.js (App Router), TypeScript (strict), Tailwind CSS, Recharts and Vitest.

## Run it

```bash
npm install
npm run dev        # http://localhost:3000
npm run lint
npx tsc --noEmit
npm run test
npm run build && npm start
```

## Formulas

With notional N, fixed rate K, floating rate L_i (index + spread), year fraction tau and frequency f:

- Periods: n = tenor × f
- Year fraction: tau = 1 / f
- Fixed payment_i = N × K × tau
- Floating payment_i = N × L_i × tau
- Net to fixed payer_i = Floating payment_i − Fixed payment_i = N × (L_i − K) × tau
- Fixed receiver's net is the exact negative of the fixed payer's net
- Cumulative net_i = sum of net_j for j ≤ i

Optional valuation (flat discount rate r, compounded at the payment frequency):

- DF_i = 1 / (1 + r / f)^i
- PV = sum of net_i × DF_i
- Par rate K_par = (1 − DF_n) / (tau × sum of DF_i)

Volatile scenario: L*0 = start, L_i = max(0, L*(i−1) + volatility × Z_i) with Z_i from a seeded generator (mulberry32 plus Box-Muller), so the same seed always gives the same path.

## Assumptions

- Simple year fraction, no day-count conventions.
- Floating rate is set at the start of each period and paid at its end (reset in advance, pay in arrears).
- Net settlement only. No principal is exchanged.
- No credit risk or collateral.
- Valuation uses the simulated floating path as the expected path. It is an illustration, not a market valuation.
- The spread is added to every period's floating rate, including custom paths.

## Project structure

```
src/
  app/
    layout.tsx, globals.css
    page.tsx              page-level state, useMemo for derived results
  components/
    InputPanel.tsx        inputs, validation messages, scenario controls, per-period rates
    SummaryCards.tsx      KPI cards
    SwapDiagram.tsx       collapsible two-party diagram
    Charts.tsx            rate, net settlement and cumulative charts
    CashFlowTable.tsx     table, totals row, CSV export
    ValuationPanel.tsx    optional valuation
  lib/
    swap.ts               pure engine: schedule, scenarios, swap, valuation, CSV, validation
    swap.test.ts          Vitest tests
    form.ts               raw form state, parsing, scenario regeneration
    format.ts             Intl.NumberFormat helpers
```
