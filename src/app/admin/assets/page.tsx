import { parseShow, parseView } from "@/lib/admin/asset-view";
import { listAssetRecords } from "@/lib/catalog/asset-registry";
import { ensureCatalog } from "@/lib/catalog/server";
import { guardAdmin } from "../_components/guard";
import { UNAVAILABLE_TEXT, adminMetadata } from "../_components/meta";
import { AdminShell } from "../_components/shell";
import { AssetsView } from "./_components/AssetsView";

export const dynamic = "force-dynamic";
export const metadata = adminMetadata("Admin assets");

type PageProps = { searchParams: Promise<{ cat?: string; show?: string; q?: string; view?: string }> };

export default async function AdminAssetsPage({ searchParams }: PageProps) {
  const guard = await guardAdmin("dashboard");
  if (guard.kind !== "ok") {
    return (
      <main className="mx-auto w-full max-w-sm px-4 py-16">
        <h1 className="font-display text-2xl font-bold text-ink">Admin</h1>
        <p role="alert" className="mt-4 text-sm text-warn-ink">
          {UNAVAILABLE_TEXT}
        </p>
      </main>
    );
  }

  await ensureCatalog();
  const params = await searchParams;
  const filter = {
    cat: params.cat ?? "",
    show: parseShow(params.show),
    q: (params.q ?? "").slice(0, 80),
    view: parseView(params.view),
  };

  return (
    <AdminShell session={guard.session} active="assets" title="Assets">
      <p className="mb-4 text-sm text-ink-soft">
        Every image we use for each part: the thumbnail on the Parts tab and the drawing in the diagram.
      </p>
      <AssetsView records={listAssetRecords()} filter={filter} />
    </AdminShell>
  );
}
