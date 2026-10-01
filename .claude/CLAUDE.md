# Exact Calculator — Project Index

A static Svelte 5 + TypeScript scientific calculator that gives **exact** answers (fractions, radicals, multiples of π, exact logs/trig) with a toggle for decimals. It also **solves equations in one unknown** and returns the exact value(s) of that variable (e.g. `x² − 6x + 4 = 0` → `x = 3 ± √5`). The screen is a **list of live, editable lines**: a line can define a variable (`a = 5`, or solve one: `2x = 6`) and any other line, above or below, can use it; circular definitions are reported as errors. Input is typed with MathQuill or an on-screen keypad.

Background notes the design follows (read these before changing the math):
- `01-pressing-a-key-in-the-calculator.md` — keypress → LaTeX → parse → evaluate pipeline
- `02-exact-simplification.md` — exact rationals, radicals, trig tables, canonical forms
- `03-exact-solutions.md` — solving strategies (isolation, quadratic, rational roots, radicals, trig, logs)
- `04-mathquill-easy-typing.md` — MathQuill config and API

## Commands (pnpm)

| Command | What it does |
| --- | --- |
| `pnpm dev` | Vite dev server |
| `pnpm build` | Static build to `dist/` (relative paths, works from any folder/host) |
| `pnpm preview` | Serve the built `dist/` |
| `pnpm test` | Run the whole test suite (Vitest, config in `tests/vitest.config.ts`) |
| `pnpm check` | svelte-check type checking |

## Architecture

Two independent halves. **The UI only imports from `src/math/index.ts`** (`evaluateWorkspace(lines)`, `calculate(latex)`), so the math engine has no DOM/Svelte dependencies and is fully unit-tested.

```
keypress → MathQuill (LaTeX) → calculate(latex)
  → parse/tokenize → parse/parser → Expr tree
  → simplify (operations/*)          → exact value
  → solve/solveEquation (strategies) → exact solutions, verified
  → format/* → LaTeX strings for exact + decimal modes → UI renders with MathQuill StaticMath
```

Core data type: `Expr` in `src/math/ast/nodes.ts` — `num` (exact BigInt Rational), `const` (π, e), `var`, `add`, `mul`, `pow`, `func`. Subtraction is `add` of `-1·b`; division is `pow(b, -1)`; √x is `pow(x, 1/2)`.

## File map

### Entry / app shell
- `index.html` — page shell, inline SVG favicon.
- `src/main.ts` — mounts `App.svelte`, imports global CSS.
- `src/App.svelte` — Layout (editable expression list on top, keypad at the bottom) and app state: the list of lines, the active line, Exact/Decimal mode, RAD/DEG, undo/redo, `ans`. Evaluates all lines together with `evaluateWorkspace`.
- `vite.config.ts`, `svelte.config.js`, `tsconfig.json` — standard config (`base: './'` for static hosting).

### `src/styles/` (shared tokens)
- `tokens.css` — all colors/spacing/radii/fonts (incl. keypad key colors and the serif `--font-math` for key faces), light + dark themes. Re-skin here.
- `global.css` — resets, base styles, MathQuill color overrides.

