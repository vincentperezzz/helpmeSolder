"use client";

import "@/app/guides/[id]/guide.css";
import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { ChecksRegion } from "@/components/guide/Checks";
import { ControlsBar } from "@/components/guide/ControlsBar";
import {
  TAB_IDS,
  TAB_LABELS,
  buildChecks,
  defaultTab,
  readTab,
  writeTab,
  type TabId,
} from "@/components/guide/model";
import { CloseIcon } from "@/components/guide/icons";
import { MobileDock } from "@/components/guide/MobileDock";
import { PanelTabs, panelDomId, tabDomId } from "@/components/guide/PanelTabs";
import { SCROLL_ATTR } from "@/components/guide/scroll";
import { NotesPanel, StepsPanel } from "@/components/guide/TextPanels";
import { TopBar } from "@/components/guide/TopBar";
import {
  POWER_CHOICES,
  powerFact,
  type PowerSourceValue,
} from "@/components/PowerSelector";
import { PrepParts } from "@/components/PrepParts";
import { SolderChecklist } from "@/components/SolderChecklist";
import { ToolsList, toolsFor } from "@/components/ToolsList";
import { WokwiDiagram } from "@/components/WokwiDiagram";
import { getCatalogPart } from "@/lib/catalog";
import type { Guide, GuideStep, PowerSource } from "@/lib/catalog/types";
import {
  layoutFeedback,
  toBreadboardLayout,
  toDirectLayout,
} from "@/lib/guides/layout-variants";
import { previewPowerFeedback } from "@/lib/guides/power-preview";
import { buildSolderPlan, hasBreadboard } from "@/lib/guides/solder-plan";
import { validateGuide } from "@/lib/guides/validator";

/**
 * Plain data in, nothing server-only inside: the guide page renders this with
 * a guide from the database, and a preview route can render it with a sample.
 */
export type GuideWorkspaceProps = {
  guide: Guide;
  orderedSteps: GuideStep[];
  /** Already formatted, for example "March 4, 2026". */
  expiryLabel: string;
  retentionDays: number;
};

