import jQuery from 'jquery';
import 'mathquill/build/mathquill.css';
import type { MathQuillInterface } from './types';

// MathQuill 0.10 is a classic script that reads `window.jQuery` when it runs and
// publishes `window.MathQuill`, so jQuery has to be on window before the import.

type MathQuillWindow = Window & {
  jQuery?: typeof jQuery;
  MathQuill?: { getInterface(version: number): MathQuillInterface };
};

let loading: Promise<MathQuillInterface> | null = null;

/** Load MathQuill once and share the interface between every field on the page. */
export function loadMathQuill(): Promise<MathQuillInterface> {
  loading ??= (async () => {
    const globalWindow = window as MathQuillWindow;
    globalWindow.jQuery = jQuery;
    await import('mathquill/build/mathquill.js');
    if (!globalWindow.MathQuill) {
      throw new Error('MathQuill loaded but did not register window.MathQuill');
    }
    return globalWindow.MathQuill.getInterface(2);
  })();
  return loading;
}
