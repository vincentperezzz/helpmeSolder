/**
 * The MCP tools shown on the homepage, grouped by the job they do.
 * tools.test.ts checks this list against the tools the server really registers.
 */
export type HomeTool = { name: string; body: string };
export type HomeToolGroup = { title: string; tools: HomeTool[] };

export const TOOL_GROUPS: HomeToolGroup[] = [
  {
    title: "Find parts",
    tools: [
      { name: "list_catalog", body: "Browse boards, modules, passives and ready-made recipes." },
      { name: "search_catalog", body: "Look a part up by name, like DHT22 or ultrasonic distance." },
      {
        name: "get_part_details",
        body: "Read one part in full: how to tell it apart, pins and voltage limits.",
      },
      { name: "request_part", body: "Tell us about a part that is missing from the catalog." },
    ],
  },
  {
    title: "Plan the build",
    tools: [
      { name: "create_guide", body: "Start a guide and get its secret link." },
      { name: "ask_power_source", body: "Ask you how the build is powered, never guessing." },
      { name: "set_power_source", body: "Save the power source you picked." },
      { name: "ask_sensor", body: "Ask which exact sensor or input module you have." },
    ],
  },
  {
    title: "Draw and write it",
    tools: [
      { name: "add_part", body: "Place a catalog part on the guide." },
      { name: "add_connection", body: "Wire two exact pins together." },
      { name: "set_steps", body: "Write the ordered soldering steps and notes." },
    ],
  },
  {
    title: "Check and share",
    tools: [
      { name: "validate_guide", body: "Check pins and voltages, and get alternatives for any problem." },
      { name: "get_guide", body: "Read the guide back with its validation result." },
      { name: "get_guide_link", body: "Fetch the share link once the guide is ready." },
    ],
  },
];

export const TOOL_NAMES: string[] = TOOL_GROUPS.flatMap((group) =>
  group.tools.map((tool) => tool.name),
);
