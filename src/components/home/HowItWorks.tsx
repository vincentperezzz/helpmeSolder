"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import "./HowItWorks.css";
import { HowItWorksScene } from "./HowItWorksScene";
import { MOTION_CSS } from "./motion";
import { BEATS, beatAt, seekTimeFor, wrapMs, type BeatId } from "./timeline";

const SCENE_LABEL = "How HelpmeSolder works in four beats: Ask, Plan, Wire, Open.";
const WIDE_QUERY = "(min-width: 768px)";
const REDUCED_QUERY = "(prefers-reduced-motion: reduce)";

function clockTime(root: HTMLElement): number | null {
  for (const scene of root.querySelectorAll(".hiw-scene")) {
    const time = scene.getAnimations()[0]?.currentTime;
    if (typeof time === "number") return time;
  }
  return null;
}

function seekAll(root: HTMLElement, ms: number) {
  for (const animation of root.getAnimations({ subtree: true })) animation.currentTime = ms;
}

/**
 * High-precision cybernetic engineering console for the HelpmeSolder pipeline.
 * Runs on a 14s continuous hardware-accelerated clock synced via requestAnimationFrame.
 */
export function HowItWorks() {
  const rootRef = useRef<HTMLElement>(null);
  const lastTime = useRef(0);
  const pendingSeek = useRef<number | null>(null);
  const [seen, setSeen] = useState(false);
  const [inView, setInView] = useState(false);
  const [tabHidden, setTabHidden] = useState(false);
  const [reduced, setReduced] = useState(false);
  const [userPaused, setUserPaused] = useState(false);
  const [beat, setBeat] = useState<BeatId>("ask");
  const [beatProgress, setBeatProgress] = useState(0);

  const live = seen && !reduced;
  const paused = userPaused || !inView || tabHidden;

  useEffect(() => {
    const query = window.matchMedia(REDUCED_QUERY);
    const sync = () => {
      setReduced(query.matches);
    };
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        setInView(entry.isIntersecting);
        if (entry.isIntersecting) setSeen(true);
      },
      { threshold: 0.2 },
    );
    observer.observe(root);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const sync = () => setTabHidden(document.hidden);
    sync();
    document.addEventListener("visibilitychange", sync);
    return () => document.removeEventListener("visibilitychange", sync);
  }, []);

  // Restore clock position across responsive swaps
  useEffect(() => {
    const root = rootRef.current;
    if (!root || !live) return;
    const apply = () => {
      const target = pendingSeek.current ?? lastTime.current;
      pendingSeek.current = null;
      if (target > 0) seekAll(root, target);
    };
    apply();
    const query = window.matchMedia(WIDE_QUERY);
    query.addEventListener("change", apply);
    return () => query.removeEventListener("change", apply);
  }, [live]);

  // Ultra-fluid requestAnimationFrame tracking loop (zero lag, 100% exact sync)
  useEffect(() => {
    const root = rootRef.current;
    if (!root || !live || paused) return;

    let rafId: number;
    const tick = () => {
      const time = clockTime(root);
      if (time !== null) {
        const ms = wrapMs(time);
        lastTime.current = ms;
        const currentBeat = beatAt(ms);
        setBeat(currentBeat);

        const currentBeatObj = BEATS.find((b) => b.id === currentBeat);
        if (currentBeatObj) {
          const ratio = Math.max(0, Math.min(1, (ms - currentBeatObj.start) / (currentBeatObj.end - currentBeatObj.start)));
          setBeatProgress(ratio);
        }
      }
      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [live, paused]);

  const jump = useCallback(
    (id: BeatId) => {
      setBeat(id);
      setBeatProgress(0);
      if (reduced) return;
      const target = seekTimeFor(id);
      lastTime.current = target;
      setUserPaused(false);
      const root = rootRef.current;
      if (live && root) seekAll(root, target);
      else {
        pendingSeek.current = target;
        setSeen(true);
      }
    },
    [live, reduced],
  );

  const className = [
    "hiw",
    live ? "is-live" : "",
    live && paused ? "is-paused" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const activeIndex = BEATS.findIndex((b) => b.id === beat);

  return (
    <section
      ref={rootRef}
      className={className}
      data-seen={seen ? "true" : "false"}
      data-focus={reduced ? beat : undefined}
      aria-labelledby="hiw-title"
    >
      <style>{MOTION_CSS}</style>

      <header className="hiw-head">
        <div className="hiw-head__text">
          <span className="hiw-badge-tag">02 · The Workflow</span>
          <h2 id="hiw-title" className="hiw-title">
            Your chat plans it. We draw it from real parts.
          </h2>
          <p className="hiw-lede">
            Describe the build in plain words. HelpmeSolder checks every pin and voltage, then produces an interactive step-by-step guide.
          </p>
        </div>
      </header>

      {/* Monolith Precision Workbench Stage */}
      <div className="hiw-monolith">
        {/* HUD Control Bar */}
        <div className="hiw-hud">
          <div className="hiw-hud__status">
            <span className="hiw-hud__dot" aria-hidden="true" />
            <span className="hiw-hud__label">SYS.ACTIVE // 4-STAGE PIPELINE</span>
          </div>

          <div className="hiw-hud__stepper" aria-hidden="true">
            {BEATS.map((b, i) => (
              <span
                key={b.id}
                className={`hiw-hud__step-pip ${i === activeIndex ? "is-active" : i < activeIndex ? "is-passed" : ""}`}
              >
                {`0${i + 1}`}
              </span>
            ))}
          </div>

          <button
            type="button"
            className="hiw-toggle"
            onClick={() => setUserPaused((value) => !value)}
            aria-label={userPaused ? "Play animation" : "Pause animation"}
          >
            {userPaused ? (
              <>
                <svg className="hiw-toggle__icon" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                  <path d="M4.5 3.5v9l8-4.5-8-4.5z" />
                </svg>
                <span>RESUME</span>
              </>
            ) : (
              <>
                <svg className="hiw-toggle__icon" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                  <path d="M4 3.5h3v9H4v-9zm5 0h3v9H9v-9z" />
                </svg>
                <span>FREEZE</span>
              </>
            )}
          </button>
        </div>

        {/* Live Vector Circuit Stage */}
        <div className="hiw-canvas">
          <HowItWorksScene layout="tall" label={SCENE_LABEL} />
          <HowItWorksScene layout="wide" label={SCENE_LABEL} />
        </div>

        <ol className="sr-only">
          <li>Ask: you type a request in a chat, such as an ESP32 and a buzzer that beeps when the soil is dry.</li>
          <li>
            Plan: the assistant calls create_guide, add_part, add_connection and validate_guide. HelpmeSolder blocks 5 V
            on a 3.3 V pin and accepts the safe fix.
          </li>
          <li>Wire: numbered wires draw one by one between the board, the soil sensor and the buzzer.</li>
          <li>Open: a secret link opens the numbered checklist in any browser, on any device, and each joint gets ticked off.</li>
        </ol>

        {/* Integrated Hardware Sequencer Deck */}
        <div className="hiw-deck" role="tablist" aria-label="Workflow pipeline steps">
          {BEATS.map((b, index) => {
            const isActive = beat === b.id;
            const isPassed = index < activeIndex;

            return (
              <button
                key={b.id}
                type="button"
                role="tab"
                id={`hiw-beat-${b.id}`}
                className="hiw-deck-tab"
                style={{ "--i": index } as React.CSSProperties}
                data-active={isActive ? "true" : undefined}
                data-passed={isPassed ? "true" : undefined}
                aria-selected={isActive}
                onClick={() => jump(b.id)}
              >
                {/* Laser Progress Trace Bar */}
                <div className="hiw-deck-rail">
                  <div
                    className="hiw-deck-progress"
                    style={{
                      transform: isActive
                        ? `scaleX(${beatProgress})`
                        : isPassed
                          ? "scaleX(1)"
                          : "scaleX(0)",
                      opacity: isActive ? 1 : isPassed ? 0.35 : 0,
                    }}
                    aria-hidden="true"
                  />
                </div>

                <div className="hiw-deck-body">
                  <div className="hiw-deck-top">
                    <span className="hiw-deck-num">{`0${index + 1}`}</span>
                    <span className="hiw-deck-name">{b.label}</span>
                  </div>
                  <p className="hiw-deck-hint">
                    {b.hint.split("\n").map((line) => (
                      <span key={line} className="hiw-deck-line">
                        {line}{" "}
                      </span>
                    ))}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
