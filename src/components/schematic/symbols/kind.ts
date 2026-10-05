import type { CatalogPart } from "@/lib/catalog/types";
import type { SymbolKind } from "@/lib/schematic/types";

const ID_PREFIX_KINDS: [string, SymbolKind][] = [
  ["passive.resistor.", "resistor"],
  ["passive.led.", "led"],
  ["passive.capacitor.", "capacitor"],
  ["passive.diode.", "diode"],
  ["passive.power.battery.", "battery"],
  ["passive.power.supply.", "usb-supply"],
];

const ID_EXACT_KINDS: Record<string, SymbolKind> = {
  "passive.potentiometer": "potentiometer",
  "passive.pushbutton": "pushbutton",
  "passive.power.usb_wall": "usb-supply",
  "passive.power.power_bank": "usb-supply",
};

export function getSymbolKind(catalogId: string, catalogPart?: CatalogPart): SymbolKind {
  const exact = ID_EXACT_KINDS[catalogId];
  if (exact) return exact;
  const prefixed = ID_PREFIX_KINDS.find(([prefix]) => catalogId.startsWith(prefix));
  if (prefixed) return prefixed[1];
  if (catalogPart?.electrical?.battery) return "battery";
  return "block";
}
