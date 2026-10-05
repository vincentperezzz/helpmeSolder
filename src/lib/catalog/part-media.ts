import { getActiveCatalog } from "./registry";
import type { PartCategory } from "./types";

export type { PartCategory };

export function resolvePartPhoto(photoHint?: string): string | null {
  if (!photoHint) return null;
  return getActiveCatalog().media.get(photoHint) ?? null;
}

export function googleImagesLookupUrl(query: string): string {
  return `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(query)}`;
}


/** Plain-language type tag, derived from catalog kind, id and name. */
export function partCategory(part?: {
  kind?: string;
  id?: string;
  name?: string;
  photoHint?: string;
  category?: PartCategory;
}): PartCategory {
  if (!part) return "Basic part";
  if (part.category) return part.category;
  if (part.kind === "board") return "Board";
  const t = `${part.id ?? ""} ${part.photoHint ?? ""} ${part.name ?? ""}`.toLowerCase();
  if (/battery|usb-wall|power|supply|9v|18650|aa/.test(t)) return "Power";
  if (/lcd|oled|ssd1306|ili9|tft|7segment|seven|segment|bar-graph|matrix display|epaper/.test(t))
    return "Display";
  if (/button|switch|keypad|joystick|ky-040|encoder|potentiometer|ir-receiver|remote/.test(t))
    return "Input";
  if (/photoresistor|sensor|ntc|dht|pir|mpu|hc-sr|hx711|heart|sound|tilt|ds1307/.test(t))
    return "Sensor";
  if (/buzzer|servo|stepper|motor|relay|(^|[^a-z])led([^a-z]|$)|neopixel|led-ring|speaker/.test(t))
    return "Output";
  if (/resistor|breadboard|capacitor|diode|wire/.test(t)) return "Basic part";
  if (part.kind === "module") return "Sensor";
  return "Basic part";
}