### `src/ui/` (UI section)
- `types.ts` — `DisplayMode` ('exact' | 'decimal'), `ExpressionLine` ({ id, latex }).
- `state/undoHistory.ts` — generic undo/redo snapshot stack (snapshots of the whole line list).
- `state/lines.ts` — pure list helpers: insert after, remove (keeps one line), neighbor, next id.
- `state/savedLines.ts` — keeps the lines in localStorage between visits (safe if storage is blocked).
- `mathquill/loadMathQuill.ts` — loads MathQuill 0.10 once (puts jQuery on `window` first), returns the interface.
- `mathquill/config.ts` — MathField typing options (auto commands `sqrt pi theta nthroot`, operator names). Any operator name added here must be understood by `src/math/parse/tokenize.ts`.
- `mathquill/types.ts`, `mathquill/mathquill.d.ts` — minimal typings for MathQuill.
- `keypad/keys.ts` — **keypad layout as data**: `KEYPAD_TABS` (main / abc / func), each made of grid `KeyGroup`s with key `span`s and spacers; `KeyLabel` (text, scripts, fraction); `KeyAction` (write/cmd/typed/keystroke/ans/shift/submit). Add or move keys here.
- `components/MathField.svelte` — editable MathQuill input; bindable `latex`; Enter / backspace-at-start / up / down callbacks; `applyAction()` / `focus()` (focus works even before MathQuill has loaded).
- `components/ExpressionRow.svelte` — one editable line: MathField, live result on the right, delete button. Enter adds a line below, backspace on an empty line deletes it, ↑/↓ move between lines.
- `components/ResultView.svelte` — renders any `CalculationResult` (value, simplified + roots, solved, truth, error), right-aligned.
- `components/SolutionLines.svelte` — solution lines + notes for the chosen mode.
- `components/StaticMath.svelte` — read-only LaTeX renderer.
- `components/Keypad.svelte` — keypad panel: toolbar + the active tab's key groups; Shift state for the abc tab.
- `components/KeypadToolbar.svelte` — tabs, RAD/DEG and exact/decimal toggles, undo, redo, clear all.
- `components/KeyButton.svelte` / `KeyFace.svelte` — one key, and how its label is drawn.
- `components/SegmentedToggle.svelte` — generic segmented switch (RAD | DEG, a/b | 1.5).

### `src/math/` (math section)
- `index.ts` — public API: `evaluateWorkspace`, `calculate`, result types.
- `calculate.ts` — `calculate(latex, { angleMode })` for a single line, plus `parseLine`, `calculateStatement`, `errorResult` used by the workspace: decides what the input is (number / expression with variables / equation) and builds `CalculationResult` with exact + decimal LaTeX. Never throws.
- `workspace/` — evaluating the whole line list together:
  - `evaluateWorkspace.ts` — entry point: parse all lines, assign definitions, resolve values, compute each line's result (`LineResult` = result + variable it defines).
  - `parseLines.ts` — parse each line; `v = …` with v absent on the right is an explicit definition (left side only).
  - `assignDefinitions.ts` — which line defines which variable, order-independent: explicit definitions first, then equations with exactly one not-yet-defined variable (repeated until nothing changes). Duplicate explicit definitions are errors.
  - `resolveDefinitions.ts` — `DefinitionResolver`: depth-first value resolution with cycle detection ("Circular definition: a → b → a."), substitution of known values, and reasons a variable can't be used (several solutions, periodic, approximate, no solution).
  - `types.ts` — `ParsedLine`, `VariableValue`, `LineResult`.
- `transform/angleMode.ts` — degree mode: rewrites sin(u) → sin(u·π/180) and arcsin(u) → arcsin(u)·180/π before simplifying/solving.
- `errors.ts` — `MathError` (user-facing message).
- `number/rational.ts` — exact `Rational` (BigInt, always reduced; parses decimals from text).
- `number/integer.ts` — gcd/lcm, integer roots, factorization, divisors, perfect powers.
- `ast/nodes.ts` — `Expr` types + raw constructors (`add`, `mul`, `divide`, `sqrt`, ...).
- `ast/inspect.ts` — `containsVariable`, `collectVariables`, `toKey` (canonical key), `replaceSubtree`.
- `parse/tokenize.ts` — LaTeX → tokens (handles `\left(`, `\frac`, `\sqrt[n]`, `\operatorname`, subscripts, greek).
- `parse/parser.ts` — tokens → `Statement` (expression or `left = right`), implicit multiplication, `\sin^{2}x`, `\sin^{-1}x`, `\log_{b}`, postfix `!` and `%`.
- `simplify/simplify.ts` — bottom-up dispatcher; delegates to `operations/`.
- `operations/` — **one file per operation** (edit rules here):
  - `add.ts` — sums: combine like terms and rationals.
  - `multiply.ts` — products: coefficients, merge powers, distribute constants over a sum.
  - `power.ts` — powers/roots: exact integer powers, radicals, (x²)^½ = |x|, constant-sum expansion.
  - `radicals.ts` — integer radicals as prime exponents (√72 = 6√2, rationalizes √2/2).
  - `rationalize.ts` — conjugate rationalization 1/(a+b√k) and denesting √(a±√b).
  - `expand.ts` — full polynomial expansion (used by solvers).
  - `order.ts` — canonical ordering of terms/factors.
  - `sign.ts` — sign helpers; `arithmetic.ts` — `sumOf`/`productOf`/`quotientOf`... wrappers on simplified input.
  - `functions/` — **one file per function family**, each a `FunctionDefinition` (`types.ts`): exact `simplify` + float `evaluate`. `trig.ts` (+ exact table `trigTable.ts`), `inverseTrig.ts`, `logarithm.ts` (ln, log_b), `abs.ts`, `factorial.ts`. Register new functions in `registry.ts`; `apply.ts` runs them.
