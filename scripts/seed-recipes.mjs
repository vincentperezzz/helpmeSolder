const base = process.env.HELPMESOLDER_API_URL || "http://localhost:3000";

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
  const body = await response.json();
  if (!response.ok) {
    throw new Error(`${response.status} ${path}: ${JSON.stringify(body)}`);
  }
  return body;
}

async function patch(id, payload) {
  return api(`/api/guides/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

const recipes = [
  {
    title: "Buzzer Beep",
    board_id: "board.esp32.devkit",
    power_source: "usb_wall",
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
        order: 1,
        title: "Place the ESP32",
        body: "Put the ESP32 on the bench and note GPIO5, VIN, and GND.",
      },
      {
        id: "s2",
        order: 2,
        title: "Wire the buzzer",
        body: "Connect buzzer SIG to GPIO5, VCC to VIN, GND to GND.",
      },
      {
        id: "s3",
        order: 3,
        title: "Power and test",
        body: "Power over USB wall and drive GPIO5 high to beep.",
      },
    ],
    notes: ["Active buzzers tone themselves. Keep SIG digital."],
  },
  {
    title: "I2C LCD Text",
    board_id: "board.arduino.uno",
    power_source: "usb_wall",
    parts: [
      { instanceId: "board1", catalogId: "board.arduino.uno" },
      { instanceId: "lcd1", catalogId: "module.lcd.i2c.1602" },
    ],
    connections: [
      {
        id: "c1",
        from: { instanceId: "board1", pinId: "5v" },
        to: { instanceId: "lcd1", pinId: "vcc" },
      },
      {
        id: "c2",
        from: { instanceId: "board1", pinId: "gnd" },
        to: { instanceId: "lcd1", pinId: "gnd" },
      },
      {
        id: "c3",
        from: { instanceId: "board1", pinId: "a4" },
        to: { instanceId: "lcd1", pinId: "sda" },
      },
      {
        id: "c4",
        from: { instanceId: "board1", pinId: "a5" },
        to: { instanceId: "lcd1", pinId: "scl" },
      },
    ],
    steps: [
      {
        id: "s1",
        order: 1,
        title: "Place Uno and LCD",
        body: "Set the Uno and I2C LCD backpack side by side.",
      },
      {
        id: "s2",
        order: 2,
        title: "Wire power",
        body: "Connect LCD VCC to 5V and LCD GND to GND.",
      },
      {
        id: "s3",
        order: 3,
        title: "Wire I2C",
        body: "Connect SDA to A4 and SCL to A5.",
      },
    ],
    notes: ["Uno I2C defaults are A4/A5."],
  },
  {
    title: "Soil Moisture Read",
    board_id: "board.esp32.devkit",
    power_source: "battery",
    parts: [
      { instanceId: "board1", catalogId: "board.esp32.devkit" },
      { instanceId: "soil1", catalogId: "module.soil.moisture" },
    ],
    connections: [
      {
        id: "c1",
        from: { instanceId: "board1", pinId: "3v3" },
        to: { instanceId: "soil1", pinId: "vcc" },
      },
      {
        id: "c2",
        from: { instanceId: "board1", pinId: "gnd" },
        to: { instanceId: "soil1", pinId: "gnd" },
      },
      {
        id: "c3",
        from: { instanceId: "board1", pinId: "gpio34" },
        to: { instanceId: "soil1", pinId: "ao" },
      },
    ],
    steps: [
      {
        id: "s1",
        order: 1,
        title: "Place ESP32 and sensor",
        body: "Keep the soil probe away from the USB port.",
      },
      {
        id: "s2",
        order: 2,
        title: "Wire power and analog",
        body: "Connect VCC to 3V3, GND to GND, A0 to GPIO34.",
      },
      {
        id: "s3",
        order: 3,
        title: "Read moisture",
        body: "Power from battery and read the analog value on GPIO34.",
      },
    ],
    notes: ["GPIO34 is input-only analog on ESP32."],
  },
];

const results = [];

for (const recipe of recipes) {
  const created = await api("/api/guides", {
    method: "POST",
    body: JSON.stringify({ title: recipe.title, board_id: recipe.board_id }),
  });
  const id = created.guide.id;
  await api(`/api/guides/${id}/power`, {
    method: "PUT",
    body: JSON.stringify({ power_source: recipe.power_source }),
  });
  const patched = await patch(id, {
    parts: recipe.parts,
    connections: recipe.connections,
    steps: recipe.steps,
    notes: recipe.notes,
  });
  const validation = await api(`/api/guides/${id}/validate`, {
    method: "POST",
    body: "{}",
  });
  results.push({
    title: recipe.title,
    id,
    url: created.url,
    ok: validation.validation.ok,
    blocked: validation.blocked,
    parts: patched.guide.parts.length,
    connections: patched.guide.connections.length,
  });
}

console.log(JSON.stringify(results, null, 2));
