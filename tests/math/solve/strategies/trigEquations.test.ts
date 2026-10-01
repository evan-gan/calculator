import { describe, expect, test } from 'vitest';
import { solveLatex } from '../../../helpers';

describe('trig equations (general solutions)', () => {
  test.each([
    ['2\\sin\\left(x\\right)=\\sqrt{3}', ['x=\\frac{\\pi}{3}+2 \\pi n', 'x=\\frac{2 \\pi}{3}+2 \\pi n']],
    ['\\sin\\left(x\\right)=-\\frac{1}{2}', ['x=\\frac{7 \\pi}{6}+2 \\pi n', 'x=\\frac{11 \\pi}{6}+2 \\pi n']],
    ['\\sin\\left(x\\right)=0', ['x=\\pi n']],
    ['\\cos\\left(x\\right)=0', ['x=\\frac{\\pi}{2}+\\pi n']],
    ['\\sin\\left(2x\\right)=\\frac{1}{2}', ['x=\\frac{\\pi}{12}+\\pi n', 'x=\\frac{5 \\pi}{12}+\\pi n']],
    ['\\tan\\left(x\\right)=\\sqrt{3}', ['x=\\frac{\\pi}{3}+\\pi n']],
  ])('%s', (equation, expected) => {
    expect(solveLatex(equation).exactLines).toEqual(expected);
  });
});
