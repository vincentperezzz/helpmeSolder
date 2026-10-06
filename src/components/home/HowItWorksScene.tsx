import type { CSSProperties, ReactNode } from "react";
import { A } from "./motion";

/**
 * Static vector art for the storyboard. Each zone is drawn once in its own
 * local coordinates; the wide and tall scenes only place the zones and route
 * the traces between them. Every element that moves carries a "hiw-a" class
 * plus its own keyframes (see motion.ts), and rests in its composed pose
 * (see HowItWorks.css) when nothing is animating.
 */

function AskZone({ clipId }: { clipId: string }) {
  const lines = [
    { y: 46, text: "ESP32 + buzzer that", cover: A.cover1, caret: A.caret1 },
    { y: 74, text: "beeps when the soil", cover: A.cover2, caret: A.caret2 },
    { y: 102, text: "is dry", cover: A.cover3, caret: A.caret3 },
  ];
  return (
    <g className="hiw-zone hiw-zone--ask">
      <clipPath id={clipId}>
        <rect x="14" y="20" width="202" height="92" />
      </clipPath>
      <g className="hiw-a" style={A.askBubble}>
        <path
          className="hiw-bubble"
          d="M16 8H214a16 16 0 0 1 16 16V104a16 16 0 0 1-16 16H52L30 142V120H16A16 16 0 0 1 0 104V24A16 16 0 0 1 16 8Z"
        />
        <g clipPath={`url(#${clipId})`}>
          {lines.map((line) => (
            <text key={line.y} className="hiw-prompt" x="16" y={line.y}>
              {line.text}
            </text>
          ))}
          {lines.map((line) => (
            <rect
              key={`c${line.y}`}
              className="hiw-a hiw-cover"
              style={line.cover}
              x="14"
              y={line.y - 20}
              width="210"
              height="28"
            />
          ))}
          {lines.map((line) => (
            <rect
              key={`k${line.y}`}
              className="hiw-a hiw-caret"
              style={line.caret}
              x="14"
              y={line.y - 17}
              width="2.5"
              height="22"
              rx="1"
            />
          ))}
        </g>
      </g>
      <g className="hiw-a" style={A.reply}>
        <rect className="hiw-reply" x="20" y="160" width="190" height="38" rx="13" />
        <text className="hiw-reply-text" x="36" y="184">
          Planning your wiring
        </text>
      </g>
    </g>
  );
}

/**
 * Local origin is the HelpmeSolder node centre. Wide: pills sit centred under the node.
 * Tall (phone): the node sits in the right part of the column and the pills span
 * wide to its left, with the trace entering as a stub from the left edge.
 */
function PlanZone({ wide }: { wide: boolean }) {
  const pillX = wide ? -120 : -185;
  const chipX = wide ? -175 : -245;
  const chips: { cls: string; style: CSSProperties; label: string; w: number }[] = [
    { cls: "hiw-chip--1", style: A.chip1, label: "create_guide", w: 116 },
    { cls: "hiw-chip--2", style: A.chip2, label: "add_part", w: 84 },
    { cls: "hiw-chip--3", style: A.chip3, label: "add_connection", w: 131 },
    { cls: "hiw-chip--4", style: A.chip4, label: "validate_guide", w: 131 },
  ];
  return (
    <g className="hiw-zone hiw-zone--plan">
      <path className="hiw-trace hiw-a" style={A.trace} d={`M${chipX} 104H${wide ? -10 : -49}`} pathLength={1} />
      <g transform={`translate(${chipX} 92)`}>
        {chips.map((c) => (
          <g key={c.label} className={`hiw-a hiw-chip ${c.cls}`} style={c.style}>
            <rect className="hiw-chip-box" width={c.w} height="24" rx="12" />
            <text className="hiw-chip-text" x="11" y="16.5">
              {c.label}
            </text>
            {c.label === "add_connection" && (
              <rect className="hiw-a hiw-chip-bad" style={A.chip3Bad} width={c.w} height="24" rx="12" />
            )}
          </g>
        ))}
      </g>
      <g className="hiw-a hiw-node" style={A.node}>
        <rect className="hiw-node-box" x="-55" y="62" width="110" height="84" rx="10" />
        <text className="hiw-node-text" x="0" y="100">
          Helpme
        </text>
        <text className="hiw-node-text" x="0" y="122">
          Solder
        </text>
        <rect className="hiw-a hiw-ring hiw-ring--bad" style={A.ringBad} x="-59" y="58" width="118" height="92" rx="13" />
        <rect className="hiw-a hiw-ring hiw-ring--ok" style={A.ringOk} x="-59" y="58" width="118" height="92" rx="13" />
      </g>
      <g className="hiw-a" style={A.pillBad}>
        <rect className="hiw-pill hiw-pill--bad" x={pillX} y="156" width="240" height="26" rx="13" />
        <text className="hiw-pill-text hiw-pill-text--bad" x={pillX + 16} y="173.5">
          Blocked: 5 V on a 3.3 V pin
        </text>
      </g>
      <g className="hiw-a" style={A.pillOk}>
        <rect className="hiw-pill hiw-pill--ok" x={pillX} y="184" width="240" height="26" rx="13" />
        <text className="hiw-pill-text hiw-pill-text--ok" x={pillX + 16} y="201.5">
          Fixed: wired to the 3.3 V pin
        </text>
      </g>
    </g>
  );
}

