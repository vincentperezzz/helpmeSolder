import { useEffect, useState, type Dispatch, type RefObject, type SetStateAction } from "react";
import { getCatalogPart } from "@/lib/catalog";
import {
  getDiagramAsset,
  prefersDiagramAsset,
} from "@/lib/catalog/board-assets";
import { getBatteryAsset } from "@/lib/catalog/batteries";
import type { Guide } from "@/lib/catalog/types";
import { isBatteryPowerSource } from "@/lib/guides/power-source";
import { hasWokwiVisual } from "@/lib/catalog/wokwi";
import {
  BB_COLS,
  BB_HEIGHT,
  BB_ORIGIN_X,
  BB_ROW_Y,
  BB_STEP,
  BB_WIDTH,
  POWER_ORIGIN,
} from "./constants";
import { placeBadges, BADGE_R } from "./badges";
import { canvasFromBounds, sceneBounds } from "./bounds";
import { POWER_WIRE_IDS } from "./focus";
import { assignLanes, hopPoints, roundedPath } from "./lanes";
import { breadboardHoleLocal, isBreadboardId, parseBreadboardRail } from "./breadboard";
import { breadboardJumperPoints, breadboardPinExit, pinExitDirection } from "./geometry";
import { isPlugConnection } from "@/lib/guides/solder-plan";
import { rotatedBox, rotatePoint } from "./plug";
import {
  assignWireColors,
  labelRect,
  pinLabel,
  pointAlongPath,
  resolveLabelPositions,
} from "./labels";
import { USB_WALL_SIZE } from "@/components/BatteryAssets";
import { boardPowerPins } from "./layout";
import {
  BATTERY_WIRE_ANCHORS,
  USB_WALL_BOX,
  USB_WALL_OUT,
  batteryBlockHeight,
  powerSourceName,
} from "./PowerSourceVisual";
import { PLUG_LENGTH, getBoardUsbPort, plugBack, usbOutward } from "./usb-port";
import { routedPath, solidObstaclesFor, type Obstacle } from "./routing";
import type {
  CanvasSize,
  DiagramScene,
  ExitDir,
  PinInfo,
  PlacedPart,
  Point,
  Rect,
  Wire,
} from "./types";

const EMPTY_SCENE: DiagramScene = { wires: [], partRects: [], bounds: null };

/** A point halfway along the path's length. */
function pathMiddle(points: Point[]): Point {
  let total = 0;
  for (let i = 0; i < points.length - 1; i += 1) {
    total += Math.hypot(points[i + 1].x - points[i].x, points[i + 1].y - points[i].y);
  }
  return pointAlongPath(points, total / 2);
}

function growRect(rect: Rect, by: number): Rect {
  return { x: rect.x - by, y: rect.y - by, w: rect.w + by * 2, h: rect.h + by * 2 };
}