- `evaluate/evaluate.ts` — float evaluation (decimal mode, sign checks, verification); real odd roots of negatives.
- `solve/` — equation solving in one unknown:
  - `solveEquation.ts` — entry point: runs strategies in order, verifies against the original equation, dedupes, normalizes periodic solutions, finds excluded points.
  - `types.ts` — `Solution` (exact with optional period, or approximate), `SolveOutcome`, `Strategy`.
  - `verify.ts` — plug-back check and numeric identity test.
  - `strategies/` — one file per method: `polynomial.ts`, `rational.ts` (clear denominators), `isolate.ts` (unknown appears once; undo operations), `logarithm.ts` (combine logs), `substitution.ts` (u = sin x, u = e^x), `radical.ts` (raise to root index), `numeric.ts` (last resort, labelled approximate).
  - `polynomial/` — `extract.ts` (coefficients), `solvePolynomial.ts` (dispatcher), `rationalRoots.ts`, `quadratic.ts`, `cubic.ts` (Cardano/trig form), `pureRoots.ts` (xⁿ = c), `numericRoots.ts` (Durand–Kerner).
  - `inverses/` — per-function inverse rules for isolation (`trig.ts` general solutions, `inverseTrig.ts`, `logarithm.ts`, `abs.ts`; registry in `index.ts`).
- `format/` — `toLatex.ts` (exact printing; sums whose terms share a rational or symbolic denominator print as one fraction, e.g. (8+√2+4√6)/(2e); ± pairs), `toDecimal.ts` (exact rational digits, 12 sig. figs), `decimalize.ts` (decimal coefficients in expressions with variables), `formatSolutions.ts` (solution lines for both modes).

### `tests/` (mirrors `src/math/`)
- `vitest.config.ts` — single entry for `pnpm test`; `helpers.ts` — `simplifyLatex`, `solveLatex`, `parseExpr`.
- `math/number`, `math/parse`, `math/operations` (+ `functions/`), `math/evaluate`, `math/format`, `math/transform`, `math/workspace` (shared variables, order independence, cycles, duplicates), `math/solve/polynomial`, `math/solve/strategies`, `math/solve/solveEquation.test.ts`, `math/calculate.test.ts`.
- `ui/state/undoHistory.test.ts`, `ui/state/lines.test.ts`, `ui/keypad/layout.test.ts` (every keypad group fills whole rows; every tab has Enter).

## Behaviour notes / limits
- Angles default to radians; DEG switches trig input/output to degrees (solutions get period 360).
- Real numbers only: even roots of negatives are errors; quadratics with Δ < 0 report "No real solution".
- `e` is always Euler's number; single letters are variables; `x_{1}` and greek letters are variables too.
- An expression with exactly one variable also shows where it equals 0.
- Exact solving covers: polynomials (rational roots, quadratic, cubic, xⁿ = c, xⁿ substitution), rational, radical, exp/log, abs, trig (general solutions with period, n ∈ ℤ). Anything else falls back to numeric roots in [-100, 100], clearly labelled approximate.
- A variable used by other lines must have one exact value; one with several solutions (x² = 4), a periodic family, or only approximate values shows its solutions on its own line but gives an explanatory error where it's used. A definition may keep free variables (`y = 2t`).
- Not yet supported: inequalities, systems of equations solved together (they're reported as circular), complex numbers, functions like f(x).
