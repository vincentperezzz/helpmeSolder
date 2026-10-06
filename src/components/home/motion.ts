import type { CSSProperties } from "react";
import { buildKeyframes, type Step } from "./timeline";

/**
 * Every animated element in the storyboard runs on the same 14 s clock.
 * Each one gets its own keyframes (built from absolute milliseconds) so the
 * whole scene can be paused, resumed or sought by setting one currentTime.
 */

const rules: string[] = [];

function def(name: string, steps: Step[]): CSSProperties {
  const id = `hiw-${name}`;
  rules.push(buildKeyframes(id, steps));
  return { animationName: id };
}

const SETTLE = "cubic-bezier(0.16,1,0.3,1)";
const GLIDE = "cubic-bezier(0.4,0,0.2,1)";
const SHOWN = "opacity:1;transform:none";

function rise(name: string, at: number, ms = 450, from = "translateY(10px)"): CSSProperties {
  return def(name, [
    [at, `opacity:0;transform:${from}`],
    [at + ms, SHOWN],
  ]);
}

function pop(name: string, at: number, ms = 360): CSSProperties {
  return def(name, [
    [at, "opacity:0;transform:scale(0.55)"],
    [at + ms, "opacity:1;transform:scale(1)"],
  ]);
}

function draw(name: string, at: number, ms = 450): CSSProperties {
  return def(name, [
    [at, "stroke-dashoffset:1", GLIDE],
    [at + ms, "stroke-dashoffset:0"],
  ]);
}

function type(name: string, from: number, to: number, distance: number, chars: number): CSSProperties {
  const ease = `steps(${chars},end)`;
  return def(name, [
    [from, "transform:translateX(0px)", ease],
    [to, `transform:translateX(${distance}px)`],
  ]);
}

function caret(name: string, from: number, to: number, distance: number, chars: number): CSSProperties {
  const ease = `steps(${chars},end)`;
  return def(name, [
    [from - 1, "opacity:0;transform:translateX(0px)"],
    [from, "opacity:1;transform:translateX(0px)", ease],
    [to, `opacity:1;transform:translateX(${distance}px)`],
    [to + 120, `opacity:0;transform:translateX(${distance}px)`],
  ]);
}

function chip(name: string, at: number): CSSProperties {
  return def(name, [
    [at, "opacity:0;transform:translate(0px,0px)"],
    [at + 120, "opacity:1;transform:translate(0px,0px)", GLIDE],
    [at + 720, "opacity:1;transform:translate(110px,0px)", GLIDE],
    [at + 820, "opacity:0;transform:translate(118px,0px)"],
  ]);
}

function ring(name: string, on: number, off?: number): CSSProperties {
  const steps: Step[] = [
    [on, "opacity:0"],
    [on + 120, "opacity:1"],
  ];
  if (off !== undefined) steps.push([off, "opacity:1"], [off + 160, "opacity:0"]);
  return def(name, steps);
}

// Wire begins: the Plan node slides left to its resting place (centred over its
// column) and the Blocked/Fixed pills follow it while fading out.
const SLIDE_AT = 7800;
const SLIDE_MS = 500;

function pill(name: string, at: number): CSSProperties {
  return def(name, [
    [at, "opacity:0;transform:translate(var(--px),8px)"],
    [at + 400, "opacity:1;transform:translate(var(--px),0px)"],
    [SLIDE_AT, "opacity:1;transform:translate(var(--px),0px)", GLIDE],
    [SLIDE_AT + SLIDE_MS, "opacity:0;transform:translate(0px,0px)"],
  ]);
}

const WIRE_AT = [8400, 8900, 9400, 9900];
const TICK_AT = [12600, 12850, 13100, 13350];

