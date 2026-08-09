# Kubo Pay — Pricing Spec

Documents the pricing model implemented in `pricing-engine/`. This is the
single source of truth for corridor rates, fees and spreads — both
`index.html` and `kubo-simulador-corredores.jsx` import from here instead
of defining their own copies.

## Pipeline

```
sendAmount (EUR)
  -> fee                 (flat or none, per corridor)
  -> amountAfterFee
  -> FX rate              fixed (baseRate) OR variable (marketRate * (1 - spread))
  -> recipientAmount      amountAfterFee * customerRate
  -> totalCost             implied cost of the operation, expressed in EUR
  -> Quote                 the object returned to callers
```

Implemented in `pricing-engine/engine.js:computeQuote()`. No financial
formula lives anywhere else — UI code (`index.html`, the `.jsx` artifact)
only reads `Quote` fields and formats them for display.

## Corridors

| Code | Country | Destination currency | FX type | Rate | Fee | Spread |
|---|---|---|---|---|---|---|
| AO | Angola | AOA | variable | supplied per quote (`marketRate`) | none | **2.5%** |
| CV | Cabo Verde | CVE | fixed | **1 EUR = 110.265 CVE** | **€1 flat** | none |
| GW | Guiné-Bissau | XOF | fixed | **1 EUR = 655.957 XOF** | **€1 flat** | none |

Source of truth: `pricing-engine/corridors.js`.

### Angola (AO) — variable rate

Angola has no real FX peg — AOA floats. There is no live rate feed yet, so
`marketRate` is supplied by the caller (currently a manually-typed input in
the UI, defaulting to 1050).

```
customerRate = marketRate * (1 - spread)
recipientAmount = sendAmount * customerRate     // fee = 0, so amountAfterFee = sendAmount
```

### Cabo Verde (CV) / Guiné-Bissau (GW) — fixed rate

CVE and XOF are treated as pegged 1:1 to EUR at a fixed rate. The cost to
the customer is entirely the flat €1 fee, deducted from the amount *before*
conversion:

```
amountAfterFee = sendAmount - fee
recipientAmount = amountAfterFee * baseRate
```

Because the rate is fixed, `totalCost` for these two corridors always
equals exactly the fee (in EUR), for any `sendAmount > fee` — the rate
cancels out algebraically (see "totalCost formula" below).

## totalCost formula

`totalCost` is a single formula shared by every corridor (no per-corridor
branching):

```
marketReceivedAmount = sendAmount * marketRate         // what they'd get sending the FULL amount at the full market rate, no fee
cost                  = marketReceivedAmount - recipientAmount   // in destination currency
totalCost             = cost / customerRate             // converted back to EUR
```

If `customerRate` is `0` (see AO edge case below), `totalCost` is defined
as `0` instead of dividing by zero.

## Rounding

`roundMoney(value, decimals)` in `pricing-engine/engine.js` rounds using a
decimal-string technique:

```js
Math.round(Number(`${value}e${decimals}`))  ->  Number(`${rounded}e-${decimals}`)
```

This avoids the classic JavaScript binary-float bug where `1.005 * 100`
evaluates to `100.49999999999999` (which would incorrectly round down to
`1.00` instead of `1.01`). Verified against that exact case plus every
worked example below.

Money amounts are rounded to `corridor.displayDecimals` (0 for AOA — matches
the original component's behavior; 2 for CVE/XOF). `totalCost` is always
rounded to 2 decimals (it's always expressed in EUR).

**Known limitation:** this is `Number`-based (IEEE-754 double) arithmetic,
not arbitrary-precision decimal math. It's accurate enough for amounts and
rates in the ranges used here, verified case-by-case below, but is **not**
suitable as-is for a production ledger. Before this touches real money,
replace it with either a decimal library (`decimal.js`, `big.js`) or
integer minor-unit arithmetic (cents/céntimos as integers).

## Edge cases

| Case | Rule | Result |
|---|---|---|
| `sendAmount <= fee` | Customer sent less than (or exactly) the fee | `recipientAmount = 0`, `totalCost = sendAmount` (they can't lose more than they sent) |
| `sendAmount < 0` | Clamped to `0` | Same as `sendAmount = 0` |
| `marketRate < 0` (AO) | Clamped to `0` | `customerRate = 0` |
| `marketRate = 0` (AO) | `customerRate = 0` | `recipientAmount = 0`, `totalCost = 0` — guarded explicitly against `0/0` (would otherwise be `NaN`) |
| Unknown/disabled corridor code | — | `getCorridor()` / `computeQuote()` throw, instead of returning `NaN`/`undefined` silently |

`roundMoney()` also returns `0` for any non-finite input (`NaN`, `Infinity`)
as a last-resort guard.

## Worked examples (from the test suite)

| Corridor | sendAmount | fee | rate | recipientAmount | totalCost |
|---|---|---|---|---|---|
| GW | €1,000 | €1 | 655.957 | 655,301.04 XOF | €1.00 |
| CV | €500 | €1 | 110.265 | 55,022.24 CVE | €1.00 |
| GW | €500 | €1 | 655.957 | 327,322.54 XOF | €1.00 |
| CV | €0.50 | €1 | 110.265 | 0 CVE | €0.50 |
| AO | €500 | — | market 1050, spread 2.5% | 511,875 AOA | €12.82 |
| AO | €500 | — | market 0 | 0 AOA | €0.00 |

All of the above are asserted in `pricing-engine/engine.test.js`.

## Mock vs. real data

| Value | Status | Future source |
|---|---|---|
| CVE fixed rate (110.265) | Real peg, hardcoded | Static — CVE is genuinely pegged to EUR by law, unlikely to need a live feed |
| XOF fixed rate (655.957) | Real peg, hardcoded | Static — same as above (CFA franc peg) |
| AO `marketRate` | **Mock** — manually typed in the UI, defaults to 1050 | Should come from a live FX feed / rate provider API |
| AO spread (2.5%) | Placeholder business decision, configurable in `corridors.js` | Should eventually come from a pricing/config service, possibly per-provider or per-volume tiered |
| €1 flat fee (CV/GW) | Placeholder business decision | Should eventually come from a fee schedule / provider cost model |
| `enabled` flag per corridor | Functional today (used by `getCorridor()`), no corridor currently disabled | Lets ops disable a corridor without deploying code, once there's an admin surface |

**Explicitly out of scope for this phase** (per request): no external FX API
integration, no new backend, no Supabase changes, no design changes.

## Extending

To add a new fixed-rate corridor: add an entry to
`pricing-engine/corridors.js` with `fxType: 'fixed'` and a `baseRate`. To
add a new variable-rate corridor: `fxType: 'variable'`, `baseRate: null`,
and pass `marketRate` at quote time. No changes to `engine.js` are needed
for either case — `computeQuote()` is corridor-agnostic.
