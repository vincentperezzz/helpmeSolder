import type { UsbPlug } from "./types";
import { PLUG_LENGTH, PLUG_WIDTH } from "./usb-port";

/** A USB plug drawn as a small boot, body and metal tip, pointing from `back` toward `tip`. */
export function UsbPlugShape({ plug }: { plug: UsbPlug }) {
  const width = PLUG_WIDTH[plug.kind];
  const angle =
    (Math.atan2(plug.tip.y - plug.back.y, plug.tip.x - plug.back.x) * 180) / Math.PI;
  const half = width / 2;
  const rounded = plug.kind === "usb-c" ? half - 1 : 2;
  return (
    <g transform={`translate(${plug.back.x} ${plug.back.y}) rotate(${angle})`}>
      <rect x={0} y={-half - 1.5} width={7} height={width + 3} rx={2} fill="#263238" />
      <rect
        x={7}
        y={-half}
        width={PLUG_LENGTH - 13}
        height={width}
        rx={2}
        fill="#546e7a"
        stroke="#263238"
        strokeWidth={1}
      />
      <rect
        x={PLUG_LENGTH - 6}
        y={-half + 2}
        width={6}
        height={width - 4}
        rx={rounded}
        fill="#e0e6ea"
        stroke="#78909c"
        strokeWidth={0.8}
      />
    </g>
  );
}
