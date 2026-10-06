export function BrandLogo({
  size = 24,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      className={className}
      aria-hidden="true"
      style={{ display: "inline-block", verticalAlign: "middle" }}
    >
      <rect width="64" height="64" rx="14" fill="#121a20" />
      <path
        d="M8 18 H26 L38 32 L26 46 H8"
        stroke="#b65c2e"
        strokeWidth="5.5"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M38 32 H57"
        stroke="#eef3f0"
        strokeWidth="5.5"
        strokeLinecap="round"
      />
      <circle
        cx="38"
        cy="32"
        r="8.5"
        fill="#b65c2e"
        stroke="#121a20"
        strokeWidth="3"
      />
    </svg>
  );
}