const PANEL_HEADINGS: Record<TabId, string> = {
  parts: "Parts you need",
  tools: "Tools you need",
  solder: "What to solder where",
  steps: TAB_LABELS.steps,
  notes: TAB_LABELS.notes,
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

export function GuideWorkspace({
  guide,
  orderedSteps,
  expiryLabel,
  retentionDays,
}: GuideWorkspaceProps) {
  const uid = useId();
  const checksId = `${uid}-checks`;

  const [enlarged, setEnlargedState] = useState(false);
  const enlargedRef = useRef(false);
  // Small screens, picture full screen: the panel becomes a bottom sheet.
  const [sheetOpen, setSheetOpen] = useState(false);
  const setEnlarged = useCallback((value: boolean) => {
    enlargedRef.current = value;
    setEnlargedState(value);
    if (!value) setSheetOpen(false);
  }, []);

  // A guide that names its power source keeps it. Only a guide without one
  // lets the viewer pick, and that pick is a preview, not the guide's truth.
  const guidePower = guide.power_source;
  const [chosenPower, setChosenPower] = useState<PowerSource | null>(null);
  const selectedPower = guidePower ?? chosenPower;

  useEffect(() => {
    // Read after mount so server and first client render match.
    if (guidePower !== null) return;
    const saved = readPower(guide.id);
    if (saved) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setChosenPower(saved);
    }
  }, [guide.id, guidePower]);

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

  // ---------- tabs ----------

  const [tab, setTab] = useState<TabId>(() => defaultTab(guide));
  const tabRef = useRef(tab);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const scrollMemory = useRef<Partial<Record<TabId, number>>>({});

  useEffect(() => {
    const saved = readTab(guide.id);
    if (saved) {
      tabRef.current = saved;
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTab(saved);
    }
  }, [guide.id]);

  const switchTab = useCallback(
    (next: TabId, remember: boolean) => {
      if (remember) writeTab(guide.id, next);
      const current = tabRef.current;
      if (next === current) return;
      const scroller = scrollerRef.current;
      if (scroller) scrollMemory.current[current] = scroller.scrollTop;
      tabRef.current = next;
      setTab(next);
    },
    [guide.id],
  );

  // Each tab opens where it was left. Runs before the checklist scrolls a picked wire into view.
  useLayoutEffect(() => {
    const scroller = scrollerRef.current;
    if (scroller) scroller.scrollTop = scrollMemory.current[tab] ?? 0;
  }, [tab]);

  // A wire picked in the picture opens the Solder tab. Only the panel scrolls, never the page.
  const selectWire = useCallback(
    (id: string | null) => {
      setFocusId((current) => (id === current ? null : id));
      if (id) {
        switchTab("solder", false);
        if (enlargedRef.current) setSheetOpen(true);
      }
    },
    [switchTab],
  );

  useEffect(() => {
    if (!sheetOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSheetOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [sheetOpen]);

  function openSheet(next: TabId) {
    switchTab(next, true);
    setSheetOpen(true);
  }

  // ---------- what the viewer sees ----------

  const shownGuide = useMemo<Guide>(
    () => ({ ...guide, power_source: selectedPower }),
    [guide, selectedPower],
  );
  const feedback = useMemo(
    () =>
      guidePower === null
        ? previewPowerFeedback(guide, shownGuide)
        : { damage: [], headsUp: [] },
    [guide, shownGuide, guidePower],
  );
  const layoutGuide = useMemo<Guide>(
    () => (breadboardView ? toBreadboardLayout(shownGuide) : toDirectLayout(shownGuide)),
    [shownGuide, breadboardView],
  );
  const layoutIssues = useMemo(
    () => layoutFeedback(shownGuide, layoutGuide),
    [shownGuide, layoutGuide],
  );
  const validation = useMemo(() => validateGuide(guide), [guide]);
  const checks = useMemo(
    () => buildChecks({ validation, feedback, layoutIssues }),
    [validation, feedback, layoutIssues],
  );
  const [checksOpen, setChecksOpen] = useState(() => !validation.ok);

  const board = guide.board_id ? getCatalogPart(guide.board_id) : null;
  const counts = useMemo<Partial<Record<TabId, number>>>(
    () => ({
      parts: layoutGuide.parts.length,
      tools: toolsFor(layoutGuide).length,
      solder: buildSolderPlan(layoutGuide).items.length,
      steps: orderedSteps.length,
      notes: guide.notes.length,
    }),
    [layoutGuide, orderedSteps.length, guide.notes.length],
  );

  const isLayoutPreview = breadboardView !== ownBreadboard;
  const fact = powerFact(guidePower);

  function showChecks() {
    setEnlarged(false);
    setChecksOpen(true);
  }

  function toggleChecks() {
    if (enlarged) showChecks();
    else setChecksOpen((open) => !open);
  }

  function choosePower(value: PowerSourceValue) {
    if (guidePower !== null) return;
    setChosenPower(value);
    writePower(guide.id, value);
    const fresh = previewPowerFeedback(guide, { ...guide, power_source: value });
    if (fresh.damage.length + fresh.headsUp.length > 0) showChecks();
  }

  function clearPower() {
    setChosenPower(null);
    writePower(guide.id, null);
  }

  function chooseLayout(value: boolean) {
    setBreadboardView(value);
    setFocusId(null);
    writeLayout(guide.id, value === ownBreadboard ? null : value);
    const next = value ? toBreadboardLayout(shownGuide) : toDirectLayout(shownGuide);
    if (layoutFeedback(shownGuide, next).length > 0) showChecks();
  }

  return (
    <main
      className="guide-app"
      data-enlarged={enlarged}
      data-sheet={sheetOpen ? "open" : "closed"}
    >
      <TopBar
        title={guide.title || "Untitled guide"}
        powerFact={fact}
        boardName={board?.name ?? null}
        checks={checks}
        checksOpen={checksOpen}
        onToggleChecks={toggleChecks}
        checksId={checksId}
      />

      <div className="ga-body">
        <section aria-label="Wiring picture" className="ga-stage">
          <h2 className="ga-ph">Wiring picture</h2>
          <ControlsBar
            powerFact={fact}
            chosenPower={chosenPower}
            onChoosePower={choosePower}
            onClearPower={clearPower}
            breadboard={breadboardView}
            onBreadboardChange={chooseLayout}
            layoutPreview={isLayoutPreview}
            ownBreadboard={ownBreadboard}
            onBackToOriginal={() => chooseLayout(ownBreadboard)}
          />
          <div
            className="ga-canvas-frame"
            onPointerDownCapture={() => {
              if (sheetOpen) setSheetOpen(false);
            }}
          >
            <div className="ga-canvas-fill">
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
            </div>
          </div>
        </section>

        <section aria-label="Build guide" className="ga-panel">
          <div className="ga-sheet-head" data-print-hide="true">
            <span aria-hidden className="ga-sheet-handle" />
            <button type="button" className="ga-sheet-close" onClick={() => setSheetOpen(false)}>
              <CloseIcon size={18} />
              <span className="ml-1.5">Close</span>
            </button>
          </div>
          <ChecksRegion
            id={checksId}
            checks={checks}
            open={checksOpen}
            onClose={() => setChecksOpen(false)}
          />
          <PanelTabs
            prefix={uid}
            tab={tab}
            onChange={(next) => switchTab(next, true)}
            counts={counts}
          />
          <div ref={scrollerRef} {...{ [SCROLL_ATTR]: "" }} className="ga-scroll">
            {TAB_IDS.map((id) => (
              <div
                key={id}
                role="tabpanel"
                id={panelDomId(uid, id)}
                aria-labelledby={tabDomId(uid, id)}
                hidden={tab !== id}
                tabIndex={0}
                className="ga-tabpanel"
              >
                <h2 className="ga-ph">{PANEL_HEADINGS[id]}</h2>
                {id === "parts" ? <PrepParts parts={layoutGuide.parts} /> : null}
                {id === "tools" ? <ToolsList guide={layoutGuide} /> : null}
                {id === "solder" ? (
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
                ) : null}
                {id === "steps" ? <StepsPanel guideId={guide.id} steps={orderedSteps} /> : null}
                {id === "notes" ? (
                  <NotesPanel
                    notes={guide.notes}
                    expiryLabel={expiryLabel}
                    retentionDays={retentionDays}
                  />
                ) : null}
              </div>
            ))}
          </div>
        </section>
      </div>
      <MobileDock onOpen={openSheet} onExit={() => setEnlarged(false)} />
    </main>
  );
}
