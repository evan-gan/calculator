# Exact Calculator — Project Index

A static Svelte 5 + TypeScript scientific calculator that gives **exact** answers (fractions, radicals, multiples of π, exact logs/trig) with a toggle for decimals. It also **solves equations in one unknown** and returns the exact value(s) of that variable (e.g. `x² − 6x + 4 = 0` → `x = 3 ± √5`), and does **calculus**: derivatives (`d/dx` prefix), indefinite/definite/improper integrals, finite/infinite sums (Σ) and products (Π), and limits (`lim_{x→a}`, one-sided and at ±∞), exact where possible and numeric (labelled ≈) otherwise. Answers can be shown exact, as decimals, or in scientific notation (a×10ⁿ). The screen is a **list of live, editable lines**: a line can define a variable (`a = 5`, or solve one: `2x = 6`) and any other line, above or below, can use it; circular definitions are reported as errors. Input is typed with MathQuill or an on-screen keypad.

There are **two apps** sharing the math engine and the UI components: the **scientific calculator** (`index.html` → `src/scientific/`) and the **graphing app** (`graphing/index.html` → `src/graphing/`, served at `/graphing/`). The graphing app is the same editable line list (keypad hidden until the keyboard button is pressed, so phones use their own keyboard meanwhile) next to a canvas that pans (drag), zooms (wheel, pinch, +/− buttons, home), has a wrench settings menu (text size, grid on/off + square/polar, axis numbers, minor gridlines, arrows, per-axis show/label/range/step, lock viewport, radians/degrees), shows a curve point's decimal coordinates while you press on a curve, and draws every line that uses x or y: `y = f(x)`, a bare expression in x, `x = g(y)`, or an implicit curve (`x² + y² = 25`). x and y are reserved there (never defined by a line); other variables must be defined on another line (`a = 2`, then `y = ax`).

Background notes the design follows (read these before changing the math):
- `01-pressing-a-key-in-the-calculator.md` — keypress → LaTeX → parse → evaluate pipeline
- `02-exact-simplification.md` — exact rationals, radicals, trig tables, canonical forms
- `03-exact-solutions.md` — solving strategies (isolation, quadratic, rational roots, radicals, trig, logs)
- `04-mathquill-easy-typing.md` — MathQuill config and API

## Commands (pnpm)

| Command | What it does |
| --- | --- |
| `pnpm dev` | Vite dev server |
| `pnpm build` | Static build of both apps to `dist/` (`dist/index.html` calculator, `dist/graphing/index.html` graphing; relative paths, works from any folder/host) |
| `pnpm preview` | Serve the built `dist/` |
| `pnpm test` | Run the whole test suite (Vitest, config in `tests/vitest.config.ts`; excludes `tests/temp/`) |
| `pnpm test:temp` | Run throwaway exploration tests in `tests/temp/` (gitignored; prints console output) |
| `pnpm check` | svelte-check type checking |

## Architecture

Two independent halves. **The UI only imports from `src/math/index.ts`** (`evaluateWorkspace(lines)`, `calculate(latex)`, and for graphing `evaluateGraphWorkspace(lines)` + `traceCurve(plot, window, pixels)`), so the math engine has no DOM/Svelte dependencies and is fully unit-tested.

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

### Entry / app shells
- `index.html` — calculator page shell, inline SVG favicon. `graphing/index.html` — graphing page shell.
- `vite.config.ts` — multi-page build (`build.rollupOptions.input`: scientific + graphing), `base: './'` for static hosting. `svelte.config.js`, `tsconfig.json` — standard config.

### `src/scientific/` (calculator app)
- `main.ts` — mounts `ScientificApp.svelte`, imports global CSS.
- `ScientificApp.svelte` — layout only: `ExpressionList` on top, `Keypad` at the bottom (with a "graph" link). State lives in a `LineEditor` (storage key `exact-calculator:lines`); results from `evaluateWorkspace`; Exact/Decimal/Scientific and RAD/DEG.

