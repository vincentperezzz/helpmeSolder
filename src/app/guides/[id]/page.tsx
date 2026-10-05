import type { Metadata } from "next";
import { GuideWorkspace } from "@/components/GuideWorkspace";
import { VisitBeacon } from "@/components/VisitBeacon";
import { getGuide } from "@/lib/guides/repository";
import { getExpiryDate, getRetentionDays } from "@/lib/guides/retention";

export const dynamic = "force-dynamic";

type GuidePageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Guide | HelpmeSolder",
    description: "Private build guide",
    referrer: "no-referrer",
    robots: {
      index: false,
      follow: false,
      nocache: true,
      googleBot: { index: false, follow: false, noimageindex: true },
    },
  };
}

function BrandMark() {
  return <p className="brand-mark text-sm tracking-tight text-mute">HelpmeSolder</p>;
}

function StatusPage({
  title,
  detail,
}: {
  title: string;
  detail: string;
}) {
  return (
    <main className="guide-shell mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4 px-6 py-16">
      <BrandMark />
      <h1 className="brand-mark text-4xl leading-none tracking-tight text-ink">
        {title}
      </h1>
      <p className="text-ink-soft">{detail}</p>
    </main>
  );
}

export default async function GuidePage({ params }: GuidePageProps) {
  const { id } = await params;
  let guide = null;
  let loadError: string | null = null;

  try {
    guide = await getGuide(id);
  } catch {
    loadError = "Could not load guide.";
  }

  if (loadError) {
    return <StatusPage title="Guide unavailable" detail={loadError} />;
  }

  if (!guide) {
    // Never echo the requested id back; keep the response generic.
    return (
      <StatusPage
        title="Guide unavailable"
        detail={`This guide does not exist or the link is incorrect. Guides that nobody opens for ${getRetentionDays()} days are deleted, so an old link may have expired.`}
      />
    );
  }

  const retentionDays = getRetentionDays();
  const expiryLabel = getExpiryDate(new Date(), retentionDays).toLocaleDateString(
    "en-US",
    { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" },
  );
  const orderedSteps = [...guide.steps].sort((a, b) => a.order - b.order);

  return (
    <>
      <VisitBeacon />
      <GuideWorkspace
        guide={guide}
        orderedSteps={orderedSteps}
        expiryLabel={expiryLabel}
        retentionDays={retentionDays}
      />
    </>
  );
}
