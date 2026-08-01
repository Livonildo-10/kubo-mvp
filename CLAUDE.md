# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository state

This is not a scaffolded project — there is no `package.json`, no build config, no test runner, no git repository, and no README. The repository contains exactly one file:

- `kubo-simulador-corredores.jsx` — a single self-contained React component (`KuboSimulator`, default export), written as a standalone artifact (e.g. for pasting into a Claude/v0/bolt-style single-file preview environment), not as part of an npm project.

There are no build/lint/test commands to run because no tooling is configured. If the user asks to run or preview this component, it needs to be dropped into a React + Tailwind host project (e.g. `create-vite` + Tailwind) first — none exists here yet.

## What the component does

`KuboSimulator` is a remittance-fee simulator UI (Portuguese-language) for a fictional/prototype product "KUBO", simulating money transfer corridors from Switzerland (CH) to PALOP countries (Portuguese-speaking African countries). Structure:

- `CORRIDORS` — a static config object keyed by country code (`AO` Angola, `CV` Cabo Verde, `GW` Guiné-Bissau), each entry defining currency, transfer rail, and pricing model:
  - `pegType: "variável"` (Angola/AOA) — floating rate, priced as `midRate * (1 - spreadPct)`. The mid-market rate is a manually-editable input (`midRate` state), since there's no live FX feed.
  - `pegType: "fixo"` (Cabo Verde/CVE, Guiné-Bissau/XOF) — currency pegged to EUR at a hardcoded `fixedRate`, with a flat fee (`flatFee`) subtracted from the sent amount before conversion, instead of a spread.
- The `result` calculation (`useMemo`, keyed on `amount`/`midRate`/`corridor`) branches on `pegType` to compute: effective rate, amount received, what would've been received at pure market rate, and the implied total cost of the operation (converted back to EUR).
- Rendering is a single-page dark-themed "departures board" layout (colors/fonts hardcoded inline, not via a theme file): amount input → selectable corridor list → conditional mid-rate input (only for floating-rate corridors) → result panel showing received amount, applied rate, market-rate comparison, and total cost.
- Uses `lucide-react` icons (`Lock`, `TrendingUp`, `ArrowRight`, `RefreshCw`) and Tailwind utility classes alongside inline `style` objects — assumes both Tailwind and `lucide-react` are available in the host project.
- Formatting via a local `fmt()` helper using `pt-PT` locale number formatting.

When making changes, edit the pricing/formatting logic in the `result` `useMemo` or the `CORRIDORS` config, not the JSX layout, for anything affecting the simulated numbers.
