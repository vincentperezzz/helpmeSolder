import {
  useEffect,
  useState,
  type Dispatch,
  type MutableRefObject,
  type RefObject,
  type SetStateAction,
} from "react";
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
  BB_ORIGIN_X,
  BB_ROW_Y,
  BB_STEP,
  POWER_ORIGIN,
  clampZoom,
} from "./constants";
import { breadboardHoleLocal, isBreadboardId, parseBreadboardRail } from "./breadboard";
import { breadboardPinExit, pinExitDirection } from "./geometry";
import { labelRect, pinLabel, resolveLabelPositions, wireColor } from "./labels";
import { boardPowerPins } from "./layout";
import { BATTERY_WIRE_ANCHORS } from "./PowerSourceVisual";
import { routedPath, type Obstacle } from "./routing";
import type { CanvasSize, ExitDir, PinInfo, PlacedPart, Point, Wire } from "./types";

export function useWireMeasure({
  guide,
  placed,
  ready,
  hostRef,
  viewportRef,
  fittedRef,
  setCanvas,
  setZoom,
  setPan,
}: {
  guide: Guide;
  placed: PlacedPart[];
  ready: boolean;
  hostRef: RefObject<HTMLDivElement | null>;
  viewportRef: RefObject<HTMLDivElement | null>;
  fittedRef: MutableRefObject<boolean>;
  setCanvas: Dispatch<SetStateAction<CanvasSize>>;
  setZoom: Dispatch<SetStateAction<number>>;
  setPan: Dispatch<SetStateAction<{ x: number; y: number }>>;
}): Wire[] {
  const [wires, setWires] = useState<Wire[]>([]);

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
      let maxRight = 1200;
      let maxBottom = 720;
      let contentRight = 0;
      let contentBottom = 0;
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
        maxRight = Math.max(maxRight, offsetX + width + 140);
        maxBottom = Math.max(maxBottom, offsetY + height + 120);
        contentRight = Math.max(contentRight, offsetX + width);
        contentBottom = Math.max(contentBottom, offsetY + height);

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
        obstacles.push({
          x: bodyX,
          y: bodyY,
          w: bodyW + (isBreadboardId(part.catalogId) ? 0 : bodyPad * 2),
          h: bodyH + (isBreadboardId(part.catalogId) ? 0 : bodyPad * 2),
          ...(part.seated
            ? { soft: true }
            : isBreadboardId(part.catalogId)
              ? {}
              : { hug: true }),
        });

        if (hasPins) {
          const locals = raw.map((pin) => ({ x: pin.x, y: pin.y }));
          for (const pin of raw) {
            const key = `${part.instanceId}:${pin.name}`;
            const global = { x: offsetX + pin.x, y: offsetY + pin.y };
            anchors.set(key, global);
            exitDirs.set(key, pinExitDirection({ x: pin.x, y: pin.y }, locals));
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
          obstacles.push({
            x: POWER_ORIGIN.x,
            y: POWER_ORIGIN.y,
            w: asset.width,
            h: asset.height + 16,
          });
        } else {
          obstacles.push({
            x: POWER_ORIGIN.x,
            y: POWER_ORIGIN.y,
            w: 150,
            h: 110,
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
          const outPt = {
            x: POWER_ORIGIN.x + 128,
            y: POWER_ORIGIN.y + 38,
          };
          anchors.set("power-source:OUT", outPt);
          exitDirs.set("power-source:OUT", { dx: 1, dy: 0 });
          const targetPin = powerPins.usb || powerPins.vin;
          const target = targetPin
            ? anchors.get(`${board.instanceId}:${targetPin}`)
            : undefined;
          const boardKey = targetPin
            ? `${board.instanceId}:${targetPin}`
            : "";
          anchors.set(
            "power-source:BOARD",
            target || { x: board.x + 40, y: board.y + 20 },
          );
          if (boardKey) {
            exitDirs.set(
              "power-source:BOARD",
              exitDirs.get(boardKey) ?? defaultExit,
            );
          } else {
            exitDirs.set("power-source:BOARD", defaultExit);
          }
        }
      }

      const nextWires: Wire[] = [];
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

      guide.connections.forEach((connection, index) => {
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
        const fromName = fromPart
          ? pinLabel(fromPart.catalogId, connection.from.pinId)
          : connection.from.pinId;
        const toName = toPart
          ? pinLabel(toPart.catalogId, connection.to.pinId)
          : connection.to.pinId;
        const label = connection.note || `${fromName} → ${toName}`;
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
        } else {
          route = routeWire(from, to, fromKey, toKey, index);
        }
        routedPaths.push(route.points);
        const span = Math.hypot(to.x - from.x, to.y - from.y);
        const touchesBreadboard =
          (fromPart && isBreadboardId(fromPart.catalogId)) ||
          (toPart && isBreadboardId(toPart.catalogId));
        const bothOnOrNearBoard =
          touchesBreadboard &&
          fromPart &&
          toPart &&
          (isBreadboardId(fromPart.catalogId) || fromPart.catalogId.includes("resistor") || fromPart.catalogId.includes(".led.")) &&
          (isBreadboardId(toPart.catalogId) || toPart.catalogId.includes("resistor") || toPart.catalogId.includes(".led."));
        const showLabel =
          (Boolean(connection.note) && !/^Bridge/i.test(connection.note || "")) ||
          (span > 110 && !bothOnOrNearBoard);
        maxRight = Math.max(maxRight, from.x + 40, to.x + 40, route.mid.x + 80);
        maxBottom = Math.max(maxBottom, from.y + 40, to.y + 40, route.mid.y + 40);
        contentRight = Math.max(contentRight, from.x, to.x, route.mid.x);
        contentBottom = Math.max(contentBottom, from.y, to.y, route.mid.y);
        nextWires.push({
          id: connection.id,
          color: wireColor(index, label),
          d: route.d,
          label,
          showLabel,
          mid: route.mid,
          from,
          to,
          points: route.points,
        });
      });

      if (guide.power_source && isBatteryPowerSource(guide.power_source)) {
        const plusFrom = anchors.get("power-source:+");
        const plusTo = anchors.get("power-source:VIN");
        const minusFrom = anchors.get("power-source:-");
        const minusTo = anchors.get("power-source:GND");
        if (plusFrom && plusTo) {
          const route = routeWire(
            plusFrom,
            plusTo,
            "power-source:+",
            "power-source:VIN",
            0,
          );
          routedPaths.unshift(route.points);
          nextWires.unshift({
            id: "power-plus",
            color: "#c62828",
            d: route.d,
            label: "+ → VIN",
            showLabel: true,
            mid: route.mid,
            from: plusFrom,
            to: plusTo,
            points: route.points,
          });
        }
        if (minusFrom && minusTo) {
          const route = routeWire(
            minusFrom,
            minusTo,
            "power-source:-",
            "power-source:GND",
            1,
          );
          routedPaths.unshift(route.points);
          nextWires.unshift({
            id: "power-minus",
            color: "#212121",
            d: route.d,
            label: "− → GND",
            showLabel: true,
            mid: route.mid,
            from: minusFrom,
            to: minusTo,
            points: route.points,
          });
        }
      } else if (guide.power_source === "usb_wall") {
        const from = anchors.get("power-source:OUT");
        const to = anchors.get("power-source:BOARD");
        if (from && to) {
          const route = routeWire(from, to, "power-source:OUT", "power-source:BOARD", 0);
          routedPaths.unshift(route.points);
          nextWires.unshift({
            id: "power-feed",
            color: "#37474f",
            d: route.d,
            label: "USB → VIN",
            showLabel: true,
            mid: route.mid,
            from,
            to,
            points: route.points,
          });
        }
      }

      resolveLabelPositions(nextWires, obstacles);

      for (const wire of nextWires) {
        if (!wire.showLabel) continue;
        const box = labelRect(wire.mid, wire.label);
        maxRight = Math.max(maxRight, box.x + box.w + 24);
        maxBottom = Math.max(maxBottom, box.y + box.h + 24);
        contentRight = Math.max(contentRight, box.x + box.w);
        contentBottom = Math.max(contentBottom, box.y + box.h);
      }

      if (!boardsReady && attempts < 25) {
        attempts += 1;
        window.setTimeout(measure, 120);
        return;
      }

      const fitWidth = Math.ceil(contentRight + 60);
      const fitHeight = Math.ceil(contentBottom + 60);
      setCanvas({
        width: Math.ceil(maxRight + 160),
        height: Math.ceil(maxBottom + 160),
        fitWidth,
        fitHeight,
      });
      setWires(nextWires);

      const viewport = viewportRef.current;
      if (viewport && !fittedRef.current) {
        const fit = Math.min(
          (viewport.clientWidth - 48) / Math.max(fitWidth, 1),
          (viewport.clientHeight - 48) / Math.max(fitHeight, 1),
          1.15,
        );
        fittedRef.current = true;
        setZoom(clampZoom(Number.isFinite(fit) && fit > 0 ? fit : 1));
        setPan({ x: 40, y: 40 });
      }
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
    viewportRef,
    fittedRef,
    setCanvas,
    setZoom,
    setPan,
  ]);

  return wires;
}