function Badge({ n, x, y, style }: { n: number; x: number; y: number; style: CSSProperties }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <g className="hiw-a" style={style}>
        <circle className="hiw-badge" r="9.5" />
        <text className="hiw-badge-text" y="4.3">
          {n}
        </text>
      </g>
    </g>
  );
}

function WireZone({ gridId }: { gridId: string }) {
  const pins = [
    { y: 44, label: "3V3" },
    { y: 76, label: "G34" },
    { y: 108, label: "G25" },
    { y: 140, label: "GND" },
  ];
  return (
    <g className="hiw-zone hiw-zone--wire">
      <defs>
        <pattern id={gridId} width="16" height="16" patternUnits="userSpaceOnUse">
          <path className="hiw-grid" d="M16 0H0V16" />
        </pattern>
      </defs>
      <g className="hiw-a" style={A.bed}>
        <rect className="hiw-bed" width="250" height="200" rx="12" />
        <rect width="250" height="200" rx="12" fill={`url(#${gridId})`} />
      </g>
      <g className="hiw-a" style={A.board}>
        <rect className="hiw-board" x="14" y="24" width="84" height="152" rx="7" />
        <rect className="hiw-usb" x="36" y="168" width="40" height="10" rx="2" />
        <text className="hiw-board-name" x="56" y="160" textAnchor="middle">
          ESP32
        </text>
        {pins.map((p) => (
          <g key={p.label}>
            <rect className="hiw-pin" x="94" y={p.y - 4.5} width="9" height="9" rx="1.5" />
            <text className="hiw-pin-text" x="88" y={p.y + 4} textAnchor="end">
              {p.label}
            </text>
          </g>
        ))}
      </g>
      <g className="hiw-a" style={A.sensor}>
        <rect className="hiw-part" x="164" y="26" width="74" height="50" rx="6" />
        <text className="hiw-part-text" x="208" y="48" textAnchor="middle">
          Soil
        </text>
        <text className="hiw-part-text" x="208" y="64" textAnchor="middle">
          sensor
        </text>
        <circle className="hiw-pin" cx="164" cy="40" r="4.5" />
        <circle className="hiw-pin" cx="164" cy="62" r="4.5" />
      </g>
      <g className="hiw-a" style={A.buzzer}>
        <circle className="hiw-buzzer" cx="206" cy="134" r="29" />
        <text className="hiw-buzzer-text" x="206" y="138.5" textAnchor="middle">
          Buzzer
        </text>
        <circle className="hiw-pin" cx="178" cy="122" r="4.5" />
        <circle className="hiw-pin" cx="178" cy="146" r="4.5" />
      </g>
      <path className="hiw-wire hiw-a" style={A.wire1} d="M102 44H126V40H164" pathLength={1} />
      <path className="hiw-wire hiw-a" style={A.wire2} d="M102 76H144V62H164" pathLength={1} />
      <path className="hiw-wire hiw-a" style={A.wire3} d="M102 108H150V122H178" pathLength={1} />
      <path className="hiw-wire hiw-a" style={A.wire4} d="M102 140H162V146H178" pathLength={1} />
      <Badge n={1} x={145} y={40} style={A.badge1} />
      <Badge n={2} x={123} y={76} style={A.badge2} />
      <Badge n={3} x={126} y={108} style={A.badge3} />
      <Badge n={4} x={132} y={140} style={A.badge4} />
    </g>
  );
}

