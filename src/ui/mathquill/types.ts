// The subset of the MathQuill v0.10 API this app uses (the package ships no types).

export interface MathQuillField {
  latex(): string;
  latex(value: string): MathQuillField;
  revert(): void;
  reflow(): void;
}

export interface EditableMathField extends MathQuillField {
  write(latex: string): EditableMathField;
  cmd(command: string): EditableMathField;
  typedText(text: string): EditableMathField;
  keystroke(keys: string): EditableMathField;
  focus(): EditableMathField;
  moveToRightEnd(): EditableMathField;
  blur(): EditableMathField;
}

export interface MathFieldHandlers {
  edit?: (field: EditableMathField) => void;
  enter?: (field: EditableMathField) => void;
  deleteOutOf?: (direction: number, field: EditableMathField) => void;
  upOutOf?: (field: EditableMathField) => void;
  downOutOf?: (field: EditableMathField) => void;
}

export interface MathFieldConfig {
  spaceBehavesLikeTab?: boolean;
  leftRightIntoCmdGoes?: 'up' | 'down';
  restrictMismatchedBrackets?: boolean;
  sumStartsWithNEquals?: boolean;
  supSubsRequireOperand?: boolean;
  charsThatBreakOutOfSupSub?: string;
  autoSubscriptNumerals?: boolean;
  autoCommands?: string;
  autoOperatorNames?: string;
  handlers?: MathFieldHandlers;
}

export interface MathQuillInterface {
  MathField(element: HTMLElement, config?: MathFieldConfig): EditableMathField;
  StaticMath(element: HTMLElement): MathQuillField;
}
