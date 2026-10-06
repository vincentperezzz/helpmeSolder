"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import "./HowItWorks.css";
import { HowItWorksScene } from "./HowItWorksScene";
import { A, MOTION_CSS } from "./motion";
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
 * Animated storyboard of the product: ask in chat, plan through the tool
 * calls, wire the parts, open the guide on a phone. The SVG is static JSX; one
 * shared 14 s CSS clock drives it, so React only learns which beat is current.
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
  const [beat, setBeat] = useState<BeatId | null>("ask");

  const live = seen && !reduced;
  const paused = userPaused || !inView || tabHidden;

  useEffect(() => {
    const query = window.matchMedia(REDUCED_QUERY);
    const sync = () => {
      setReduced(query.matches);
      if (query.matches) setBeat(null);
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
      { threshold: 0.3 },
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

  // A pending jump lands once the animations exist; a breakpoint flip
  // restarts the swapped-in SVG at zero, so put it back on the shared clock.
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

  // Which beat is current: a slow check of the shared clock, state only on change.
  useEffect(() => {
    const root = rootRef.current;
    if (!root || !live || paused) return;
    const id = window.setInterval(() => {
      const time = clockTime(root);
      if (time === null) return;
      lastTime.current = wrapMs(time);
      setBeat(beatAt(time));
    }, 160);
    return () => window.clearInterval(id);
  }, [live, paused]);

  const jump = useCallback(
    (id: BeatId) => {
      setBeat(id);
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

  const className = ["hiw", live ? "is-live" : "", live && paused ? "is-paused" : ""].filter(Boolean).join(" ");

  return (
    <section ref={rootRef} className={className} data-focus={reduced && beat ? beat : undefined} aria-labelledby="hiw-title">
      <style>{MOTION_CSS}</style>
      <header className="hiw-head">
        <div>
          <h2 id="hiw-title" className="hiw-title">
            From a chat to a wiring plan
          </h2>
          <p className="hiw-lede">
            Describe the build in plain words. HelpmeSolder checks every pin and voltage, then sends a numbered guide to
            your phone.
          </p>
        </div>
        <button
          type="button"
          className="hiw-toggle"
          onClick={() => setUserPaused((value) => !value)}
          aria-label={userPaused ? "Play the animation" : "Pause the animation"}
        >
          {userPaused ? "Play" : "Pause"}
        </button>
      </header>

      <div className="hiw-stage">
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
        <li>Open: a secret link opens the numbered checklist on your phone and each joint gets ticked off.</li>
      </ol>

      <ul className="hiw-legend" aria-label="Jump to a beat">
        {BEATS.map((b) => (
          <li key={b.id}>
            <button type="button" className="hiw-beat" aria-pressed={beat === b.id} onClick={() => jump(b.id)}>
              <span className="hiw-beat-name">{b.label}</span>
              <span className="hiw-beat-hint">{b.hint}</span>
              <span className="hiw-a hiw-prog" style={A.progress[b.id]} aria-hidden="true" />
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
