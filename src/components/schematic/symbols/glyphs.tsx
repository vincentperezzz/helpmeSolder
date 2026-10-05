import type { ReactElement } from "react";
import type { SymbolKind } from "@/lib/schematic/types";

type GlyphProps = { voltageText?: string };

function Resistor() {
  return <path d="M0 10H10L14 2L22 18L30 2L38 18L46 2L50 10H60" />;
}

function Led() {
  return (
    <>
      <path d="M0 22H24M24 13L40 22L24 31ZM40 13V31M40 22H60" />
      <path d="M30 9L38 1M38 1H33M38 1V6M38 11L46 3M46 3H41M46 3V8" />
    </>
  );
}

function Diode() {
  return <path d="M0 12H24M24 3L40 12L24 21ZM40 3V21M40 12H60" />;
}

function Capacitor() {
  return <path d="M0 14H26M26 3V25M34 3V25M34 14H60" />;
}

function Potentiometer() {
  return (
    <>
      <path d="M0 28H10L14 20L22 36L30 20L38 36L46 20L50 28H60" />
      <path d="M30 0V16M26 9L30 16L34 9" />
    </>
  );
}

function Pushbutton() {
  return (
    <>
      <path d="M0 10H10V30H0M60 10H50V30H60M10 20H18M50 20H42M18 20L40 11M30 4V15M24 4H36" />
      <circle cx={18} cy={20} r={1.8} />
      <circle cx={42} cy={20} r={1.8} />
    </>
  );
}

function Battery() {
  return (
    <>
      <path d="M0 16H18M18 4V28M26 10V22M34 4V28M42 10V22M42 16H60" />
      <path d="M26 10V22M42 10V22" strokeWidth={3.4} />
      <path d="M8 8H14M11 5V11M47 8H53" />
    </>
  );
}

function UsbSupply({ voltageText }: GlyphProps) {
  return (
    <>
      <circle cx={20} cy={32} r={14} />
      <path d="M20 0V18M20 46V64M25 10H31M28 7V13M25 54H31" />
      <text
        x={20}
        y={36}
        textAnchor="middle"
        fontSize={10}
        fontWeight={600}
        fill="currentColor"
        stroke="none"
      >
        {voltageText ?? "5V"}
      </text>
    </>
  );
}

export const GLYPHS: Record<Exclude<SymbolKind, "block">, (props: GlyphProps) => ReactElement> = {
  resistor: Resistor,
  led: Led,
  diode: Diode,
  capacitor: Capacitor,
  potentiometer: Potentiometer,
  pushbutton: Pushbutton,
  battery: Battery,
  "usb-supply": UsbSupply,
};
