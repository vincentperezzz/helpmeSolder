export type ModuleTerminalPoint = { x: number; y: number };

export type ModuleAsset = {
  src: string;
  width: number;
  height: number;
  caption: string;
  license: string;
  /** SVG user units matching the file viewBox; keys are catalog pin ids. */
  terminals?: Record<string, ModuleTerminalPoint>;
};

/**
 * Visual assets for module wiring diagrams (sensors/probes without Wokwi).
 * Coordinates are in SVG user units matching each file's viewBox.
 */
export const moduleAssets: Record<string, ModuleAsset> = {
  "module.soil.moisture": {
    src: "/assets/modules/soil-moisture-capacitive.svg",
    width: 80,
    height: 210,
    caption: "Capacitive soil moisture sensor",
    license: "CC0 - HelpmeSolder original SVG",
    terminals: {
      VCC: { x: 48, y: 42 },
      GND: { x: 72, y: 42 },
      AO: { x: 96, y: 42 },
      DO: { x: 120, y: 42 },
    },
  },
};

export function getModuleAsset(id: string): ModuleAsset | undefined {
  return moduleAssets[id];
}
