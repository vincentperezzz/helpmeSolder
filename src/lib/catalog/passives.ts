import { POWER_BANK_ELECTRICAL, USB_WALL_ELECTRICAL } from "./batteries";
import { BATTERY_RECORD_LIST, batteryPinVoltageClass, type BatteryRecord } from "./battery-records";
import type { CatalogPart, PartElectrical } from "./types";

function rail(id: string, label: string, kinds: CatalogPart["pins"][number]["kinds"], voltage?: "3v3" | "5v") {
  return { id, label, kinds, voltage };
}

function breadboardHolePins(): CatalogPart["pins"] {
  const cols = Array.from({ length: 30 }, (_, i) => i + 1);
  const rows = ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j"] as const;
  const holes = cols.flatMap((col) =>
    rows.map((row) => rail(`${row}${col}`, `${row}${col}`, ["digital", "analog"])),
  );
  const railHoles = cols.flatMap((col) => [
    rail(`+.t.${col}`, `+ top ${col}`, ["power"], "5v"),
    rail(`-.t.${col}`, `− top ${col}`, ["ground"]),
    rail(`+.b.${col}`, `+ bot ${col}`, ["power"], "5v"),
    rail(`-.b.${col}`, `− bot ${col}`, ["ground"]),
  ]);
  return [
    rail("+", "+ rail (top)", ["power"], "5v"),
    rail("-", "− rail (bottom)", ["ground"]),
    rail("+.t", "+ rail (top)", ["power"], "5v"),
    rail("-.t", "− rail (top)", ["ground"]),
    rail("+.b", "+ rail (bottom)", ["power"], "5v"),
    rail("-.b", "− rail (bottom)", ["ground"]),
    ...railHoles,
    ...holes,
  ];
}

