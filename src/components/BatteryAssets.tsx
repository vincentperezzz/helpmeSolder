import type { BatteryKind } from "@/lib/catalog/batteries";
import { getBatteryAsset } from "@/lib/catalog/batteries";

/** Caption line height and the width of one 13px monospace character, in diagram px. */
export const BATTERY_CAPTION_LINE = 18;
export const BATTERY_CAPTION_CHAR_W = 7.9;

/** Lines a caption wraps to inside `width` px (greedy word wrap, long words break). */
export function captionLineCount(text: string, width: number): number {
  const perLine = Math.max(1, Math.floor(width / BATTERY_CAPTION_CHAR_W));
  let lines = 1;
  let used = 0;
  for (const word of text.split(/\s+/).filter(Boolean)) {
    const len = word.length;
    if (used === 0) {
      lines += Math.floor((len - 1) / perLine);
      used = ((len - 1) % perLine) + 1;
      continue;
    }
    if (used + 1 + len <= perLine) {
      used += 1 + len;
      continue;
    }
    lines += 1;
    lines += Math.floor((len - 1) / perLine);
    used = ((len - 1) % perLine) + 1;
  }
  return lines;
}

/** Caption under a battery drawing. Wraps inside the block; its height is reserved via `batteryBlockHeight`. */
function BatteryCaption({ text }: { text: string }) {
  return (
    <p
      className="mt-1 font-mono text-[13px] text-mute"
      style={{ lineHeight: `${BATTERY_CAPTION_LINE}px`, overflowWrap: "anywhere" }}
    >
      {text}
    </p>
  );
}

