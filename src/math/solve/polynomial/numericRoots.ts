// Durand–Kerner iteration: finds all complex roots of a polynomial at once.
// Used only when no exact method applies; results are labelled approximate.

type Complex = { re: number; im: number };

const MAX_ITERATIONS = 500;
const CONVERGENCE = 1e-14;
// A root counts as real when its imaginary part is this small relative to its size.
const REAL_TOLERANCE = 1e-7;

function multiply(first: Complex, second: Complex): Complex {
  return { re: first.re * second.re - first.im * second.im, im: first.re * second.im + first.im * second.re };
}

function divide(first: Complex, second: Complex): Complex {
  const scale = second.re * second.re + second.im * second.im;
  return {
    re: (first.re * second.re + first.im * second.im) / scale,
    im: (first.im * second.re - first.re * second.im) / scale,
  };
}

function evaluateMonic(monic: number[], point: Complex): Complex {
  let result: Complex = { re: 1, im: 0 };
  for (let index = monic.length - 2; index >= 0; index--) {
    result = multiply(result, point);
    result.re += monic[index];
  }
  return result;
}

/**
 * Approximate real roots of a polynomial.
 *
 * Args:
 *   coefficients: float coefficients, low -> high degree, leading coefficient non-zero
 *
 * Returns:
 *   Real roots sorted ascending (repeated roots may appear once or several times).
 */
export function approximateRealRoots(coefficients: number[]): number[] {
  const degree = coefficients.length - 1;
  if (degree < 1) return [];
  const leading = coefficients[degree];
  const monic = coefficients.map((coefficient) => coefficient / leading);
  // Standard starting points: powers of a complex number that isn't a root of unity.
  let roots: Complex[] = Array.from({ length: degree }, (_, index) => {
    const seed: Complex = { re: 0.4, im: 0.9 };
    let point: Complex = { re: 1, im: 0 };
    for (let step = 0; step < index; step++) point = multiply(point, seed);
    return point;
  });
  for (let iteration = 0; iteration < MAX_ITERATIONS; iteration++) {
    let largestStep = 0;
    roots = roots.map((root, index) => {
      let denominator: Complex = { re: 1, im: 0 };
      roots.forEach((other, otherIndex) => {
        if (otherIndex !== index) denominator = multiply(denominator, { re: root.re - other.re, im: root.im - other.im });
      });
      const step = divide(evaluateMonic(monic, root), denominator);
      largestStep = Math.max(largestStep, Math.hypot(step.re, step.im));
      return { re: root.re - step.re, im: root.im - step.im };
    });
    if (largestStep < CONVERGENCE) break;
  }
  return roots
    .filter((root) => Math.abs(root.im) <= REAL_TOLERANCE * Math.max(1, Math.abs(root.re)))
    .map((root) => root.re)
    .sort((first, second) => first - second);
}