const basePassives: CatalogPart[] = [
  {
    id: "passive.breadboard.half",
    name: "Breadboard (half)",
    kind: "passive",
    description:
      "A breadboard is a plastic board full of tiny spring-clip holes where you push in component legs and jumper wires to build a circuit with no soldering. Holes are joined by hidden metal strips: in the main area each numbered column is joined in groups of five (holes a-e of one column are joined, and holes f-j of the same column are joined, but a-e is NOT joined to f-j; the centre gap separates them). The long rows along the edges (marked red + and blue -) are power rails, each joined along its whole length (on some boards the rail is split in the middle).",
    photoCaption:
      "Half-size solderless breadboard with outer power rails (red + / blue -) and the centre gap between the a-e and f-j halves.",
    identify:
      "White (sometimes clear) plastic block with a grid of holes spaced 2.54 mm (0.1 inch) apart, numbered columns, letters a-j, a groove down the middle, and red and blue lines along the long edges. A half-size board is about 8.5 x 5.5 cm; a full-size one (830 points) is about twice as long; a mini board has no power rails.",
    variants: [
      {
        label: "Half-size (this guide)",
        detail: "About 400 tie-points, 30 columns, power rails on both long edges. Enough for one board plus a few parts.",
        matchesGuide: true,
      },
      {
        label: "Full-size / MB-102 (830 points)",
        detail: "Roughly twice as long with more columns. The same rules apply, but check whether the power rails are split in the middle (a gap in the red/blue line means two separate halves).",
      },
      {
        label: "Mini (no rails)",
        detail: "Small boards (about 170 points) often have no + / - rails, so you wire power and ground into normal columns yourself.",
      },
    ],
    watchOuts: [
      "The top and bottom power rails are separate from each other. Bridge them with a jumper wire if you need power on both sides.",
      "Holes a-e and f-j in the same column are NOT connected to each other: the centre gap cuts them. Put the two legs of one part in different columns, or you will short it out.",
      "A breadboard is for low-voltage prototypes only (never mains power). A loose, worn clip is a common cause of 'it worked a minute ago'.",
    ],
    photoHint: "breadboard-half",
    pins: breadboardHolePins(),
  },
  {
    id: "passive.resistor.220",
    name: "Resistor 220Ω",
    kind: "passive",
    description:
      "A resistor limits how much electric current can flow, measured in ohms (symbol Ω). It has no polarity: either leg can go either way. A 220 Ω resistor is the usual choice in series with an LED on a 3.3 V or 5 V pin so the LED is not damaged and the pin is not overloaded (roughly 10-15 mA).",
    photoCaption:
      "Through-hole 220 Ω resistor: red, red, brown bands, then a gold or brown tolerance band.",
    identify:
      "Small cylinder with two wire legs and coloured bands. 220 Ω is red, red, brown on a 4-band resistor (then a gold band for tolerance), or red, red, black, black on a 5-band one. Lookalikes: 2.2 kΩ is red-red-red, 22 Ω is red-red-black. If unsure, measure it with a multimeter on the ohms setting.",
    variants: [
      {
        label: "220 Ω (this guide)",
        detail: "Common LED current limiter for a 5 V or 3.3 V signal.",
        matchesGuide: true,
      },
      {
        label: "330 Ω / 470 Ω / 1 kΩ",
        detail: "Also used with LEDs. A higher value makes the LED dimmer but is gentler on the pin. Not the same value as 220 Ω.",
      },
      {
        label: "1/4 W through-hole vs SMD",
        detail: "Buy 1/4 W (or 1/8 W) axial through-hole resistors for breadboards and soldering. Tiny SMD resistors are not meant for beginners.",
      },
    ],
    watchOuts: [
      "Resistors have no polarity, so orientation does not matter.",
      "Value is read from the bands, not guessed: red-red-brown is 220 Ω, red-red-red is 2.2 kΩ (ten times more, so an LED would be very dim). Check with a multimeter if bands are hard to read.",
    ],
    photoHint: "resistor-220",
    wokwi: { tag: "wokwi-resistor", attrs: { value: "220" } },
    pins: [
      { id: "1", label: "1", kinds: ["digital", "analog", "power"] },
      { id: "2", label: "2", kinds: ["digital", "analog", "power"] },
    ],
  },
  {
    id: "passive.resistor.1k",
    name: "Resistor 1kΩ",
    kind: "passive",
    description:
      "A 1 kΩ (1000 ohm) resistor. It has no polarity. Typical uses are limiting current to a small LED (dimmer than with 220 Ω), driving the base of a small transistor, or acting as a pull-up/pull-down that keeps a pin at a known on or off level.",
    photoCaption:
      "Through-hole 1 kΩ resistor: brown, black, red bands, then a gold or brown tolerance band.",
    identify:
      "Small axial resistor. 1 kΩ is brown, black, red on a 4-band resistor (or brown, black, black, brown on a 5-band one). Lookalikes: 10 kΩ is brown-black-orange; 100 Ω is brown-black-brown. Measure with a multimeter if unsure.",
    variants: [
      {
        label: "1 kΩ (this guide)",
        detail: "General-purpose value for gentle LED limiting, transistor bases and light pull-ups.",
        matchesGuide: true,
      },
      {
        label: "1/4 W through-hole",
        detail: "The usual breadboard/solder size. Make sure the stripes, not just the pack label, say 1 kΩ.",
      },
    ],
    watchOuts: [
      "No polarity, so either way round works.",
      "Do not confuse brown-black-red (1 kΩ) with brown-black-orange (10 kΩ): they look very similar in dim light.",
      "With an LED on 5 V, 1 kΩ gives a visibly dim glow; use 220-330 Ω if you want it bright.",
    ],
    photoHint: "resistor-1k",
    wokwi: { tag: "wokwi-resistor", attrs: { value: "1000" } },
    pins: [
      { id: "1", label: "1", kinds: ["digital", "analog", "power"] },
      { id: "2", label: "2", kinds: ["digital", "analog", "power"] },
    ],
  },
  {
    id: "passive.resistor.10k",
    name: "Resistor 10kΩ",
    kind: "passive",
    description:
      "A 10 kΩ (10,000 ohm) resistor. It has no polarity. Its main job is a pull-up or pull-down: it gently ties an input pin to 3.3 V/5 V or to ground so the pin reads a clean HIGH or LOW instead of floating randomly. It is also used in a voltage divider with a photoresistor or thermistor.",
    photoCaption:
      "Through-hole 10 kΩ resistor: brown, black, orange bands, then a gold or brown tolerance band.",
    identify:
      "Small axial resistor. 10 kΩ is brown, black, orange on a 4-band resistor (or brown, black, black, red on a 5-band one). Lookalikes: 1 kΩ is brown-black-red; 100 kΩ is brown-black-yellow. Measure with a multimeter if unsure.",
    variants: [
      {
        label: "10 kΩ (this guide)",
        detail: "Standard pull-up/pull-down and divider value.",
        matchesGuide: true,
      },
      {
        label: "1/4 W through-hole",
        detail: "The usual breadboard/solder size.",
      },
    ],
    watchOuts: [
      "No polarity, so either way round works.",
      "For a plain button you usually do not need this part: use INPUT_PULLUP in code, which turns on a built-in pull-up resistor inside the chip.",
      "Check the third band (orange) to avoid mixing it up with 1 kΩ (red) or 100 kΩ (yellow).",
    ],
    photoHint: "resistor-10k",
    wokwi: { tag: "wokwi-resistor", attrs: { value: "10000" } },
    pins: [
      { id: "1", label: "1", kinds: ["digital", "analog", "power"] },
      { id: "2", label: "2", kinds: ["digital", "analog", "power"] },
    ],
  },
  {
    id: "passive.led.red",
    name: "LED (red)",
    kind: "passive",
    description:
      "An LED (light-emitting diode) is a small light that only works one way round. The longer leg is the anode (A, +) and goes toward the signal or power; the shorter leg is the cathode (C, -) and goes toward ground. An LED has almost no resistance of its own, so it must always be wired in series with a resistor (about 220-330 Ω on 3.3 V or 5 V) or it can burn out itself or the pin.",
    photoCaption:
      "5 mm through-hole red LED. Long leg is the anode (+); the flat edge on the rim and the shorter leg mark the cathode (-).",
    identify:
      "Small clear or red-tinted plastic dome with two legs, usually 5 mm across (3 mm and 10 mm also exist). Long leg = anode (+). Looking at the rim, the side with a flat cut and the shorter leg is the cathode (-). Lookalikes: an RGB LED has 4 legs; a bi-colour LED has 2 legs but changes colour with direction.",
    variants: [
      {
        label: "5 mm red LED (this guide)",
        detail: "Needs a series resistor. Drops about 1.8-2.2 V when lit and runs happily at 10-20 mA.",
        matchesGuide: true,
      },
      {
        label: "3 mm or 10 mm LED",
        detail: "Same wiring and polarity, just a different size.",
      },
      {
        label: "SMD / addressable LEDs (e.g. WS2812)",
        detail: "Different footprint and wiring (power, ground and a data pin). Not this part.",
      },
    ],
    watchOuts: [
      "Never connect an LED straight to a pin or battery: always add a series resistor (220-330 Ω for 3.3 V or 5 V).",
      "Wrong polarity means it simply will not light (and a large reverse voltage can damage it). If it is dark, flip it.",
      "A microcontroller pin can safely supply only about 20 mA (less on some 3.3 V boards), so drive one LED per pin.",
    ],
    photoHint: "led-red",
    wokwi: { tag: "wokwi-led", attrs: { color: "red", label: "LED" } },
    pins: [
      { id: "A", label: "A (anode)", kinds: ["digital", "power"] },
      { id: "C", label: "C (cathode)", kinds: ["ground"] },
    ],
  },
  {
    id: "passive.led.green",
    name: "LED (green)",
    kind: "passive",
    description:
      "A green LED (light-emitting diode): a small light that only works one way round. The longer leg is the anode (A, +) and the shorter leg is the cathode (C, -) toward ground. It must always be wired in series with a resistor (about 220-330 Ω on 3.3 V or 5 V) or it can burn out.",
    photoCaption:
      "5 mm green through-hole LED. Long leg is the anode (+); polarity is the same as the red LED.",
    identify:
      "Same shape as the red LED, with a green-tinted or clear dome. Long leg = anode (+); flat edge on the rim and shorter leg = cathode (-). Check the pack label: a clear-dome LED can be any colour until you light it.",
    variants: [
      {
        label: "5 mm green LED (this guide)",
        detail: "Needs a series resistor. Forward voltage is typically about 2.0-3.0 V depending on type; check the pack.",
        matchesGuide: true,
      },
      {
        label: "3 mm or 10 mm LED",
        detail: "Same polarity and wiring, just a different size.",
      },
    ],
    watchOuts: [
      "Always use a series resistor (220-330 Ω for 3.3 V or 5 V). On 3.3 V a green LED can be dim with a large resistor: lower the value a little rather than skipping it.",
      "Wrong polarity means it will not light; flip it.",
      "A pin should drive about 20 mA at most (less on some 3.3 V boards), so one LED per pin.",
    ],
    photoHint: "led-green",
    wokwi: { tag: "wokwi-led", attrs: { color: "green", label: "LED" } },
    pins: [
      { id: "A", label: "A (anode)", kinds: ["digital", "power"] },
      { id: "C", label: "C (cathode)", kinds: ["ground"] },
    ],
  },
  {
    id: "passive.potentiometer",
    name: "Potentiometer",
    kind: "passive",
    description:
      "A potentiometer (pot) is a turnable knob that acts as an adjustable resistor. It has three legs: the two outer legs are the ends of a resistive track (one goes to GND, the other to the supply, 3.3 V or 5 V) and the middle leg is the wiper. Turning the knob slides the wiper, so the middle leg outputs a voltage anywhere between 0 V and the supply; read it on an analog input pin (analogRead). Typical values are 10 kΩ (the usual choice) or anything from 1 kΩ to 100 kΩ.",
    photoCaption:
      "Rotary potentiometer with three legs in a row: outer legs go to GND and the supply, the middle leg is the output (wiper).",
    identify:
      "Knob or small round body with a metal shaft and three legs in a row (or a blue/white trimmer with a tiny screw head on top). A marking such as 103 means 10 kΩ and 104 means 100 kΩ. Lookalikes: a rotary encoder has 5 legs and clicks; a 2-leg trimmer is a plain variable resistor.",
    variants: [
      {
        label: "Rotary pot, 10 kΩ linear (B10K) (this guide)",
        detail: "The standard choice. Linear (B) means the voltage changes evenly as you turn it. Audio (A) pots change unevenly: avoid them for sensors.",
        matchesGuide: true,
      },
      {
        label: "Trimmer / trimpot",
        detail: "Tiny blue or white pot adjusted with a screwdriver. Same three-leg wiring.",
      },
      {
        label: "Slide pot",
        detail: "Slider instead of a knob; same three legs.",
      },
    ],
    watchOuts: [
      "The middle leg (wiper) is the output and goes to an analog pin; do not tie it directly to the supply or ground.",
      "Power the outer legs from the SAME voltage as the board's logic (3.3 V on ESP32/Pico) so the analog pin never sees more than it tolerates.",
      "If the value moves the wrong direction, swap the two outer legs.",
    ],
    photoHint: "potentiometer",
    wokwi: { tag: "wokwi-potentiometer", attrs: { value: "0.5" } },
    pins: [
      { id: "GND", label: "GND", kinds: ["ground"] },
      { id: "SIG", label: "SIG/wiper", kinds: ["analog"] },
      { id: "VCC", label: "VCC", kinds: ["power"], voltage: "5v" },
    ],
  },
  {
    id: "passive.pushbutton",
    name: "Pushbutton",
    kind: "passive",
    description:
      "A tactile pushbutton is a switch that connects its contacts only while you hold it down. The common 4-leg version is really two pairs: the two legs on the same side are always joined inside, and pressing the button joins one pair to the other. Wire one leg to a GPIO pin and a diagonally opposite leg to GND, set the pin to INPUT_PULLUP in code (the chip's built-in pull-up resistor, so no external resistor is needed), and the pin reads LOW when pressed and HIGH when released.",
    photoCaption:
      "4-leg tactile pushbutton: legs on the same side are always connected; pressing joins the two sides.",
    identify:
      "Small black square (about 6 x 6 mm) with a round plastic cap and 4 metal legs, one at each corner. Lookalikes: a 2-leg or 3-leg switch is a different part; larger buttons with a plastic stem on a panel are arcade or panel buttons that need soldered wires.",
    variants: [
      {
        label: "6 x 6 mm 4-leg tactile (this guide)",
        detail: "Fits a breadboard straddling the centre gap. Momentary: on only while pressed.",
        matchesGuide: true,
      },
      {
        label: "2-leg or panel / arcade button",
        detail: "Same idea (two contacts) but only 2 wires. Check that it is momentary, not latching.",
      },
      {
        label: "Latching pushbutton",
        detail: "Stays on after one press and off after the next. Behaves like a toggle switch, not this part.",
      },
    ],
    watchOuts: [
      "Straddle the breadboard centre gap, or use diagonal legs, so the two sides are not already shorted by the board. If the button always reads pressed, rotate it 90 degrees.",
      "Use INPUT_PULLUP and wire to GND, not to 5 V. Reads are inverted: LOW means pressed.",
      "Never connect a button straight across power and ground; it must go to an input pin and ground.",
    ],
    photoHint: "pushbutton",
    wokwi: { tag: "wokwi-pushbutton", attrs: { color: "red" } },
    pins: [
      { id: "1.l", label: "1L", kinds: ["digital"] },
      { id: "2.l", label: "2L", kinds: ["digital"] },
      { id: "1.r", label: "1R", kinds: ["digital"] },
      { id: "2.r", label: "2R", kinds: ["digital"] },
    ],
  },
  {
    id: "passive.power.usb_wall",
    name: "USB Wall Adapter",
    kind: "passive",
    description:
      "A 5 V USB wall adapter (phone charger) with a USB cable that plugs into the board's USB port. It supplies 5 V for the board and parts and does the safe mains conversion for you. Ask the user whether they want wall power or a battery.",
    photoCaption:
      "5 V USB wall adapter used as the guide power source.",
    identify:
      "Small plastic brick with plug prongs on one side and a USB-A (rectangular) or USB-C port on the other; the label should say OUTPUT 5 V with a current such as 1 A or 2 A. A phone charger works.",
    variants: [
      {
        label: "5 V 1-2 A phone charger (this guide)",
        detail: "Plenty for a board plus a few modules. Use a good-quality data cable (some cheap cables are power-only or very thin).",
        matchesGuide: true,
      },
      {
        label: "Computer USB port",
        detail: "Also 5 V, but limited to about 500 mA (USB 2.0).",
      },
    ],
    watchOuts: [
      "Use a regulated 5 V adapter only; avoid unlabeled or higher-voltage supplies (9 V or 12 V would damage a 5 V board).",
      "Do not open or modify the adapter: it carries mains voltage inside.",
    ],
    photoHint: "usb-wall",
    pins: [
      { id: "5V", label: "5V OUT", kinds: ["power"], voltage: "5v" },
      { id: "GND", label: "GND", kinds: ["ground"] },
    ],
  },
  {
    id: "passive.power.power_bank",
    name: "USB Power Bank",
    kind: "passive",
    description:
      "A rechargeable USB power bank (the kind used to charge a phone) used as a portable 5 V supply. Plug its USB cable into the board's USB port, exactly like a wall adapter, and nothing needs soldering for power. It is the easiest way to run a project away from a wall socket. Some power banks switch off when the load is very small; a board that draws only a few milliamps may need a bank with a 'low-current' or 'always on' mode.",
    photoCaption: "USB power bank: its USB-A output port feeds the board through a USB cable.",
    identify:
      "A flat or brick-shaped rechargeable pack, often with small LED dots showing charge level, a USB-A (rectangular) output port, a USB-C or micro-USB charging port, and a rating in mAh (for example 10000 mAh).",
    variants: [
      {
        label: "5 V USB power bank (this guide)",
        detail: "Outputs a regulated 5 V (up to 2-3 A). Capacity from about 2000 to 20000+ mAh. Any brand works: the output is 5 V either way.",
        matchesGuide: true,
      },
      {
        label: "Power bank with fast-charge (9 V / 12 V) modes",
        detail: "Normal USB devices are still given 5 V, but only plug in a cable that asks for 5 V. Avoid 'trigger' cables that force 9 V or 12 V on a 5 V board.",
      },
    ],
    watchOuts: [
      "Use a good data-capable cable (cheap cables can be power-only or very thin and drop the voltage).",
      "Some power banks turn themselves off when the load is tiny (a small board with no Wi-Fi). If the board keeps losing power, try another bank or add a small extra load.",
      "Never use a damaged or swollen power bank, and do not leave it charging unattended.",
    ],
    photoHint: "power-bank",
    pins: [
      { id: "5V", label: "5V OUT", kinds: ["power"], voltage: "5v" },
      { id: "GND", label: "GND", kinds: ["ground"] },
    ],
  },
];

