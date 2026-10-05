import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getCatalogPart, listCatalog } from "@/lib/catalog";
import { CATEGORIES, categoryOf } from "@/lib/admin/coverage";
import type { CatalogPart, Guide, ValidationResult } from "@/lib/catalog/types";
import {
  createGuide,
  getGuide,
  updateGuide,
} from "@/lib/guides/repository";
import {
  POWER_OPTIONS,
  POWER_SOURCE_OPTIONS,
  POWER_SOURCE_VALUES,
  describePowerVoltage,
  matchPowerSource,
} from "@/lib/guides/power-source";
import { getRetentionDays, retentionNotice } from "@/lib/guides/retention";
import { issueSeverity, validateGuide } from "@/lib/guides/validator";
import { STRONG_MATCH, suggestClosest } from "@/lib/requests/normalize";
import { resolveAlias, type PartRequestInput } from "@/lib/requests/record";
import type { CatalogSearchInput } from "@/lib/requests/search";
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
  /** Records a catalog search and its outcome. Best-effort, never throws. */
  recordSearch: (search: CatalogSearchInput) => void;
};

type GuidePatch = Parameters<typeof updateGuide>[1];

type ToolResult = {
  content: { type: "text"; text: string }[];
  isError?: boolean;
};

const INSTRUCTIONS = `HelpmeSolder writes a how-to solder guide (parts prep, wiring diagram, steps) at a secret link.
Required order. Do not skip or reorder:
1. ASK FIRST, in chat, before any create_guide call: which power source (ask_power_source gives the options), which exact board and sensor or module (ask_sensor, list_catalog, search_catalog), and any limits. Wait for the user's answers. Never guess.
2. create_guide. It returns NO link on purpose. Do not tell the user any link yet.
3. Build the whole guide: set_power_source, add_part (catalog ids only), add_connection, set_steps. Parts can be added in any order. There is no gate on power or on anything else: the only rules are the ones in the tool descriptions and validate_guide results. Never describe other server rules or promise features that are not listed.
4. validate_guide. Fix every problem it lists (use alternatives[]) and call it again.
5. When validate_guide returns shareUrl, share that link ONCE, as your last message, and mention the retention message it returns (guides are deleted if nobody opens them for a while). get_guide_link returns the same link again later. If there is no shareUrl, read missing[] and finish the guide first.

Catalog: if unsure of an id call search_catalog with a short name. Never invent ids.
Before choosing any part call get_part_details (or read the search_catalog hint). When buying advice matters (active vs passive buzzer, 3.3 V vs 5 V, I2C vs SPI display), read its identify and watchOuts to the user out loud.
If nothing in the catalog fits, call request_part (it tells the site owner) and tell the user it is not supported yet.
If the user wants a power type we do not list (solar, mains, a car battery, an unusual battery size), still call set_power_source with its plain name so the site owner is told, then offer the closest supported option. Battery brand names do not matter electrically: pick by chemistry, size and cell count. NiMH cells are 1.2 V each (3 NiMH AA = 3.6 V, 4 = 4.8 V), lower than alkaline (4.5 V and 6 V), which matters for 5 V boards.

Writing steps (readers are beginners who dislike circuit diagrams):
- The page already generates a "What to solder where" checklist from the connections, so do NOT restate every wire in the steps.
- When a step names a pin, use the exact pin label used in the connections (for example "1 (SIG)" or "GND", never "+" or "-" if the pin is labelled otherwise).
- Order: prepare parts and tools, solder power and ground first, then signal wires, then power up and test.
- One action per step, plain words, short sentences. Say what to look for at the end (for example "the LED lights").`;

function firstSentence(text: string, max = 160): string {
  return text.split(/(?<=[.!?])\s/)[0].slice(0, max);
}

function categoryLabel(part: CatalogPart): string {
  const id = categoryOf(part.kind, part.id);
  return CATEGORIES.find((category) => category.id === id)?.label ?? "Other basic parts";
}

/** Compact catalog entry: enough to pick a part, not its full detail. */
function compactPart(part: CatalogPart) {
  return {
    id: part.id,
    name: part.name,
    kind: part.kind,
    category: categoryLabel(part),
    summary: firstSentence(part.description),
  };
}

