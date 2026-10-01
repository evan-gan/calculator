// Keypad layout as data. To add or move a key, edit the tabs below; Keypad.svelte renders them.

/** What pressing a key does. Editing actions go to the math field; the rest are handled by the app. */
export type KeyAction =
  | { type: 'write'; latex: string } // insert fixed LaTeX, cursor ends after it
  | { type: 'cmd'; command: string } // insert a structure (wraps any selection)
  | { type: 'typed'; text: string } // simulate typing, so auto-commands like sin( fire
  | { type: 'keystroke'; key: string } // Left, Right, Backspace...
  | { type: 'ans' } // insert the previous answer
  | { type: 'shift' } // toggle upper-case letters (handled inside the keypad)
  | { type: 'submit' };

/** number = dark grey digit keys, plain = white keys, control = grey editing keys, accent = blue Enter. */
export type KeyVariant = 'number' | 'plain' | 'control' | 'accent';

/** How a key's face is drawn: plain text, text with super/prefix scripts, or a small fraction. */
export type KeyLabel =
  | string
  | { base: string; sup?: string; sub?: string; preSup?: string; italic?: boolean }
  | { numerator: string; denominator: string };

export interface KeyDefinition {
  label: KeyLabel;
  /** Spoken name for screen readers. */
  ariaLabel: string;
  action: KeyAction;
  variant: KeyVariant;
  /** Grid columns this key covers (default 1). */
  span?: number;
  /** Version of this key used while Shift is on (letters only). */
  shifted?: KeyDefinition;
}

/** Empty space in a grid, `span` columns wide. */
export type KeySpacer = { spacer: number };
export type KeySlot = KeyDefinition | KeySpacer;

/** A block of keys laid out on a grid with a fixed number of columns. */
export interface KeyGroup {
  columns: number;
  slots: KeySlot[];
}

export type KeypadTabId = 'main' | 'abc' | 'func';

export interface KeypadTab {
  id: KeypadTabId;
  label: string;
  groups: KeyGroup[];
}

export function isSpacer(slot: KeySlot): slot is KeySpacer {
  return 'spacer' in slot;
}

// ---- key builders ----

const typed = (label: KeyLabel, text: string, ariaLabel: string, variant: KeyVariant = 'plain'): KeyDefinition => ({
  label,
  ariaLabel,
  action: { type: 'typed', text },
  variant,
});

const write = (label: KeyLabel, latex: string, ariaLabel: string, variant: KeyVariant = 'plain'): KeyDefinition => ({
  label,
  ariaLabel,
  action: { type: 'write', latex },
  variant,
});

const command = (label: KeyLabel, commandText: string, ariaLabel: string): KeyDefinition => ({
  label,
  ariaLabel,
  action: { type: 'cmd', command: commandText },
  variant: 'plain',
});

const withSpan = (key: KeyDefinition, span: number): KeyDefinition => ({ ...key, span });

const digit = (value: string) => typed(value, value, value, 'number');

const letter = (value: string): KeyDefinition => ({
  ...write({ base: value, italic: true }, value, value),
  shifted: write({ base: value.toUpperCase(), italic: true }, value.toUpperCase(), `capital ${value}`),
});

// ---- shared keys ----

const SQUARE = write({ base: 'a', sup: '2', italic: true }, '^{2}', 'squared');
const POWER = command({ base: 'a', sup: 'b', italic: true }, '^', 'power');
const ABS = typed('|a|', '|', 'absolute value');
const SQRT = command('√', '\\sqrt', 'square root');
const NTH_ROOT = command({ base: '√', preSup: 'n' }, '\\nthroot', 'nth root');
const PI = command('π', '\\pi', 'pi');
const E = write({ base: 'e', italic: true }, 'e', 'e');
const X = write({ base: 'x', italic: true }, 'x', 'x');
const EQUALS = write('=', '=', 'equals');
const OPEN = typed('(', '(', 'open parenthesis');
const CLOSE = typed(')', ')', 'close parenthesis');
const FACTORIAL = write('!', '!', 'factorial');
const LEFT: KeyDefinition = { label: '←', ariaLabel: 'move left', action: { type: 'keystroke', key: 'Left' }, variant: 'control' };
const RIGHT: KeyDefinition = { label: '→', ariaLabel: 'move right', action: { type: 'keystroke', key: 'Right' }, variant: 'control' };
const BACKSPACE: KeyDefinition = { label: '⌫', ariaLabel: 'backspace', action: { type: 'keystroke', key: 'Backspace' }, variant: 'control' };
const ENTER: KeyDefinition = { label: '↵', ariaLabel: 'enter', action: { type: 'submit' }, variant: 'accent' };
const SHIFT: KeyDefinition = { label: '⇧', ariaLabel: 'shift', action: { type: 'shift' }, variant: 'control' };

