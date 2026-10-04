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
      "Create a secret HelpmeSolder guide and return its URL. Prefer setting board_id from list_catalog. Before wiring, ask the user how they will power the project (battery pack vs USB wall adapter) — never guess — then call set_power_source.",
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
        "How will you power this build — a battery pack, or a USB wall adapter plugged into the board?",
      whyAsk:
        "Battery vs USB wall changes the diagram (battery pack vs wall brick) and wiring notes (VIN/GND vs USB/VIN). Never assume.",
      options: [
        {
          id: "battery",
          label: "Battery pack",
          diagram: "Shows a battery pack feeding VIN (+) and GND (−).",
          when:
            "Portable, outdoor, remote, or no wall outlet. Mind voltage (usually 3.7–9V depending on pack).",
        },
        {
          id: "usb_wall",
          label: "USB wall adapter",
          diagram: "Shows a USB wall brick into the board USB / 5V rail.",
          when: "Bench, indoor, always-on, or powered from a phone charger brick.",
        },
      ],
      nextStep:
        "Ask the user the question above. After they pick, call set_power_source with battery or usb_wall.",
      guide_id: guide_id ?? null,
      context: context ?? null,
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
