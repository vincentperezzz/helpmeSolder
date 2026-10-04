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
if (catalog.boards?.length !== 6) fail(`expected 6 boards, got ${catalog.boards?.length}`);
if (catalog.modules?.length !== 40) fail(`expected 40 modules, got ${catalog.modules?.length}`);
if (catalog.passives?.length !== 10) {
  fail(`expected 10 passives, got ${catalog.passives?.length}`);
}
if (catalog.recipes?.length !== 16) fail(`expected 16 recipes, got ${catalog.recipes?.length}`);

const displayModules = (catalog.modules || []).filter((m) => m.displayClass);
if (displayModules.length < 6) {
  fail(`expected LCD/OLED/TFT display classes, got ${displayModules.length}`);
}
if (!(catalog.passives || []).some((p) => p.id.includes("breadboard"))) {
  fail("missing breadboard passive");
}
if (!(catalog.passives || []).some((p) => p.id.includes("resistor"))) {
  fail("missing resistor passives");
}

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
        from: { instanceId: "board1", pinId: "D5" },
        to: { instanceId: "buzzer1", pinId: "1" },
      },
      {
        id: "c2",
        from: { instanceId: "board1", pinId: "GND.1" },
        to: { instanceId: "buzzer1", pinId: "2" },
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
        body: "Pin 1 to D5.",
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

const lcdGuide = await api("/api/guides", {
  method: "POST",
  body: JSON.stringify({
    title: "Verify LCD Classes",
    board_id: "board.arduino.uno",
  }),
});
const lcdId = lcdGuide.guide.id;
await api(`/api/guides/${lcdId}/power`, {
  method: "PUT",
  body: JSON.stringify({ power_source: "usb_wall" }),
});
await api(`/api/guides/${lcdId}`, {
  method: "PATCH",
  body: JSON.stringify({
    parts: [
      { instanceId: "board1", catalogId: "board.arduino.uno" },
      { instanceId: "lcd1", catalogId: "module.lcd.i2c.1602" },
      { instanceId: "oled1", catalogId: "module.oled.ssd1306" },
    ],
    connections: [
      {
        id: "c1",
        from: { instanceId: "board1", pinId: "5V" },
        to: { instanceId: "lcd1", pinId: "VCC" },
      },
      {
        id: "c2",
        from: { instanceId: "board1", pinId: "GND.2" },
        to: { instanceId: "lcd1", pinId: "GND" },
      },
      {
        id: "c3",
        from: { instanceId: "board1", pinId: "A4" },
        to: { instanceId: "lcd1", pinId: "SDA" },
      },
      {
        id: "c4",
        from: { instanceId: "board1", pinId: "A5" },
        to: { instanceId: "lcd1", pinId: "SCL" },
      },
      {
        id: "c5",
        from: { instanceId: "board1", pinId: "3.3V" },
        to: { instanceId: "oled1", pinId: "3V3" },
      },
      {
        id: "c6",
        from: { instanceId: "board1", pinId: "GND.3" },
        to: { instanceId: "oled1", pinId: "GND" },
      },
    ],
    steps: [
      {
        id: "s1",
        title: "Wire LCD class",
        body: "1602 I2C on A4/A5.",
        order: 1,
      },
    ],
    notes: ["LCD class check"],
  }),
});
const lcdValidation = await api(`/api/guides/${lcdId}/validate`, {
  method: "POST",
  body: "{}",
});
if (!lcdValidation.validation?.ok) {
  fail(`lcd validation not ok: ${JSON.stringify(lcdValidation.validation)}`);
}

const page = await fetch(created.url);
if (page.status !== 200) fail(`guide page ${page.status}`);
const html = await page.text();
for (const needle of [
  "Verify MCP Path",
  "Prep / Parts",
  "Wiring Diagram",
  "Steps",
  "diagram-shell",
  "diagram-viewport",
  "Zoom",
  "Wokwi Elements",
  "photoHint",
  "Place board",
  "verify note",
  "D5",
  "USB wall",
]) {
  if (!html.includes(needle)) fail(`guide HTML missing ${needle}`);
}

const lcdPage = await fetch(lcdGuide.url);
if (lcdPage.status !== 200) fail(`lcd guide page ${lcdPage.status}`);
const lcdHtml = await lcdPage.text();
for (const needle of ["Verify LCD Classes", "LCD 1602", "OLED SSD1306", "Wiring Diagram"]) {
  if (!lcdHtml.includes(needle)) fail(`lcd guide HTML missing ${needle}`);
}

console.log(
  JSON.stringify(
    {
      ok: true,
      id,
      url: created.url,
      lcdId,
      lcdUrl: lcdGuide.url,
      boards: catalog.boards.length,
      modules: catalog.modules.length,
      passives: catalog.passives.length,
      recipes: catalog.recipes.length,
      displayClasses: displayModules.map((m) => m.displayClass),
      validation: validation.validation,
    },
    null,
    2,
  ),
);
