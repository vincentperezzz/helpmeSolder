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

function Yes({ value }: { value: boolean }) {
  return value ? (
    <span className="text-flux">Yes</span>
  ) : (
    <span className="font-medium text-copper-deep">Missing</span>
  );
}

export function PartsTable({
  caption,
  rows,
  usage,
}: {
  caption: string;
  rows: CoverageRow[];
  /** Guides containing each part. Null when guides could not be read. */
  usage: Map<string, number> | null;
}) {
  return (
    <div className="overflow-x-auto rounded-md border border-line">
      <table className="w-full min-w-[38rem] text-left text-sm">
        <caption className="px-3 py-2 text-left text-xs text-mute">{caption}</caption>
        <thead className="bg-paper-deep text-xs text-mute">
          <tr>
            <th scope="col" className="px-3 py-2 font-medium">Name</th>
            <th scope="col" className="px-3 py-2 font-medium">Type</th>
            <th scope="col" className="px-3 py-2 font-medium">Logic</th>
            <th scope="col" className="px-3 py-2 font-medium">Diagram drawing</th>
            <th scope="col" className="px-3 py-2 font-medium">Thumbnail</th>
            <th scope="col" className="px-3 py-2 font-medium">Used in guides</th>
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
              <td className="px-3 py-2 tabular-nums text-ink-soft">
                {usage ? (usage.get(row.id) ?? 0) : "n/a"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
