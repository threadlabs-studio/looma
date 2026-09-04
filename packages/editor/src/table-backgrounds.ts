export const TABLE_CELL_BACKGROUND_PRESETS = {
  none: null,
  gray: "#f3f4f6",
  yellow: "#fef3c7",
  blue: "#dbeafe",
  green: "#dcfce7",
  red: "#fee2e2",
} as const;

export const TABLE_CELL_BACKGROUND_OPTIONS = [
  { action: "background-none", label: "Default", value: TABLE_CELL_BACKGROUND_PRESETS.none, swatch: null },
  { action: "background-gray", label: "Gray", value: TABLE_CELL_BACKGROUND_PRESETS.gray, swatch: TABLE_CELL_BACKGROUND_PRESETS.gray },
  { action: "background-yellow", label: "Yellow", value: TABLE_CELL_BACKGROUND_PRESETS.yellow, swatch: TABLE_CELL_BACKGROUND_PRESETS.yellow },
  { action: "background-blue", label: "Blue", value: TABLE_CELL_BACKGROUND_PRESETS.blue, swatch: TABLE_CELL_BACKGROUND_PRESETS.blue },
  { action: "background-green", label: "Green", value: TABLE_CELL_BACKGROUND_PRESETS.green, swatch: TABLE_CELL_BACKGROUND_PRESETS.green },
  { action: "background-red", label: "Red", value: TABLE_CELL_BACKGROUND_PRESETS.red, swatch: TABLE_CELL_BACKGROUND_PRESETS.red },
] as const;

export type TableCellBackgroundAction = typeof TABLE_CELL_BACKGROUND_OPTIONS[number]["action"];
