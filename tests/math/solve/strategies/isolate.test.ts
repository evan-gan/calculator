import { describe, expect, test } from 'vitest';
import { solveLatex } from '../../../helpers';

describe('isolation (unknown appears once)', () => {
  test.each([
    ['3\\sqrt{2x-1}+4=10', 'x=\\frac{5}{2}'],
    ['4^{x}=8', 'x=\\frac{3}{2}'],
    ['3^{x}=7', 'x=\\log_{3}\\left(7\\right)'],
    ['2^{x}=\\frac{1}{8}', 'x=-3'],
    ['\\ln\\left(x\\right)=2', 'x=e^{2}'],
    ['\\log\\left(x\\right)=3', 'x=1000'],
    ['\\left|x-1\\right|=3', 'x=-2,\\ 4'],
    ['\\sqrt[3]{x}=-2', 'x=-8'],
    ['x^{\\frac{2}{3}}=4', 'x=\\pm 8'],
    ['\\arcsin\\left(x\\right)=\\frac{\\pi}{6}', 'x=\\frac{1}{2}'],
    ['\\frac{1}{x}=2', 'x=\\frac{1}{2}'],
  ])('%s gives %s', (equation, expected) => {
    expect(solveLatex(equation).exactLines).toEqual([expected]);
  });

  test.each(['\\sqrt{x}=-1', 'e^{x}=0', '\\left|x\\right|=-2', '\\sin\\left(x\\right)=2'])('%s has no real solution', (equation) => {
    expect(solveLatex(equation).notes).toEqual(['No real solution.']);
  });
});
