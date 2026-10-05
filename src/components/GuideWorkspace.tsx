"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  PowerSelector,
  powerChoiceLabel,
  POWER_CHOICES,
} from "@/components/PowerSelector";
import { LayoutToggle } from "@/components/LayoutToggle";
import { PrepParts } from "@/components/PrepParts";
import { SolderChecklist } from "@/components/SolderChecklist";
import { ToolsList } from "@/components/ToolsList";
import { WokwiDiagram } from "@/components/WokwiDiagram";
import type { Guide, GuideStep, PowerSource } from "@/lib/catalog/types";
import {
  layoutFeedback,
  toBreadboardLayout,
  toDirectLayout,
} from "@/lib/guides/layout-variants";
import { previewPowerFeedback } from "@/lib/guides/power-preview";
import { hasBreadboard } from "@/lib/guides/solder-plan";

type GuideWorkspaceProps = {
  guide: Guide;
  orderedSteps: GuideStep[];
};

const powerKey = (guideId: string) => `helpmesolder:power-choice:${guideId}`;

function readPower(guideId: string): PowerSource | null {
  try {
    const raw = window.localStorage.getItem(powerKey(guideId));
    return POWER_CHOICES.find((choice) => choice.value === raw)?.value ?? null;
  } catch {
    return null;
  }
}

function writePower(guideId: string, value: PowerSource | null) {
  try {
    if (value === null) window.localStorage.removeItem(powerKey(guideId));
    else window.localStorage.setItem(powerKey(guideId), value);
  } catch {
    // Storage blocked: the choice still works for this visit.
  }
}

const layoutKey = (guideId: string) => `helpmesolder:breadboard-view:${guideId}`;

function readLayout(guideId: string): boolean | null {
  try {
    const raw = window.localStorage.getItem(layoutKey(guideId));
    return raw === "on" ? true : raw === "off" ? false : null;
  } catch {
    return null;
  }
}

function writeLayout(guideId: string, value: boolean | null) {
  try {
    if (value === null) window.localStorage.removeItem(layoutKey(guideId));
    else window.localStorage.setItem(layoutKey(guideId), value ? "on" : "off");
  } catch {
    // Storage blocked: the choice still works for this visit.
  }
}

const followKey = (guideId: string) => `helpmesolder:follow-mode:${guideId}`;

function readFollow(guideId: string): { follow: boolean; hide: boolean } {
  try {
    const parsed: unknown = JSON.parse(
      window.localStorage.getItem(followKey(guideId)) ?? "null",
    );
    const value = (parsed ?? {}) as { follow?: unknown; hide?: unknown };
    return { follow: value.follow === true, hide: value.hide === true };
  } catch {
    return { follow: false, hide: false };
  }
}

function writeFollow(guideId: string, follow: boolean, hide: boolean) {
  try {
    window.localStorage.setItem(followKey(guideId), JSON.stringify({ follow, hide }));
  } catch {
    // Storage blocked: the choice still works for this visit.
  }
}