/** Catalog entry for one battery / supply record. */
function batteryPart(record: BatteryRecord): CatalogPart {
  return {
    id: record.partId,
    name: record.name,
    kind: "passive",
    description: record.description,
    photoCaption: record.photoCaption,
    identify: record.identify,
    variants: record.variants,
    watchOuts: record.watchOuts,
    photoHint: record.photoHint,
    pins: [
      {
        id: "+",
        label: `+ (${record.pinNotes.plus})`,
        kinds: ["power"],
        voltage: batteryPinVoltageClass(record.nominal),
      },
      { id: "-", label: `− (${record.pinNotes.minus})`, kinds: ["ground"] },
    ],
  };
}

function batteryElectrical(record: BatteryRecord): PartElectrical {
  return {
    ...(record.chemistry === "dc-supply"
      ? {}
      : {
          battery: {
            chemistry: record.chemistry,
            cells: record.cells,
            ...(record.lowCurrent ? { lowCurrent: true } : {}),
          },
        }),
    pins: {
      "+": {
        source: { nominal: record.nominal, min: record.min, max: record.max, external: true },
      },
    },
  };
}

const PASSIVE_ELECTRICAL: Record<string, PartElectrical> = {
  "passive.power.usb_wall": {
    pins: { "5V": { source: { ...USB_WALL_ELECTRICAL, external: true } } },
  },
  "passive.power.power_bank": {
    pins: { "5V": { source: { ...POWER_BANK_ELECTRICAL, external: true } } },
  },
  ...Object.fromEntries(BATTERY_RECORD_LIST.map((record) => [record.partId, batteryElectrical(record)])),
  // Passive divider: wiper swings up to whatever VCC it is wired to.
  "passive.potentiometer": { logic: "5v", logicFollowsSupply: true },
};

export const passives: CatalogPart[] = [...basePassives, ...BATTERY_RECORD_LIST.map(batteryPart)].map((part) => ({
  ...part,
  electrical: PASSIVE_ELECTRICAL[part.id],
}));
