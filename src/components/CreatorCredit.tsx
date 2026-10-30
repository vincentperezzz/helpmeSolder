import { CREATOR } from "@/lib/site/creator";

/** A quiet "Made by" line with the creator's GitHub and Instagram. */
export function CreatorCredit({ className = "" }: { className?: string }) {
  return (
    <p className={`creator-credit ${className}`.trim()}>
      Made by <strong className="font-medium">{CREATOR.name}</strong>
      <span aria-hidden="true"> · </span>
      <a href={CREATOR.github.url} className="link-quiet" target="_blank" rel="noopener noreferrer">
        GitHub
      </a>
      <span aria-hidden="true"> · </span>
      <a
        href={CREATOR.instagram.url}
        className="link-quiet"
        target="_blank"
        rel="noopener noreferrer"
      >
        Instagram @{CREATOR.instagram.handle}
      </a>
    </p>
  );
}
