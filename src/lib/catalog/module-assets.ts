export type ModuleTerminalPoint = { x: number; y: number };

export type ModuleAsset = {
  src: string;
  width: number;
  height: number;
  caption: string;
  terminals?: Record<string, ModuleTerminalPoint>;
  license?: string;
};

/**
 * Visual assets for module wiring diagrams (sensors, probes, etc.).
 * Coordinates are in SVG user units matching each file's viewBox.
 */
export const moduleAssets: Record<string, ModuleAsset> = {
  "module.soil.moisture": {
    src: "/assets/modules/soil-moisture-capacitive.svg",
    width: 160,
    height: 420,
    caption: "Capacitive soil moisture probe (original CC0 silhouette)",
    license: "CC0 - HelpmeSolder original SVG",
    terminals: {
      vcc: { x: 48, y: 42 },
      gnd: { x: 72, y: 42 },
      ao: { x: 96, y: 42 },
      do: { x: 120, y: 42 },
    },
  },
};

export function getModuleAsset(id: string): ModuleAsset | undefined {
  return moduleAssets[id];
}
