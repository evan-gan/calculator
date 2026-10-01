# Exact Calculator — Project Index

A static Svelte 5 + TypeScript scientific calculator that gives **exact** answers (fractions, radicals, multiples of π, exact logs/trig) with a toggle for decimals. It also **solves equations in one unknown** and returns the exact value(s) of that variable (e.g. `x² − 6x + 4 = 0` → `x = 3 ± √5`), and does **calculus**: derivatives (`d/dx` prefix), indefinite/definite/improper integrals, finite/infinite sums (Σ) and products (Π), and limits (`lim_{x→a}`, one-sided and at ±∞), exact where possible and numeric (labelled ≈) otherwise. The screen is a **list of live, editable lines**: a line can define a variable (`a = 5`, or solve one: `2x = 6`) and any other line, above or below, can use it; circular definitions are reported as errors. Input is typed with MathQuill or an on-screen keypad.

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
| `pnpm test` | Run the whole test suite (Vitest, config in `tests/vitest.config.ts`; excludes `tests/temp/`) |
| `pnpm test:temp` | Run throwaway exploration tests in `tests/temp/` (gitignored; prints console output) |
| `pnpm check` | svelte-check type checking |

## Architecture

Two independent halves. **The UI only imports from `src/math/index.ts`** (`evaluateWorkspace(lines)`, `calculate(latex)`), so the math engine has no DOM/Svelte dependencies and is fully unit-tested.

```
keypress → MathQuill (LaTeX) → calculate(latex)
  → parse/tokenize → parse/parser → Expr tree
  → simplify (operations/*, calculus/*) → exact value
  → solve/solveEquation (strategies) → exact solutions, verified
  → format/* → LaTeX strings for exact + decimal modes → UI renders with MathQuill StaticMath
```

Core data type: `Expr` in `src/math/ast/nodes.ts` — `num` (exact BigInt Rational), `const` (π, e, ∞), `var`, `add`, `mul`, `pow`, `func`. Subtraction is `add` of `-1·b`; division is `pow(b, -1)`; √x is `pow(x, 1/2)`.