function OpenZone() {
  const rows = [
    { n: 1, y: 90, label: "3V3 to VCC", tick: A.tick1, box: A.box1 },
    { n: 2, y: 118, label: "G34 to AO", tick: A.tick2, box: A.box2 },
    { n: 3, y: 146, label: "G25 to +", tick: A.tick3, box: A.box3 },
    { n: 4, y: 174, label: "GND to -", tick: A.tick4, box: A.box4 },
  ];
  return (
    <g className="hiw-zone hiw-zone--open">
      <g className="hiw-a" style={A.window}>
        <rect className="hiw-window" x="0" y="4" width="200" height="200" rx="12" />
        <path className="hiw-window-bar" d="M0 38V16A12 12 0 0 1 12 4H188A12 12 0 0 1 200 16V38Z" />
        <rect className="hiw-address" x="14" y="12" width="172" height="20" rx="10" />
      </g>
      <g className="hiw-a" style={A.address}>
        <text className="hiw-address-text" x="100" y="25.8" textAnchor="middle">
          /guides/h025arr1
        </text>
      </g>
      <g className="hiw-a hiw-screen" style={A.screen}>
        <text className="hiw-screen-title" x="18" y="64">
          Soil alarm
        </text>
        {rows.map((r) => (
          <g key={r.n} transform={`translate(0 ${r.y})`}>
            <circle className="hiw-badge" cx="27" cy="0" r="9" />
            <text className="hiw-badge-text" x="27" y="4.3">
              {r.n}
            </text>
            <text className="hiw-row-text" x="44" y="4.5">
              {r.label}
            </text>
            <rect className="hiw-box" x="158" y="-9" width="18" height="18" rx="4" />
            <rect className="hiw-a hiw-box-fill" style={r.box} x="158" y="-9" width="18" height="18" rx="4" />
            <path className="hiw-a hiw-tick" style={r.tick} d="M161.5 0.5L166 5L173 -4.5" pathLength={1} />
          </g>
        ))}
      </g>
      <g transform="translate(100 22)">
        <g className="hiw-a hiw-secret" style={A.secret}>
          <rect className="hiw-secret-box" x="-44" y="-14" width="88" height="28" rx="14" />
          <text className="hiw-secret-text" y="4.8" textAnchor="middle">
            Secret link
          </text>
        </g>
      </g>
    </g>
  );
}

function Link({ d, style }: { d: string; style: CSSProperties }) {
  return <path className="hiw-trace hiw-a" style={style} d={d} pathLength={1} />;
}

function Place({ x, y, children }: { x: number; y: number; children: ReactNode }) {
  return <g transform={`translate(${x} ${y})`}>{children}</g>;
}

export function HowItWorksScene({ layout, label }: { layout: "wide" | "tall"; label: string }) {
  const wide = layout === "wide";
  // --fx/--fy: where the secret link flies in from. --px: how far the Plan zone
  // sits right of its resting place while it needs room (it slides back for Wire).
  // --ct/--cr/--cn: how far the tool-call chips travel, bounce back and return.
  const vars = (
    wide ? { "--fx": "-110px", "--fy": "0px", "--px": "7px", "--ct": "110px", "--cr": "100px", "--cn": "18px" }
      : { "--fx": "0px", "--fy": "-72px", "--px": "0px", "--ct": "150px", "--cr": "136px", "--cn": "24px" }
  ) as CSSProperties;
  return (
    <svg
      className={`hiw-svg hiw-svg--${layout}`}
      viewBox={wide ? "0 0 1200 230" : "0 0 340 972"}
      role="img"
      aria-label={label}
      style={vars}
      preserveAspectRatio="xMidYMid meet"
    >
      <g className="hiw-a hiw-scene" style={A.scene}>
        {wide ? (
          <>
            {/* Trunk: runs through the four zone centres (150, 450, 750, 1050), under the art. */}
            <Link d="M150 114H275" style={A.link1} />
            <Link d="M450 114H625" style={A.link2} />
            <Link d="M750 114H955" style={A.link3} />
            <Place x={35} y={10}>
              <AskZone clipId={`hiw-clip-${layout}`} />
            </Place>
            <Place x={450} y={10}>
              <PlanZone wide />
            </Place>
            <Place x={625} y={10}>
              <WireZone gridId={`hiw-grid-${layout}`} />
            </Place>
            <Place x={950} y={10}>
              <OpenZone />
            </Place>
          </>
        ) : (
          <>
            <Link d="M170 202V358" style={A.link1} />
            <Link d="M170 466V508" style={A.link2} />
            <Link d="M170 708V766" style={A.link3} />
            <Place x={55} y={0}>
              <AskZone clipId={`hiw-clip-${layout}`} />
            </Place>
            <Place x={265} y={254}>
              <PlanZone wide={false} />
            </Place>
            <Place x={45} y={508}>
              <WireZone gridId={`hiw-grid-${layout}`} />
            </Place>
            <Place x={70} y={762}>
              <OpenZone />
            </Place>
          </>
        )}
      </g>
    </svg>
  );
}
