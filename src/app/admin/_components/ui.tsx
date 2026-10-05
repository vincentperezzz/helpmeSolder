import type { ReactNode } from "react";
import type { CoverageRow } from "@/lib/admin/coverage";

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="mb-3 font-display text-lg font-bold text-ink">{title}</h2>
      {children}
    </section>
  );
}

export function Tile({
  label,
  value,
  hint,
  big,
}: {
  label: string;
  value: string | number;
  hint?: string;
  big?: boolean;
}) {
  return (
    <div className="rounded-md border border-line bg-white/60 p-3">
      <p className="text-xs text-mute">{label}</p>
      <p className={`mt-1 font-semibold text-ink ${big ? "text-3xl" : "text-2xl"}`}>{value}</p>
      {hint ? <p className="mt-1 text-xs text-mute">{hint}</p> : null}
    </div>
  );
}

export function Tiles({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{children}</div>;
}

export function BarList({
  entries,
  label,
  empty = "Nothing yet.",
}: {
  entries: { label: string; count: number }[];
  label: string;
  empty?: string;
}) {
  if (entries.length === 0) return <p className="text-sm text-mute">{empty}</p>;
  const max = Math.max(...entries.map((e) => e.count));
  return (
    <ul aria-label={label} className="space-y-2">
      {entries.map((entry) => (
        <li key={entry.label} className="text-sm">
          <div className="flex justify-between gap-3">
            <span className="min-w-0 break-words text-ink">{entry.label}</span>
            <span className="shrink-0 tabular-nums text-mute">{entry.count}</span>
          </div>
          <div className="mt-1 h-2 rounded bg-paper-deep">
            <div
              className="h-2 rounded bg-flux"
              style={{ width: `${max === 0 ? 2 : Math.max(2, (entry.count / max) * 100)}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

function Yes({ value }: { value: boolean }) {
  return value ? (
    <span className="text-flux">Yes</span>
  ) : (
    <span className="font-medium text-copper-deep">Missing</span>
  );
}

export function PartsTable({ caption, rows }: { caption: string; rows: CoverageRow[] }) {
  return (
    <div className="overflow-x-auto rounded-md border border-line">
      <table className="w-full min-w-[32rem] text-left text-sm">
        <caption className="px-3 py-2 text-left text-xs text-mute">{caption}</caption>
        <thead className="bg-paper-deep text-xs text-mute">
          <tr>
            <th scope="col" className="px-3 py-2 font-medium">Name</th>
            <th scope="col" className="px-3 py-2 font-medium">Type</th>
            <th scope="col" className="px-3 py-2 font-medium">Logic</th>
            <th scope="col" className="px-3 py-2 font-medium">Diagram drawing</th>
            <th scope="col" className="px-3 py-2 font-medium">Thumbnail</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-t border-line">
              <th scope="row" className="px-3 py-2 font-medium text-ink">{row.name}</th>
              <td className="px-3 py-2 text-ink-soft">{row.group}</td>
              <td className="px-3 py-2 text-ink-soft">{row.logic}</td>
              <td className="px-3 py-2"><Yes value={row.hasDrawing} /></td>
              <td className="px-3 py-2"><Yes value={row.hasThumbnail} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