Calculus operators are `func` nodes named `derivative` / `integral` / `sum` / `product` / `limit` whose **second argument is the operator's variable** (a `var` node); layouts are documented in `src/math/ast/calculus.ts` (`limit` is `[body, variable, point, side]`, side 1 = a⁺, -1 = a⁻, 0 = both). The variable of a sum, product, limit or definite integral is *local* (bound): `collectVariables`, `containsVariable` and `substituteVariable` in `ast/inspect.ts` skip it. Substituting a value for a derivative's variable stores it as the evaluation point (d/dx x² at x = 3); an indefinite integral's variable is never substituted. `simplify` hands these nodes to `calculus/simplifyCalculus.ts`; `evaluate` hands them to `calculus/evaluateCalculus.ts`. One that can't be evaluated exactly stays in the tree and is shown as `≈ value`.

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
- `mathquill/config.ts` — MathField typing options (auto commands `sqrt pi theta nthroot sum prod int infty to` — `to` types →; operator names incl. `lim`; Σ starts with `n=`). Any operator name added here must be understood by `src/math/parse/tokenize.ts`.
- `mathquill/types.ts`, `mathquill/mathquill.d.ts` — minimal typings for MathQuill.
- `keypad/keys.ts` — **keypad layout as data**: `KEYPAD_TABS` (main / abc / func / calc — d/dx, ∫, ∫ₐᵇ, Σ, Π, lim (types `lim_xto`, cursor at the point), ∞, →, dx, x, n, h), each made of grid `KeyGroup`s with key `span`s and spacers; `KeyLabel` (text, scripts, fraction); `KeyAction` (write/cmd/typed/keystroke/ans/shift/submit). Add or move keys here.
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
- `calculate.ts` — `calculate(latex, { angleMode })` for a single line, plus `parseLine`, `calculateStatement`, `errorResult` used by the workspace: decides what the input is (number / expression with variables / equation) and builds `CalculationResult` with exact + decimal LaTeX. Appends `+ C` to indefinite integrals; shows `≈` in exact mode for an integral/series with no exact value; skips the roots scan for both. Never throws.
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
- `number/rationalPolynomial.ts` — polynomials with Rational coefficients (low→high): add/multiply/long division, gcd, monic, Taylor shift, power-series quotient, conversion to/from `Expr`.
- `ast/nodes.ts` — `Expr` types + raw constructors (`add`, `mul`, `divide`, `sqrt`, ...). `FunctionName` = `ElementaryFunctionName` (registry functions) | `CalculusOperatorName`.
- `ast/calculus.ts` — calculus node constructors/readers (`derivative`, `integral`, `series`, `limit`, `readDerivative`, `readLimit`...), `boundVariableOf`, `infinityDirection`, `containsIndefiniteIntegral`, `containsCalculusOperator`.
- `ast/inspect.ts` — `containsVariable`, `collectVariables`, `countOccurrences`, `substituteVariable` (all bound-variable aware), `toKey` (canonical key), `replaceSubtree`, `children`.
- `parse/tokenize.ts` — LaTeX → tokens (handles `\left(`, `\frac`, `\sqrt[n]`, `\operatorname`, subscripts, greek, `\int`/`\sum`/`\prod`/`\lim` as `bigOperator`, `\infty`, `\mathrm{d}`, `\to`/`\rightarrow`/→ as the `→` operator; `markLimitSides` turns `0^{+}`, `0^-`, `0+` before a `}` into a `side` token).
- `parse/parser.ts` — tokens → `Statement` (expression or `left = right`), implicit multiplication, `\sin^{2}x`, `\sin^{-1}x`, `\log_{b}`, postfix `!` and `%`. Calculus: `\frac{d}{dx}` / `\frac{d^2}{dx^2}` (acts on the following term), `\int_a^b … dx` (body runs to the differential; empty limit boxes = indefinite), `\sum_{n=a}^{b}` / `\prod` / `\lim_{x\to a}` (act on the following term), `±\infty` only as a limit. `divideIntoOperator`: MathQuill's `\frac{\lim_{x\to0}\sin x}{x}` (typing `/` after lim) becomes lim(sin x/x) when the bottom uses the operator's variable (also Σ, Π).
- `simplify/simplify.ts` — bottom-up dispatcher; delegates to `operations/`.
- `calculus/` — derivatives, integrals and series:
  - `simplifyCalculus.ts` — dispatcher called by `simplify`; `evaluateCalculus.ts` — float values for `evaluate` (numeric integral / series / limit, or evaluate the exact result).
  - `readRationalFunction.ts` — `toRationalFunction`: read an expression (sums included) as N(x)/D(x) with rational coefficients, in lowest terms with monic D. Used by integration, telescoping sums, infinite products and limits.
  - `differentiate.ts` — symbolic d/dx (sum, product, power, chain rule; FTC/Leibniz for unevaluated integrals). Per-function rules live in each `FunctionDefinition.derivative`. `derivativeOperator.ts` — d^n/dx^n node, then the evaluation point.
  - `integralOperator.ts` — indefinite (antiderivative or error) and definite integrals: exact F(b) − F(a) (with one-sided/∞ limits) **confirmed against a numeric value**; divergent → error; no antiderivative → stays unevaluated (≈).
  - `integrate/` — antiderivative engine. `antiderivative.ts` (entry `findAntiderivative`: splits sums and constant factors, tries methods in order, verifies F' = f numerically), one file per method: `table.ts` (standard forms with linear argument ax+b, sin²/sec², 1/√(a x²+c), 1/quadratic), `rationalFunction.ts` (division + `partialFractions.ts` over rational roots + `splitOverRealFactors.ts` for the rest), `trigPowers.ts` (sinᵐcosⁿ: odd power → substitution, even → reduction formula; tanⁿ/cotⁿ/secⁿ/cscⁿ reduction formulas), `exponentialTrig.ts` (b^(αx)·sin/cos(βx) closed form), `substitution.ts` (u-substitution), `byParts.ts` (polynomial × exp/trig (or an exp·trig pair), or × ln/inverse trig). Helpers: `linear.ts`, `quadratic.ts` (incl. ∫ (Bx+C)/Q^k reduction formula), `types.ts`.
    - `partialFractions.ts` — rational-root part of N/D (`factorRationalRoots` is reused by products/limits); what's over the factor without rational roots is returned as `irreducible`.
    - `realFactors.ts` — `factorOverReals`: square-free decomposition (Yun), then quadratics as-is, cubics (x+h)³+k with a cube root, quartics by Ferrari when the resolvent cubic has a rational root (x⁴+1 = (x²+√2x+1)(x²−√2x+1)); otherwise null.
    - `splitOverRealFactors.ts` — numerators of the partial fractions over those (irrational-coefficient) factors via an exact linear system, then integrates each (ln / arctan / reduction formula).
  - `antiderivativeLimits.ts` — exact limits of antiderivatives at the bounds of improper integrals: ±∞ (vanishing terms, arctan, cancelling logs) and one-sided at points (x ln x → 0). (Not the `lim` operator — that is `limit/`.)
  - `limit/` — the `lim` operator:
    - `limitOperator.ts` — entry: `simplifyLimit` (each side via `findLimit`, cross-checked against `numericLimit`; disagreeing sides / oscillation / undefined side → MathError; no exact answer → stays unevaluated, shown as ≈) and `evaluateLimit` (float value of an unevaluated lim).
    - `findLimit.ts` — recursive one-sided limit: substitution, `rationalLimit.ts` (cancel common factors / compare degrees), `growth.ts` (leading term c·|x|^p of algebraic expressions at ±∞), then sums and products; `powerAndCallLimits.ts` — u^v (constant parts, else e^(v ln u)) and f(u) (continuity, ln 0⁺ = −∞, tan poles via sin/cos, arctan(±∞), sin/cos(∞) bounded).
    - `indeterminate.ts` — 0·∞ (incl. 0/0, ∞/∞): growth hierarchy, merged exponentials, L'Hôpital on quotient forms (simpler bottom first), multiplying out; ∞ − ∞: hierarchy, common denominator, conjugate for √. `dominance.ts` — factorial ≻ exponential ≻ power ≻ log at ±∞.
    - `numericLimit.ts` — Richardson-extrapolated estimate (ignores float-cancellation zeros), divergence detection, `isDefinedNear`; `probe.ts` — signs/values next to the point, safe substitution; `types.ts` — `Approach`, `LimitResult` (finite / infinite / bounded / unknown), `LimitContext` (call budget, rewrite depth).
  - `numericIntegral.ts` — adaptive 5-point Gauss–Legendre, ∞ limits by x = a + t/(1−t), splits at breakpoints, null on divergence. `singularPoints.ts` — where the integrand blows up (zero denominators, tan/sec/csc/cot poles, log arguments), solved with `solveEquation` (cached).
  - `series/` — `seriesOperator.ts` (Σ/Π: limits validation, closed forms, Π b^g(n) = b^(Σ g), exact term-by-term up to 500 terms, else unevaluated; numeric `evaluateSeries`), `finiteSums.ts` (Faulhaber polynomial sums, geometric sums, then telescoping), `infiniteSums.ts` (geometric, even ζ(2k), Σ xⁿ/n! = eˣ, telescoping; known divergence errors), `telescoping.ts` (rational terms whose partial fractions cancel in chains, Σ 1/(n(n+1)) = 1; leftover chains → ζ tail), `infiniteProducts.ts` (Π to ∞ of rational functions via Γ ratios — factorials, Γ(1/2) = √π for Wallis — plus shifted irreducible factor pairs; convergence checks), `zeta.ts` (Σ_{m≥a} 1/m^{2k}), `numericSeries.ts` (sums: fast terms / alternating Euler averaging / Euler–Maclaurin tail; products: exp(Σ ln)), `messages.ts` (shared divergence / not-found messages), `bernoulli.ts`.
- `operations/` — **one file per operation** (edit rules here):
  - `add.ts` — sums: combine like terms and rationals.
  - `multiply.ts` — products: coefficients, merge powers, distribute constants over a sum.
  - `power.ts` — powers/roots: exact integer powers, radicals, (x²)^½ = |x|, constant-sum expansion.
  - `radicals.ts` — integer radicals as prime exponents (√72 = 6√2, rationalizes √2/2).
  - `rationalize.ts` — conjugate rationalization 1/(a+b√k) and denesting √(a±√b).
  - `expand.ts` — full polynomial expansion (used by solvers).
  - `order.ts` — canonical ordering of terms/factors.
  - `sign.ts` — sign helpers; `arithmetic.ts` — `sumOf`/`productOf`/`quotientOf`... wrappers on simplified input.
  - `functions/` — **one file per function family**, each a `FunctionDefinition` (`types.ts`): exact `simplify` + float `evaluate` + `derivative` (chain rule included). `trig.ts` (+ exact table `trigTable.ts`), `inverseTrig.ts`, `logarithm.ts` (ln, log_b), `abs.ts`, `factorial.ts`. Register new functions in `registry.ts`; `apply.ts` runs them.
- `evaluate/evaluate.ts` — float evaluation (decimal mode, sign checks, verification); real odd roots of negatives.
- `solve/linearSystem.ts` — exact Gaussian elimination with Expr entries (radicals), used by partial fractions over irrational factors.
- `solve/` — equation solving in one unknown:
  - `solveEquation.ts` — entry point: runs strategies in order, verifies against the original equation, dedupes, normalizes periodic solutions, finds excluded points.
  - `types.ts` — `Solution` (exact with optional period, or approximate), `SolveOutcome`, `Strategy`.
  - `verify.ts` — plug-back check and numeric identity test.
  - `strategies/` — one file per method: `polynomial.ts`, `rational.ts` (clear denominators), `isolate.ts` (unknown appears once; undo operations), `logarithm.ts` (combine logs), `substitution.ts` (u = sin x, u = e^x), `radical.ts` (raise to root index), `numeric.ts` (last resort, labelled approximate; coarser scan when the expression holds an unevaluated integral/series).
  - `polynomial/` — `extract.ts` (coefficients), `solvePolynomial.ts` (dispatcher), `rationalRoots.ts`, `quadratic.ts`, `cubic.ts` (Cardano/trig form), `pureRoots.ts` (xⁿ = c), `numericRoots.ts` (Durand–Kerner).
  - `inverses/` — per-function inverse rules for isolation (`trig.ts` general solutions, `inverseTrig.ts`, `logarithm.ts`, `abs.ts`; registry in `index.ts`).
- `format/` — `calculusToLatex.ts` (unevaluated ∫/Σ/Π/d/dx/lim nodes), `toLatex.ts` (exact printing; `\ln|x|`; sums whose terms share a rational or symbolic denominator print as one fraction, e.g. (8+√2+4√6)/(2e); ± pairs), `toDecimal.ts` (exact rational digits, 12 sig. figs), `decimalize.ts` (decimal coefficients in expressions with variables), `formatSolutions.ts` (solution lines for both modes).

### `tests/` (mirrors `src/math/`)
- `temp/` — **gitignored scratch tests** for quick experiments (`pnpm test:temp`, config `vitest.temp.config.ts`). Put temporary checks here instead of creating and deleting files elsewhere; never `rm` them. `temp/probe.ts` runs inputs through `calculate` and saves labelled results to `temp/results/<label>.txt` (`PROBE_LABEL=05-something pnpm test:temp tests/temp/x.test.ts`) so runs can be compared later.
- `vitest.config.ts` — single entry for `pnpm test`; `helpers.ts` — `simplifyLatex`, `solveLatex`, `parseExpr`.
- `math/number` (+ `rationalPolynomial`), `math/parse` (+ `calculusParsing`, `limitParsing`), `math/ast/calculusScopes` (bound variables), `math/operations` (+ `functions/`), `math/evaluate`, `math/format`, `math/transform`, `math/workspace` (shared variables, order independence, cycles, duplicates, `calculusInWorkspace`), `math/solve/polynomial`, `math/solve/strategies`, `math/solve/solveEquation.test.ts`, `math/solve/linearSystem.test.ts`, `math/calculate.test.ts`.
- `math/calculus/` — `differentiate`, `definiteIntegral`, `numericIntegral`, `antiderivativeLimits`, `readRationalFunction`, `calculateCalculus` (+ C, ≈ display), `integrate/` (`table`, `rationalFunction`, `partialFractions`, `realFactors`, `trigPowers`, `exponentialTrig`, `substitution`, `byParts`), `series/` (`finiteSums`, `infiniteSums`, `telescoping`, `infiniteProducts`, `numericSeries`, `bernoulli`), `limit/` (`limitOperator` — on-screen results, sides, errors, workspace; `indeterminateForms`; `numericLimit`; `rationalLimit`; `growth`).
- `ui/state/undoHistory.test.ts`, `ui/state/lines.test.ts`, `ui/keypad/layout.test.ts` (every keypad group fills whole rows; every tab has Enter).

## Behaviour notes / limits
- Angles default to radians; DEG switches trig input/output to degrees (solutions get period 360).
- Inverse trig is typed as arcsin/arccos/arctan (or sin⁻¹) but printed as sin⁻¹/cos⁻¹/tan⁻¹ (`latex` in `inverseTrig.ts`; powers of them get parentheses in `toLatex.ts`).
- Real numbers only: even roots of negatives are errors; quadratics with Δ < 0 report "No real solution".
- `e` is always Euler's number; single letters are variables; `x_{1}` and greek letters are variables too.
- An expression with exactly one variable also shows where it equals 0.
- Exact solving covers: polynomials (rational roots, quadratic, cubic, xⁿ = c, xⁿ substitution), rational, radical, exp/log, abs, trig (general solutions with period, n ∈ ℤ). Anything else falls back to numeric roots in [-100, 100], clearly labelled approximate.
- A variable used by other lines must have one exact value; one with several solutions (x² = 4), a periodic family, or only approximate values shows its solutions on its own line but gives an explanatory error where it's used. A definition may keep free variables (`y = 2t`).
- Calculus: `d/dx`, Σ, Π and lim act on the term after them (`d/dx x² + 1 = 2x + 1`); use parentheses or a fraction for more. Indefinite integrals show `+ C` (a line defining a variable from one stores the antiderivative without C). Integration covers standard forms of linear arguments, rational functions (rational roots, then real factors with radical coefficients: quadratics, (x+h)³+k, Ferrari-splittable quartics like x⁴+1, repeated factors), powers/products of trig functions, b^(ax)·sin/cos(bx), u-substitution, and parts for polynomial × exp/trig/log/inverse-trig; otherwise indefinite → error, definite → numeric ≈. Infinite sums: exact for geometric, even p-series, xⁿ/n!, telescoping rational terms; others numeric ≈ when convergence can be established. Infinite products: exact for rational factors whose Γ ratios are rational or involve √π (Wallis) and for b^g(n); divergence is detected; others numeric ≈.
- Limits: two-sided unless written `a^{+}` / `a^{-}`; results can be ±∞ (shown in both modes). If only one side is defined (√x at 0) that side is used. No exact answer → ≈ from Richardson extrapolation; if that doesn't settle either → "Couldn't find this limit". Exact answers with no other variables are cross-checked numerically and dropped if they disagree.
- Not yet supported: inequalities, systems of equations solved together (they're reported as circular), complex numbers, functions like f(x), partial derivatives, infinite products with irreducible factors that aren't shifts of each other (Π(1+1/n²) is ≈ only), limits needing more than ~6 L'Hôpital steps.