const trig = (name: string) => typed(name, `${name}(`, name);
const inverseTrig = (name: string) => typed({ base: name, sup: '−1' }, `arc${name}(`, `inverse ${name}`);

// ---- tabs ----

const MAIN_TAB: KeypadTab = {
  id: 'main',
  label: 'main',
  groups: [
    {
      columns: 3,
      slots: [SQUARE, POWER, ABS, SQRT, NTH_ROOT, PI, trig('sin'), trig('cos'), trig('tan'), OPEN, CLOSE, X],
    },
    {
      columns: 4,
      slots: [
        digit('7'), digit('8'), digit('9'), typed('÷', '/', 'divide'),
        digit('4'), digit('5'), digit('6'), typed('×', '*', 'times'),
        digit('1'), digit('2'), digit('3'), typed('−', '-', 'minus'),
        digit('0'), digit('.'), EQUALS, typed('+', '+', 'plus'),
      ],
    },
    {
      columns: 2,
      slots: [
        typed('%', '%', 'percent'),
        // Typing / makes whatever is left of the cursor the numerator, like keyboard input.
        typed({ numerator: 'a', denominator: 'b' }, '/', 'fraction'),
        LEFT,
        RIGHT,
        { label: 'ans', ariaLabel: 'previous answer', action: { type: 'ans' }, variant: 'plain' },
        BACKSPACE,
        withSpan(ENTER, 2),
      ],
    },
  ],
};

const ABC_TAB: KeypadTab = {
  id: 'abc',
  label: 'abc',
  groups: [
    {
      // 20 half-width columns so rows can be offset like a real keyboard.
      columns: 20,
      slots: [
        ...'qwertyuiop'.split('').map((value) => withSpan(letter(value), 2)),
        { spacer: 1 },
        ...'asdfghjkl'.split('').map((value) => withSpan(letter(value), 2)),
        { spacer: 1 },
        withSpan({ ...EQUALS, variant: 'control' }, 3),
        ...'zxcvbnm'.split('').map((value) => withSpan(letter(value), 2)),
        withSpan(BACKSPACE, 3),
        withSpan(SHIFT, 3),
        ...[OPEN, CLOSE, typed('[', '[', 'open bracket'), typed(']', ']', 'close bracket'), FACTORIAL, PI].map((key) =>
          withSpan(key, 2),
        ),
        withSpan(ENTER, 5),
      ],
    },
  ],
};

const FUNC_TAB: KeypadTab = {
  id: 'func',
  label: 'func',
  groups: [
    {
      columns: 3,
      slots: [
        trig('sin'), trig('cos'), trig('tan'),
        inverseTrig('sin'), inverseTrig('cos'), inverseTrig('tan'),
        trig('csc'), trig('sec'), trig('cot'),
        typed({ base: 'log', sub: 'a' }, 'log_', 'log base'),
        typed({ base: '10', sup: 'x' }, '10^', 'ten to the power'),
        FACTORIAL,
      ],
    },
    {
      columns: 3,
      slots: [
        POWER, SQRT, NTH_ROOT,
        typed({ base: 'e', sup: 'x', italic: true }, 'e^', 'e to the power'), typed('abs', 'abs(', 'absolute value'), X,
        typed('ln', 'ln(', 'natural log'), typed('log', 'log(', 'log base 10'), BACKSPACE,
        E, PI, ENTER,
      ],
    },
  ],
};

export const KEYPAD_TABS: KeypadTab[] = [MAIN_TAB, ABC_TAB, FUNC_TAB];