export const A = {
  scene: def("scene", [
    [0, "opacity:0"],
    [260, "opacity:1", "linear"],
    [13500, "opacity:1", "linear"],
    [13950, "opacity:0"],
  ]),

  // Ask: the prompt types in line by line, then the assistant answers.
  askBubble: rise("ask-bubble", 100, 420, "translateY(8px)"),
  cover1: type("cover-1", 500, 1300, 210, 19),
  cover2: type("cover-2", 1400, 2200, 210, 19),
  cover3: type("cover-3", 2300, 2700, 80, 6),
  caret1: caret("caret-1", 500, 1300, 210, 19),
  caret2: caret("caret-2", 1400, 2200, 210, 19),
  caret3: caret("caret-3", 2300, 2700, 80, 6),
  reply: rise("reply", 2900, 380, "translateY(8px)"),
  link1: draw("link-1", 2800, 300),

  // Plan: tool calls travel into HelpmeSolder; one is bounced, then fixed.
  trace: draw("trace", 3000, 600),
  node: def("node", [
    [3100, "opacity:0;transform:translateX(var(--px)) scale(0.55)"],
    [3520, "opacity:1;transform:translateX(var(--px)) scale(1)"],
    [SLIDE_AT, "opacity:1;transform:translateX(var(--px)) scale(1)"],
    [SLIDE_AT + SLIDE_MS, "opacity:1;transform:translateX(0px) scale(1)"],
  ]),
  chip1: chip("chip-1", 3500),
  chip2: chip("chip-2", 4100),
  chip3: def("chip-3", [
    [4700, "opacity:0;transform:translate(0px,0px)"],
    [4800, "opacity:1;transform:translate(0px,0px)", GLIDE],
    [5300, "opacity:1;transform:translate(110px,0px)", SETTLE],
    [5450, "opacity:1;transform:translate(100px,0px)", GLIDE],
    [6200, "opacity:1;transform:translate(18px,0px)", GLIDE],
    [6900, "opacity:1;transform:translate(110px,0px)"],
    [7000, "opacity:0;transform:translate(118px,0px)"],
  ]),
  chip3Bad: def("chip-3-bad", [
    [5300, "opacity:0"],
    [5400, "opacity:1"],
    [6200, "opacity:1"],
    [6360, "opacity:0"],
  ]),
  chip4: chip("chip-4", 6900),
  ringBad: ring("ring-bad", 5300, 6300),
  ringOk: ring("ring-ok", 7500),
  pillBad: pill("pill-bad", 5500),
  pillOk: pill("pill-ok", 6400),
  link2: draw("link-2", 7500, 300),

  // Wire: parts land, then wires draw one by one with numbered badges.
  bed: rise("bed", 7800, 420, "translateY(10px)"),
  board: rise("board", 8000, 420, "translateY(8px)"),
  sensor: rise("sensor", 8150, 400, "translateY(8px)"),
  buzzer: rise("buzzer", 8250, 400, "translateY(8px)"),
  wire1: draw("wire-1", WIRE_AT[0]),
  wire2: draw("wire-2", WIRE_AT[1]),
  wire3: draw("wire-3", WIRE_AT[2]),
  wire4: draw("wire-4", WIRE_AT[3]),
  badge1: pop("badge-1", WIRE_AT[0] + 380),
  badge2: pop("badge-2", WIRE_AT[1] + 380),
  badge3: pop("badge-3", WIRE_AT[2] + 380),
  badge4: pop("badge-4", WIRE_AT[3] + 380),
  link3: draw("link-3", 10900, 320),

  // Open: the secret link lands in the address bar and the guide appears.
  window: rise("window", 11000, 420, "translateY(10px)"),
  address: rise("address", 12100, 300, "translateY(4px)"),
  secret: def("secret", [
    [11250, "opacity:0;transform:translate(var(--fx),var(--fy))"],
    [11400, "opacity:1;transform:translate(var(--fx),var(--fy))", GLIDE],
    [11950, "opacity:1;transform:translate(0px,0px)", GLIDE],
    [12150, "opacity:1;transform:translate(0px,0px)"],
    [12300, "opacity:0;transform:translate(0px,0px)"],
  ]),
  screen: rise("screen", 12100, 420, "translateY(8px)"),
  tick1: draw("tick-1", TICK_AT[0], 240),
  tick2: draw("tick-2", TICK_AT[1], 240),
  tick3: draw("tick-3", TICK_AT[2], 240),
  tick4: draw("tick-4", TICK_AT[3], 240),
  box1: ring("box-1", TICK_AT[0]),
  box2: ring("box-2", TICK_AT[1]),
  box3: ring("box-3", TICK_AT[2]),
  box4: ring("box-4", TICK_AT[3]),
};

export const MOTION_CSS = rules.join("");