### `src/graphing/` (graphing app — reuses `src/ui/` and `src/math/`)
- `main.ts` — mounts `GraphingApp.svelte`.
- `GraphingApp.svelte` — sidebar (link back to calculator, `KeypadToggle`, `ExpressionList` with a color swatch per graphed line) + `GraphCanvas`; keypad below when shown. Its own `LineEditor` (key `exact-calculator:graph-lines`). Owns `graphSettings` (saved) and `angleMode` (shared by the keypad toolbar and the settings menu). Results from `evaluateGraphWorkspace`; `curves` = lines with a plot. Phones (≤720px): graph on top, list below.
- `types.ts` — `GraphCurve` ({ id, colorIndex, plot }).
- `components/GraphCanvas.svelte` — the canvas: size via ResizeObserver, asks `GraphRenderer` for at most one frame per animation frame (and another frame right away while tiles are still unfinished), pointer handling: press on a curve (within 8px mouse / 20px touch) → traced point that follows that curve while held; elsewhere drag/pinch through `PointerGesture`; mouse over a curve → normal arrow cursor. Non-passive wheel zoom at the cursor. Wrench button + `ZoomControls`; the settings menu opens to their left (closes on canvas press / Escape). `moveView` ignores gestures when the viewport is locked.
- `components/ControlButton.svelte` — 40px icon button used by the wrench and `ZoomControls.svelte` (+, −, home; disabled when locked). `KeypadToggle.svelte` — show/hide keypad button.
- `components/settings/` — the wrench menu: `GraphSettingsMenu.svelte` (layout: A|A text size, Grid + `GridTypePicker.svelte` (square/polar pictures), Axis Numbers, Minor Gridlines, Arrows, two `AxisSettingsFields.svelte` (show, label, `min ≤ x ≤ max` range that follows the view, step), More Options (lock viewport, reset), Radians|Degrees), `NumberBox.svelte` (text box that commits a number on Enter/blur via `evaluateNumberInput`, accepts 2π, 1/2, √2; red when invalid), `CheckboxField.svelte`.
- `state/viewport.ts` — `Viewport` (center + `unitsPerPixelX/Y`; equal unless typed ranges differ): `homeViewport` (x from −10 to 10, square), `visibleWindow`, `viewportForWindow` (typed ranges → viewport), `toScreen`/`toGraph`, `panByPixels`, `zoomAround` (keeps the point under the cursor and the x:y ratio; clamped).
- `state/pointerGesture.ts` — `PointerGesture`: one pointer pans, two pinch-zoom around their midpoint.
- `state/graphSettings.ts` — `GraphSettings` / `AxisSettings` types, defaults, `mergeGraphSettings` (validates saved data), load/save (key `exact-calculator:graph-settings`).
- `state/nearestPoint.ts` — `nearestCurvePoint`: closest point on the polylines drawn last frame (screen distance, interpolated along segments; no math re-evaluation), optionally restricted to one curve.
- `render/graphRenderer.ts` — `GraphRenderer`: draws a `GraphFrame` (grid, curves, traced point); mid-gesture gives tracing an 8ms budget per frame; resizes the canvas buffer only when its size changes, caches the theme (re-read on scheme/text-size change), keeps `drawnCurves` for point lookup.
- `render/traceCache.ts` — **main drag optimization**: `TraceCache` traces each plot (WeakMap by plot object) in fixed tiles of the plane — 128px squares for implicit curves, 256px strips for y = f(x) / x = g(y) — at a scale rounded to 2^(1/4) steps, and keeps them (≤600 per plot). A drag only traces the tiles that come on screen (≤5ms); a zoom reuses tiles until the rounded scale changes. Tiles not traced within the frame's budget are covered by the last complete frame's curve and finished on the next frames.
- `render/drawGrid.ts` — background, `axisSteps` (typed step via `customGridSteps`, else automatic), cartesian minor/major lines, or `drawPolarGrid.ts` (circles at the x step, spokes every 15°, clipped to the view); then `drawAxes.ts` (each axis optional, arrowheads, numbers kept on screen, axis names). `render/gridLines.ts` — `gridValues`, `strokeLines`, `crispPixel`. `render/gridSteps.ts` — 1/2/5×10ⁿ spacing, `customGridSteps`, tick labels (`formatTick`, enough decimals for steps like π), `formatCoordinate` (traced point, precise to the zoom), `formatRangeValue` (6 sig. figs). `render/drawCurves.ts` — strokes polylines (clamps far-off coordinates). `render/drawTracedPoint.ts` — dot + "(x, y)" label box (flips near edges). `render/graphTheme.ts` — graph colors from CSS tokens + sizes for normal/large text (label font, curve width); a curve's color follows its line id (`curveColorIndex`, `curveColorVariable`).