/** Electrical limits in plain words. Only states what the catalog knows. */
function electricalInWords(part: CatalogPart): string[] {
  const e = part.electrical;
  if (!e) return [];
  const lines: string[] = [];
  if (e.logic) lines.push(`Logic level: ${e.logic === "3v3" ? "3.3 V" : "5 V"}.`);
  if (e.supply) lines.push(`Supply: ${e.supply.min} to ${e.supply.max} V.`);
  if (e.logicFollowsSupply) lines.push("Signal levels follow whatever supply voltage it is wired to.");
  if (e.fiveVTolerantIo === true) lines.push("Pins tolerate 5 V input.");
  if (e.fiveVTolerantIo === false) lines.push("Pins are NOT 5 V tolerant: never feed them 5 V.");
  if (e.inputMaxVolts !== undefined) {
    lines.push(
      `Signal inputs accept at most ${e.inputMaxVolts} V${e.inputMaxIsHard === false ? " (advisory limit)" : ""}.`,
    );
  }
  if (e.inputOnlyPins?.length) lines.push(`Input-only pins: ${e.inputOnlyPins.join(", ")}.`);
  if (e.battery) {
    lines.push(`Battery: ${e.battery.cells} cell(s), ${e.battery.chemistry}.`);
    if (e.battery.lowCurrent) lines.push("Low current: only a few milliamps, not for motors or Wi-Fi bursts.");
  }
  const supplyPin = Object.values(e.pins ?? {}).find((pin) => pin.source?.external)?.source;
  if (supplyPin) {
    lines.push(`Supplies ${supplyPin.nominal} V nominal (${supplyPin.min}-${supplyPin.max} V).`);
  }
  return lines;
}

function allCatalogParts(): CatalogPart[] {
  const { boards, modules, passives } = listCatalog();
  return [...boards, ...modules, ...passives];
}

/** Parts in the same family (same first two id segments), easy to confuse with this one. */
function relatedParts(part: CatalogPart) {
  const family = (id: string) => id.split(".").slice(0, 2).join(".");
  return allCatalogParts()
    .filter((other) => other.id !== part.id && family(other.id) === family(part.id))
    .slice(0, 6)
    .map((other) => ({ id: other.id, name: other.name, summary: firstSentence(other.description) }));
}

function partDetails(part: CatalogPart) {
  return {
    id: part.id,
    name: part.name,
    kind: part.kind,
    category: categoryLabel(part),
    description: part.description,
    identify: part.identify ?? null,
    variants: (part.variants ?? []).map(({ label, detail }) => ({ label, detail })),
    watchOuts: part.watchOuts ?? [],
    photoCaption: part.photoCaption ?? null,
    pins: part.pins.map(({ id, label, kinds, voltage }) => ({ id, label, kinds, voltage })),
    electrical: electricalInWords(part),
    relatedParts: relatedParts(part),
  };
}

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

/** Plain-language list of what still blocks sharing. Empty means ready. */
function missingForShare(guide: Guide, validation: ValidationResult): string[] {
  const missing: string[] = [];
  if (!guide.power_source) {
    missing.push("power source not set (ask the user, then call set_power_source)");
  }
  if (guide.parts.length === 0) {
    missing.push("no parts yet (call add_part)");
  }
  if (guide.connections.length === 0) {
    missing.push("no connections yet (call add_connection)");
  }
  if (guide.steps.length === 0) {
    missing.push("no steps yet (call set_steps)");
  }
  const errors = validation.issues.filter(
    (issue) => issue.code !== "power_source_required" && issueSeverity(issue) === "error",
  );
  if (errors.length > 0) {
    missing.push(`validation errors: ${errors.map((issue) => issue.message).join(" | ")}`);
  }
  return missing;
}

/** The share link exists only once the guide is complete and valid. */
function shareStatus(ctx: ToolContext, guide: Guide) {
  const validation = validateGuide(guide);
  const missing = missingForShare(guide, validation);
  if (missing.length > 0 || !validation.ok) {
    return {
      guideId: guide.id,
      validation,
      blocked: !validation.ok,
      readyToShare: false,
      missing,
      next: "Do NOT share a link yet. Finish the items in missing[], then call validate_guide again.",
    };
  }
  return {
    guideId: guide.id,
    validation,
    blocked: false,
    readyToShare: true,
    shareUrl: `${ctx.appUrl}/guides/${guide.id}`,
    message: `Share this link with the user once. Mention that guides are deleted if nobody opens them for ${getRetentionDays()} days.`,
  };
}

