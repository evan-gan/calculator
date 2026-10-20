import { describe, expect, test } from 'vitest';
import { DEFAULT_AXES } from '../../../src/math';
import { toLatex } from '../../../src/math/format/toLatex';
import { planPlot } from '../../../src/math/graph/planPlot';
import { MathError } from '../../../src/math/errors';
import { parseLatex } from '../../../src/math/parse/parser';

const plan = (latex: string) => planPlot(parseLatex(latex), DEFAULT_AXES);

describe('planPlot: deciding how to draw a line', () => {
  test('y = f(x) is drawn as a function of x, simplified', () => {
    const plot = plan('y=2x+x');
    expect(plot).toMatchObject({ kind: 'explicit', along: 'horizontal', input: 'x' });
    expect(toLatex(plot!.expr)).toBe('3 x');
  });

  test('f(x) = y (reversed sides) is also explicit', () => {
    expect(plan('x^{2}=y')).toMatchObject({ kind: 'explicit', along: 'horizontal', input: 'x' });
  });

  test('a bare expression in x is graphed as y = expression', () => {
    expect(plan('x^{2}-4')).toMatchObject({ kind: 'explicit', along: 'horizontal', input: 'x' });
  });

  test('x = g(y) is drawn sideways, as a function of y', () => {
    expect(plan('x=\\sin y')).toMatchObject({ kind: 'explicit', along: 'vertical', input: 'y' });
  });

  test('x = 3 is a vertical line drawn as a function of y', () => {
    expect(plan('x=3')).toMatchObject({ kind: 'explicit', along: 'vertical', input: 'y' });
  });

  test('an equation where neither side is a lone axis variable is implicit', () => {
    const plot = plan('x^{2}+y^{2}=25');
    expect(plot).toMatchObject({ kind: 'implicit', horizontal: 'x', vertical: 'y' });
  });

  test('y = y + x (y on both sides) falls back to implicit', () => {
    expect(plan('y=y^{2}+x')).toMatchObject({ kind: 'implicit' });
  });

  test('plain numbers are not graphed', () => {
    expect(plan('2+2')).toBeNull();
  });

  test('an expression using y is not graphed', () => {
    expect(plan('x+y')).toBeNull();
  });

  test('a variable with no value is an error naming it', () => {
    expect(() => plan('y=ax')).toThrow(MathError);
    expect(() => plan('y=ax')).toThrow('a needs a value');
  });

  test('other axis names can be used', () => {
    const plot = planPlot(parseLatex('s=t^{2}'), { horizontal: 't', vertical: 's' });
    expect(plot).toMatchObject({ kind: 'explicit', along: 'horizontal', input: 't' });
  });
});
