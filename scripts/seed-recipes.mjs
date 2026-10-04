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
        order: 1,
        title: "Place the ESP32",
        body: "Put the ESP32 on the bench and note D5 and GND.",
      },
      {
        id: "s2",
        order: 2,
        title: "Wire the buzzer",
        body: "Connect buzzer pin 1 (SIG) to D5 and pin 2 to GND.",
      },
      {
        id: "s3",
        order: 3,
        title: "Power and test",
        body: "Power over USB wall and drive D5 high to beep.",
      },
    ],
    notes: ["Wokwi buzzer is a 2-pin part: signal + ground."],
  },
  {
    title: "I2C LCD 1602",
    board_id: "board.arduino.uno",
    power_source: "usb_wall",
    parts: [
      { instanceId: "board1", catalogId: "board.arduino.uno" },
      { instanceId: "lcd1", catalogId: "module.lcd.i2c.1602" },
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
    notes: ["Uno I2C defaults are A4/A5. Character LCD class: 1602 I2C."],
  },
  {
    title: "I2C LCD 2004",
    board_id: "board.esp32.devkit",
    power_source: "usb_wall",
    parts: [
      { instanceId: "board1", catalogId: "board.esp32.devkit" },
      { instanceId: "lcd1", catalogId: "module.lcd.i2c.2004" },
    ],
    connections: [
      {
        id: "c1",
        from: { instanceId: "board1", pinId: "VIN" },
        to: { instanceId: "lcd1", pinId: "VCC" },
      },
      {
        id: "c2",
        from: { instanceId: "board1", pinId: "GND.1" },
        to: { instanceId: "lcd1", pinId: "GND" },
      },
      {
        id: "c3",
        from: { instanceId: "board1", pinId: "D21" },
        to: { instanceId: "lcd1", pinId: "SDA" },
      },
      {
        id: "c4",
        from: { instanceId: "board1", pinId: "D22" },
        to: { instanceId: "lcd1", pinId: "SCL" },
      },
    ],
    steps: [
      {
        id: "s1",
        order: 1,
        title: "Place ESP32 and 2004",
        body: "Keep the 20x4 LCD facing up next to the DevKit.",
      },
      {
        id: "s2",
        order: 2,
        title: "Wire power",
        body: "Connect LCD VCC to VIN and LCD GND to GND.",
      },
      {
        id: "s3",
        order: 3,
        title: "Wire I2C",
        body: "Connect SDA to D21 and SCL to D22.",
      },
    ],
    notes: ["Character LCD class: 2004 I2C. ESP32 I2C defaults are D21/D22."],
  },
  {
    title: "Parallel LCD 1602",
    board_id: "board.arduino.uno",
    power_source: "usb_wall",
    parts: [
      { instanceId: "board1", catalogId: "board.arduino.uno" },
      { instanceId: "lcd1", catalogId: "module.lcd.parallel.1602" },
    ],
    connections: [
      {
        id: "c1",
        from: { instanceId: "board1", pinId: "5V" },
        to: { instanceId: "lcd1", pinId: "VDD" },
      },
      {
        id: "c2",
        from: { instanceId: "board1", pinId: "GND.2" },
        to: { instanceId: "lcd1", pinId: "VSS" },
      },
      {
        id: "c3",
        from: { instanceId: "board1", pinId: "GND.3" },
        to: { instanceId: "lcd1", pinId: "RW" },
      },
      {
        id: "c4",
        from: { instanceId: "board1", pinId: "12" },
        to: { instanceId: "lcd1", pinId: "RS" },
      },
      {
        id: "c5",
        from: { instanceId: "board1", pinId: "11" },
        to: { instanceId: "lcd1", pinId: "E" },
      },
      {
        id: "c6",
        from: { instanceId: "board1", pinId: "5" },
        to: { instanceId: "lcd1", pinId: "D4" },
      },
      {
        id: "c7",
        from: { instanceId: "board1", pinId: "4" },
        to: { instanceId: "lcd1", pinId: "D5" },
      },
      {
        id: "c8",
        from: { instanceId: "board1", pinId: "3" },
        to: { instanceId: "lcd1", pinId: "D6" },
      },
      {
        id: "c9",
        from: { instanceId: "board1", pinId: "2" },
        to: { instanceId: "lcd1", pinId: "D7" },
      },
    ],
    steps: [
      {
        id: "s1",
        order: 1,
        title: "Place Uno and parallel LCD",
        body: "Use the full HD44780 header, not an I2C backpack.",
      },
      {
        id: "s2",
        order: 2,
        title: "Wire power and RW",
        body: "VDD to 5V, VSS to GND, RW to GND for write-only.",
      },
      {
        id: "s3",
        order: 3,
        title: "Wire control and data",
        body: "RS to D12, E to D11, D4-D7 to D5-D2.",
      },
    ],
    notes: ["Character LCD class: 1602 parallel. Contrast (V0) needs a pot in hardware."],
  },
  {
    title: "OLED SSD1306",
    board_id: "board.esp32.devkit",
    power_source: "usb_wall",
    parts: [
      { instanceId: "board1", catalogId: "board.esp32.devkit" },
      { instanceId: "oled1", catalogId: "module.oled.ssd1306" },
    ],
    connections: [
      {
        id: "c1",
        from: { instanceId: "board1", pinId: "3V3" },
        to: { instanceId: "oled1", pinId: "3V3" },
      },
      {
        id: "c2",
        from: { instanceId: "board1", pinId: "GND.1" },
        to: { instanceId: "oled1", pinId: "GND" },
      },
      {
        id: "c3",
        from: { instanceId: "board1", pinId: "D21" },
        to: { instanceId: "oled1", pinId: "DATA" },
      },
      {
        id: "c4",
        from: { instanceId: "board1", pinId: "D22" },
        to: { instanceId: "oled1", pinId: "CLK" },
      },
    ],
    steps: [
      {
        id: "s1",
        order: 1,
        title: "Place ESP32 and OLED",
        body: "Keep the SSD1306 module close to the DevKit I2C pins.",
      },
      {
        id: "s2",
        order: 2,
        title: "Wire power",
        body: "Connect OLED 3V3 to board 3V3 and GND to GND.",
      },
      {
        id: "s3",
        order: 3,
        title: "Wire I2C",
        body: "Connect DATA to D21 and CLK to D22.",
      },
    ],
    notes: ["OLED class: SSD1306. DATA/CLK are SDA/SCL on I2C modules."],
  },
  {
    title: "ILI9341 TFT",
    board_id: "board.esp32.devkit",
    power_source: "usb_wall",
    parts: [
      { instanceId: "board1", catalogId: "board.esp32.devkit" },
      { instanceId: "tft1", catalogId: "module.tft.ili9341" },
    ],
    connections: [
      {
        id: "c1",
        from: { instanceId: "board1", pinId: "3V3" },
        to: { instanceId: "tft1", pinId: "VCC" },
      },
      {
        id: "c2",
        from: { instanceId: "board1", pinId: "GND.1" },
        to: { instanceId: "tft1", pinId: "GND" },
      },
      {
        id: "c3",
        from: { instanceId: "board1", pinId: "D5" },
        to: { instanceId: "tft1", pinId: "CS" },
      },
      {
        id: "c4",
        from: { instanceId: "board1", pinId: "D4" },
        to: { instanceId: "tft1", pinId: "RST" },
      },
      {
        id: "c5",
        from: { instanceId: "board1", pinId: "D2" },
        to: { instanceId: "tft1", pinId: "D/C" },
      },
      {
        id: "c6",
        from: { instanceId: "board1", pinId: "D23" },
        to: { instanceId: "tft1", pinId: "MOSI" },
      },
      {
        id: "c7",
        from: { instanceId: "board1", pinId: "D18" },
        to: { instanceId: "tft1", pinId: "SCK" },
      },
      {
        id: "c8",
        from: { instanceId: "board1", pinId: "D19" },
        to: { instanceId: "tft1", pinId: "MISO" },
      },
    ],
    steps: [
      {
        id: "s1",
        order: 1,
        title: "Place ESP32 and TFT",
        body: "Keep the ILI9341 panel flat and note the SPI header.",
      },
      {
        id: "s2",
        order: 2,
        title: "Wire power",
        body: "VCC to 3V3 and GND to GND. Tie LED backlight to 3V3 on the module.",
      },
      {
        id: "s3",
        order: 3,
        title: "Wire SPI",
        body: "CS D5, RST D4, D/C D2, MOSI D23, SCK D18, MISO D19.",
      },
    ],
    notes: [
      "TFT class: ILI9341. Diagram only — not a live simulator.",
      "LED often shares 3V3 with VCC on breakout boards.",
    ],
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
        from: { instanceId: "board1", pinId: "3V3" },
        to: { instanceId: "soil1", pinId: "vcc" },
      },
      {
        id: "c2",
        from: { instanceId: "board1", pinId: "GND.1" },
        to: { instanceId: "soil1", pinId: "gnd" },
      },
      {
        id: "c3",
        from: { instanceId: "board1", pinId: "D34" },
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
        body: "Connect VCC to 3V3, GND to GND, A0 to D34.",
      },
      {
        id: "s3",
        order: 3,
        title: "Read moisture",
        body: "Power from battery and read the analog value on D34.",
      },
    ],
    notes: ["D34 is input-only analog on ESP32. Soil module uses skeleton visual."],
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
