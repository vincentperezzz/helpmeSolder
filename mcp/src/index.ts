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
      "Create a secret HelpmeSolder guide and return its URL. Prefer setting board_id from list_catalog.",
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
  "set_power_source",
  {
    description:
      "Set guide power_source to battery or usb_wall. If unknown, ask the user first.",
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
    description: "List boards, modules, and recipes available for wiring guides.",
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
      "Validate a guide. Hard-blocks bad pins/parts and returns alternatives[].",
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
