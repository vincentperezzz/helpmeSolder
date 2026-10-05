import type { BatteryKind } from "@/lib/catalog/batteries";
import { getBatteryAsset } from "@/lib/catalog/batteries";

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
          <text x="62" y="12" textAnchor="middle" fontFamily="ui-monospace, monospace" fontSize="11" fill="#212121">
            −
          </text>
          <rect x="90" y="14" width="16" height="16" rx="2" fill="#c62828" stroke="#8e0000" strokeWidth="1.5" />
          <rect x="94" y="18" width="8" height="8" rx="1" fill="#ef5350" />
          <text x="98" y="12" textAnchor="middle" fontFamily="ui-monospace, monospace" fontSize="11" fill="#c62828">
            +
          </text>
        </svg>
        <p className="mt-1 font-mono text-[9px] text-mute">{asset.caption}</p>
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
          <text x="50" y="100" textAnchor="middle" fontFamily="ui-monospace, monospace" fontSize="11" fill="#5d4037">
            AA
          </text>
          <text x="110" y="100" textAnchor="middle" fontFamily="ui-monospace, monospace" fontSize="11" fill="#5d4037">
            AA
          </text>
          <rect x="68" y="10" width="24" height="12" rx="2" fill="#c62828" stroke="#8e0000" strokeWidth="1.5" />
          <circle cx="80" cy="16" r="5" fill="#ef5350" />
          <text x="80" y="8" textAnchor="middle" fontFamily="ui-monospace, monospace" fontSize="11" fill="#c62828">
            +
          </text>
          <path d="M50 28 V16 H68" fill="none" stroke="#c62828" strokeWidth="2" />
          <path d="M110 28 V16 H92" fill="none" stroke="#c62828" strokeWidth="2" />
          <rect x="62" y="142" width="36" height="10" rx="2" fill="#212121" stroke="#000" strokeWidth="1.5" />
          <text x="80" y="164" textAnchor="middle" fontFamily="ui-monospace, monospace" fontSize="11" fill="#212121">
            −
          </text>
          <path d="M50 140 V147 H62" fill="none" stroke="#212121" strokeWidth="2" />
          <path d="M110 140 V147 H98" fill="none" stroke="#212121" strokeWidth="2" />
        </svg>
        <p className="mt-1 font-mono text-[9px] text-mute">{asset.caption}</p>
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
          <text x="60" y="96" textAnchor="middle" fontFamily="ui-monospace, monospace" fontSize="11" fill="#e3f2fd">
            18650
          </text>
          <circle cx="60" cy="14" r="8" fill="#c62828" stroke="#8e0000" strokeWidth="1.5" />
          <circle cx="60" cy="14" r="4" fill="#ef5350" />
          <text x="60" y="8" textAnchor="middle" fontFamily="ui-monospace, monospace" fontSize="11" fill="#c62828">
            +
          </text>
          <path d="M60 22 V28" stroke="#c62828" strokeWidth="2.5" />
          <rect x="38" y="158" width="44" height="12" rx="2" fill="#212121" stroke="#000" strokeWidth="1.5" />
          <text x="60" y="178" textAnchor="middle" fontFamily="ui-monospace, monospace" fontSize="11" fill="#212121">
            −
          </text>
          <path d="M60 152 V158" stroke="#212121" strokeWidth="2.5" />
        </svg>
        <p className="mt-1 font-mono text-[9px] text-mute">{asset.caption}</p>
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
        <text x="38" y="100" textAnchor="middle" fontFamily="ui-monospace, monospace" fontSize="10" fill="#5d4037">
          AA
        </text>
        <text x="85" y="100" textAnchor="middle" fontFamily="ui-monospace, monospace" fontSize="10" fill="#5d4037">
          AA
        </text>
        <text x="132" y="100" textAnchor="middle" fontFamily="ui-monospace, monospace" fontSize="10" fill="#5d4037">
          AA
        </text>
        <rect x="73" y="8" width="24" height="12" rx="2" fill="#c62828" stroke="#8e0000" strokeWidth="1.5" />
        <circle cx="85" cy="14" r="5" fill="#ef5350" />
        <text x="85" y="6" textAnchor="middle" fontFamily="ui-monospace, monospace" fontSize="11" fill="#c62828">
          +
        </text>
        <path d="M38 30 V14 H73" fill="none" stroke="#c62828" strokeWidth="2" />
        <path d="M85 30 V20" fill="none" stroke="#c62828" strokeWidth="2" />
        <path d="M132 30 V14 H97" fill="none" stroke="#c62828" strokeWidth="2" />
        <rect x="67" y="144" width="36" height="10" rx="2" fill="#212121" stroke="#000" strokeWidth="1.5" />
        <text x="85" y="166" textAnchor="middle" fontFamily="ui-monospace, monospace" fontSize="11" fill="#212121">
          −
        </text>
        <path d="M38 140 V149 H67" fill="none" stroke="#212121" strokeWidth="2" />
        <path d="M85 140 V144" fill="none" stroke="#212121" strokeWidth="2" />
        <path d="M132 140 V149 H103" fill="none" stroke="#212121" strokeWidth="2" />
      </svg>
      <p className="mt-1 font-mono text-[9px] text-mute">{asset.caption}</p>
    </div>
  );
}

export function UsbWallVisual({
  connector = "micro-usb",
}: {
  connector?: "usb-c" | "micro-usb";
}) {
  const isUsbC = connector === "usb-c";
  return (
    <svg viewBox="0 0 160 118" width={160} height={118} role="img" aria-label="USB wall adapter">
      <rect x="14" y="10" width="70" height="52" rx="6" fill="#eceff1" stroke="#546e7a" strokeWidth="1.5" />
      <rect x="24" y="20" width="18" height="10" rx="1" fill="#90a4ae" />
      <rect x="48" y="20" width="18" height="10" rx="1" fill="#90a4ae" />
      <text x="24" y="50" fontFamily="ui-monospace, monospace" fontSize="9" fill="#37474f">
        USB WALL
      </text>
      <path d="M84 36 H112" stroke="#212121" strokeWidth="3" />
      {isUsbC ? (
        <g>
          <rect x="112" y="26" width="34" height="20" rx="10" fill="#263238" stroke="#111" />
          <rect x="120" y="32" width="18" height="8" rx="3" fill="#cfd8dc" />
          <text x="129" y="58" textAnchor="middle" fontFamily="ui-monospace, monospace" fontSize="8" fill="#37474f">
            USB-C
          </text>
        </g>
      ) : (
        <g>
          <rect x="112" y="28" width="28" height="16" rx="2" fill="#37474f" />
          <rect x="118" y="32" width="16" height="8" rx="1" fill="#90a4ae" />
          <text x="126" y="58" textAnchor="middle" fontFamily="ui-monospace, monospace" fontSize="8" fill="#37474f">
            micro
          </text>
        </g>
      )}
      <text x="14" y="82" fontFamily="ui-monospace, monospace" fontSize="10" fill="#546e7a">
        {isUsbC ? "USB-C cable = power" : "USB cable = power"}
      </text>
      <text x="14" y="98" fontFamily="ui-monospace, monospace" fontSize="9" fill="#78909c">
        flash plug powers the board
      </text>
    </svg>
  );
}