export function registerTools(server: McpServer, ctx: ToolContext): void {
  server.registerTool(
    "create_guide",
    {
      description:
        "Create an empty HelpmeSolder guide. Call this only AFTER you have asked the user in chat which power source, which exact board and sensor, and any limits, and have their answers. It returns NO link on purpose: do not share any link yet. Build the whole guide first (set_power_source, add_part, add_connection, set_steps; any order, nothing is blocked), then call validate_guide and share only the shareUrl it returns. Prefer setting board_id from list_catalog. Use a short plain title a beginner would recognise (for example \"ESP32 buzzer\").",
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
          retention: { days: getRetentionDays(), message: retentionNotice() },
          next: "Do NOT share any link yet. First settle the open questions with the user in chat (power source, exact sensor), then build the whole guide (set_power_source, add_part, add_connection, set_steps), then call validate_guide, and only share the link that validate_guide returns as shareUrl.",
        });
      }),
  );

  server.registerTool(
    "ask_power_source",
    {
      description:
        "Decision helper for power. Call this when power_source is unknown, BEFORE create_guide. Returns the exact question and options to ask the user in chat. Do NOT invent a battery type or USB wall: wait for the user's answer, then call set_power_source. This is a question for the user, not a server gate: parts can be added in any order.",
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
            "How will you power this build? USB (wall adapter or power bank), AA / AAA / C / D batteries (alkaline, rechargeable NiMH or lithium), a 9V battery, a CR2032 coin cell, a LiPo pouch or pack, a Li-ion cell (18650, 21700, 14500, CR123A), or a 9V / 12V wall supply with a barrel plug?",
          whyAsk:
            "Power choice changes the diagram, the voltage the board sees and the VIN/USB wiring notes. Never assume battery type, cell count or USB wall. Brand does not matter electrically, only chemistry, size and number of cells.",
          options: POWER_OPTIONS.map((option) => ({
            id: option.id,
            label: option.ask.label,
            group: option.groupLabel,
            voltage: describePowerVoltage(option),
            diagram: option.ask.diagram,
            when: option.ask.when,
            setPowerSource: option.id,
          })),
          warnings: [
            "NiMH rechargeable AA/AAA cells are 1.2 V each, not 1.5 V: 3 cells = 3.6 V (alkaline: 4.5 V) and 4 cells = 4.8 V (alkaline: 6 V). That is too low for some 5 V boards.",
            "14500 Li-ion cells are AA size but 3.7 V: never put them in an AA holder.",
            "A CR2032 coin cell only supplies a few milliamps: not for motors, servos or Wi-Fi bursts without a capacitor.",
            "LiPo and Li-ion cells can catch fire if shorted or charged wrongly; JST connector polarity differs between makers.",
          ],
          nextStep: `Ask the user the question above. After they pick, call set_power_source with power_source equal to that option's id (one of: ${POWER_SOURCE_VALUES.join(", ")}). If the user wants a type not listed (for example a solar panel, mains power or a car battery), call set_power_source with its plain name (for example "solar panel") so it is noted for the site owner, then offer the closest supported option.`,
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
    ({ guide_id, intent }) => {
      if (intent && intent.trim() !== "") {
        const matches = suggestClosest(intent, 8);
        ctx.recordSearch({
          query: intent,
          source: "ask_sensor",
          resultCount: matches.length,
          topMatchId: matches[0]?.id,
          topScore: matches[0]?.score,
        });
      }
      return Promise.resolve(
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
      );
    },
  );

  server.registerTool(
    "set_power_source",
    {
      description:
        `Set guide power_source AFTER asking the user (use ask_power_source first if unknown). Supported values: ${POWER_SOURCE_VALUES.join(", ")} (see ask_power_source for what each is). If the user wants something else (solar, mains, a car battery, an unlisted battery size), pass its plain name as power_source and an optional description: it is noted for the site owner, the guide is NOT changed, and you must then ask the user which supported option to use. Never invent the answer.`,
      inputSchema: {
        guide_id: z.string(),
        power_source: z
          .union([
            z.enum([...POWER_SOURCE_VALUES, "battery"]),
            z.string().min(1).max(80),
          ])
          .describe(
            `One of ${POWER_SOURCE_VALUES.join(", ")} (or battery for 3xAA). Any other text is treated as an unsupported power source and only noted.`,
          ),
        description: z
          .string()
          .max(200)
          .optional()
          .describe("What the user wants, in a few words. No personal information."),
      },
    },
    ({ guide_id, power_source, description }) =>
      safely(async () => {
        let resolved = matchPowerSource(power_source);
        if (!resolved) {
          const alias = await resolveAlias(power_source);
          resolved = alias ? matchPowerSource(alias) : null;
        }
        if (resolved) {
          const power = resolved;
          return changeGuide(ctx, guide_id, () => ({ power_source: power }));
        }
        ctx.recordMiss({
          name: power_source,
          kind: "power",
          source: "set_power_source",
          note: description,
        });
        return textResult({
          supported: false,
          recorded: true,
          message: "That power source is not supported yet. It has been noted for the site owner.",
          supportedOptions: POWER_SOURCE_OPTIONS,
          nextStep:
            "Tell the user it is not supported yet and ask which supported option to use instead (call ask_power_source for the list). Do not guess.",
        });
      }),
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
      description:
        "Fetch a guide and its validation result. Does not return the share link: use validate_guide or get_guide_link for that.",
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
        "Compact list of boards, modules, passives (breadboard, resistors, LEDs, pots, buttons, USB wall, battery holders), and recipes: id, name, kind, category and a one-line summary. Call get_part_details for full detail. Use passives whenever a prototype needs current limiting, pull-ups, or a breadboard.",
      inputSchema: {},
    },
    () =>
      safely(async () => {
        const { boards, modules, passives, recipes } = listCatalog();
        return textResult({
          boards: boards.map(compactPart),
          modules: modules.map(compactPart),
          passives: passives.map(compactPart),
          recipes,
          next: "Call get_part_details with an id for pins, variants and watch-outs before choosing a part.",
        });
      }),
  );

  server.registerTool(
    "search_catalog",
    {
      description:
        "Find catalog parts by a short name or description (for example \"DHT22\" or \"ultrasonic distance\"). Returns up to 8 closest parts with their exact ids. Read-only. Use it when unsure of an id before add_part.",
      inputSchema: { query: z.string().max(200) },
    },
    ({ query }) =>
      safely(async () => {
        const matches = suggestClosest(query, 8);
        ctx.recordSearch({
          query,
          source: "search_catalog",
          resultCount: matches.length,
          topMatchId: matches[0]?.id,
          topScore: matches[0]?.score,
        });
        return textResult({
          query,
          results: matches.map((part) => {
            const full = getCatalogPart(part.id);
            return {
              id: part.id,
              name: part.name,
              kind: part.kind,
              category: full ? categoryLabel(full) : null,
              summary: firstSentence(part.description),
              identify: full?.identify?.slice(0, 200) ?? null,
            };
          }),
        });
      }),
  );

  server.registerTool(
    "get_part_details",
    {
      description:
        "Read-only. Full detail of one catalog part by exact id: description, how to identify it, variants, watchOuts, pins, electrical limits in plain words and look-alike related parts. Call it before choosing a part, and read identify/watchOuts to the user when it matters for buying (active vs passive buzzer, 3.3 V vs 5 V, I2C vs SPI display).",
      inputSchema: { catalog_id: z.string().max(200) },
    },
    ({ catalog_id }) =>
      safely(async () => {
        const part = getCatalogPart(catalog_id);
        if (!part) {
          const close = suggestClosest(catalog_id, 5);
          const hint =
            close.length > 0
              ? ` Closest parts: ${close.map((p) => `${p.id} (${p.name})`).join("; ")}.`
              : "";
          return errorResult(
            `Unknown catalog part "${catalog_id}".${hint} Use search_catalog or list_catalog for exact ids.`,
          );
        }
        return textResult(partDetails(part));
      }),
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
        "Validate a guide and check it is ready to share. Hard-blocks bad pins/parts and returns alternatives[]. Returns shareUrl ONLY when the guide is ready (power source set, at least one part, connection and step, and no validation errors), together with readyToShare true. Otherwise it returns readyToShare false and missing[] in plain words: finish those, then call again. Share the shareUrl once with the user as your last message. Never share a link that did not come from this tool or get_guide_link.",
      inputSchema: { guide_id: z.string() },
    },
    ({ guide_id }) =>
      safely(async () => {
        const guide = await getGuide(guide_id);
        if (!guide) {
          return errorResult("Guide not found");
        }
        return textResult(shareStatus(ctx, guide));
      }),
  );

  server.registerTool(
    "get_guide_link",
    {
      description:
        "Read-only. Returns the same readiness result as validate_guide: shareUrl only when the guide is ready to share, otherwise readyToShare false and missing[]. Use it to fetch the link again after validate_guide passed. Share the link once with the user.",
      inputSchema: { guide_id: z.string() },
    },
    ({ guide_id }) =>
      safely(async () => {
        const guide = await getGuide(guide_id);
        if (!guide) {
          return errorResult("Guide not found");
        }
        return textResult(shareStatus(ctx, guide));
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
