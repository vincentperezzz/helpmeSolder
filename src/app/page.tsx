import { GuidePicture } from "@/components/GuidePicture";
import { HeroMotion } from "@/components/HeroMotion";
import { HomeSections } from "@/components/HomeSections";
import { Magnetic } from "@/components/Magnetic";
import { ScrollLink } from "@/components/ScrollLink";
import { SiteNav } from "@/components/SiteNav";
import { VisitBeacon } from "@/components/VisitBeacon";
import "./home.css";

function WorkbenchPlane() {
  return (
    <svg
      className="absolute inset-0 h-full w-full"
      viewBox="0 0 1440 900"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="padGlow" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#c97a45" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#8f4520" stopOpacity="0.95" />
        </linearGradient>
        <linearGradient id="traceFade" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#b65c2e" stopOpacity="0.15" />
          <stop offset="40%" stopColor="#b65c2e" stopOpacity="0.85" />
          <stop offset="100%" stopColor="#2a6b66" stopOpacity="0.55" />
        </linearGradient>
      </defs>
      <rect width="1440" height="900" fill="#d7e4de" />
      <g className="parallax-far" opacity="0.28" stroke="#152028" strokeWidth="1">
        {Array.from({ length: 36 }, (_, i) => (
          <line key={`v-${i}`} x1={i * 40} y1="0" x2={i * 40} y2="900" />
        ))}
        {Array.from({ length: 23 }, (_, i) => (
          <line key={`h-${i}`} x1="0" y1={i * 40} x2="1440" y2={i * 40} />
        ))}
      </g>
      <g className="parallax-mid">
      <path
        className="motion-trace"
        d="M180 620 C360 520, 480 420, 640 380 S980 340, 1180 260"
        fill="none"
        stroke="url(#traceFade)"
        strokeWidth="10"
        strokeLinecap="round"
      />
      <path
        className="motion-trace"
        d="M220 700 C420 640, 560 560, 760 500 S1040 430, 1260 360"
        fill="none"
        stroke="#2a6b66"
        strokeOpacity="0.45"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <path
        className="signal"
        pathLength="1000"
        d="M180 620 C360 520, 480 420, 640 380 S980 340, 1180 260"
        fill="none"
        stroke="#f3c29b"
        strokeWidth="6"
        strokeLinecap="round"
      />
      <path
        className="signal signal-2"
        pathLength="1000"
        d="M220 700 C420 640, 560 560, 760 500 S1040 430, 1260 360"
        fill="none"
        stroke="#9fd6cf"
        strokeWidth="3"
        strokeLinecap="round"
      />
      </g>
      <g className="parallax-near">
        <g className="idle-float">
          <circle className="breathe" cx="640" cy="380" r="34" fill="url(#padGlow)" />
          <circle cx="640" cy="380" r="12" fill="#eef3f0" />
        </g>
        <g className="idle-float" style={{ animationDelay: "-2.4s" }}>
          <circle className="breathe" cx="980" cy="340" r="26" fill="#8f4520" />
          <circle cx="980" cy="340" r="9" fill="#eef3f0" />
        </g>
        <g className="idle-float" style={{ animationDelay: "-4.6s" }}>
          <circle className="breathe" cx="1180" cy="260" r="22" fill="#2a6b66" />
          <circle cx="1180" cy="260" r="8" fill="#eef3f0" />
        </g>
        <rect
          x="160"
          y="600"
          width="52"
          height="52"
          rx="6"
          fill="#b65c2e"
          transform="rotate(12 186 626)"
        />
      </g>
    </svg>
  );
}

export default function Home() {
  return (
    <main
      id="top"
      className="relative flex min-h-full flex-1 flex-col overflow-hidden"
    >
      <SiteNav />
      <VisitBeacon />
      <div className="atmosphere" aria-hidden="true">
        <div className="atmosphere-grid" />
      </div>

      <HeroMotion className="relative flex min-h-[100dvh] flex-1 flex-col justify-end px-6 pb-6 pt-14 sm:px-10 lg:justify-center lg:px-16 lg:pb-12 lg:pt-24">
        <div className="pointer-events-none absolute inset-0 opacity-40">
          <WorkbenchPlane />
          <div className="absolute inset-0 bg-gradient-to-t from-[#eef3f0] via-[#eef3f0]/90 to-[#eef3f0]/55" />
        </div>

        <div className="relative z-10 mx-auto grid w-full max-w-5xl items-end gap-4 lg:grid-cols-[minmax(0,0.86fr)_minmax(0,1.14fr)] lg:items-center lg:gap-10">
          <div className="order-2 flex flex-col gap-4 lg:order-1">
          <h1 className="brand-mark motion-rise text-[clamp(2.6rem,11vw,3.4rem)] leading-[0.95] lg:text-[clamp(3.25rem,4.2vw,4.5rem)]">
            HelpmeSolder
          </h1>
          <p className="motion-rise motion-rise-delay-1 max-w-2xl text-[clamp(1.35rem,3vw,2.1rem)] font-medium tracking-tight text-ink">
            Soldering guides you can just follow.
          </p>
          <p className="motion-rise motion-rise-delay-2 max-w-xl text-lg leading-relaxed text-ink-soft">
            Tell your AI what to build and get steps that show exactly what to solder and where.
          </p>
          <div className="motion-rise motion-rise-delay-3 flex flex-wrap items-center gap-6 pt-2">
            <Magnetic>
              <ScrollLink targetId="setup" className="btn-pad">
                <span className="btn-pad__face">Set up the MCP</span>
                <span aria-hidden="true" className="btn-pad__trace" />
              </ScrollLink>
            </Magnetic>
            <a
              href="/api/health"
              className="inline-flex items-center gap-2 text-sm font-semibold tracking-wide text-copper-deep underline decoration-copper/50 underline-offset-6 transition-colors hover:text-copper"
            >
              Check service health
            </a>
            <span className="hidden font-mono text-xs tracking-wide text-mute sm:inline">
              secret /guides/[id]
            </span>
          </div>
          </div>
          <div className="order-1 h-[26dvh] min-h-[168px] max-h-[200px] lg:order-2 lg:h-[min(64dvh,600px)] lg:max-h-none lg:min-h-[420px]">
            <GuidePicture />
          </div>
        </div>
      </HeroMotion>
      <HomeSections />
    </main>
  );
}
