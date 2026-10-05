import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getCatalogPart, listCatalog } from "@/lib/catalog";
import type { Guide } from "@/lib/catalog/types";
import {
  createGuide,
  getGuide,
  updateGuide,
} from "@/lib/guides/repository";
import {
  POWER_SOURCE_VALUES,
  normalizePowerSource,
} from "@/lib/guides/power-source";
import { getRetentionDays, retentionNotice } from "@/lib/guides/retention";
import { validateGuide } from "@/lib/guides/validator";
import { STRONG_MATCH, suggestClosest } from "@/lib/requests/normalize";
import { resolveAlias, type PartRequestInput } from "@/lib/requests/record";
import { sensorCategories } from "./sensor-options";

export type ToolContext = {
  /** Public base URL used to build guide links. */
  appUrl: string;
  /** Returns an error message when the caller is over the limit, else null. */
  rateLimit: (bucket: "create" | "write") => string | null;
  /** Records the caller as an anonymous daily creator. Best-effort, never throws. */
  recordCreator: () => void;
  /** Records a part the catalog does not have. Best-effort, never throws. */
  recordMiss: (miss: PartRequestInput) => void;
};

type GuidePatch = Parameters<typeof updateGuide>[1];

type ToolResult = {
  content: { type: "text"; text: string }[];
  isError?: boolean;
};

const INSTRUCTIONS = `HelpmeSolder writes a how-to solder guide (parts prep, wiring diagram, steps) at a secret link.
Flow:
1. list_catalog to pick a board and parts. If unsure of an id, call search_catalog with a short name. Never guess or invent ids.
   If nothing in the catalog fits, call request_part (it tells the site owner) and tell the user it is not supported yet.
2. If the power source is unknown call ask_power_source and ASK THE USER (never guess), later set_power_source.
3. If the build needs a sensor/input and the exact module is unknown call ask_sensor and ASK THE USER.
4. create_guide, then tell the user the returned url and mention that the guide is deleted if unopened (see retention.message).
5. set_power_source, add_part (catalog ids only), add_connection, set_steps.
6. validate_guide and fix problems using alternatives[].

Writing steps (readers are beginners who dislike circuit diagrams):
- The page already generates a "What to solder where" checklist from the connections, so do NOT restate every wire in the steps.
- When a step names a pin, use the exact pin label used in the connections (for example "1 (SIG)" or "GND", never "+" or "-" if the pin is labelled otherwise).
- Order: prepare parts and tools, solder power and ground first, then signal wires, then power up and test.
- One action per step, plain words, short sentences. Say what to look for at the end (for example "the LED lights").`;

const connectionEndpoint = z.object({ instanceId: z.string(), pinId: z.string() });

function textResult(data: unknown): ToolResult {
  return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
}

function errorResult(message: string): ToolResult {
  return { content: [{ type: "text", text: message }], isError: true };
}

async function safely(run: () => Promise<ToolResult>): Promise<ToolResult> {
  try {
    return await run();
  } catch (error) {
    console.error("[mcp] tool error:", error);
    return errorResult("Internal server error");
  }
}

async function changeGuide(
  ctx: ToolContext,
  guideId: string,
  buildPatch: (guide: Guide) => GuidePatch,
): Promise<ToolResult> {
  const limited = ctx.rateLimit("write");
  if (limited) {
    return errorResult(limited);
  }

  const existing = await getGuide(guideId);
  if (!existing) {
    return errorResult("Guide not found");
  }

  const guide = await updateGuide(guideId, buildPatch(existing));
  const validation = validateGuide(guide);
  return textResult({ guide, validation, blocked: !validation.ok });
}

