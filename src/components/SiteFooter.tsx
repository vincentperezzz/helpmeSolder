import { BrandLogo } from "@/components/BrandLogo";
import { retentionNotice } from "@/lib/guides/retention";

export function SiteFooter() {
  return (
    <footer className="relative z-10 border-t border-line-strong bg-paper px-6 py-12 sm:px-10 lg:px-16">
      <div className="mx-auto grid w-full max-w-5xl gap-8 md:grid-cols-[1fr_2fr] md:gap-16">
        <div className="flex items-center gap-2.5">
          <BrandLogo size={22} className="shrink-0 rounded-[5px]" />
          <p className="brand-mark text-xl">HelpmeSolder</p>
        </div>
        <div className="flex max-w-xl flex-col gap-3 text-sm leading-relaxed text-mute">
          <p>
            Guides live at a secret, unguessable link. There are no accounts, so
            anyone with the link can view the guide.
          </p>
          <p>{retentionNotice()}</p>
          <p>
            <a href="/api/health" className="link-quiet">
              Service status
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