export function useWireMeasure({
  guide,
  placed,
  ready,
  hostRef,
  numbers,
  setCanvas,
}: {
  guide: Guide;
  placed: PlacedPart[];
  ready: boolean;
  hostRef: RefObject<HTMLDivElement | null>;
  /** Connection id to its 1-based position in the written checklist. */
  numbers: ReadonlyMap<string, number>;
  setCanvas: Dispatch<SetStateAction<CanvasSize>>;
}): DiagramScene {
  const [scene, setScene] = useState<DiagramScene>(EMPTY_SCENE);

  useEffect(() => {
    if (!ready || !hostRef.current) return;

    let cancelled = false;
    let attempts = 0;
    const measure = () => {
      const host = hostRef.current;
      if (!host || cancelled) return;

      const anchors = new Map<string, Point>();
      const exitDirs = new Map<string, ExitDir>();
      const obstacles: Obstacle[] = [];
      const partRects: Rect[] = [];
      let boardsReady = true;

      for (const part of placed) {
        const node = host.querySelector(
          `[data-instance="${part.instanceId}"]`,
        ) as (HTMLElement & { pinInfo?: PinInfo[] | (() => PinInfo[]) }) | null;
        if (!node) {
          if (part.kind === "board") boardsReady = false;
          continue;
        }

        const offsetX = part.x;
        const offsetY = part.y;
        const rawW = node.offsetWidth;
        const rawH = node.offsetHeight;
        const raw = typeof node.pinInfo === "function" ? node.pinInfo() : node.pinInfo;
        const hasPins = Array.isArray(raw) && raw.length > 0;
        const diagramAsset = getDiagramAsset(part.catalogId);
        const useDiagramAsset =
          Boolean(diagramAsset) &&
          prefersDiagramAsset(
            part.catalogId,
            Boolean(hasWokwiVisual(getCatalogPart(part.catalogId))),
          );
        if (part.kind === "board" && !hasPins && !useDiagramAsset) {
          boardsReady = false;
        }

        let width = Math.max(rawW, 120);
        let height = Math.max(rawH, 80);
        if (hasPins) {
          const xs = raw.map((pin) => pin.x);
          const ys = raw.map((pin) => pin.y);
          width = Math.max(width, Math.max(...xs) - Math.min(...xs) + 36);
          height = Math.max(height, Math.max(...ys) - Math.min(...ys) + 36);
        } else if (useDiagramAsset && diagramAsset) {
          width = Math.max(width, diagramAsset.width);
          height = Math.max(height, diagramAsset.height);
        } else if (part.kind === "board") {
          width = Math.max(width, 160);
          height = Math.max(height, 220);
        }
        // Tight box of what is actually drawn (not the padded layout minimum),
        // plus the part's name above a breadboard.
        const drawnW = isBreadboardId(part.catalogId)
          ? BB_WIDTH
          : Math.max(
              rawW,
              hasPins ? Math.max(...raw.map((pin) => pin.x)) + 6 : 0,
              useDiagramAsset && diagramAsset ? diagramAsset.width : 0,
            ) || width;
        const drawnH = isBreadboardId(part.catalogId)
          ? BB_HEIGHT
          : Math.max(
              rawH,
              hasPins ? Math.max(...raw.map((pin) => pin.y)) + 6 : 0,
              useDiagramAsset && diagramAsset ? diagramAsset.height : 0,
            ) || height;
        const nameRoom = isBreadboardId(part.catalogId) ? 24 : 0;
        // A plugged part is turned, so its box is the turned one.
        const plugBox = part.plug ? rotatedBox(part.plug) : null;
        partRects.push({
          x: offsetX - 4,
          y: offsetY - 4 - nameRoom,
          w: (plugBox?.w ?? drawnW) + 8,
          h: (plugBox?.h ?? drawnH) + 8 + nameRoom,
        });

        const bodyPad = isBreadboardId(part.catalogId) ? 2 : 10;
        // Pins sit just inside the real body, so a pinned part's obstacle is
        // its measured size, not the padded minimum used for layout. This keeps
        // wires from running a long way beside the board before turning.
        const pinnedW = hasPins
          ? Math.max(rawW, Math.max(...raw.map((pin) => pin.x)) + 6)
          : width;
        const pinnedH = hasPins
          ? Math.max(rawH, Math.max(...raw.map((pin) => pin.y)) + 6)
          : height;
        const bodyW = isBreadboardId(part.catalogId)
          ? (BB_COLS - 1) * BB_STEP + 12
          : pinnedW;
        const bodyH = isBreadboardId(part.catalogId)
          ? BB_ROW_Y.j - BB_ROW_Y.a + 18
          : pinnedH;
        const bodyX = isBreadboardId(part.catalogId)
          ? offsetX + BB_ORIGIN_X - 6
          : offsetX - bodyPad;
        const bodyY = isBreadboardId(part.catalogId)
          ? offsetY + BB_ROW_Y.a - 8
          : offsetY - bodyPad;
        obstacles.push(
          plugBox
            ? { x: offsetX, y: offsetY, w: plugBox.w, h: plugBox.h, soft: true }
            : {
                x: bodyX,
                y: bodyY,
                w: bodyW + (isBreadboardId(part.catalogId) ? 0 : bodyPad * 2),
                h: bodyH + (isBreadboardId(part.catalogId) ? 0 : bodyPad * 2),
                ...(part.seated
                  ? { soft: true }
                  : isBreadboardId(part.catalogId)
                    ? {}
                    : { hug: true }),
              },
        );

        if (hasPins) {
          const turn = (pin: { x: number; y: number }) =>
            part.plug ? rotatePoint(part.plug, pin) : { x: pin.x, y: pin.y };
          const locals = raw.map(turn);
          for (const pin of raw) {
            const key = `${part.instanceId}:${pin.name}`;
            const local = turn(pin);
            anchors.set(key, { x: offsetX + local.x, y: offsetY + local.y });
            exitDirs.set(key, pinExitDirection(local, locals));
          }
        } else if (isBreadboardId(part.catalogId)) {
          const catalog = getCatalogPart(part.catalogId);
          catalog?.pins.forEach((pin) => {
            const local = breadboardHoleLocal(pin.id);
            if (!local) return;
            const key = `${part.instanceId}:${pin.id}`;
            anchors.set(key, {
              x: offsetX + local.x,
              y: offsetY + local.y,
            });
            exitDirs.set(key, breadboardPinExit(pin.id));
          });
        } else {
          const catalog = getCatalogPart(part.catalogId);
          const terminalLocals = diagramAsset?.terminals
            ? Object.values(diagramAsset.terminals)
            : [];
          catalog?.pins.forEach((pin, index) => {
            const key = `${part.instanceId}:${pin.id}`;
            const named =
              diagramAsset?.terminals?.[pin.id] ||
              diagramAsset?.terminals?.[pin.id.toLowerCase()] ||
              diagramAsset?.terminals?.[pin.id.toUpperCase()];
            if (named) {
              anchors.set(key, {
                x: offsetX + named.x,
                y: offsetY + named.y,
              });
              exitDirs.set(
                key,
                pinExitDirection(named, terminalLocals.length ? terminalLocals : [named]),
              );
              return;
            }
            const onRight = index % 2 !== 0;
            const assetW = diagramAsset?.width ?? width;
            anchors.set(key, {
              x: offsetX + (onRight ? assetW : 0),
              y: offsetY + 28 + Math.floor(index / 2) * 16,
            });
            exitDirs.set(key, onRight ? { dx: 1, dy: 0 } : { dx: -1, dy: 0 });
          });
        }
      }

      if (guide.power_source) {
        if (isBatteryPowerSource(guide.power_source)) {
          const asset = getBatteryAsset(guide.power_source);
          // The drawing is crossed only by its own wires; the caption under it
          // is solid, so no wire or label ever runs over the text.
          obstacles.push({
            x: POWER_ORIGIN.x,
            y: POWER_ORIGIN.y,
            w: asset.width,
            h: asset.height,
          });
          obstacles.push({
            x: POWER_ORIGIN.x - 4,
            y: POWER_ORIGIN.y + asset.height,
            w: asset.width + 8,
            h: batteryBlockHeight(asset) - asset.height + 2,
            hug: true,
          });
          partRects.push({
            x: POWER_ORIGIN.x - 4,
            y: POWER_ORIGIN.y - 4,
            w: asset.width + 8,
            h: batteryBlockHeight(asset) + 8,
          });
        } else {
          partRects.push({
            x: POWER_ORIGIN.x - 4,
            y: POWER_ORIGIN.y - 4,
            w: USB_WALL_SIZE.width + 8,
            h: USB_WALL_SIZE.height + 8,
          });
          obstacles.push({
            x: POWER_ORIGIN.x,
            y: POWER_ORIGIN.y,
            w: USB_WALL_BOX.w,
            h: USB_WALL_BOX.h,
          });
        }
      }

      const defaultExit: ExitDir = { dx: 1, dy: 0 };

      const board = placed.find((part) => part.kind === "board");
      if (guide.power_source && board) {
        const powerPins = boardPowerPins(board);
        if (isBatteryPowerSource(guide.power_source)) {
          const wireAnchors = BATTERY_WIRE_ANCHORS[guide.power_source];
          anchors.set("power-source:+", wireAnchors.plus);
          anchors.set("power-source:-", wireAnchors.minus);
          exitDirs.set("power-source:+", wireAnchors.plusExit);
          exitDirs.set("power-source:-", wireAnchors.minusExit);
          if (powerPins.vin) {
            const vinKey = `${board.instanceId}:${powerPins.vin}`;
            const vin =
              anchors.get(vinKey) || {
                x: board.x + 40,
                y: board.y + 24,
              };
            anchors.set("power-source:VIN", vin);
            exitDirs.set(
              "power-source:VIN",
              exitDirs.get(vinKey) ?? defaultExit,
            );
          }
          if (powerPins.gnd) {
            const gndKey = `${board.instanceId}:${powerPins.gnd}`;
            const gnd =
              anchors.get(gndKey) || {
                x: board.x + 40,
                y: board.y + 56,
              };
            anchors.set("power-source:GND", gnd);
            exitDirs.set(
              "power-source:GND",
              exitDirs.get(gndKey) ?? defaultExit,
            );
          }
        } else {
          const usbPort = getBoardUsbPort(board.catalogId);
          if (usbPort) {
            const outward = usbOutward(usbPort.side);
            const mouth = { x: board.x + usbPort.x, y: board.y + usbPort.y };
            anchors.set("power-source:OUT", {
              x: USB_WALL_OUT.x + PLUG_LENGTH,
              y: USB_WALL_OUT.y,
            });
            exitDirs.set("power-source:OUT", { dx: 1, dy: 0 });
            anchors.set("power-source:BOARD", plugBack(mouth, outward));
            exitDirs.set("power-source:BOARD", outward);
          } else {
            // No USB connector known for this board: fall back to a 5V wire.
            anchors.set("power-source:OUT", USB_WALL_OUT);
            exitDirs.set("power-source:OUT", { dx: 1, dy: 0 });
            const targetPin = powerPins.usb || powerPins.vin;
            const boardKey = targetPin ? `${board.instanceId}:${targetPin}` : "";
            anchors.set(
              "power-source:BOARD",
              (boardKey && anchors.get(boardKey)) || { x: board.x + 40, y: board.y + 20 },
            );
            exitDirs.set(
              "power-source:BOARD",
              (boardKey && exitDirs.get(boardKey)) || defaultExit,
            );
          }
        }
      }

      const nextWires: Wire[] = [];
      const badgeEnds = new Map<string, "from" | "to">();
      const routedPaths: Point[][] = [];
      const routeWire = (
        from: Point,
        to: Point,
        fromKey: string,
        toKey: string,
        index: number,
      ) =>
        routedPath(
          from,
          to,
          exitDirs.get(fromKey) ?? defaultExit,
          exitDirs.get(toKey) ?? { dx: -defaultExit.dx, dy: -defaultExit.dy },
          obstacles,
          index,
          routedPaths,
        );

      // Same label string as solder-plan.ts builds, so the diagram colours and
      // the checklist swatches always match.
      const connectionLabels = guide.connections.map((connection) => {
        const fromPart = guide.parts.find((part) => part.instanceId === connection.from.instanceId);
        const toPart = guide.parts.find((part) => part.instanceId === connection.to.instanceId);
        const fromName = fromPart
          ? pinLabel(fromPart.catalogId, connection.from.pinId)
          : connection.from.pinId;
        const toName = toPart
          ? pinLabel(toPart.catalogId, connection.to.pinId)
          : connection.to.pinId;
        return connection.note || `${fromName} → ${toName}`;
      });
      const connectionColors = assignWireColors(connectionLabels);

      guide.connections.forEach((connection, index) => {
        // A part leg sitting in a hole is drawn as the part itself, not as a wire.
        if (isPlugConnection(connection)) return;
        const fromKey = `${connection.from.instanceId}:${connection.from.pinId}`;
        const toKey = `${connection.to.instanceId}:${connection.to.pinId}`;
        const from = anchors.get(fromKey);
        const to = anchors.get(toKey);
        if (!from || !to) return;

        const fromPart = guide.parts.find(
          (part) => part.instanceId === connection.from.instanceId,
        );
        const toPart = guide.parts.find(
          (part) => part.instanceId === connection.to.instanceId,
        );
        const label = connectionLabels[index];
        const fromRail = parseBreadboardRail(connection.from.pinId);
        const toRail = parseBreadboardRail(connection.to.pinId);
        const sameBoardRailBridge =
          fromPart &&
          toPart &&
          fromPart.instanceId === toPart.instanceId &&
          isBreadboardId(fromPart.catalogId) &&
          fromRail &&
          toRail;

        let route: { d: string; mid: Point; points: Point[] };
        if (sameBoardRailBridge && fromRail && toRail) {
          const edgeX =
            from.x + (fromRail.col >= BB_COLS - 2 || toRail.col >= BB_COLS - 2 ? 14 : -14);
          const points: Point[] = [
            from,
            { x: edgeX, y: from.y },
            { x: edgeX, y: to.y },
            to,
          ];
          route = {
            points,
            mid: points[1],
            d: points
              .map((point, i) =>
                i === 0 ? `M ${point.x} ${point.y}` : `L ${point.x} ${point.y}`,
              )
              .join(" "),
          };
        } else if (
          fromPart &&
          fromPart.instanceId === toPart?.instanceId &&
          isBreadboardId(fromPart.catalogId)
        ) {
          const points = breadboardJumperPoints(from, to);
          route = {
            points,
            mid: points[Math.floor(points.length / 2)],
            d: points
              .map((point, i) =>
                i === 0 ? `M ${point.x} ${point.y}` : `L ${point.x} ${point.y}`,
              )
              .join(" "),
          };
        } else {
          route = routeWire(from, to, fromKey, toKey, index);
        }
        routedPaths.push(route.points);
        // Connection wires are named by a numbered badge (and a card on demand),
        // never by a pill that sits on the picture all the time.
        nextWires.push({
          id: connection.id,
          color: connectionColors[index],
          d: route.d,
          label,
          showLabel: false,
          mid: route.mid,
          from,
          to,
          points: route.points,
        });
        // Badge goes at the end that is not the microcontroller's crowded header.
        const fromIsBoard = connection.from.instanceId === board?.instanceId;
        const toIsBoard = connection.to.instanceId === board?.instanceId;
        badgeEnds.set(connection.id, fromIsBoard && !toIsBoard ? "to" : "from");
      });

      // Label sits on its wire near the board pin it names, a short way along from it.
      const labelNearEnd = (points: Point[]): Point =>
        pointAlongPath([...points].reverse(), 44);

      if (guide.power_source && isBatteryPowerSource(guide.power_source) && board) {
        const powerPins = boardPowerPins(board);
        const sourceName = powerSourceName(guide.power_source);
        const vinName = powerPins.vin ? pinLabel(board.catalogId, powerPins.vin) : "VIN";
        const gndName = powerPins.gnd ? pinLabel(board.catalogId, powerPins.gnd) : "GND";
        const plusFrom = anchors.get("power-source:+");
        const plusTo = anchors.get("power-source:VIN");
        const minusFrom = anchors.get("power-source:-");
        const minusTo = anchors.get("power-source:GND");
        // Short pill text so it fits on the wire; the full sentence is the tooltip.
        if (plusFrom && plusTo) {
          const route = routeWire(plusFrom, plusTo, "power-source:+", "power-source:VIN", 0);
          routedPaths.unshift(route.points);
          nextWires.unshift({
            id: "power-plus",
            color: "#c62828",
            d: route.d,
            label: `+ to ${vinName}`,
            title: `${sourceName} + to ${vinName}`,
            showLabel: true,
            mid: labelNearEnd(route.points),
            from: plusFrom,
            to: plusTo,
            points: route.points,
          });
        }
        if (minusFrom && minusTo) {
          const route = routeWire(minusFrom, minusTo, "power-source:-", "power-source:GND", 1);
          routedPaths.unshift(route.points);
          nextWires.unshift({
            id: "power-minus",
            color: "#212121",
            d: route.d,
            label: `− to ${gndName}`,
            title: `${sourceName} − to ${gndName}`,
            showLabel: true,
            mid: labelNearEnd(route.points),
            from: minusFrom,
            to: minusTo,
            points: route.points,
          });
        }
      } else if (guide.power_source === "usb_wall") {
        const from = anchors.get("power-source:OUT");
        const to = anchors.get("power-source:BOARD");
        const usbPort = board ? getBoardUsbPort(board.catalogId) : undefined;
        if (from && to) {
          const route = routeWire(from, to, "power-source:OUT", "power-source:BOARD", 0);
          routedPaths.unshift(route.points);
          if (usbPort && board) {
            const mouth = { x: board.x + usbPort.x, y: board.y + usbPort.y };
            nextWires.unshift({
              id: "power-feed",
              color: "#78909c",
              d: route.d,
              label: "USB cable into the board's USB port",
              title: "USB cable from the wall adapter into the board's USB port",
              showLabel: true,
              mid: labelNearEnd(route.points),
              from,
              to,
              points: route.points,
              plugs: [
                { tip: USB_WALL_OUT, back: from, kind: "usb-a" },
                { tip: mouth, back: to, kind: usbPort.kind },
              ],
            });
          } else {
            nextWires.unshift({
              id: "power-feed",
              color: "#c62828",
              d: route.d,
              label: "5V from the USB adapter to the power pin",
              title: "5V from the USB adapter to the board's power pin",
              showLabel: true,
              mid: labelNearEnd(route.points),
              from,
              to,
              points: route.points,
            });
          }
        }
      }

      // Give overlapping legs their own lanes, then redraw every wire with
      // rounded corners and a hop wherever it crosses another wire.
      const lanes = assignLanes(
        nextWires.map((wire) => wire.points),
        {
          solid: nextWires.map((wire) =>
            solidObstaclesFor(wire.from, wire.to, obstacles).map((rect) => growRect(rect, 3)),
          ),
        },
      );
      const hops = hopPoints(
        lanes,
        nextWires.map((wire) => Boolean(wire.plugs)),
      );
      nextWires.forEach((wire, i) => {
        wire.points = lanes[i];
        wire.d = roundedPath(lanes[i], hops[i]);
        wire.mid = (POWER_WIRE_IDS as readonly string[]).includes(wire.id)
          ? labelNearEnd(lanes[i])
          : pathMiddle(lanes[i]);
      });

      // Power wires keep a short pill; place it clear of wires, parts and other pills.
      resolveLabelPositions(nextWires, obstacles);
      const pills = nextWires.flatMap((wire) =>
        wire.showLabel ? [labelRect(wire.mid, wire.label)] : [],
      );
      placeBadges(nextWires, { numbers, ends: badgeEnds, fixedRects: pills, partRects });

      const bounds = sceneBounds({ wires: nextWires, partRects, badgeRadius: BADGE_R });

      if (!boardsReady && attempts < 25) {
        attempts += 1;
        window.setTimeout(measure, 120);
        return;
      }

      if (bounds) setCanvas(canvasFromBounds(bounds));
      setScene({ wires: nextWires, partRects, bounds });
    };

    const frame = requestAnimationFrame(() => {
      requestAnimationFrame(measure);
    });
    const timer = window.setTimeout(measure, 160);

    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
      window.clearTimeout(timer);
    };
  }, [
    ready,
    placed,
    guide.connections,
    guide.power_source,
    guide.parts,
    hostRef,
    numbers,
    setCanvas,
  ]);

  return scene;
}
