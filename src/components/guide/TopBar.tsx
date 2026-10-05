"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { PrintButton } from "@/app/guides/[id]/PrintButton";
import type { Guide } from "@/lib/catalog/types";
import { StatusPill } from "./Checks";
import type { GuideChecks } from "./model";

type TopBarProps = {
  title: string;
  /** The guide's own power as a fact ("3 AA batteries"), or null when it is not set. */
  powerFact: string | null;
  boardName: string | null;
  checks: GuideChecks;
  checksOpen: boolean;
  onToggleChecks: () => void;
  checksId: string;
  /** The guide as drawn, used when the viewer prints with the schematic. */
  printGuide: Guide;
};

export function PowerChip({ fact }: { fact: string | null }) {
  return (
    <span className="ga-chip" title={fact ? `Powered by ${fact}` : "No power source set"}>
      {fact ? (
        <>
          <span>Powered by</span>
          <strong>{fact}</strong>
        </>
      ) : (
        <strong>Power not set</strong>
      )}
    </span>
  );
}

function BoardChip({ name }: { name: string }): ReactNode {
  return (
    <span className="ga-chip" title={`Board: ${name}`}>
      <span>Board</span>
      <strong>{name}</strong>
    </span>
  );
}

/** Slim app bar: brand, guide title, the two facts, status and print. */
export function TopBar({
  title,
  powerFact,
  boardName,
  checks,
  checksOpen,
  onToggleChecks,
  checksId,
  printGuide,
}: TopBarProps) {
  return (
    <header className="ga-bar">
      <Link
        href="/"
        className="ga-brand brand-mark hidden shrink-0 rounded-[10px] px-1 text-sm tracking-tight text-mute hover:text-ink sm:block"
      >
        HelpmeSolder
      </Link>
      <span aria-hidden className="hidden h-5 w-px shrink-0 bg-line-strong sm:block" />
      <h1 className="brand-mark min-w-0 truncate text-[15px] leading-tight tracking-tight sm:text-base">
        {title}
      </h1>
      <div className="hidden min-w-0 shrink items-center gap-2 md:flex">
        <PowerChip fact={powerFact} />
        {boardName ? <BoardChip name={boardName} /> : null}
      </div>
      <div className="ml-auto flex shrink-0 items-center gap-2">
        <StatusPill
          checks={checks}
          open={checksOpen}
          onToggle={onToggleChecks}
          controlsId={checksId}
        />
        <PrintButton guide={printGuide} />
      </div>
    </header>
  );
}
