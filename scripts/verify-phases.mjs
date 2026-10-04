#!/usr/bin/env node
const base = process.env.HELPMESOLDER_API_URL || "http://localhost:3000";

function fail(message) {
  console.error(`VERIFY FAIL: ${message}`);
  process.exit(1);
}

async function api(path, init) {
  const response = await fetch(`${base}${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(process.env.MCP_API_KEY
        ? { authorization: `Bearer ${process.env.MCP_API_KEY}` }
        : {}),
      ...(init?.headers || {}),
    },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    fail(`${response.status} ${path}: ${JSON.stringify(body)}`);
  }
  return body;
}

const catalog = await api("/api/catalog");
if (catalog.boards?.length !== 5) fail("expected 5 boards");
if (catalog.modules?.length !== 3) fail("expected 3 modules");
if (catalog.recipes?.length !== 3) fail("expected 3 recipes");

const created = await api("/api/guides", {
  method: "POST",
  body: JSON.stringify({
    title: "Verify MCP Path",
    board_id: "board.esp32.devkit",
  }),
});
if (!created.url?.includes("/guides/")) fail("create_guide missing URL");
const id = created.guide.id;

await api(`/api/guides/${id}/power`, {
  method: "PUT",
  body: JSON.stringify({ power_source: "usb_wall" }),
});

await api(`/api/guides/${id}`, {
  method: "PATCH",
  body: JSON.stringify({
    parts: [
      { instanceId: "board1", catalogId: "board.esp32.devkit" },
      { instanceId: "buzzer1", catalogId: "module.buzzer.active" },
    ],
    connections: [
      {
        id: "c1",
        from: { instanceId: "board1", pinId: "gpio5" },
        to: { instanceId: "buzzer1", pinId: "sig" },
      },
      {
        id: "c2",
        from: { instanceId: "board1", pinId: "gnd" },
        to: { instanceId: "buzzer1", pinId: "gnd" },
      },
      {
        id: "c3",
        from: { instanceId: "board1", pinId: "vin" },
        to: { instanceId: "buzzer1", pinId: "vcc" },
      },
    ],
    steps: [
      {
        id: "s1",
        title: "Place board",
        body: "ESP32 on bench.",
        order: 1,
      },
      {
        id: "s2",
        title: "Wire buzzer",
        body: "SIG to GPIO5.",
        order: 2,
      },
    ],
    notes: ["verify note"],
  }),
});

const validation = await api(`/api/guides/${id}/validate`, {
  method: "POST",
  body: "{}",
});
if (!validation.validation?.ok) fail("validation not ok");
if (validation.blocked) fail("unexpected block");

const page = await fetch(created.url);
if (page.status !== 200) fail(`guide page ${page.status}`);
const html = await page.text();
for (const needle of [
  "Verify MCP Path",
  "Prep / Parts",
  "Wiring Diagram",
  "Steps",
  "<svg",
  "GPIO5",
  "photoHint",
  "Place board",
  "verify note",
]) {
  if (!html.includes(needle)) fail(`guide HTML missing ${needle}`);
}

if (!html.includes('d="M 216 81')) {
  fail("GPIO5 wire path missing expected endpoint");
}

console.log(
  JSON.stringify(
    {
      ok: true,
      id,
      url: created.url,
      validation: validation.validation,
    },
    null,
    2,
  ),
);
