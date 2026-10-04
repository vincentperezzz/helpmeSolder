#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import {
  addConnection,
  addConnectionInput,
  addPart,
  addPartInput,
  createGuide,
  createGuideInput,
  getGuide,
  listCatalog,
  setPowerInput,
  setPowerSource,
  setSteps,
  setStepsInput,
  validateGuide,
} from "./api.js";
import { sensorCategories } from "./sensor-options.js";

const server = new McpServer({
  name: "helpmesolder",
  version: "0.1.0",
});

function ok(data: unknown) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
  };
}

function fail(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return {
    content: [{ type: "text" as const, text: message }],
    isError: true,
  };
}

server.registerTool(
  "create_guide",
  {
    description:
      "Create a secret HelpmeSolder guide and return its URL. Prefer setting board_id from list_catalog. Before wiring, ask the user which power source (battery type or USB wall) — never guess — then call set_power_source.",
    inputSchema: createGuideInput,
  },
  async (input) => {
    try {
      return ok(await createGuide(input));
    } catch (error) {
      return fail(error);
    }
  },
);

server.registerTool(
  "ask_power_source",
  {
    description:
      "Decision helper for power. Call this when power_source is unknown. Returns the exact question and options to ask the user. Do NOT invent battery vs USB wall — wait for the user's answer, then call set_power_source.",
    inputSchema: z.object({
      guide_id: z.string().optional(),
      context: z
        .string()
        .optional()
        .describe("Optional project context (portable, outdoor, bench, etc.)"),
    }),
  },
  async ({ guide_id, context }) => {
    return ok({
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
          diagram: "Shows a battery pack feeding VIN (+) and GND (−).",
          when: "Compact portable builds; check board VIN range (often 7–12V on Uno).",
          setPowerSource: "battery",
        },
        {
          id: "battery_2aa",
          label: "2×AA battery pack (~3V)",
          diagram: "Shows a battery pack feeding VIN (+) and GND (−).",
          when: "Low-voltage portable; may need 3.3V board or boost — confirm MCU supply.",
          setPowerSource: "battery",
        },
        {
          id: "battery_3aa",
          label: "3×AA battery pack (~4.5V)",
          diagram: "Shows a battery pack feeding VIN (+) and GND (−).",
          when: "Portable with a bit more headroom than 2×AA.",
          setPowerSource: "battery",
        },
        {
          id: "battery_18650",
          label: "18650 Li-ion cell (~3.7V)",
          diagram: "Shows a battery pack feeding VIN (+) and GND (−).",
          when: "Rechargeable portable; use a protected cell and proper charger — never guess polarity.",
          setPowerSource: "battery",
        },
      ],
      nextStep:
        "Ask the user the question above. After they pick an option id, call set_power_source with power_source set to that option's setPowerSource (usb_wall or battery). Mention their specific battery kind in steps/notes.",
      guide_id: guide_id ?? null,
      context: context ?? null,
    });
  },
);

server.registerTool(
  "ask_sensor",
  {
    description:
      "Decision helper when the user wants sensing/measurement/input but has not named an exact module. Returns grouped catalog options. Do NOT guess (e.g. do not assume generic soil moisture) — ask the user, then add_part with the chosen catalog id.",
    inputSchema: z.object({
      guide_id: z.string().optional(),
      intent: z
        .string()
        .optional()
        .describe("What the user said they want to measure or detect"),
    }),
  },
  async ({ guide_id, intent }) => {
    return ok({
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
    });
  },
);

server.registerTool(
  "set_power_source",
  {
    description:
      "Set guide power_source to battery or usb_wall AFTER asking the user (use ask_power_source first if unknown). This chooses which power diagram is drawn on the guide page. Never invent the answer.",
    inputSchema: setPowerInput,
  },
  async (input) => {
    try {
      return ok(await setPowerSource(input));
    } catch (error) {
      return fail(error);
    }
  },
);

server.registerTool(
  "add_part",
  {
    description: "Add or replace a part instance on a guide using a catalog id.",
    inputSchema: addPartInput,
  },
  async (input) => {
    try {
      return ok(await addPart(input));
    } catch (error) {
      return fail(error);
    }
  },
);

server.registerTool(
  "add_connection",
  {
    description: "Add or replace a pin-to-pin connection on a guide.",
    inputSchema: addConnectionInput,
  },
  async (input) => {
    try {
      return ok(await addConnection(input));
    } catch (error) {
      return fail(error);
    }
  },
);

server.registerTool(
  "set_steps",
  {
    description: "Replace the ordered steps (and optional notes) on a guide.",
    inputSchema: setStepsInput,
  },
  async (input) => {
    try {
      return ok(await setSteps(input));
    } catch (error) {
      return fail(error);
    }
  },
);

server.registerTool(
  "get_guide",
  {
    description: "Fetch a guide and its validation result.",
    inputSchema: z.object({ guide_id: z.string() }),
  },
  async ({ guide_id }) => {
    try {
      return ok(await getGuide(guide_id));
    } catch (error) {
      return fail(error);
    }
  },
);

server.registerTool(
  "list_catalog",
  {
    description:
      "List boards, modules, passives (breadboard, resistors, LEDs, pots, buttons, USB wall, battery), and recipes. Use passives whenever a prototype needs current limiting, pull-ups, or a breadboard.",
    inputSchema: z.object({}),
  },
  async () => {
    try {
      return ok(await listCatalog());
    } catch (error) {
      return fail(error);
    }
  },
);

server.registerTool(
  "validate_guide",
  {
    description:
      "Validate a guide. Hard-blocks bad pins/parts and returns alternatives[]. If needsPowerSource is true, call ask_power_source and ask the user before continuing.",
    inputSchema: z.object({ guide_id: z.string() }),
  },
  async ({ guide_id }) => {
    try {
      return ok(await validateGuide(guide_id));
    } catch (error) {
      return fail(error);
    }
  },
);

const transport = new StdioServerTransport();
await server.connect(transport);
