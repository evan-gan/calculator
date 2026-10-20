/** Per-axis options from the settings menu. */
export interface AxisSettings {
  visible: boolean;
  /** Written by the positive end of the axis; empty for none. */
  label: string;
  /** Gridline spacing in graph units, or null for automatic. */
  step: number | null;
}

export type GridType = 'cartesian' | 'polar';
export type TextSize = 'normal' | 'large';

/** How the graph paper is drawn (everything in the wrench menu except the view ranges and angle mode). */
export interface GraphSettings {
  /** Large makes labels and curves bigger, for projectors and screenshots. */
  textSize: TextSize;
  showGrid: boolean;
  gridType: GridType;
  showAxisNumbers: boolean;
  showMinorGridlines: boolean;
  showArrows: boolean;
  xAxis: AxisSettings;
  yAxis: AxisSettings;
  /** Stop dragging and zooming from moving the view (tracing points still works). */
  lockViewport: boolean;
}

export function defaultGraphSettings(): GraphSettings {
  return {
    textSize: 'normal',
    showGrid: true,
    gridType: 'cartesian',
    showAxisNumbers: true,
    showMinorGridlines: true,
    showArrows: false,
    xAxis: { visible: true, label: '', step: null },
    yAxis: { visible: true, label: '', step: null },
    lockViewport: false,
  };
}

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;

/** Keep only well-typed fields from saved data, so an old or edited save can't break drawing. */
function mergeAxis(fallback: AxisSettings, saved: unknown): AxisSettings {
  if (!isRecord(saved)) return fallback;
  const step = saved.step;
  return {
    visible: typeof saved.visible === 'boolean' ? saved.visible : fallback.visible,
    label: typeof saved.label === 'string' ? saved.label : fallback.label,
    step: typeof step === 'number' && Number.isFinite(step) && step > 0 ? step : null,
  };
}

/**
 * Settings from saved data, falling back to the default for anything missing or malformed.
 *
 * Args:
 *   saved: parsed JSON from storage (any shape)
 *
 * Returns:
 *   Complete, valid settings.
 */
export function mergeGraphSettings(saved: unknown): GraphSettings {
  const settings = defaultGraphSettings();
  if (!isRecord(saved)) return settings;
  for (const key of ['showGrid', 'showAxisNumbers', 'showMinorGridlines', 'showArrows', 'lockViewport'] as const) {
    if (typeof saved[key] === 'boolean') settings[key] = saved[key];
  }
  if (saved.textSize === 'normal' || saved.textSize === 'large') settings.textSize = saved.textSize;
  if (saved.gridType === 'cartesian' || saved.gridType === 'polar') settings.gridType = saved.gridType;
  settings.xAxis = mergeAxis(settings.xAxis, saved.xAxis);
  settings.yAxis = mergeAxis(settings.yAxis, saved.yAxis);
  return settings;
}

const STORAGE_KEY = 'exact-calculator:graph-settings';

// Storage can be unavailable (private mode, blocked site data); the defaults are used then.
export function loadGraphSettings(): GraphSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return mergeGraphSettings(raw ? JSON.parse(raw) : null);
  } catch (error) {
    console.warn('Could not read saved graph settings; using the defaults.', error);
    return defaultGraphSettings();
  }
}

export function saveGraphSettings(settings: GraphSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch (error) {
    console.warn('Could not save graph settings (browser storage unavailable).', error);
  }
}