### `src/styles/` (shared tokens)
- `tokens.css` — all colors/spacing/radii/fonts (incl. keypad key colors, the serif `--font-math` for key faces, and graph tokens `--color-graph-1..6` (curve colors in fixed order, validated for color-blind separation) + `--color-graph-bg/grid-minor/grid-major/axis/label`), light + dark themes. Re-skin here.
- `global.css` — resets, base styles, MathQuill color overrides.

### `src/ui/` (shared UI used by both apps)
- `types.ts` — `DisplayMode` ('exact' | 'decimal' | 'scientific'; each picks a `ResultLine` field / `SolutionDisplay` line list), `ExpressionLine` ({ id, latex }), `AppLink` (link to the other app).
- `state/lineEditor.svelte.ts` — `LineEditor` (runes class, construct during component init): lines, active line, add/delete/move focus/clear, undo/redo (an effect snapshots every change), saving under a per-app storage key. `focusHandler` is set by `ExpressionList`.
- `state/undoHistory.ts` — generic undo/redo snapshot stack (snapshots of the whole line list).
- `state/undoShortcut.ts` — `historyCommandFor(keys)`: ⌘Z/Ctrl+Z undo, ⌘⇧Z/Ctrl+Shift+Z/Ctrl+Y redo. `ExpressionList` listens on window (capture phase, so MathQuill never sees it) in both apps; plain text boxes (graph settings) keep native undo.
- `state/lines.ts` — pure list helpers: insert after, remove (keeps one line), neighbor, next id.
- `state/previousAnswer.ts` — what the `ans` key inserts (nearest numeric line above).
- `state/savedLines.ts` — keeps the lines in localStorage between visits under a given key (safe if storage is blocked).
- `mathquill/loadMathQuill.ts` — loads MathQuill 0.10 once (puts jQuery on `window` first), returns the interface.
- `mathquill/config.ts` — MathField typing options (auto commands `sqrt pi theta nthroot sum prod int infty to` — `to` types →; operator names incl. `lim`; Σ starts with `n=`). Any operator name added here must be understood by `src/math/parse/tokenize.ts`.
- `mathquill/types.ts`, `mathquill/mathquill.d.ts` — minimal typings for MathQuill.
- `keypad/keys.ts` — **keypad layout as data**: `KEYPAD_TABS` (main / abc / func / calc — d/dx, ∫, ∫ₐᵇ, Σ, Π, lim (types `lim_xto`, cursor at the point), ∞, →, dx, x, n, h), each made of grid `KeyGroup`s with key `span`s and spacers; `KeyLabel` (text, scripts, fraction); `KeyAction` (write/cmd/typed/keystroke/ans/shift/submit). Add or move keys here.
- `components/MathField.svelte` — editable MathQuill input; bindable `latex`; Enter / backspace-at-start / up / down callbacks; `applyAction()` / `focus()` (focus works even before MathQuill has loaded). Sets `inputmode="none"` on MathQuill's hidden textarea so phones don't open the system keyboard (paste/long-press still work), unless `allowSystemKeyboard` (graphing app with keypad hidden).
- `components/ExpressionList.svelte` — the editable list for a `LineEditor`: renders rows, focuses lines, optional per-row `marker` snippet, undo/redo keyboard shortcuts; exports `handleKeyAction(action)` (Enter adds a line, ans, else into the active row).
- `components/ExpressionRow.svelte` — one editable line: optional marker, MathField, live result on the right, delete button, `placeholder` text. Enter adds a line below, backspace on an empty line deletes it, ↑/↓ move between lines.
- `components/ResultView.svelte` — renders any `CalculationResult` (value, simplified + roots, solved, truth, error), right-aligned.
- `components/SolutionLines.svelte` — solution lines + notes for the chosen mode.
- `components/StaticMath.svelte` — read-only LaTeX renderer.
- `components/Keypad.svelte` — keypad panel: toolbar + the active tab's key groups; Shift state for the abc tab.
- `components/KeypadToolbar.svelte` — tabs, RAD/DEG and exact/decimal/scientific (a/b | 1.5 | ×10ⁿ) toggles, undo, redo, clear all, optional `appLink`.
- `components/KeyButton.svelte` / `KeyFace.svelte` — one key, and how its label is drawn.
- `components/SegmentedToggle.svelte` — generic segmented switch (RAD | DEG, a/b | 1.5); options may set `fontSize`/`ariaLabel`, `stretch` fills the width.