export function GuideWorkspace({ guide, orderedSteps }: GuideWorkspaceProps) {
  const [enlarged, setEnlarged] = useState(false);
  const [selectedPower, setSelectedPower] = useState<PowerSource | null>(
    guide.power_source,
  );

  useEffect(() => {
    // Read after mount so server and first client render match.
    const saved = readPower(guide.id);
    if (saved) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelectedPower(saved);
    }
  }, [guide.id]);

  const ownBreadboard = hasBreadboard(guide);
  const [breadboardView, setBreadboardView] = useState(ownBreadboard);

  useEffect(() => {
    const saved = readLayout(guide.id);
    if (saved !== null) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setBreadboardView(saved);
    }
  }, [guide.id]);

  const [followMode, setFollowMode] = useState(false);
  const [hideOthers, setHideOthers] = useState(false);
  const [focusId, setFocusId] = useState<string | null>(null);
  const [hoverId, setHoverId] = useState<string | null>(null);

  useEffect(() => {
    const saved = readFollow(guide.id);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFollowMode(saved.follow);
    setHideOthers(saved.hide);
  }, [guide.id]);

  const changeFollow = useCallback(
    (value: boolean) => {
      setFollowMode(value);
      writeFollow(guide.id, value, hideOthers);
    },
    [guide.id, hideOthers],
  );
  const changeHide = useCallback(
    (value: boolean) => {
      setHideOthers(value);
      writeFollow(guide.id, followMode, value);
    },
    [guide.id, followMode],
  );
  const focusedWireIds = useMemo(() => (focusId ? [focusId] : null), [focusId]);
  const selectWire = useCallback((id: string | null) => {
    setFocusId((current) => (id === current ? null : id));
  }, []);

  const shownGuide = useMemo<Guide>(
    () => ({ ...guide, power_source: selectedPower }),
    [guide, selectedPower],
  );
  const feedback = useMemo(
    () => previewPowerFeedback(guide, shownGuide),
    [guide, shownGuide],
  );
  const layoutGuide = useMemo<Guide>(
    () => (breadboardView ? toBreadboardLayout(shownGuide) : toDirectLayout(shownGuide)),
    [shownGuide, breadboardView],
  );
  const layoutIssues = useMemo(
    () => layoutFeedback(shownGuide, layoutGuide),
    [shownGuide, layoutGuide],
  );
  const isLayoutPreview = breadboardView !== ownBreadboard;
  const isPreview = selectedPower !== null && selectedPower !== guide.power_source;

  function choosePower(value: PowerSource) {
    setSelectedPower(value);
    writePower(guide.id, value === guide.power_source ? null : value);
  }

  function chooseLayout(value: boolean) {
    setBreadboardView(value);
    setFocusId(null);
    writeLayout(guide.id, value === ownBreadboard ? null : value);
  }

  function backToOriginal() {
    chooseLayout(ownBreadboard);
  }

  function backToDefault() {
    setSelectedPower(guide.power_source);
    writePower(guide.id, null);
  }

  return (
    <div
      className={
        enlarged
          ? "grid min-w-0 grid-cols-1 gap-4"
          : "grid min-w-0 grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1.55fr)_minmax(280px,0.85fr)] lg:items-start"
      }
    >
      <section className="motion-rise motion-rise-delay-1 order-2 min-w-0 max-w-full space-y-3 lg:order-1">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="space-y-2">
            <h2 className="text-xs font-semibold tracking-[0.18em] text-flux uppercase">
              Wiring picture
            </h2>
            <div className="section-rule w-24" />
          </div>
          <p className="max-w-xl text-xs text-mute sm:text-sm">
            {enlarged
              ? "The parts list and steps are hidden while the picture is big. Turn off Bigger or Full screen to see them again."
              : "The parts list and steps stay next to the picture. Use Bigger or Full screen to hide them."}
          </p>
        </div>
        {!enlarged ? (
          <div className="space-y-3">
            {selectedPower === null ? (
              <p className="rounded-xl border border-copper/40 bg-paper-deep px-4 py-3 text-base font-medium text-ink">
                Pick how you will power it so the picture and checklist can show it.
              </p>
            ) : null}
            <div
              data-print-hide="true"
              className="flex flex-wrap items-center gap-x-6 gap-y-1 rounded-xl border border-line-strong bg-white/70 px-4"
            >
              <PowerSelector value={selectedPower} onChange={choosePower} />
              <LayoutToggle checked={breadboardView} onChange={chooseLayout} />
            </div>
            {selectedPower !== null ? (
              <p className="hidden px-1 text-xs text-mute sm:block">
                {POWER_CHOICES.find((choice) => choice.value === selectedPower)?.hint}
              </p>
            ) : null}
            {isPreview ? (
              <p
                data-print-hide="true"
                className="flex flex-wrap items-center gap-x-3 text-sm text-ink-soft"
              >
                <span>
                  You are previewing another way to power it. The guide&apos;s default
                  is {powerChoiceLabel(guide.power_source)}.
                </span>
                <button
                  type="button"
                  onClick={backToDefault}
                  className="min-h-11 text-sm font-semibold text-ink underline underline-offset-2 hover:text-copper focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-copper"
                >
                  Back to the default
                </button>
              </p>
            ) : null}
            {isLayoutPreview ? (
              <p
                data-print-hide="true"
                className="flex flex-wrap items-center gap-x-3 text-sm text-ink-soft"
              >
                <span>
                  You are previewing the other layout. This guide was written with{" "}
                  {ownBreadboard ? "a breadboard" : "direct wires"}.
                </span>
                <button
                  type="button"
                  onClick={backToOriginal}
                  className="min-h-11 text-sm font-semibold text-ink underline underline-offset-2 hover:text-copper focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-copper"
                >
                  Back to the original
                </button>
              </p>
            ) : null}
            {layoutIssues.length > 0 ? (
              <div
                role="status"
                className="rounded-xl border border-amber-500/30 bg-amber-50/60 px-4 py-3 text-sm text-amber-950"
              >
                <p className="font-semibold">Heads up</p>
                <ul className="mt-1 list-disc space-y-1 pl-5">
                  {layoutIssues.map((message) => (
                    <li key={message}>{message}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            {feedback.damage.length > 0 ? (
              <div
                role="status"
                className="rounded-xl border border-amber-500/50 bg-amber-50 px-4 py-3 text-sm text-amber-950"
              >
                <p className="font-semibold">This power choice may damage a part:</p>
                <ul className="mt-1 list-disc space-y-1 pl-5">
                  {feedback.damage.map((message) => (
                    <li key={message}>{message}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            {feedback.headsUp.length > 0 ? (
              <div
                role="status"
                className="rounded-xl border border-amber-500/30 bg-amber-50/60 px-4 py-3 text-sm text-amber-950"
              >
                <p className="font-semibold">Heads up</p>
                <ul className="mt-1 list-disc space-y-1 pl-5">
                  {feedback.headsUp.map((message) => (
                    <li key={message}>{message}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        ) : null}
        <WokwiDiagram
          guide={layoutGuide}
          enlarged={enlarged}
          onEnlargedChange={setEnlarged}
          focusedWireIds={focusedWireIds}
          hideUnfocused={hideOthers}
          hoveredWireId={hoverId}
          onHoverWire={setHoverId}
          onSelectWire={selectWire}
        />
      </section>

      {!enlarged ? (
        <aside className="motion-rise motion-rise-delay-2 order-1 min-w-0 max-w-full space-y-10 lg:order-2 lg:sticky lg:top-4">
          <section className="space-y-4">
            <div className="space-y-2">
              <h2 className="text-xs font-semibold tracking-[0.18em] text-flux uppercase">
                Parts
              </h2>
              <div className="section-rule w-24" />
            </div>
            <PrepParts parts={layoutGuide.parts} />
          </section>

          <ToolsList guide={layoutGuide} />

          <SolderChecklist
            guide={layoutGuide}
            followMode={followMode}
            onFollowModeChange={changeFollow}
            hideOthers={hideOthers}
            onHideOthersChange={changeHide}
            focusId={focusId}
            onFocusChange={setFocusId}
            hoverId={hoverId}
            onHoverChange={setHoverId}
          />

          <section className="space-y-4">
            <div className="space-y-2">
              <h2 className="text-xs font-semibold tracking-[0.18em] text-flux uppercase">
                Steps
              </h2>
              <div className="section-rule w-24" />
            </div>
            {orderedSteps.length === 0 ? (
              <p className="text-ink-soft">No steps yet.</p>
            ) : (
              <ol className="space-y-6">
                {orderedSteps.map((step) => (
                  <li key={step.id} className="grid gap-2 sm:grid-cols-[2.5rem_1fr]">
                    <span className="brand-mark text-xl text-copper">
                      {String(step.order).padStart(2, "0")}
                    </span>
                    <div className="space-y-1">
                      <p className="font-semibold tracking-tight text-ink">
                        {step.title}
                      </p>
                      <p className="text-sm leading-relaxed text-ink-soft">
                        {step.body}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </section>

          {guide.notes.length > 0 ? (
            <section className="space-y-4 pb-4">
              <div className="space-y-2">
                <h2 className="text-xs font-semibold tracking-[0.18em] text-flux uppercase">
                  Notes
                </h2>
                <div className="section-rule w-24" />
              </div>
              <ul className="space-y-2 text-sm text-ink-soft">
                {guide.notes.map((note) => (
                  <li key={note} className="border-l-2 border-copper/50 pl-4">
                    {note}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </aside>
      ) : null}
    </div>
  );
}
