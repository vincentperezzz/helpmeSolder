import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

export const CARD_SIZE = { width: 1200, height: 630 } as const;

const INK = "#121a20";
const PAPER = "#eef3f0";
const MAT = "#c9d8d1";
const COPPER = "#b65c2e";

// Bundled static instances of Syne and DM Sans (OFL), read once at module
// load, so rendering never touches the network.
const fontsPromise = Promise.all([
  readFile(join(process.cwd(), "src/app/fonts/Syne-ExtraBold.ttf")),
  readFile(join(process.cwd(), "src/app/fonts/DMSans-Medium.ttf")),
]);

type CardText = {
  /** Display lines, each rendered on its own row. */
  title: string[];
  titleSize: number;
  /** Supporting lines under the title. */
  subtitle: string[];
};

function Grid() {
  const lines = [];
  for (let x = 0; x <= 1200; x += 48) {
    lines.push(<line key={`v${x}`} x1={x} y1={0} x2={x} y2={630} />);
  }
  for (let y = 0; y <= 630; y += 48) {
    lines.push(<line key={`h${y}`} x1={0} y1={y} x2={1200} y2={y} />);
  }
  return (
    <svg
      width={1200}
      height={630}
      viewBox="0 0 1200 630"
      style={{ position: "absolute", left: 0, top: 0 }}
    >
      <g stroke={PAPER} strokeOpacity={0.06} strokeWidth={1}>
        {lines}
      </g>
    </svg>
  );
}

/** Two copper traces meeting at a solder joint and leaving as one, like the favicon. */
function Traces() {
  return (
    <svg
      width={1200}
      height={190}
      viewBox="0 0 1200 190"
      style={{ position: "absolute", left: 0, top: 36 }}
    >
      <g stroke={COPPER} strokeWidth={20} fill="none" strokeLinecap="round" strokeLinejoin="round">
        <path d="M-20 36 H420 L560 95" />
        <path d="M-20 154 H420 L560 95" />
      </g>
      <path d="M640 95 H1220" stroke={PAPER} strokeWidth={20} strokeLinecap="round" />
      <circle cx={600} cy={95} r={50} fill={COPPER} stroke={INK} strokeWidth={10} />
    </svg>
  );
}

export async function renderSocialCard({
  title,
  titleSize,
  subtitle,
}: CardText): Promise<ImageResponse> {
  const [syne, dmSans] = await fontsPromise;
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          position: "relative",
          background: INK,
          color: PAPER,
        }}
      >
        <Grid />
        <Traces />
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: 268,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          {title.map((line) => (
            <div
              key={line}
              style={{
                display: "flex",
                fontFamily: "Syne",
                fontWeight: 800,
                fontSize: titleSize,
                lineHeight: 1.05,
                letterSpacing: -1,
                color: PAPER,
              }}
            >
              {line}
            </div>
          ))}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              marginTop: 28,
              fontFamily: "DM Sans",
              fontWeight: 500,
              fontSize: 44,
              lineHeight: 1.25,
              color: MAT,
            }}
          >
            {subtitle.map((line) => (
              <div key={line} style={{ display: "flex" }}>
                {line}
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
    {
      ...CARD_SIZE,
      fonts: [
        { name: "Syne", data: syne, style: "normal", weight: 800 },
        { name: "DM Sans", data: dmSans, style: "normal", weight: 500 },
      ],
    },
  );
}