### `src/math/` (math section)
- `index.ts` — public API: `evaluateWorkspace`, `calculate`, `evaluateGraphWorkspace`, `traceCurve`, result and graph types.
- `evaluateNumber.ts` — `evaluateNumberInput(text)`: plain text like "-10", "2pi", "1/2", "√2", "1e3" → finite number or null (for settings boxes).
- `calculate.ts` — `calculate(latex, { angleMode })` for a single line, plus `parseLine`, `calculateStatement`, `errorResult` used by the workspace: decides what the input is (number / expression with variables / equation) and builds `CalculationResult` with exact + decimal + scientific LaTeX (`ResultLine`). Appends `+ C` to indefinite integrals; shows `≈` in exact mode for an integral/series with no exact value; skips the roots scan for both. Never throws.
- `workspace/` — evaluating the whole line list together:
  - `evaluateWorkspace.ts` — entry point: `prepareWorkspace` (parse all lines, assign definitions, resolve values) + `workspaceLineResult` (one line's `LineResult` = result + variable it defines); `WorkspaceOptions.reservedVariables` are never defined (graphing reserves x, y).
  - `parseLines.ts` — parse each line; `v = …` with v absent on the right is an explicit definition (left side only).
  - `assignDefinitions.ts` — which line defines which variable, order-independent: explicit definitions first, then equations with exactly one not-yet-defined variable (repeated until nothing changes). Duplicate explicit definitions are errors. Lines mentioning a reserved variable never define anything.
  - `resolveDefinitions.ts` — `DefinitionResolver`: depth-first value resolution with cycle detection ("Circular definition: a → b → a."), substitution of known values, and reasons a variable can't be used (several solutions, periodic, approximate, no solution).
  - `types.ts` — `ParsedLine`, `VariableValue`, `LineResult`.
- `graph/` — what to draw for the graphing app:
  - `types.ts` — `GraphAxes` (variable per screen axis; `DEFAULT_AXES` = x, y — change here to graph other variables), `Plot` (explicit along horizontal/vertical, or implicit F = 0), `ViewWindow`, `PixelSize`, `Polyline`, `GraphLineResult` (LineResult + plot).
  - `planPlot.ts` — statement → `Plot`: `y = f(x)` / bare expression in x → explicit; `x = g(y)` → explicit along y; otherwise implicit left − right; free non-axis variables → MathError ("a needs a value…"); numbers / expressions with y → null.
  - `evaluateGraphWorkspace.ts` — workspace with axes reserved; lines using an axis variable get substituted, planned, and a text result (empty for equations in both x and y).
  - `traceCurve.ts` — `Plot` + window + pixels → polylines (explicit: 2 samples/pixel; implicit: 4px grid cells); math errors at a point leave a gap.
  - `sampleFunction.ts` — even sampling into runs, broken at undefined points (bisects to the domain edge) and at poles/jumps (bisection: change that doesn't shrink = discontinuity).
  - `traceImplicit.ts` — marching squares (shared edge crossings, saddle resolved by the centre value; crossings where |F| grows, i.e. poles, are rejected). Tangential zeros like (x−y)² = 0 aren't found.
- `transform/angleMode.ts` — degree mode: rewrites sin(u) → sin(u·π/180) and arcsin(u) → arcsin(u)·180/π before simplifying/solving.
- `errors.ts` — `MathError` (user-facing message).
- `number/rational.ts` — exact `Rational` (BigInt, always reduced; parses decimals from text).
- `number/integer.ts` — gcd/lcm, integer roots, factorization, divisors, perfect powers.
- `number/rationalPolynomial.ts` — polynomials with Rational coefficients (low→high): add/multiply/long division, gcd, monic, Taylor shift, power-series quotient, conversion to/from `Expr`.
- `ast/nodes.ts` — `Expr` types + raw constructors (`add`, `mul`, `divide`, `sqrt`, ...). `FunctionName` = `ElementaryFunctionName` (registry functions) | `CalculusOperatorName`.
- `ast/calculus.ts` — calculus node constructors/readers (`derivative`, `integral`, `series`, `limit`, `readDerivative`, `readLimit`...), `boundVariableOf`, `infinityDirection`, `containsIndefiniteIntegral`, `containsCalculusOperator`.
- `ast/inspect.ts` — `containsVariable`, `collectVariables`, `countOccurrences`, `substituteVariable` (all bound-variable aware), `toKey` (canonical key, cached per node in a WeakMap — Expr nodes must never be mutated), `replaceSubtree`, `children`.
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
  - `multiply.ts` — products: coefficients, merge powers, cancel common factors (`cancelFactors.ts`), distribute constants over a sum.
  - `cancelFactors.ts` — fractions holding sums: pulls each sum's content (gcd of coefficients × atoms in every term) and cancels it against the other side ((mg sin θ − ma)/(mg cos θ) = (g sin θ − a)/(g cos θ)), cancels numbers/signs ((3a+6b)/(9c) = (a+2b)/(3c)), and divides sums exactly ((x²−1)/(x−1) = x+1, (a²−b²)/(a+b) = a−b). Returns null when nothing cancels, so other products keep their form.
  - `atomPolynomial.ts` — a sum read as a polynomial over "atoms" (any non-rational factor: m, sin θ, √x, e^x; x^(-3/2) = (√x)^-3, e^(-x) = (e^x)^-1): content, exact lexicographic division, back to `Expr`.
  - `expandToCancel.ts` — called by `add.ts`: multiplies out factored products in a sum only when that leaves fewer terms (a(b+c) − ab = ac; x(x+1)+1 stays).
  - `power.ts` — powers/roots: exact integer powers, radicals, (x²)^½ = |x|, (x³)^⅓ = x, roots split off whole powers (√(a²b) = |a|√b, ∛(x³y) = x∛y), constant-sum expansion.
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
- `format/` — `calculusToLatex.ts` (unevaluated ∫/Σ/Π/d/dx/lim nodes), `toLatex.ts` (exact printing; `\ln|x|`; sums whose terms share a rational or symbolic denominator print as one fraction, e.g. (8+√2+4√6)/(2e); ± pairs), `toDecimal.ts` (exact rational digits, 12 sig. figs; float noise → 0 judged relative to the size of the terms (`floatNoiseScale`, `constantToFloatLatex`; function calls follow their argument, ln divides by it), so tiny answers like 1.6×10⁻¹⁴ or sin(10⁻²⁰) keep their digits; `NumberNotation` 'decimal' switches to a×10ⁿ only past 10¹² / below 10⁻⁶, 'scientific' always), `decimalize.ts` (decimal coefficients in expressions with variables; integer coefficients stay as they are), `formatSolutions.ts` (solution lines for all three modes: `exactLines` / `decimalLines` / `scientificLines`).

### `tests/` (mirrors `src/math/`)
- `temp/` — **gitignored scratch tests** for quick experiments (`pnpm test:temp`, config `vitest.temp.config.ts`). Put temporary checks here instead of creating and deleting files elsewhere; never `rm` them. `temp/graph/graphProbe.test.ts` probes the graph workspace + trace timings. `temp/screenshots/` holds a headless-Chrome screenshot tool (`capture.mjs` — env `SCHEME`, `SETTINGS` (graph settings JSON), `WHEEL` (mouse events), `KEYS` (key events); `shoot-graphing.sh`, `shoot-settings.sh` (menu, polar, traced point, phone), `check-undo.sh` (⌘Z in a real browser); needs `pnpm build && pnpm preview --port 4173`) and its PNGs. `temp/probe.ts` runs inputs through `calculate` and saves labelled results to `temp/results/<label>.txt` (`PROBE_LABEL=05-something pnpm test:temp tests/temp/x.test.ts`) so runs can be compared later.
- `vitest.config.ts` — single entry for `pnpm test`; `helpers.ts` — `simplifyLatex`, `solveLatex`, `parseExpr`.
- `math/operations/cancelFactors.test.ts` (common factors, numbers/signs, exact division, holes still excluded when solving), `math/operations/expandToCancel.test.ts`, `math/operations/power.test.ts` (incl. roots of products with variable powers).
- `math/number` (+ `rationalPolynomial`), `math/parse` (+ `calculusParsing`, `limitParsing`), `math/ast/calculusScopes` (bound variables), `math/operations` (+ `functions/`), `math/evaluate`, `math/format`, `math/transform`, `math/workspace` (shared variables, order independence, cycles, duplicates, `calculusInWorkspace`), `math/solve/polynomial`, `math/solve/strategies`, `math/solve/solveEquation.test.ts`, `math/solve/linearSystem.test.ts`, `math/calculate.test.ts`.
- `math/calculus/` — `differentiate`, `definiteIntegral`, `numericIntegral`, `antiderivativeLimits`, `readRationalFunction`, `calculateCalculus` (+ C, ≈ display), `integrate/` (`table`, `rationalFunction`, `partialFractions`, `realFactors`, `trigPowers`, `exponentialTrig`, `substitution`, `byParts`), `series/` (`finiteSums`, `infiniteSums`, `telescoping`, `infiniteProducts`, `numericSeries`, `bernoulli`), `limit/` (`limitOperator` — on-screen results, sides, errors, workspace; `indeterminateForms`; `numericLimit`; `rationalLimit`; `growth`).
- `math/graph/` — `planPlot`, `evaluateGraphWorkspace`, `sampleFunction`, `traceImplicit`, `traceCurve`; `math/workspace/reservedVariables.test.ts`.
- `graphing/state/` (`viewport`, `pointerGesture`, `nearestPoint`, `graphSettings`), `graphing/render/` (`gridSteps` incl. custom steps and coordinate formats, `traceCache`).
- `math/format/tinyValues.test.ts` (tiny irrational answers and tiny function values aren't shown as 0; real cancellation noise still is).
- `math/format/scientificNotation.test.ts` (scientific mode: numbers, rounding carry, expressions, solution lines).
- `math/evaluateNumber.test.ts`; `ui/state/undoShortcut.test.ts`.
- `ui/state/undoHistory.test.ts`, `ui/state/lines.test.ts`, `ui/state/previousAnswer.test.ts`, `ui/keypad/layout.test.ts` (every keypad group fills whole rows; every tab has Enter).

## Behaviour notes / limits
- Angles default to radians; DEG switches trig input/output to degrees (solutions get period 360).
- Scientific mode (×10ⁿ) writes every number as a×10ⁿ, including ×10⁰ (7 → 7×10⁰); 0, ∞ and integer coefficients next to variables (2x) are left as they are. It uses the same = / ≈ as decimal mode.
- Inverse trig is typed as arcsin/arccos/arctan (or sin⁻¹) but printed as sin⁻¹/cos⁻¹/tan⁻¹ (`latex` in `inverseTrig.ts`; powers of them get parentheses in `toLatex.ts`).
- Fractions cancel common factors, like x/x = 1: (x²−1)/(x−1) shows x+1 and graphs without the hole at x = 1; equations still reject such points because solutions are checked against the original input. Cancelling is sound but not complete: atoms are treated as independent, so identities like sin²θ + cos²θ = 1 aren't used, and only pairs of sums are divided ((x+1)(x−1)/(x²−1) works through the pair x+1 | x²−1).
- Real numbers only: even roots of negatives are errors; quadratics with Δ < 0 report "No real solution".
- `e` is always Euler's number; single letters are variables; `x_{1}` and greek letters are variables too.
- An expression with exactly one variable also shows where it equals 0.
- Exact solving covers: polynomials (rational roots, quadratic, cubic, xⁿ = c, xⁿ substitution), rational, radical, exp/log, abs, trig (general solutions with period, n ∈ ℤ). Anything else falls back to numeric roots in [-100, 100], clearly labelled approximate.
- A variable used by other lines must have one exact value; one with several solutions (x² = 4), a periodic family, or only approximate values shows its solutions on its own line but gives an explanatory error where it's used. A definition may keep free variables (`y = 2t`).
- Calculus: `d/dx`, Σ, Π and lim act on the term after them (`d/dx x² + 1 = 2x + 1`); use parentheses or a fraction for more. Indefinite integrals show `+ C` (a line defining a variable from one stores the antiderivative without C). Integration covers standard forms of linear arguments, rational functions (rational roots, then real factors with radical coefficients: quadratics, (x+h)³+k, Ferrari-splittable quartics like x⁴+1, repeated factors), powers/products of trig functions, b^(ax)·sin/cos(bx), u-substitution, and parts for polynomial × exp/trig/log/inverse-trig; otherwise indefinite → error, definite → numeric ≈. Infinite sums: exact for geometric, even p-series, xⁿ/n!, telescoping rational terms; others numeric ≈ when convergence can be established. Infinite products: exact for rational factors whose Γ ratios are rational or involve √π (Wallis) and for b^g(n); divergence is detected; others numeric ≈.
- Limits: two-sided unless written `a^{+}` / `a^{-}`; results can be ±∞ (shown in both modes). If only one side is defined (√x at 0) that side is used. No exact answer → ≈ from Richardson extrapolation; if that doesn't settle either → "Couldn't find this limit". Exact answers with no other variables are cross-checked numerically and dropped if they disagree.
- Graphing: x and y can't be defined by lines; curves keep their color by line id; implicit curves are traced on a 4px grid, so very thin features or tangential zeros can be missed. Traced-point coordinates come from the drawn samples (interpolated), not re-evaluated. Zooming past a scale step retraces implicit curves over a few frames (the previous curve stays drawn meanwhile). Not yet: sliders for free variables, intersection/extremum points, polar/parametric equations (the polar *grid* exists), tracing in a Web Worker.
- Not yet supported: inequalities, systems of equations solved together (they're reported as circular), complex numbers, functions like f(x), partial derivatives, infinite products with irreducible factors that aren't shifts of each other (Π(1+1/n²) is ≈ only), limits needing more than ~6 L'Hôpital steps.
