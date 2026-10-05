import type { ReactNode } from "react";
import type { TabId } from "./model";

/** One small icon set for the workspace: 24 grid, 1.75 stroke, round caps. */
function Icon({ children, size = 22 }: { children: ReactNode; size?: number }) {
  return (
    <svg
      aria-hidden
      focusable="false"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </svg>
  );
}

type IconProps = { size?: number };

export const PartsIcon = (p: IconProps) => (
  <Icon {...p}>
    <rect x="6" y="6" width="12" height="12" rx="2" />
    <path d="M9 3v3M15 3v3M9 18v3M15 18v3M3 9h3M3 15h3M18 9h3M18 15h3" />
  </Icon>
);

export const ToolsIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M14.5 6.5a4 4 0 0 0 4.9 4.9l-9.6 9.6a2.1 2.1 0 0 1-3-3l9.6-9.6a4 4 0 0 0-1.9-1.9z" />
  </Icon>
);

export const SolderIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M3 21l6-6" />
    <path d="M9 15l7.5-7.5 3 3L12 18z" />
    <path d="M17 4l3 3" />
  </Icon>
);

export const StepsIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M9 6h11M9 12h11M9 18h11" />
    <path d="M4 6h.01M4 12h.01M4 18h.01" />
  </Icon>
);

export const NotesIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M6 3h9l4 4v14H6z" />
    <path d="M14 3v5h5M9 13h7M9 17h5" />
  </Icon>
);

export const ShowPanelIcon = (p: IconProps) => (
  <Icon {...p}>
    <rect x="3" y="4" width="18" height="16" rx="2" />
    <path d="M14 4v16" />
  </Icon>
);

export const CloseIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M6 6l12 12M18 6L6 18" />
  </Icon>
);

export const DockIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M5 7h14M5 12h14M5 17h14" />
  </Icon>
);

export const CheckIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M5 12.5l4.5 4.5L19 7.5" />
  </Icon>
);

export const TipIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M9 18h6M10 21h4" />
    <path d="M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z" />
  </Icon>
);

export const AlertIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 4l9 16H3z" />
    <path d="M12 10v4M12 17h.01" />
  </Icon>
);

export const GlassesIcon = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="7" cy="14" r="3.5" />
    <circle cx="17" cy="14" r="3.5" />
    <path d="M10.5 14h3M3.5 14L5 7M20.5 14L19 7" />
  </Icon>
);

export const CutterIcon = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="6" cy="18" r="2.5" />
    <circle cx="14" cy="19" r="2.5" />
    <path d="M7.5 16L18 4M13 16.8L8 5" />
  </Icon>
);

export const HandsIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4 20h16M12 20v-6" />
    <path d="M12 14l-5-5V5M12 14l5-5V5" />
  </Icon>
);

export const WireIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M3 8h5a4 4 0 0 1 4 4 4 4 0 0 0 4 4h5" />
    <path d="M3 6v4M21 14v4" />
  </Icon>
);

export const SolderRollIcon = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="10" cy="12" r="7" />
    <circle cx="10" cy="12" r="2.5" />
    <path d="M17 12c2 0 3 1 4 3" />
  </Icon>
);

export const TAB_ICONS: Record<TabId, (p: IconProps) => ReactNode> = {
  parts: PartsIcon,
  tools: ToolsIcon,
  solder: SolderIcon,
  steps: StepsIcon,
  notes: NotesIcon,
};

/** Picks an icon for a tool line by what it says. */
export function toolIcon(label: string): (p: IconProps) => ReactNode {
  const text = label.toLowerCase();
  if (/glasses/.test(text)) return GlassesIcon;
  if (/cutter|strip/.test(text)) return CutterIcon;
  if (/helping|tape to hold/.test(text)) return HandsIcon;
  if (/iron/.test(text)) return SolderIcon;
  if (/^solder/.test(text)) return SolderRollIcon;
  return WireIcon;
}