export function registerTools(server: McpServer, ctx: ToolContext): void {
  server.registerTool(
    "create_guide",
    {
      description:
        "Create a secret HelpmeSolder guide and return its URL. Prefer setting board_id from list_catalog. Use a short plain title a beginner would recognise (for example \"ESP32 buzzer\"). Before wiring, ask the user which power source (battery type or USB wall) — never guess — then call set_power_source.",
      inputSchema: {
        title: z.string().optional(),
        board_id: z.string().optional(),
      },
    },
    (input) =>
      safely(async () => {
        const limited = ctx.rateLimit("create");
        if (limited) {
          return errorResult(limited);
        }
        const guide = await createGuide(input);
        ctx.recordCreator();
        if (input.board_id && !getCatalogPart(input.board_id)) {
          ctx.recordMiss({ name: input.board_id, kind: "board", source: "add_part" });
        }
        return textResult({
          guide,
          validation: validateGuide(guide),
          url: `${ctx.appUrl}/guides/${guide.id}`,
          retention: { days: getRetentionDays(), message: retentionNotice() },
        });
      }),
  );

  server.registerTool(
    "ask_power_source",
    {
      description:
        "Decision helper for power. Call this when power_source is unknown. Returns the exact question and options to ask the user. Do NOT invent a battery type or USB wall — wait for the user's answer, then call set_power_source.",
      inputSchema: {
        guide_id: z.string().optional(),
        context: z
          .string()
          .optional()
          .describe("Optional project context (portable, outdoor, bench, etc.)"),
      },
    },
    ({ guide_id, context }) =>
      Promise.resolve(
        textResult({
          mustAskUser: true,
          question:
            "How will you power this build — USB wall adapter, 9V battery, 2×AA, 3×AA, or single 18650 cell?",
          whyAsk:
            "Power choice changes the diagram and VIN/USB wiring notes. Never assume battery type or USB wall.",
          options: [
            {
              id: "usb_wall",
              label: "USB wall adapter",
              diagram: "Shows a USB wall brick into the board USB / 5V rail.",
              when: "Bench, indoor, always-on, or powered from a phone charger brick.",
              setPowerSource: "usb_wall",
            },
            {
              id: "battery_9v",
              label: "9V battery (snap connector)",
              diagram: "Classic 9V snap with +/− leads to VIN and GND.",
              when: "Compact portable builds; check board VIN range (often 7–12V on Uno).",
              setPowerSource: "battery_9v",
            },
            {
              id: "battery_2aa",
              label: "2×AA battery pack (~3V)",
              diagram: "Two-AA holder with red/black leads to VIN and GND.",
              when: "Low-voltage portable; may need 3.3V board or boost — confirm MCU supply.",
              setPowerSource: "battery_2aa",
            },
            {
              id: "battery_3aa",
              label: "3×AA battery pack (~4.5V)",
              diagram: "Three-AA holder with +/− to VIN and GND.",
              when: "Portable with a bit more headroom than 2×AA.",
              setPowerSource: "battery_3aa",
            },
            {
              id: "battery_18650",
              label: "18650 Li-ion cell (~3.7V)",
              diagram: "Cylindrical 18650 in a holder; +/− to VIN and GND.",
              when: "Rechargeable portable; use a protected cell and proper charger — never guess polarity.",
              setPowerSource: "battery_18650",
            },
          ],
          nextStep:
            "Ask the user the question above. After they pick, call set_power_source with power_source equal to that option's id (battery_9v, battery_2aa, battery_3aa, battery_18650, or usb_wall).",
          guide_id: guide_id ?? null,
          context: context ?? null,
        }),
      ),
  );

  server.registerTool(
    "ask_sensor",
    {
      description:
        "Decision helper when the user wants sensing/measurement/input but has not named an exact module. Returns grouped catalog options. Do NOT guess (e.g. do not assume generic soil moisture) — ask the user, then add_part with the chosen catalog id.",
      inputSchema: {
        guide_id: z.string().optional(),
        intent: z
          .string()
          .optional()
          .describe("What the user said they want to measure or detect"),
      },
    },
    ({ guide_id, intent }) =>
      Promise.resolve(
        textResult({
          mustAskUser: true,
          question:
            "Which exact sensor or input module do you have? Pick one from the list (same part you will wire on the breadboard).",
          whyAsk:
            "Different modules use different pins, libraries, and passives. Never substitute a vague category for a specific catalog part.",
          categories: sensorCategories,
          nextStep:
            "Ask the user the question above. After they pick an option id, call add_part with catalogId set to that id.",
          guide_id: guide_id ?? null,
          intent: intent ?? null,
        }),
      ),
  );

  server.registerTool(
    "set_power_source",
    {
      description:
        "Set guide power_source to a specific battery type or usb_wall AFTER asking the user (use ask_power_source first if unknown). This chooses which power diagram is drawn on the guide page. Never invent the answer.",
      inputSchema: {
        guide_id: z.string(),
        power_source: z.enum([...POWER_SOURCE_VALUES, "battery"]),
      },
    },
    ({ guide_id, power_source }) =>
      safely(() =>
        changeGuide(ctx, guide_id, () => ({
          power_source: normalizePowerSource(power_source),
        })),
      ),
  );

  server.registerTool(
    "add_part",
    {
      description: "Add or replace a part instance on a guide using a catalog id.",
      inputSchema: {
        guide_id: z.string(),
        instanceId: z.string(),
        catalogId: z.string(),
        label: z.string().optional(),
      },
    },
    ({ guide_id, instanceId, catalogId: sentId, label }) =>
      safely(async () => {
        let catalogId = sentId;
        if (!getCatalogPart(catalogId)) {
          const alias = await resolveAlias(catalogId);
          if (alias && getCatalogPart(alias)) {
            catalogId = alias;
          } else {
            ctx.recordMiss({ name: sentId, source: "add_part" });
            const close = suggestClosest(sentId, 3);
            const hint =
              close.length > 0
                ? ` Closest supported parts: ${close
                    .map((part) => `${part.id} (${part.name})`)
                    .join("; ")}. Ask the user which supported alternative to use, or call request_part if nothing fits.`
                : " Call search_catalog to look for it, or call request_part if nothing fits, then tell the user it is not supported yet.";
            return errorResult(
              `Unknown catalog part "${sentId}". Call list_catalog and use an exact id.${hint}`,
            );
          }
        }
        return changeGuide(ctx, guide_id, (guide) => ({
          parts: [
            ...guide.parts.filter((part) => part.instanceId !== instanceId),
            { instanceId, catalogId, label },
          ],
        }));
      }),
  );

  server.registerTool(
    "add_connection",
    {
      description: "Add or replace a pin-to-pin connection on a guide.",
      inputSchema: {
        guide_id: z.string(),
        id: z.string(),
        from: connectionEndpoint,
        to: connectionEndpoint,
        note: z.string().optional(),
      },
    },
    ({ guide_id, id, from, to, note }) =>
      safely(() =>
        changeGuide(ctx, guide_id, (guide) => ({
          connections: [
            ...guide.connections.filter((connection) => connection.id !== id),
            { id, from, to, note },
          ],
        })),
      ),
  );

  server.registerTool(
    "set_steps",
    {
      description: "Replace the ordered steps (and optional notes) on a guide. Write for beginners: one action per step, short plain sentences. Refer to pins with the exact labels used in the connections (for example \"1 (SIG)\" or \"GND\"); never invent other names like + or - for them. Order the steps: prepare parts, solder power and ground first, then signal wires, then power up and test. Do not list every wire again: the guide page already shows a generated \"What to solder where\" checklist from the connections. Use notes for warnings.",
      inputSchema: {
        guide_id: z.string(),
        steps: z.array(
          z.object({
            id: z.string(),
            title: z.string(),
            body: z.string(),
            order: z.number().int(),
          }),
        ),
        notes: z.array(z.string()).optional(),
      },
    },
    ({ guide_id, steps, notes }) =>
      safely(() => changeGuide(ctx, guide_id, () => ({ steps, notes }))),
  );

  server.registerTool(
    "get_guide",
    {
      description: "Fetch a guide and its validation result.",
      inputSchema: { guide_id: z.string() },
    },
    ({ guide_id }) =>
      safely(async () => {
        const guide = await getGuide(guide_id);
        if (!guide) {
          return errorResult("Guide not found");
        }
        return textResult({ guide, validation: validateGuide(guide) });
      }),
  );

  server.registerTool(
    "list_catalog",
    {
      description:
        "List boards, modules, passives (breadboard, resistors, LEDs, pots, buttons, USB wall, battery holders), and recipes. Use passives whenever a prototype needs current limiting, pull-ups, or a breadboard.",
      inputSchema: {},
    },
    () => safely(async () => textResult(listCatalog())),
  );

  server.registerTool(
    "search_catalog",
    {
      description:
        "Find catalog parts by a short name or description (for example \"DHT22\" or \"ultrasonic distance\"). Returns up to 8 closest parts with their exact ids. Read-only. Use it when unsure of an id before add_part.",
      inputSchema: { query: z.string().max(200) },
    },
    ({ query }) =>
      safely(async () =>
        textResult({
          query,
          results: suggestClosest(query, 8).map((part) => ({
            id: part.id,
            name: part.name,
            kind: part.kind,
            description: part.description.split(/(?<=[.!?])\s/)[0].slice(0, 160),
          })),
        }),
      ),
  );

  server.registerTool(
    "request_part",
    {
      description:
        "Tell the site owner about a part the user needs that is NOT in the catalog (after search_catalog found nothing that fits). Do not put personal information in reason. Then tell the user it is not supported yet and offer the closest supported part. Never invent a catalog id.",
      inputSchema: {
        name: z.string().min(1).max(80),
        kind: z
          .enum(["board", "sensor", "display", "output", "input", "power", "other"])
          .optional(),
        reason: z
          .string()
          .max(200)
          .optional()
          .describe("Short technical reason only. No personal information."),
        pins: z
          .array(
            z.object({
              id: z.string().max(30),
              label: z.string().max(40),
              kind: z.string().max(20).optional(),
            }),
          )
          .max(40)
          .optional(),
      },
    },
    ({ name, kind, reason, pins }) =>
      safely(async () => {
        const closest = suggestClosest(name, 5);
        const top = closest[0];
        if (top && top.score >= STRONG_MATCH) {
          return textResult({
            recorded: false,
            supported: true,
            catalogId: top.id,
            name: top.name,
            message: "This part is already in the catalog. Use this catalog id with add_part.",
          });
        }
        ctx.recordMiss({ name, kind, source: "request_part", pins, note: reason });
        return textResult({
          recorded: true,
          supported: false,
          message: "This part is not in the catalog yet. It has been noted for the site owner.",
          closest: closest.map((part) => ({ id: part.id, name: part.name, kind: part.kind })),
          nextStep:
            "Tell the user it is not supported yet. Offer the closest supported part or continue without it. Never invent a catalog id.",
        });
      }),
  );

  server.registerTool(
    "validate_guide",
    {
      description:
        "Validate a guide. Hard-blocks bad pins/parts and returns alternatives[]. If needsPowerSource is true, call ask_power_source and ask the user before continuing.",
      inputSchema: { guide_id: z.string() },
    },
    ({ guide_id }) =>
      safely(async () => {
        const guide = await getGuide(guide_id);
        if (!guide) {
          return errorResult("Guide not found");
        }
        const validation = validateGuide(guide);
        return textResult({
          guideId: guide.id,
          validation,
          blocked: !validation.ok,
        });
      }),
  );
}

export function createMcpServer(ctx: ToolContext): McpServer {
  const server = new McpServer(
    { name: "helpmesolder", version: "0.2.0" },
    { instructions: INSTRUCTIONS },
  );
  registerTools(server, ctx);
  return server;
}
