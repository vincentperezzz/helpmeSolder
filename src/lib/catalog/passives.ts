import { BATTERY_ELECTRICAL, USB_WALL_ELECTRICAL, type BatteryKind } from "./batteries";
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
    id: "passive.power.battery.9v",
    name: "9V Battery (snap)",
    kind: "passive",
    description:
      "A 9 V rectangular battery with two snap terminals on top. The smaller round terminal is + and the larger hexagon-shaped one is -. A snap connector with red (+) and black (-) wires clips on. Use it into a board's VIN pin or barrel jack, not into a 5 V or 3.3 V pin.",
    photoCaption:
      "9 V rectangular battery with both snap terminals on the top face (small round = +, larger hexagon = -).",
    identify:
      "Rectangular block about 48 x 26 x 17 mm labelled 9V (PP3 / 6LR61 alkaline), two snaps on one end. Clip on a snap lead: red = +, black = -.",
    variants: [
      {
        label: "9 V alkaline PP3 (this guide)",
        detail: "Roughly 9 V new, falling as it drains. Low capacity (a few hundred mAh), best for small, low-power builds.",
        matchesGuide: true,
      },
      {
        label: "Rechargeable 9 V (NiMH or Li-ion)",
        detail: "Nominal voltage may differ (for example 8.4 V); check the label against the board's VIN range.",
      },
    ],
    watchOuts: [
      "Connect red to VIN (or a regulator input) and black to GND. Reversed polarity can destroy the board instantly.",
      "9 V must not go to a 5 V or 3.3 V pin.",
      "Small 9 V cells give little current and drain fast with motors, servos, Wi-Fi boards or LED strips.",
    ],
    photoHint: "battery-9v",
    pins: [
      { id: "+", label: "+ (top snap)", kinds: ["power"], voltage: "5v" },
      { id: "-", label: "− (top snap)", kinds: ["ground"] },
    ],
  },
  {
    id: "passive.power.battery.2aa",
    name: "2×AA Batteries",
    kind: "passive",
    description:
      "Two AA batteries in a holder, about 3 V (2 x 1.5 V) when fresh. The holder has a red wire for + and a black wire for -. Typically used for low-power projects on boards that accept about 3 V; check the board's minimum supply first.",
    photoCaption:
      "2xAA holder: the red wire is +, the black wire is -.",
    identify:
      "A plastic holder for two AA cells with two wires. Spring end of each cell is -, bump end is +. Red wire = +, black = -.",
    variants: [
      {
        label: "2xAA alkaline (this guide)",
        detail: "About 3.0 V fresh, falling toward 2 V as it empties. Check that your board or module accepts that range.",
        matchesGuide: true,
      },
      {
        label: "2xAA NiMH rechargeable",
        detail: "About 2.4 V nominal; may be too low for some 3.3 V parts.",
      },
    ],
    watchOuts: [
      "Check that the board accepts about 2-3 V; many 3.3 V boards need close to 3.0 V and may need a voltage booster.",
      "Insert cells the right way round: polarity is marked in the holder.",
      "Do not mix new and old batteries or different brands.",
    ],
    photoHint: "battery-2aa",
    pins: [
      { id: "+", label: "+ (top)", kinds: ["power"], voltage: "3v3" },
      { id: "-", label: "− (bottom)", kinds: ["ground"] },
    ],
  },
  {
    id: "passive.power.battery.3aa",
    name: "3×AA Batteries",
    kind: "passive",
    description:
      "Three AA batteries in a holder, about 4.5 V when fresh. Red wire is +, black wire is -. Often used with 5 V boards such as Arduinos, within the board's accepted voltage range.",
    photoCaption:
      "3xAA holder: red wire is +, black wire is -.",
    identify:
      "Plastic holder for three AA cells in a row with two wires (red +, black -).",
    variants: [
      {
        label: "3xAA alkaline (this guide)",
        detail: "About 4.5 V fresh and falling as it drains. Check the board's minimum supply voltage.",
        matchesGuide: true,
      },
      {
        label: "4xAA holder",
        detail: "About 6 V. Suitable for a board's VIN, not for 5 V pins.",
      },
    ],
    watchOuts: [
      "Voltage drops as batteries drain, so a board may reset or misbehave near the end of life.",
      "Insert cells the right way round and connect red to + and black to GND.",
      "Do not mix old and new batteries.",
    ],
    photoHint: "battery-3aa",
    pins: [
      { id: "+", label: "+ (top)", kinds: ["power"], voltage: "5v" },
      { id: "-", label: "− (bottom)", kinds: ["ground"] },
    ],
  },
  {
    id: "passive.power.battery.18650",
    name: "18650 Li-ion Cell",
    kind: "passive",
    description:
      "A single 18650 rechargeable lithium-ion cell, 3.7 V nominal (about 4.2 V full, 3.0 V empty). The flat end is - and the end with the raised button is +. It can deliver a lot of current, so it needs a proper holder and, ideally, a protected cell or a charger-protection board (such as a TP4056 module).",
    photoCaption:
      "18650 cell: raised button end is +, flat end is -.",
    identify:
      "Cylinder about 18 mm wide and 65 mm long, like a long AA battery, with a printed rating such as 2600 mAh. Protected cells are slightly longer and have a small circuit under the label.",
    variants: [
      {
        label: "18650 Li-ion, 3.7 V (this guide)",
        detail: "Typical capacity 2000-3500 mAh. Choose a protected cell from a reputable brand.",
        matchesGuide: true,
      },
      {
        label: "Unprotected vs protected cell",
        detail: "A protected cell has an internal safety circuit. Prefer it as a beginner.",
      },
    ],
    watchOuts: [
      "Do not reverse polarity. Prefer a holder with protection for beginners.",
      "Never short the terminals or leave a bare cell loose in a bag with metal: it can overheat and ignite.",
      "Charge only with a Li-ion charger, never with a plain power supply. Do not use damaged or swollen cells.",
    ],
    photoHint: "battery-18650",
    pins: [
      { id: "+", label: "+ (top)", kinds: ["power"], voltage: "3v3" },
      { id: "-", label: "− (bottom)", kinds: ["ground"] },
    ],
  },
];

function batteryElectrical(kind: BatteryKind): PartElectrical {
  const spec = BATTERY_ELECTRICAL[kind];
  return {
    battery: { chemistry: spec.chemistry, cells: spec.cells },
    pins: {
      "+": {
        source: { nominal: spec.nominal, min: spec.min, max: spec.max, external: true },
      },
    },
  };
}

const PASSIVE_ELECTRICAL: Record<string, PartElectrical> = {
  "passive.power.usb_wall": {
    pins: { "5V": { source: { ...USB_WALL_ELECTRICAL, external: true } } },
  },
  "passive.power.battery.9v": batteryElectrical("battery_9v"),
  "passive.power.battery.2aa": batteryElectrical("battery_2aa"),
  "passive.power.battery.3aa": batteryElectrical("battery_3aa"),
  "passive.power.battery.18650": batteryElectrical("battery_18650"),
  // Passive divider: wiper swings up to whatever VCC it is wired to.
  "passive.potentiometer": { logic: "5v", logicFollowsSupply: true },
};

export const passives: CatalogPart[] = basePassives.map((part) => ({
  ...part,
  electrical: PASSIVE_ELECTRICAL[part.id],
}));
