# Exact Calculator

A year ago I tried to make a calculator that would give me exact answers to equations and wanted to see how good AI would be at making it. Spoiler alert, it was not very good and the results was a buggy half working bad looking mess. Recently as I've been watching and playing around with models I found myself wondering if the new models could achieve this. After having AI do a bit of research on a popular math writing library, MathQuill, and how to best solve LaTeX equations a few hours later I had a usable prototype with basic math functions.

A few lessons in addition to the fact that models are better nowadays:
- Coding standards for agents files can lead to readable code in formats you like to review
- Having a external non coding agent do some background research in an area and compiling it into a markdown document is pretty effective at avoiding guessing (where AI coding agents fail often)
- Have AI write lots of tests for it's own code. This avoids manual testing and most obvious bugs.

---

A scientific calculator that gives **exact** answers (fractions, radicals, multiples of π) with a toggle for decimals.

- **Exact math:** `√72` → `6√2`, `sin(π/3)` → `√3/2`
- **Solves equations** in one unknown: `x² − 6x + 4 = 0` → `x = 3 ± √5`
- **Calculus:** derivatives, integrals, sums, products and limits (exact where possible, otherwise marked ≈)
- **Live lines:** define `a = 5` on one line and use it on any other
- **Input:** type with MathQuill or use the on-screen keypad

## Getting started

Requires Node.js and [pnpm](https://pnpm.io).

```sh
pnpm install
pnpm dev      # dev server
pnpm test     # run the test suite
pnpm build    # static build to dist/
```

## Structure

```
src/
  App.svelte, main.ts   App shell
  ui/                   Components, keypad layout, MathQuill setup
  styles/               Design tokens and global CSS
  math/                 Math engine (no UI code; the UI only imports math/index.ts)
    parse/  simplify/  operations/  solve/  calculus/  workspace/  format/
tests/                  Mirrors src/
```

Flow: keypress → MathQuill (LaTeX) → parse → simplify/solve → format → result.

A file-by-file map is in [.claude/CLAUDE.md](.claude/CLAUDE.md).

## Limits

Real numbers only; no inequalities, systems of equations, or `f(x)` functions.

# Want a feature?

Open up a issue! I'm open to considering more features. I've just started with some general math solving for now.