export function BatteryAssetVisual({ kind }: { kind: BatteryKind }) {
  const asset = getBatteryAsset(kind);

  if (kind === "battery_9v") {
    return (
      <div style={{ width: asset.width }}>
        <svg
          viewBox="0 0 160 150"
          width={asset.width}
          height={asset.height}
          role="img"
          aria-label={asset.label}
        >
          <rect x="44" y="34" width="72" height="96" rx="6" fill="#2f3438" stroke="#1b1f22" strokeWidth="1.5" />
          <rect x="50" y="42" width="60" height="80" rx="3" fill="#3d4449" />
          <text x="80" y="88" textAnchor="middle" fontFamily="ui-monospace, monospace" fontSize="18" fontWeight="700" fill="#f5f5f5">
            9V
          </text>
          <rect x="52" y="48" width="56" height="10" rx="1" fill="#c9a227" />
          <circle cx="62" cy="22" r="7" fill="#1a1a1a" stroke="#0d0d0d" strokeWidth="1.5" />
          <circle cx="62" cy="22" r="3.2" fill="#2a2a2a" />
          <text x="44" y="27" textAnchor="middle" fontFamily="ui-monospace, monospace" fontSize="13" fill="#212121">
            −
          </text>
          <rect x="90" y="14" width="16" height="16" rx="2" fill="#c62828" stroke="#8e0000" strokeWidth="1.5" />
          <rect x="94" y="18" width="8" height="8" rx="1" fill="#ef5350" />
          <text x="118" y="27" textAnchor="middle" fontFamily="ui-monospace, monospace" fontSize="13" fill="#c62828">
            +
          </text>
        </svg>
        <BatteryCaption text={asset.caption} />
      </div>
    );
  }

  if (kind === "battery_2aa") {
    return (
      <div style={{ width: asset.width }}>
        <svg
          viewBox="0 0 160 170"
          width={asset.width}
          height={asset.height}
          role="img"
          aria-label={asset.label}
        >
          <rect x="28" y="28" width="44" height="112" rx="8" fill="#f0e6c8" stroke="#8d6e63" strokeWidth="1.5" />
          <rect x="88" y="28" width="44" height="112" rx="8" fill="#f0e6c8" stroke="#8d6e63" strokeWidth="1.5" />
          <rect x="34" y="48" width="32" height="18" rx="2" fill="#c62828" />
          <rect x="94" y="48" width="32" height="18" rx="2" fill="#c62828" />
          <text x="50" y="100" textAnchor="middle" fontFamily="ui-monospace, monospace" fontSize="13" fill="#5d4037">
            AA
          </text>
          <text x="110" y="100" textAnchor="middle" fontFamily="ui-monospace, monospace" fontSize="13" fill="#5d4037">
            AA
          </text>
          <rect x="68" y="10" width="24" height="12" rx="2" fill="#c62828" stroke="#8e0000" strokeWidth="1.5" />
          <circle cx="80" cy="16" r="5" fill="#ef5350" />
          <text x="58" y="11" textAnchor="middle" fontFamily="ui-monospace, monospace" fontSize="13" fill="#c62828">
            +
          </text>
          <path d="M50 28 V16 H68" fill="none" stroke="#c62828" strokeWidth="2" />
          <path d="M110 28 V16 H92" fill="none" stroke="#c62828" strokeWidth="2" />
          <rect x="62" y="142" width="36" height="10" rx="2" fill="#212121" stroke="#000" strokeWidth="1.5" />
          <text x="52" y="164" textAnchor="middle" fontFamily="ui-monospace, monospace" fontSize="13" fill="#212121">
            −
          </text>
          <path d="M50 140 V147 H62" fill="none" stroke="#212121" strokeWidth="2" />
          <path d="M110 140 V147 H98" fill="none" stroke="#212121" strokeWidth="2" />
        </svg>
        <BatteryCaption text={asset.caption} />
      </div>
    );
  }

  if (kind === "battery_18650") {
    return (
      <div style={{ width: asset.width }}>
        <svg
          viewBox="0 0 120 180"
          width={asset.width}
          height={asset.height}
          role="img"
          aria-label={asset.label}
        >
          <rect x="30" y="28" width="60" height="124" rx="12" fill="#1565c0" stroke="#0d47a1" strokeWidth="1.5" />
          <rect x="36" y="40" width="48" height="100" rx="6" fill="#1976d2" />
          <text x="60" y="96" textAnchor="middle" fontFamily="ui-monospace, monospace" fontSize="13" fill="#e3f2fd">
            18650
          </text>
          <circle cx="60" cy="14" r="8" fill="#c62828" stroke="#8e0000" strokeWidth="1.5" />
          <circle cx="60" cy="14" r="4" fill="#ef5350" />
          <text x="40" y="18" textAnchor="middle" fontFamily="ui-monospace, monospace" fontSize="13" fill="#c62828">
            +
          </text>
          <path d="M60 22 V28" stroke="#c62828" strokeWidth="2.5" />
          <rect x="38" y="158" width="44" height="12" rx="2" fill="#212121" stroke="#000" strokeWidth="1.5" />
          <text x="28" y="170" textAnchor="middle" fontFamily="ui-monospace, monospace" fontSize="13" fill="#212121">
            −
          </text>
          <path d="M60 152 V158" stroke="#212121" strokeWidth="2.5" />
        </svg>
        <BatteryCaption text={asset.caption} />
      </div>
    );
  }

  return (
    <div style={{ width: asset.width }}>
      <svg
        viewBox="0 0 170 170"
        width={asset.width}
        height={asset.height}
        role="img"
        aria-label={asset.label}
      >
        <rect x="18" y="30" width="40" height="110" rx="8" fill="#f0e6c8" stroke="#8d6e63" strokeWidth="1.5" />
        <rect x="65" y="30" width="40" height="110" rx="8" fill="#f0e6c8" stroke="#8d6e63" strokeWidth="1.5" />
        <rect x="112" y="30" width="40" height="110" rx="8" fill="#f0e6c8" stroke="#8d6e63" strokeWidth="1.5" />
        <rect x="23" y="48" width="30" height="16" rx="2" fill="#c62828" />
        <rect x="70" y="48" width="30" height="16" rx="2" fill="#c62828" />
        <rect x="117" y="48" width="30" height="16" rx="2" fill="#c62828" />
        <text x="38" y="100" textAnchor="middle" fontFamily="ui-monospace, monospace" fontSize="13" fill="#5d4037">
          AA
        </text>
        <text x="85" y="100" textAnchor="middle" fontFamily="ui-monospace, monospace" fontSize="13" fill="#5d4037">
          AA
        </text>
        <text x="132" y="100" textAnchor="middle" fontFamily="ui-monospace, monospace" fontSize="13" fill="#5d4037">
          AA
        </text>
        <rect x="73" y="8" width="24" height="12" rx="2" fill="#c62828" stroke="#8e0000" strokeWidth="1.5" />
        <circle cx="85" cy="14" r="5" fill="#ef5350" />
        <text x="58" y="11" textAnchor="middle" fontFamily="ui-monospace, monospace" fontSize="13" fill="#c62828">
          +
        </text>
        <path d="M38 30 V14 H73" fill="none" stroke="#c62828" strokeWidth="2" />
        <path d="M85 30 V20" fill="none" stroke="#c62828" strokeWidth="2" />
        <path d="M132 30 V14 H97" fill="none" stroke="#c62828" strokeWidth="2" />
        <rect x="67" y="144" width="36" height="10" rx="2" fill="#212121" stroke="#000" strokeWidth="1.5" />
        <text x="55" y="164" textAnchor="middle" fontFamily="ui-monospace, monospace" fontSize="13" fill="#212121">
          −
        </text>
        <path d="M38 140 V149 H67" fill="none" stroke="#212121" strokeWidth="2" />
        <path d="M85 140 V144" fill="none" stroke="#212121" strokeWidth="2" />
        <path d="M132 140 V149 H103" fill="none" stroke="#212121" strokeWidth="2" />
      </svg>
      <BatteryCaption text={asset.caption} />
    </div>
  );
}

/** Width and height of the adapter drawing, and where its USB-A socket opens (px from its top-left). */
export const USB_WALL_SIZE = { width: 130, height: 104 } as const;
export const USB_WALL_SOCKET = { x: 104, y: 50 } as const;

export function UsbWallVisual() {
  return (
    <svg
      viewBox={`0 0 ${USB_WALL_SIZE.width} ${USB_WALL_SIZE.height}`}
      width={USB_WALL_SIZE.width}
      height={USB_WALL_SIZE.height}
      role="img"
      aria-label="USB wall adapter"
    >
      <rect x="30" y="8" width="8" height="14" rx="1" fill="#90a4ae" />
      <rect x="60" y="8" width="8" height="14" rx="1" fill="#90a4ae" />
      <rect x="6" y="20" width="90" height="58" rx="8" fill="#eceff1" stroke="#546e7a" strokeWidth="1.5" />
      <text x="51" y="55" textAnchor="middle" fontFamily="ui-monospace, monospace" fontSize="13" fontWeight="700" fill="#37474f">
        5V
      </text>
      <rect x="96" y="38" width="10" height="24" rx="2" fill="#37474f" stroke="#1c262b" strokeWidth="1" />
      <rect x="99" y="44" width="7" height="12" rx="1" fill="#0d1417" />
      <text x="6" y="98" fontFamily="ui-monospace, monospace" fontSize="13" fill="#546e7a">
        USB adapter
      </text>
    </svg>
  );
}
