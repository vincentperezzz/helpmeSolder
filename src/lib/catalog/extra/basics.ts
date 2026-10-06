import type { CatalogPart, CatalogPin, PartElectrical, PartVariantNote } from "../types";

/**
 * Expansion parts: basics and electrics (LEDs, resistors, capacitors, diodes, transistors,
 * switches, a barrel jack and small power modules). Kind is always "passive". Ids must stay
 * unique and are never removed or renamed.
 *
 * The extra breadboards (mini 170 points, full 830 points) and a jumper wire pack are NOT here:
 * the wiring diagram only draws a 30-column board (BB_COLS) and a part has no pin model for a
 * wire, so they cannot be represented honestly yet.
 */

const SIGNAL_KINDS: CatalogPin["kinds"] = ["digital", "analog", "power"];

/** Two-legged part with no polarity (resistors, ceramic capacitor). */
const NO_POLARITY_PINS: CatalogPin[] = [
  { id: "1", label: "1", kinds: SIGNAL_KINDS },
  { id: "2", label: "2", kinds: SIGNAL_KINDS },
];

const LED_PINS: CatalogPin[] = [
  { id: "A", label: "A (anode)", kinds: ["digital", "power"] },
  { id: "C", label: "C (cathode)", kinds: ["ground"] },
];

const DIODE_PINS: CatalogPin[] = [
  { id: "A", label: "A (anode)", kinds: ["digital", "analog", "power"] },
  { id: "C", label: "C (cathode, band)", kinds: ["digital", "analog", "power", "ground"] },
];

const BJT_PINS: CatalogPin[] = [
  { id: "B", label: "B (base)", kinds: ["digital", "analog"] },
  { id: "C", label: "C (collector)", kinds: ["digital", "analog", "power"] },
  { id: "E", label: "E (emitter)", kinds: ["ground", "digital", "analog"] },
];

const MOSFET_PINS: CatalogPin[] = [
  { id: "G", label: "G (gate)", kinds: ["digital", "analog"] },
  { id: "D", label: "D (drain)", kinds: ["digital", "analog", "power"] },
  { id: "S", label: "S (source)", kinds: ["ground", "digital", "analog"] },
];

const SWITCH_PINS: CatalogPin[] = [
  { id: "1", label: "1", kinds: ["digital", "analog", "power", "ground"] },
  { id: "2", label: "2", kinds: ["digital", "analog", "power", "ground"] },
];

/* ------------------------------ LEDs ------------------------------ */

type LedSpec = {
  slug: string;
  colour: string;
  /** Typical forward voltage, in words, plus the resistor advice that follows from it. */
  voltageText: string;
  identify: string;
  captionExtra: string;
  variantDetail: string;
  watchOut: string;
  wokwiColor: string;
  /** Series resistor advice for the first watch-out. */
  resistorAdvice: string;
};

function led(spec: LedSpec): CatalogPart {
  return {
    id: `passive.led.${spec.slug}`,
    name: `LED (${spec.colour})`,
    kind: "passive",
    category: "Output",
    description: `A ${spec.colour} LED (light-emitting diode) is a small light that only works one way round. The longer leg is the anode (A, +) and goes toward the signal or power; the shorter leg is the cathode (C, -) and goes toward ground. ${spec.voltageText} An LED has almost no resistance of its own, so it must always be wired in series with a resistor or it can burn out itself or the pin. To pick the resistor: subtract the LED voltage from the supply, then divide by the current you want (about 10 mA is plenty bright).`,
    photoCaption: `5 mm through-hole ${spec.colour} LED. Long leg is the anode (+); the flat edge on the rim and the shorter leg mark the cathode (-). ${spec.captionExtra}`.trim(),
    identify: spec.identify,
    variants: [
      {
        label: `5 mm ${spec.colour} LED (this guide)`,
        detail: spec.variantDetail,
        matchesGuide: true,
      },
      {
        label: "3 mm or 10 mm LED",
        detail: "Same wiring and polarity, just a different size. Check the pack for the forward voltage.",
      },
      {
        label: "SMD / addressable LEDs (e.g. WS2812)",
        detail: "Different footprint and wiring (power, ground and a data pin). Not this part.",
      },
    ],
    watchOuts: [
      `Never connect an LED straight to a pin or battery: always add a series resistor. ${spec.resistorAdvice}`,
      spec.watchOut,
      "Wrong polarity means it simply will not light (and a large reverse voltage can damage it). If it is dark, flip it: long leg toward the resistor and signal, short leg toward ground.",
      "A microcontroller pin can safely supply only about 20 mA (less on some 3.3 V boards), so drive one LED per pin, or use a transistor for several.",
    ],
    photoHint: `led-${spec.slug}`,
    wokwi: { tag: "wokwi-led", attrs: { color: spec.wokwiColor, label: "LED" } },
    pins: LED_PINS,
  };
}

const LEDS: CatalogPart[] = [
  led({
    slug: "yellow",
    colour: "yellow",
    voltageText:
      "A yellow LED drops roughly 2 V when lit (typically about 2.0-2.2 V), so it behaves like a red LED: about 220 Ω on 5 V and 100-150 Ω on 3.3 V gives a good brightness.",
    identify:
      "Same shape as the red LED, with a yellow-tinted or clear dome (a clear dome can be any colour until you light it, so trust the pack label). Long leg = anode (+); flat edge on the rim and shorter leg = cathode (-). Lookalikes: a warm-white LED can look yellowish when lit.",
    captionExtra: "Typical forward voltage about 2 V.",
    variantDetail: "Needs a series resistor. Forward voltage is typically about 2.0-2.2 V; check the pack for the exact figure.",
    watchOut:
      "Yellow and orange LEDs have a lower forward voltage than blue or white ones. Do not reuse a resistor sized for a blue/white LED: the yellow LED would take too much current.",
    wokwiColor: "yellow",
    resistorAdvice: "As a starting point use 220-330 Ω on 5 V, or 100-150 Ω on 3.3 V.",
  }),
  led({
    slug: "blue",
    colour: "blue",
    voltageText:
      "A blue LED drops more voltage than a red one, typically about 3.0-3.3 V when lit. That is why it needs a 5 V supply to shine with a normal resistor; on a 3.3 V pin it may be very dim or not light at all.",
    identify:
      "Same shape as the red LED, with a blue-tinted or clear dome. Blue LEDs look very bright and a little harsh. Long leg = anode (+); flat edge on the rim and shorter leg = cathode (-). Check the pack: a clear-dome LED can be blue, white or another colour.",
    captionExtra: "Typical forward voltage about 3.0-3.3 V.",
    variantDetail:
      "Needs a series resistor. Forward voltage is typically about 3.0-3.3 V, so on 5 V use roughly 100-150 Ω; on 3.3 V it may barely light.",
    watchOut:
      "On a 3.3 V pin (ESP32, Raspberry Pi Pico) a blue LED has almost no voltage left for the resistor, so it may stay dark or very dim: power it from 5 V through a transistor, or use a red/green LED instead.",
    wokwiColor: "blue",
    resistorAdvice: "As a starting point use about 100-150 Ω on 5 V (blue and white LEDs drop about 3.2 V). On 3.3 V there is hardly any voltage left for a resistor, so prefer 5 V.",
  }),
  led({
    slug: "white",
    colour: "white",
    voltageText:
      "A white LED works like a blue one inside, so it drops about 3.0-3.3 V when lit and shines best on a 5 V supply; on a 3.3 V pin it may be very dim or not light at all.",
    identify:
      "Same shape as the red LED, usually with a clear or milky-white dome (the colour is made by a yellow coating over a blue chip, so it can look yellowish when off). Long leg = anode (+); flat edge on the rim and shorter leg = cathode (-). Lookalikes: clear blue or UV LEDs; read the pack label.",
    captionExtra: "Typical forward voltage about 3.0-3.3 V.",
    variantDetail:
      "Needs a series resistor. Forward voltage is typically about 3.0-3.3 V, so on 5 V use roughly 100-150 Ω; on 3.3 V it may barely light.",
    watchOut:
      "A white LED will not light properly from a 3.3 V pin through a resistor: there is not enough voltage left over. Use 5 V (through a transistor if the pin is 3.3 V) or pick a red/green LED. White LEDs are also very bright: do not look straight into one at close range.",
    wokwiColor: "white",
    resistorAdvice: "As a starting point use about 100-150 Ω on 5 V (blue and white LEDs drop about 3.2 V). On 3.3 V there is hardly any voltage left for a resistor, so prefer 5 V.",
  }),
  led({
    slug: "orange",
    colour: "orange",
    voltageText:
      "An orange LED drops about 2 V when lit (typically about 2.0-2.2 V), the same as a red or yellow one: roughly 220 Ω on 5 V and 100-150 Ω on 3.3 V gives a good brightness.",
    identify:
      "Same shape as the red LED, with an orange-tinted or clear dome. Orange can look close to yellow or red, so check the pack label. Long leg = anode (+); flat edge on the rim and shorter leg = cathode (-).",
    captionExtra: "Typical forward voltage about 2 V.",
    variantDetail: "Needs a series resistor. Forward voltage is typically about 2.0-2.2 V; check the pack for the exact figure.",
    watchOut:
      "Orange, yellow and red LEDs look alike when dark. Keep them in labelled bags, because mixing them with blue or white LEDs (which need less resistance) is an easy mistake.",
    wokwiColor: "orange",
    resistorAdvice: "As a starting point use 220-330 Ω on 5 V, or 100-150 Ω on 3.3 V.",
  }),
];

const IR_LED: CatalogPart = {
  id: "passive.led.ir940",
  name: "IR LED (940 nm infrared)",
  kind: "passive",
  category: "Output",
  description:
    "An infrared (IR) LED sends out light at 940 nm that your eyes cannot see. It is what sits inside a TV remote. It has the same polarity as a normal LED: the longer leg is the anode (A, +) and the shorter leg is the cathode (C, -). It drops about 1.2-1.5 V when lit, so it must be wired in series with a resistor (about 100-220 Ω on 5 V for a few tens of milliamps; follow the datasheet). To see if it works, look at it through a phone camera: it shows as a purple-white glow. A receiver such as a 38 kHz IR receiver module expects the LED to be flashed at 38 kHz.",
  photoCaption:
    "5 mm 940 nm infrared LED. Long leg is the anode (+); the flat edge on the rim and the shorter leg mark the cathode (-). The dome is clear or dark blue.",
  identify:
    "Looks like a 5 mm LED with a clear (water-clear) or dark smoky-blue/black dome and two legs, often sold in packs of 10-50 labelled IR, 940 nm or 'infrared emitter'. Long leg = anode (+). Lookalikes: an IR photodiode/phototransistor receiver looks the same but is a sensor (read the label), and 850 nm IR LEDs are also sold (they glow faintly red to the eye).",
  variants: [
    {
      label: "940 nm 5 mm IR LED (this guide)",
      detail: "Standard remote-control wavelength. Forward voltage typically about 1.2-1.5 V; the maximum current is on the datasheet (often 20-100 mA continuous).",
      matchesGuide: true,
    },
    {
      label: "850 nm IR LED",
      detail: "Slightly shorter wavelength, a faint red glow is visible. Used for night-vision cameras. Same wiring.",
    },
    {
      label: "IR transmitter module (3-pin board)",
      detail: "A small board with the LED and a resistor already fitted. Different part: it has VCC, GND and a signal pin.",
    },
  ],
  watchOuts: [
    "Always use a series resistor. A 940 nm IR LED drops only about 1.2-1.5 V, so on 5 V a 100-220 Ω resistor gives a strong current: check the datasheet maximum and do not exceed it.",
    "You cannot see it, so a dark LED does not mean it is off. Look at it through a phone camera (many front cameras block IR) to check.",
    "A microcontroller pin can safely supply only about 20 mA. For a longer range, drive the IR LED through a small transistor such as a 2N2222.",
    "Polarity matters: long leg to the resistor/signal, short leg to ground. Do not confuse it with an IR receiver sensor, which has a different job.",
  ],
  photoHint: "led-ir-940",
  wokwi: { tag: "wokwi-led", attrs: { color: "gray", label: "IR" } },
  pins: LED_PINS,
};

/* ------------------------------ resistors ------------------------------ */

type ResistorSpec = {
  slug: string;
  name: string;
  /** Short label used in text, e.g. "330 Ω". */
  label: string;
  wokwiValue: string;
  bands4: string;
  bands5: string;
  lookalikes: string;
  description: string;
  detail: string;
  watchOuts: string[];
};

function resistor(spec: ResistorSpec): CatalogPart {
  return {
    id: `passive.resistor.${spec.slug}`,
    name: `Resistor ${spec.name}`,
    kind: "passive",
    category: "Basic part",
    description: spec.description,
    photoCaption: `Through-hole ${spec.label} resistor: ${spec.bands4} bands, then a gold or brown tolerance band.`,
    identify: `Small axial resistor with coloured bands. ${spec.label} is ${spec.bands4} on a 4-band resistor (then a gold band for 5% tolerance), or ${spec.bands5} on a 5-band one. ${spec.lookalikes} If unsure, measure it with a multimeter on the ohms setting.`,
    variants: [
      {
        label: `${spec.label} (this guide)`,
        detail: spec.detail,
        matchesGuide: true,
      },
      {
        label: "1/4 W through-hole vs SMD",
        detail: "Buy 1/4 W (or 1/8 W) axial through-hole resistors for breadboards and soldering. Tiny SMD resistors are not meant for beginners.",
      },
    ],
    watchOuts: [
      "Resistors have no polarity, so orientation does not matter.",
      ...spec.watchOuts,
    ],
    photoHint: `resistor-${spec.slug}`,
    wokwi: { tag: "wokwi-resistor", attrs: { value: spec.wokwiValue } },
    pins: NO_POLARITY_PINS,
  };
}

const RESISTORS: CatalogPart[] = [
  resistor({
    slug: "100",
    name: "100Ω",
    label: "100 Ω",
    wokwiValue: "100",
    bands4: "brown, black, brown",
    bands5: "brown, black, black, black",
    lookalikes: "Lookalikes: 1 kΩ is brown-black-red (ten times more), 10 Ω is brown-black-black.",
    description:
      "A 100 Ω resistor limits how much electric current can flow (ohms, symbol Ω). It has no polarity: either leg can go either way. A low value like this lets a lot of current through. Typical uses are an LED current limiter on a 3.3 V pin (a red LED then gets about 10-15 mA), a small series resistor on a signal line to calm ringing, or a gate resistor for a MOSFET.",
    detail: "Low value for 3.3 V LED limiting, MOSFET gates and series damping.",
    watchOuts: [
      "On 5 V a red LED with only 100 Ω would take about 30 mA, which is over a pin's safe limit (about 20 mA). Use 220-330 Ω on 5 V.",
      "Do not confuse brown-black-brown (100 Ω) with brown-black-red (1 kΩ): in dim light the third band is easy to misread. Check with a multimeter.",
    ],
  }),
  resistor({
    slug: "330",
    name: "330Ω",
    label: "330 Ω",
    wokwiValue: "330",
    bands4: "orange, orange, brown",
    bands5: "orange, orange, black, black",
    lookalikes: "Lookalikes: 3.3 kΩ is orange-orange-red, 33 Ω is orange-orange-black.",
    description:
      "A 330 Ω resistor limits how much electric current can flow (ohms, symbol Ω). It has no polarity: either leg can go either way. It is one of the most common LED resistors on a 5 V supply: a red or green LED then gets about 9 mA, which is clearly visible and gentle on the pin. A blue or white LED on 5 V gets about 5 mA, a softer glow.",
    detail: "Common LED current limiter for a 5 V signal; slightly gentler than 220 Ω.",
    watchOuts: [
      "On a 3.3 V pin 330 Ω leaves a red LED fairly dim (about 4 mA). Use 100-150 Ω if you want it brighter.",
      "Orange-orange-brown (330 Ω) and orange-orange-red (3.3 kΩ) differ only by the third band: a 3.3 kΩ resistor would make an LED almost invisible.",
    ],
  }),
  resistor({
    slug: "470",
    name: "470Ω",
    label: "470 Ω",
    wokwiValue: "470",
    bands4: "yellow, violet, brown",
    bands5: "yellow, violet, black, black",
    lookalikes: "Lookalikes: 4.7 kΩ is yellow-violet-red, 47 kΩ is yellow-violet-orange.",
    description:
      "A 470 Ω resistor limits how much electric current can flow (ohms, symbol Ω). It has no polarity: either leg can go either way. Typical uses are a gentle LED limiter on 5 V (a red LED gets about 6 mA, a softer glow), or the base resistor for a small transistor such as a 2N2222 or 2N3904 switching a relay or buzzer from a 5 V pin (about 9 mA into the base).",
    detail: "Gentle LED limiting on 5 V and a base resistor for a small transistor.",
    watchOuts: [
      "Yellow-violet-brown (470 Ω), yellow-violet-red (4.7 kΩ) and yellow-violet-orange (47 kΩ) all look alike. A wrong one makes an LED dark or a transistor not switch on: measure when in doubt.",
      "On a 3.3 V pin the base current into a transistor would be only about 5 mA; that is fine for small loads, but check the transistor datasheet for bigger ones.",
    ],
  }),
  resistor({
    slug: "2k2",
    name: "2.2kΩ",
    label: "2.2 kΩ",
    wokwiValue: "2200",
    bands4: "red, red, red",
    bands5: "red, red, black, brown",
    lookalikes: "Lookalikes: 220 Ω is red-red-brown (ten times less), 22 kΩ is red-red-orange.",
    description:
      "A 2.2 kΩ (2200 ohm) resistor. It has no polarity. Typical uses are a pull-up resistor on an I2C line (SDA or SCL to 3.3 V or 5 V; 2.2 kΩ to 4.7 kΩ is the usual range), the base resistor for a small transistor driving a light load, or a voltage divider part. As an LED resistor it is too large: the LED would glow very faintly.",
    detail: "I2C pull-ups and base resistor for light loads.",
    watchOuts: [
      "Red-red-red is 2.2 kΩ but red-red-brown is 220 Ω, ten times smaller. Using 2.2 kΩ with an LED makes it almost invisible.",
      "For I2C, use one pair of pull-ups for the whole bus. Most breakout boards already have them fitted, so adding more in parallel makes the resistance too low.",
    ],
  }),
  resistor({
    slug: "4k7",
    name: "4.7kΩ",
    label: "4.7 kΩ",
    wokwiValue: "4700",
    bands4: "yellow, violet, red",
    bands5: "yellow, violet, black, brown",
    lookalikes: "Lookalikes: 470 Ω is yellow-violet-brown, 47 kΩ is yellow-violet-orange.",
    description:
      "A 4.7 kΩ (4700 ohm) resistor. It has no polarity. It is the standard pull-up for an I2C bus (SDA and SCL each to 3.3 V or 5 V at the usual 100 kHz speed) and for the data line of a DS18B20 temperature sensor (between DATA and VCC). It can also be one half of a voltage divider.",
    detail: "Standard I2C and 1-Wire pull-up value.",
    watchOuts: [
      "Check the third band: red means 4.7 kΩ, brown means 470 Ω and orange means 47 kΩ. They look nearly the same.",
      "A pull-up goes to the same voltage as the logic of the bus (3.3 V for a 3.3 V board). Do not pull a 3.3 V bus up to 5 V.",
    ],
  }),
  resistor({
    slug: "47k",
    name: "47kΩ",
    label: "47 kΩ",
    wokwiValue: "47000",
    bands4: "yellow, violet, orange",
    bands5: "yellow, violet, black, red",
    lookalikes: "Lookalikes: 4.7 kΩ is yellow-violet-red, 470 kΩ is yellow-violet-yellow.",
    description:
      "A 47 kΩ (47,000 ohm) resistor. It has no polarity. It passes only a small current, so it is used for weak pull-ups or pull-downs and in voltage dividers. For example, 100 kΩ on top and 47 kΩ at the bottom scales a 9 V battery down to about 2.9 V so a 3.3 V analog pin can measure it safely.",
    detail: "Weak pull-up/pull-down and voltage divider value.",
    watchOuts: [
      "A high value like this makes a poor LED or transistor-base resistor, because almost no current flows through it.",
      "In a voltage divider the output depends on both resistors, and the analog pin should not be connected to anything that draws current from it. Always double-check the maths before connecting a battery to a pin.",
    ],
  }),
  resistor({
    slug: "100k",
    name: "100kΩ",
    label: "100 kΩ",
    wokwiValue: "100000",
    bands4: "brown, black, yellow",
    bands5: "brown, black, black, orange",
    lookalikes: "Lookalikes: 10 kΩ is brown-black-orange, 1 MΩ is brown-black-green.",
    description:
      "A 100 kΩ (100,000 ohm) resistor. It has no polarity. It is used where almost no current should flow: very weak pull-ups or pull-downs, the top half of a voltage divider, and timing circuits with a capacitor (100 kΩ with 100 nF has a time constant of about 10 ms). Pull a floating MOSFET gate or input to a safe state with it.",
    detail: "High value for dividers, timing and very weak pull-ups.",
    watchOuts: [
      "Brown-black-yellow (100 kΩ) looks very similar to brown-black-orange (10 kΩ). The 10 kΩ is the usual pull-up: check the third band or measure.",
      "At this value, dirt, moisture and a loose breadboard clip change the result noticeably, so readings can drift.",
    ],
  }),
  resistor({
    slug: "1m",
    name: "1MΩ",
    label: "1 MΩ",
    wokwiValue: "1000000",
    bands4: "brown, black, green",
    bands5: "brown, black, black, yellow",
    lookalikes: "Lookalikes: 100 kΩ is brown-black-yellow, 10 MΩ is brown-black-blue.",
    description:
      "A 1 MΩ (1,000,000 ohm, 'one megohm') resistor. It has no polarity. It lets only a tiny current through, so it is used for very high-impedance jobs: touch or proximity sensing, voltage dividers that must not drain a battery, and slow timing circuits with a capacitor (1 MΩ with 1 µF has a time constant of about 1 second).",
    detail: "Very high value for touch sensing, battery-friendly dividers and slow timing.",
    watchOuts: [
      "A measurement on a multimeter in the circuit is unreliable at this value because other parts and your fingers add parallel paths. Take the resistor out to measure it.",
      "At 1 MΩ even moisture or flux residue on the board can change behaviour. Keep it clean and dry.",
      "Do not use it as an LED or transistor-base resistor: far too little current would flow.",
    ],
  }),
];

/* ------------------------------ capacitors ------------------------------ */

const CERAMIC_100NF: CatalogPart = {
  id: "passive.capacitor.ceramic.100nf",
  name: "Ceramic Capacitor 100nF (104)",
  kind: "passive",
  category: "Basic part",
  description:
    "A 100 nF (0.1 µF) ceramic capacitor, marked 104. A capacitor stores a tiny bit of charge and smooths out quick dips and spikes in the power line. This one has no polarity: either leg can go either way. Its classic job is decoupling: place it right next to the power pins of a chip or module (between VCC and GND, as close as possible) so the chip gets a steady supply. It is also used to debounce a button and in simple filters and timers.",
  photoCaption:
    "Ceramic disc capacitor marked 104 (= 100 nF). It has no polarity and two thin legs; the typical voltage rating is 50 V.",
  identify:
    "A small tan, yellow, orange or blue blob (disc or block shape) about 5 mm across, with two thin legs and a number printed on it. The 3 digits are read like a resistor: 104 = 10 followed by 4 zeros in picofarads = 100,000 pF = 100 nF = 0.1 µF. Lookalikes: 103 = 10 nF, 105 = 1 µF, 102 = 1 nF, 224 = 220 nF. A voltage may be printed beside it (for example 50 V). Electrolytic capacitors are the tall cans with a stripe, not this part.",
  variants: [
    {
      label: "100 nF ceramic disc/multilayer (this guide)",
      detail: "Standard decoupling value. Disc types are tan; multilayer (MLCC) types are small rectangles, often yellow or blue. Both work the same.",
      matchesGuide: true,
    },
    {
      label: "Other ceramic values (10 nF, 1 µF...)",
      detail: "Look the same but are different values. Read the printed 3-digit code, not the shape.",
    },
    {
      label: "SMD ceramic (0603 and similar)",
      detail: "Tiny surface-mount versions on boards. Not for breadboards or beginner soldering.",
    },
  ],
  watchOuts: [
    "Ceramic capacitors have no polarity, so either leg can go to either side.",
    "Read the code: 104 is 100 nF, but 103 is 10 nF and 105 is 1 µF. They look identical.",
    "For decoupling the capacitor must sit close to the chip's power pins with short legs; across the breadboard it does much less.",
    "Check the voltage rating printed on it. 50 V is typical; never use one below your supply voltage.",
  ],
  photoHint: "capacitor-ceramic-100nf",
  pins: NO_POLARITY_PINS,
};

type ElectrolyticSpec = {
  slug: string;
  label: string;
  value: string;
  description: string;
  identify: string;
  detail: string;
  voltsTypical: string;
  watchOuts: string[];
};

// Pin ids stay "1" and "2": the schematic draws every passive.capacitor.* with the fixed
// capacitor symbol, which is keyed by those ids. The labels carry the polarity.
const ELECTROLYTIC_PINS: CatalogPin[] = [
  { id: "1", label: "1 (+, long leg)", kinds: ["power", "analog", "digital"] },
  { id: "2", label: "2 (-, stripe side)", kinds: ["ground"] },
];

function electrolytic(spec: ElectrolyticSpec): CatalogPart {
  const common: PartVariantNote[] = [
    {
      label: "Radial electrolytic (this guide)",
      detail: spec.detail,
      matchesGuide: true,
    },
    {
      label: "Other voltage ratings",
      detail: "The same value is sold at 6.3 V, 10 V, 16 V, 25 V, 35 V and higher. Higher is fine; lower than your supply is not.",
    },
  ];
  return {
    id: `passive.capacitor.electrolytic.${spec.slug}`,
    name: `Electrolytic Capacitor ${spec.label}`,
    kind: "passive",
    category: "Basic part",
    description: spec.description,
    photoCaption: `Radial electrolytic capacitor ${spec.label}. The long leg is + and the stripe with minus signs marks the negative leg. ${spec.voltsTypical}`,
    identify: spec.identify,
    variants: common,
    watchOuts: [
      "Polarity matters. Long leg (+) toward the higher voltage, the leg beside the stripe with minus signs (-) toward ground. Backwards, it can get hot, bulge, leak or pop.",
      "The voltage rating printed on the can (for example 16 V) must be well above your supply: use at least 1.5 times the voltage, so a 5 V rail is fine with 10 V or more.",
      ...spec.watchOuts,
    ],
    photoHint: `capacitor-electrolytic-${spec.slug}`,
    pins: ELECTROLYTIC_PINS,
  };
}

const ELECTROLYTICS: CatalogPart[] = [
  electrolytic({
    slug: "10uf",
    label: "10µF",
    value: "10 µF",
    description:
      "A 10 µF electrolytic capacitor: a small can that stores a little charge to smooth the power line. It is polarised: the longer leg is + and the leg beside the stripe with minus signs is -. Typical uses are smoothing the input and output of a small regulator, reducing noise next to a sensor, and the reset-capacitor on some boards. Its capacitance is low enough to charge quickly, so it is the gentle general-purpose value.",
    identify:
      "A small can about 5 mm wide and 7-11 mm tall with two legs of different length, printed with its value (10 µF or 10 uF) and a voltage such as 16 V or 25 V. The stripe on the side, with minus signs, is the negative leg. Lookalikes: 100 µF and 1000 µF cans look the same but are bigger; ceramic capacitors are small discs or blocks and are not polarised.",
    detail: "10 µF is a general smoothing value; choose a voltage rating at least 1.5 times your supply.",
    voltsTypical: "Typical rating 16-25 V.",
    watchOuts: [
      "10 µF is too small for a motor or servo power rail; use 100 µF or more there.",
      "Do not mix up the µF value with the voltage: a 10 µF 25 V can is not a 25 µF capacitor.",
    ],
  }),
  electrolytic({
    slug: "100uf",
    label: "100µF",
    value: "100 µF",
    description:
      "A 100 µF electrolytic capacitor: a can that stores charge to smooth the power line. It is polarised: the longer leg is + and the leg beside the stripe with minus signs is -. Typical uses are smoothing a 5 V rail near servos, relays or a Wi-Fi board (which draws short bursts of current), and the output of a power regulator. Place it close to the thing that draws the burst.",
    identify:
      "A can about 6 mm wide and 12 mm tall with two legs of different length, printed 100 µF (or 100 uF) and a voltage such as 16 V, 25 V or 35 V. The stripe with minus signs marks the negative leg. Lookalikes: 10 µF and 1000 µF cans look similar; compare the printed value.",
    detail: "100 µF is the common power-rail smoothing value; pick a voltage rating at least 1.5 times your supply.",
    voltsTypical: "Typical rating 16-35 V.",
    watchOuts: [
      "Connecting it across a live supply can cause a small spark and a brief current surge as it charges. That is normal, but it can reset a weak supply or board.",
      "Keep its legs short and place it near the chip or motor that needs the extra current, not at the far end of the breadboard.",
    ],
  }),
  electrolytic({
    slug: "1000uf",
    label: "1000µF",
    value: "1000 µF",
    description:
      "A 1000 µF electrolytic capacitor: a large can that stores a good amount of charge to smooth the power line. It is polarised: the longer leg is + and the leg beside the stripe with minus signs is -. Typical uses are across the power input of an addressable LED strip or ring, next to a motor driver or a servo bank, and on a power supply output. It soaks up sudden current demands and keeps the voltage steady.",
    identify:
      "A tall can about 8-10 mm wide and 12-20 mm tall (bigger than the 100 µF one) with two legs, printed 1000 µF (or 1000 uF) and a voltage such as 6.3 V, 10 V, 16 V or 25 V. The stripe with minus signs marks the negative leg. Lookalikes: 100 µF and 470 µF cans look similar but are smaller; always read the printed value.",
    detail: "1000 µF is a large reservoir for LED strips and motors; choose a voltage rating at least 1.5 times your supply.",
    voltsTypical: "Typical rating 10-25 V.",
    watchOuts: [
      "A large capacitor draws a big surge of current the moment it is connected to power, and it can hold a charge for a while afterward. Do not short its legs together with a screwdriver or wire: it can spark and weld a metal tool.",
      "It is physically tall: check that it fits your enclosure, and lay it flat or secure it if the legs are thin.",
    ],
  }),
];

/* ------------------------------ diodes ------------------------------ */

type DiodeSpec = {
  slug: string;
  name: string;
  label: string;
  description: string;
  caption: string;
  identify: string;
  detail: string;
  variants: PartVariantNote[];
  watchOuts: string[];
};

function diode(spec: DiodeSpec): CatalogPart {
  return {
    id: `passive.diode.${spec.slug}`,
    name: spec.name,
    kind: "passive",
    category: "Basic part",
    description: spec.description,
    photoCaption: spec.caption,
    identify: spec.identify,
    variants: [{ label: `${spec.label} (this guide)`, detail: spec.detail, matchesGuide: true }, ...spec.variants],
    watchOuts: spec.watchOuts,
    photoHint: `diode-${spec.slug.replace(/^zener\./, "zener-").replace(/\./g, "-")}`,
    pins: DIODE_PINS,
  };
}

const DIODES: CatalogPart[] = [
  diode({
    slug: "1n4007",
    name: "Diode 1N4007 (rectifier)",
    label: "1N4007",
    description:
      "A 1N4007 is a general-purpose rectifier diode: a one-way valve for electric current. Current flows from the anode (A) to the cathode (C, the end with the silver band) but not backwards. It drops about 0.7-1 V while conducting and handles about 1 A and up to 1000 V in reverse. Typical uses are reverse-polarity protection in series with a power input, a flyback diode across a relay coil or motor (band toward the + side), and a simple mains-free rectifier from an AC adapter. It is too slow for high-frequency work.",
    caption: "1N4007 diode: black body with a silver band on the cathode (C) end. Current flows from the plain end to the band.",
    identify:
      "A small black cylinder about 5 mm wide and 9 mm long with a wire leg on each end and a silver or white band near one end, usually printed 1N4007. The band marks the cathode (C). Lookalikes: 1N4001-1N4006 look identical but have a lower reverse voltage rating; a 1N5819 Schottky has the same shape; the small glass 1N4148 is a different, smaller part.",
    detail: "1 A, 1000 V reverse. Drops about 0.7-1 V when conducting. Fine for 5-12 V power protection and relay flyback.",
    variants: [
      {
        label: "1N4001-1N4006",
        detail: "Same size, same pinout, same 1 A, but a lower reverse voltage (50-800 V). Fine for low-voltage hobby circuits.",
      },
      {
        label: "1N5819 Schottky",
        detail: "Same body but drops only about 0.3-0.45 V and is faster. A better choice where voltage loss matters.",
      },
    ],
    watchOuts: [
      "Polarity: current flows from the plain end (anode) to the band (cathode). The band side points toward the + supply for a flyback diode across a relay or motor coil.",
      "The diode wastes about 0.7-1 V when used in series for reverse-polarity protection, so a 5 V supply drops to about 4.1-4.3 V. A Schottky diode loses less.",
      "Do not use it as a flyback diode for fast switching or very small signals; use a 1N4148 or Schottky there. For ordinary relays and small motors it is fine.",
    ],
  }),
  diode({
    slug: "1n4148",
    name: "Diode 1N4148 (small signal)",
    label: "1N4148",
    description:
      "A 1N4148 is a small, fast signal diode: a one-way valve for small currents. Current flows from the anode (A) to the cathode (C, the end with the black band) but not backwards. It switches in a few nanoseconds, drops about 0.6-0.7 V, and handles roughly 100-300 mA, so it is right for signals, logic and clamping, not for power. It can also protect a very small relay coil as a flyback diode.",
    caption: "1N4148 diode: small orange glass body with a black band on the cathode (C) end. Current flows from the plain end to the band.",
    identify:
      "A tiny glass cylinder about 3-4 mm long (orange-brown, sometimes clear), with a wire leg on each end and a black band near one end. The band marks the cathode (C). The glass body is fragile. Lookalikes: other small signal diodes such as 1N4448, and glass Zener diodes with different markings.",
    detail: "Fast, small-current diode for signals and logic. Handles roughly 100-300 mA; check the datasheet.",
    variants: [
      {
        label: "1N4448",
        detail: "Very similar fast diode with a slightly higher current rating. Same wiring.",
      },
      {
        label: "1N4007 rectifier",
        detail: "Bigger black body, 1 A. Use that one for power and relay coils.",
      },
    ],
    watchOuts: [
      "Polarity: current flows from the plain end (anode) to the band end (cathode). Backwards, it blocks.",
      "It is a signal part: do not use it for motors or power rails, where current above a few hundred milliamps would burn it out.",
      "The glass body breaks if you bend the leg close to it. Hold the leg with pliers when bending, or bend at least 2 mm away from the body.",
    ],
  }),
  diode({
    slug: "1n5819",
    name: "Schottky Diode 1N5819",
    label: "1N5819",
    description:
      "A 1N5819 is a Schottky diode: a very fast one-way valve with a low voltage drop. Current flows from the anode (A) to the cathode (C, the end with the silver band) but not backwards. It drops only about 0.3-0.45 V (a normal rectifier drops 0.7-1 V), handles about 1 A, and blocks up to 40 V in reverse. Typical uses are reverse-polarity protection that wastes little voltage, a fast flyback diode, joining two supplies (for example battery and USB) so one cannot feed the other, and the diode in boost and buck converters.",
    caption: "1N5819 Schottky diode: black body with a silver band on the cathode (C) end. Current flows from the plain end to the band.",
    identify:
      "A black cylinder about 5 mm wide and 9 mm long with a wire leg on each end and a silver band near one end, printed 1N5819. The band marks the cathode (C). It looks exactly like a 1N4007, so read the print on the body. Lookalikes: 1N5817/1N5818 are the same part with lower voltage ratings; 1N4007 is not a Schottky.",
    detail: "1 A, 40 V reverse, drop about 0.3-0.45 V. A good low-loss protection and power-path diode.",
    variants: [
      {
        label: "1N5817 / 1N5818",
        detail: "Same family with lower reverse voltage (20 V / 30 V). Same wiring.",
      },
      {
        label: "SS14 (SMD)",
        detail: "A surface-mount equivalent seen on boards. Not for breadboards.",
      },
    ],
    watchOuts: [
      "Polarity: current flows from the plain end (anode) to the band (cathode).",
      "The reverse voltage rating is only 40 V, and it leaks a little when blocking. Do not use it on high-voltage supplies.",
      "It looks identical to a 1N4007: mixing bags of them is a classic mistake. Read the printed number.",
    ],
  }),
  diode({
    slug: "zener.5v1",
    name: "Zener Diode 5.1V",
    label: "5.1 V Zener",
    description:
      "A 5.1 V Zener diode is a diode designed to be used backwards. Wired normally (anode to cathode) it conducts like a regular diode, but in the reverse direction it blocks until the voltage reaches about 5.1 V, then it conducts and holds the voltage near 5.1 V. That makes it a simple clamp or crude voltage reference. Wire it with the band (cathode, C) toward the higher voltage and the anode (A) to ground, with a series resistor limiting the current. Use it to protect an input from voltage spikes above 5.1 V.",
    caption: "5.1 V Zener diode: black body with a band on the cathode (C) end. In a clamp circuit the band side goes to the higher voltage.",
    identify:
      "A small cylinder (glass or black plastic) with a band at one end and a printed code such as 5V1, BZX55C5V1 or 1N4733A. The band marks the cathode (C). It looks like a signal or rectifier diode, so read the code carefully: a normal diode in the same position will not clamp at 5.1 V. Power ratings are typically 0.5 W (small glass) or 1 W (larger black).",
    detail: "Clamps at about 5.1 V. Typical 0.5 W or 1 W. Always use a series resistor and keep current within the datasheet limit.",
    variants: [
      {
        label: "0.5 W (BZX55C5V1) or 1 W (1N4733A)",
        detail: "Both clamp at about 5.1 V. The 1 W part handles roughly twice the current. Same wiring.",
      },
      {
        label: "3.3 V Zener",
        detail: "Used for clamping inputs of 3.3 V boards. Look the same; check the printed code.",
      },
    ],
    watchOuts: [
      "Always add a series resistor: a Zener with no resistor is a short circuit once it conducts, and it burns out.",
      "Orientation: the band (cathode) goes toward the higher voltage. Reversed, it behaves like a normal diode and clamps at about 0.7 V.",
      "A 5.1 V Zener is for 5 V circuits. It does not protect a 3.3 V pin (it would let 5.1 V through); use a 3.3 V Zener or a resistor divider there.",
      "Keep the current within the power rating: a 0.5 W part at 5.1 V can handle roughly 100 mA, and much less is better.",
    ],
  }),
];

/* ------------------------------ transistors ------------------------------ */

type BjtSpec = {
  slug: string;
  name: string;
  label: string;
  description: string;
  caption: string;
  identify: string;
  detail: string;
  variants: PartVariantNote[];
  watchOuts: string[];
};

function bjt(spec: BjtSpec): CatalogPart {
  return {
    id: `passive.transistor.${spec.slug}`,
    name: spec.name,
    kind: "passive",
    category: "Basic part",
    description: spec.description,
    photoCaption: spec.caption,
    identify: spec.identify,
    variants: [{ label: `${spec.label} (this guide)`, detail: spec.detail, matchesGuide: true }, ...spec.variants],
    watchOuts: spec.watchOuts,
    photoHint: `transistor-${spec.slug}`,
    pins: BJT_PINS,
  };
}

const TO92_CAVEAT =
  "The pin order of TO-92 transistors is NOT the same between brands: with the flat face toward you and the legs pointing down, one maker's part may read E-B-C and another's C-B-E. Always check the datasheet of the exact marking on your part before wiring it.";

const BJTS: CatalogPart[] = [
  bjt({
    slug: "2n2222",
    name: "NPN Transistor 2N2222 / PN2222",
    label: "2N2222 / PN2222",
    description:
      "A 2N2222 (or its plastic cousin PN2222) is a small NPN transistor, used as an electronic switch. A tiny current into the base (B), through a resistor of about 1 kΩ from a microcontroller pin, lets a much bigger current flow from the collector (C) to the emitter (E). Wire the load between the supply + and the collector, and the emitter to ground. It can switch roughly 600 mA to 1 A depending on the maker (check the datasheet), enough for a small relay, buzzer or a few LEDs. For a motor, relay or solenoid add a flyback diode (1N4007) across the coil.",
    caption: "PN2222 NPN transistor in a TO-92 plastic case: flat face with the printing, three legs. Check the datasheet for which leg is which.",
    identify:
      "A small black plastic half-cylinder (TO-92) with the printing on the flat face and three legs, marked PN2222, P2N2222, PN2222A or 2N2222. There is also a metal-can version (2N2222 in a TO-18 can with a small tab next to the emitter). Lookalikes: 2N3904, BC547 and many other TO-92 parts look the same; read the print on the flat face.",
    detail: "Switches roughly 600 mA to 1 A at up to about 40 V, depending on the maker. Current gain around 100-300.",
    variants: [
      {
        label: "Metal can 2N2222 (TO-18)",
        detail: "Round metal body with a tab beside the emitter. Same function, different pin layout and a higher rating. Check the datasheet.",
      },
      {
        label: "2N3904 / BC547",
        detail: "Similar small NPN transistors with lower current limits (about 100-200 mA).",
      },
    ],
    watchOuts: [
      TO92_CAVEAT,
      "Use a base resistor (about 1 kΩ from a 5 V pin; around 470 Ω-1 kΩ from 3.3 V). Without it the base takes too much current and can damage the transistor or the pin.",
      "The transistor and the microcontroller must share a ground: connect the emitter to the same GND as the board.",
      "Do not exceed the current rating. A motor's start-up surge is much higher than its running current: use a bigger transistor or a MOSFET.",
    ],
  }),
  bjt({
    slug: "2n3904",
    name: "NPN Transistor 2N3904",
    label: "2N3904",
    description:
      "A 2N3904 is a very common small NPN transistor, used as an electronic switch or amplifier. A tiny current into the base (B), through a resistor of about 1 kΩ from a microcontroller pin, lets a bigger current flow from the collector (C) to the emitter (E). Wire the load between the supply + and the collector, and the emitter to ground. It switches up to about 200 mA at up to 40 V, enough for an LED group, a small buzzer or a small relay. It is not meant for bigger motors; use a TIP120 or MOSFET there.",
    caption: "2N3904 NPN transistor in a TO-92 plastic case: flat face with the printing, three legs. Check the datasheet for which leg is which.",
    identify:
      "A small black plastic half-cylinder (TO-92) with 2N3904 printed on the flat face and three legs. Lookalikes: PN2222, BC547 and 2N2222 look the same; its complementary part 2N3906 is a PNP type and reads almost the same, so check the digit carefully.",
    detail: "Switches up to about 200 mA at 40 V. Current gain around 100-300.",
    variants: [
      {
        label: "2N3906 (PNP)",
        detail: "Looks the same but is the opposite polarity (PNP). Not the same wiring: do not swap it for a 2N3904.",
      },
      {
        label: "PN2222 / BC547",
        detail: "Similar small NPN transistors; the PN2222 handles more current (about 600 mA+).",
      },
    ],
    watchOuts: [
      TO92_CAVEAT,
      "Use a base resistor (about 1 kΩ from a 5 V pin). Without it the base takes too much current.",
      "200 mA is the limit: many small 5 V relay coils draw 70-100 mA, which is fine, but a motor or a long LED strip is too much.",
      "2N3904 (NPN) and 2N3906 (PNP) differ by one digit and look identical. Check the print.",
    ],
  }),
  bjt({
    slug: "bc547",
    name: "NPN Transistor BC547",
    label: "BC547",
    description:
      "A BC547 is a small, widely used NPN transistor, used as an electronic switch or amplifier. A tiny current into the base (B), through a resistor of about 1 kΩ from a microcontroller pin, lets a bigger current flow from the collector (C) to the emitter (E). Wire the load between the supply + and the collector, and the emitter to ground. It switches up to about 100 mA at up to 45 V, so it suits LEDs, small buzzers and signal switching. Variants end in a letter (BC547A, B, C) that tells the current gain: C is the most sensitive.",
    caption: "BC547 NPN transistor in a TO-92 plastic case: flat face with the printing, three legs. Check the datasheet for which leg is which.",
    identify:
      "A small black plastic half-cylinder (TO-92) with BC547 (and sometimes a letter A, B or C) printed on the flat face and three legs. Lookalikes: BC548 and BC549 are nearly identical with different voltage ratings; BC557 is the PNP counterpart; 2N3904 and PN2222 look the same but have different pin orders.",
    detail: "Switches up to about 100 mA at 45 V. The A/B/C letter gives low/medium/high current gain.",
    variants: [
      {
        label: "BC548 / BC549",
        detail: "Similar NPN types with slightly different voltage ratings. Same wiring in most datasheets.",
      },
      {
        label: "BC557 (PNP)",
        detail: "The opposite polarity (PNP). Looks the same: check the print.",
      },
    ],
    watchOuts: [
      TO92_CAVEAT,
      "BC547 is commonly listed as C-B-E (collector, base, emitter) with the flat face toward you, but the 2N3904 on the next shelf is usually E-B-C. Do not assume: read the datasheet.",
      "Use a base resistor of about 1 kΩ from a 5 V pin. Keep the load under about 100 mA; use a 2N2222 or a MOSFET for more.",
    ],
  }),
  {
    id: "passive.transistor.tip120",
    name: "Power NPN Transistor TIP120 (Darlington)",
    kind: "passive",
    category: "Basic part",
    description:
      "A TIP120 is a power NPN Darlington transistor in a TO-220 case. It is two transistors in one, so a very small base (B) current from a microcontroller pin, through a resistor of about 1 kΩ, can switch several amps from the collector (C) to the emitter (E). Wire the load between the supply + and the collector, and the emitter to ground. It handles about 5 A and up to 60 V, which suits DC motors, solenoids and LED strips. The cost is a voltage drop of about 1-2 V across it, which turns into heat: above roughly 1 A fit a heatsink. The metal tab is the collector.",
    photoCaption: "TIP120 power transistor in a TO-220 case. The metal tab with the hole is the collector; check the datasheet for the leg order.",
    identify:
      "A black plastic block about 10 mm wide with a metal tab and a mounting hole on top, three legs underneath, and TIP120 printed on the front. Lookalikes: TIP122 and TIP125 look the same (TIP125 is PNP); an IRLZ44N MOSFET and a 7805 regulator share the same TO-220 shape, so read the print.",
    variants: [
      {
        label: "TIP120 NPN Darlington (this guide)",
        detail: "About 5 A, 60 V. Switches loads on the ground side. Needs about 2.5 V at the base, so it works from a 5 V pin but poorly from 3.3 V.",
        matchesGuide: true,
      },
      {
        label: "TIP122",
        detail: "Same part with a higher voltage rating (100 V). Same wiring.",
      },
      {
        label: "TIP125 (PNP)",
        detail: "Opposite polarity. Not interchangeable with the TIP120.",
      },
    ],
    watchOuts: [
      "Looking at the front (printed side) with the legs pointing down, the usual order is B, C, E from left to right. This can differ between makers: check the datasheet of your exact part before wiring.",
      "The metal tab is connected to the collector. Do not let it touch other metal, a grounded heatsink without an insulating pad, or a wire.",
      "It needs about 2.5 V at the base to turn on fully, so a 3.3 V pin may not switch it properly. Use a logic-level MOSFET such as the IRLZ44N for a 3.3 V board.",
      "A motor or solenoid needs a flyback diode (such as a 1N4007) across it. The TIP120 has internal diodes, but an external one is still the safe practice.",
      "It gets hot when carrying more than about 1 A, because of the 1-2 V drop. Fit a heatsink and do not touch it just after use.",
    ],
    photoHint: "transistor-tip120",
    pins: BJT_PINS,
  },
];

const MOSFETS: CatalogPart[] = [
  {
    id: "passive.mosfet.irlz44n",
    name: "Logic-Level N-MOSFET IRLZ44N",
    kind: "passive",
    category: "Basic part",
    description:
      "An IRLZ44N is a logic-level N-channel power MOSFET in a TO-220 case. It is an electronic switch controlled by voltage rather than current: about 5 V on the gate (G) turns it fully on, letting current flow from the drain (D) to the source (S) with very little loss. Wire the load between the supply + and the drain, and the source to ground (a low-side switch). It handles up to 55 V and a few amps without a heatsink (the datasheet lists far more with one), which suits motors, LED strips and solenoids. The metal tab is the drain.",
    photoCaption: "IRLZ44N logic-level MOSFET in a TO-220 case. The metal tab with the hole is the drain; check the datasheet for the leg order.",
    identify:
      "A black plastic block about 10 mm wide with a metal tab and a mounting hole on top, three legs underneath, and IRLZ44N printed on the front (maybe with a brand logo). The 'L' matters: IRFZ44N has the same shape but needs about 10 V on the gate. Lookalikes: TIP120 and a 7805 regulator share the TO-220 shape.",
    variants: [
      {
        label: "IRLZ44N logic-level (this guide)",
        detail: "Fully on at 5 V on the gate, and usable from many 3.3 V pins at moderate current. Check the datasheet curve for 3.3 V.",
        matchesGuide: true,
      },
      {
        label: "IRFZ44N (not logic-level)",
        detail: "Same shape, but needs about 10 V on the gate to switch fully. A 3.3 V or 5 V pin will not drive it properly.",
      },
      {
        label: "IRL540N / IRLB8721",
        detail: "Other logic-level MOSFETs in the same case. Pinout is usually G-D-S: check the datasheet.",
      },
    ],
    watchOuts: [
      "Looking at the front (printed side) with the legs pointing down, the usual order is G, D, S from left to right. This can differ between makers: check the datasheet of your exact part before wiring.",
      "The metal tab is connected to the drain (the load side). Keep it from touching other metal, and use an insulating pad if you bolt it to a shared heatsink.",
      "Put a 100-220 Ω resistor in series with the gate and a 10 kΩ pull-down from gate to source, so the MOSFET stays off while the board is starting up.",
      "Connect the source to the same ground as the microcontroller. Without a common ground the MOSFET will not switch reliably.",
      "Do not mix it up with the IRFZ44N (no L): that one is not logic-level. On 3.3 V boards the IRLZ44N is usable but check the datasheet for 3.3 V: it may not reach the lowest resistance.",
    ],
    photoHint: "mosfet-irlz44n",
    pins: MOSFET_PINS,
  },
  {
    id: "passive.mosfet.irf520_module",
    name: "IRF520 MOSFET Driver Module",
    kind: "passive",
    category: "Output",
    description:
      "An IRF520 MOSFET driver module is a small red or green board with an IRF520 power MOSFET, a screw terminal for the load supply and a screw terminal for the load, and a 3-pin header for the controller (SIG, VCC, GND). Send a PWM or on/off signal to SIG, power VCC from 5 V, and it switches the load supply to the load on the ground side. Typical load supply is up to about 24 V. It switches DC motors, LED strips and pumps, and PWM on SIG dims or slows them. The IRF520 chip is not a logic-level MOSFET, so with a 5 V gate it only partly turns on: expect heating above about 1 A.",
    photoCaption: "IRF520 MOSFET driver module: screw terminals for the load supply and load, the MOSFET in the middle, and SIG / VCC / GND pins on the edge.",
    identify:
      "A small red or green board about 3 x 3.5 cm with two blue screw terminals, a TO-220 MOSFET with a heatsink tab in the middle, an LED, and a 3-pin header labelled SIG, VCC and GND (sometimes just numbers or symbols). The terminal labels vary between sellers: read the silkscreen on the board. Lookalikes: a relay module has a big blue relay box; a motor driver board (L298N) is larger with a big heatsink.",
    variants: [
      {
        label: "IRF520 driver module (this guide)",
        detail: "Typical load supply up to about 24 V and around 1-2 A; the exact limits depend on the seller, so check the listing. Some versions add a driver chip or an optocoupler.",
        matchesGuide: true,
      },
      {
        label: "Logic-level MOSFET module (IRLZ44N, IRLB8721...)",
        detail: "Boards with a logic-level MOSFET switch fully from a 3.3 V or 5 V signal and run cooler. Wired the same way.",
      },
    ],
    watchOuts: [
      "Terminal and pin labels differ between sellers (VIN+/VIN-, V+/V-, DC+/DC-...). Identify the supply input and the load output from the silkscreen before wiring. Do not guess.",
      "The IRF520 is not a logic-level MOSFET: on a 3.3 V board (ESP32, Raspberry Pi Pico) it may barely turn on, and on 5 V it runs warm. For 3.3 V boards use an IRLZ44N or a logic-level module.",
      "The board's ground (GND) and the load supply's negative must be connected together, or the control signal has no reference. Follow the seller's diagram.",
      "Never connect the load supply to the SIG/VCC header: those pins take only a 3.3-5 V logic voltage. Mixed-up voltages burn the board.",
    ],
    photoHint: "irf520-module",
    pins: [
      { id: "SIG", label: "SIG (control)", kinds: ["digital"] },
      { id: "VCC", label: "VCC (5V logic)", kinds: ["power"], voltage: "5v" },
      { id: "GND", label: "GND", kinds: ["ground"] },
      { id: "VIN+", label: "VIN+ (load supply +)", kinds: ["power"] },
      { id: "VIN-", label: "VIN- (load supply -)", kinds: ["ground"] },
      { id: "V+", label: "V+ (to load +)", kinds: ["power"] },
      { id: "V-", label: "V- (to load -, switched)", kinds: ["digital"] },
    ],
  },
];

/* ------------------------------ switches ------------------------------ */

const SWITCHES: CatalogPart[] = [
  {
    id: "passive.switch.toggle_spst",
    name: "Toggle Switch (SPST)",
    kind: "passive",
    category: "Input",
    description:
      "A toggle switch is a metal lever that you flick up or down. This simple SPST (single pole, single throw) type has two terminals and works like a gate in one wire: in the ON position the two terminals are joined, in OFF they are not. It has no polarity. Wire it in series with one wire, for example in the + wire from a battery to the board, to turn a project on and off. It is usually mounted in a hole in a box (panel mount) and held by a nut.",
    photoCaption: "Panel-mount toggle switch (SPST): a metal lever, a threaded bushing and two solder lugs. ON connects the two lugs.",
    identify:
      "A metal lever about 1-2 cm long on a threaded bushing with a nut, with two solder lugs (or screw terminals) on the back. Mini versions have PCB pins. A small rating is printed on the body (for example 6 A 125 V AC). Lookalikes: a three-lug toggle is SPDT (a changeover switch, ON-ON); a rocker switch has a rocking button; a slide switch is smaller with a slider.",
    variants: [
      {
        label: "SPST toggle, 2 terminals (this guide)",
        detail: "ON-OFF. Joins the two terminals in the ON position. Good for powering a project.",
        matchesGuide: true,
      },
      {
        label: "SPDT toggle, 3 terminals",
        detail: "Changeover (ON-ON), or ON-OFF-ON. It has an extra terminal. Using only the centre and one outer terminal makes it behave like an SPST.",
      },
      {
        label: "Mini PCB toggle",
        detail: "Smaller lever with straight pins for a breadboard or PCB. Same two-terminal idea, lower current rating.",
      },
    ],
    watchOuts: [
      "Check the rating printed on the switch. Hobby 5 V and 12 V circuits are far below it, but switches are not a substitute for a fuse and must not be used on mains wiring by beginners.",
      "Put the switch in the + wire (series), not across the supply: wiring it between + and - would short the battery when you flick it.",
      "A 3-terminal switch needs only two of the three lugs for a simple on/off. Identify the centre lug (common) and one outer lug with a multimeter in continuity mode.",
      "Solder joints on the lugs take wear when you flick the lever: use strain relief on the wires and tighten the mounting nut.",
    ],
    photoHint: "switch-toggle-spst",
    pins: SWITCH_PINS,
  },
  {
    id: "passive.switch.rocker",
    name: "Rocker Switch (ON/OFF)",
    kind: "passive",
    category: "Input",
    description:
      "A rocker switch is a button that rocks back and forth: press one side to turn ON (marked I), press the other side to turn OFF (marked O). The simple version has two terminals and works like a gate in one wire: ON joins the terminals, OFF separates them. It has no polarity. Wire it in series with one wire, for example the + wire from a battery or power adapter, so one press cuts power to the whole project. It snaps into a rectangular hole in a box (panel mount).",
    photoCaption: "Panel-mount rocker switch (ON/OFF): a rocking button marked I / O with two terminals underneath.",
    identify:
      "A black, red or green plastic block with a rocking button marked I and O (or a dot and a circle) that snaps into a rectangular hole. A common size is about 21 x 15 mm (check the listing for your cutout), with two metal blade terminals underneath. A rating is printed on the body (for example 6 A 250 V). Lookalikes: lit rocker switches have 3 or 4 terminals; a slide switch is smaller with a slider; a toggle switch has a lever.",
    variants: [
      {
        label: "2-terminal ON/OFF rocker (this guide)",
        detail: "Joins the two terminals when ON (I side pressed). Works with 5-24 V hobby circuits.",
        matchesGuide: true,
      },
      {
        label: "Lit rocker (3 or 4 terminals)",
        detail: "A small lamp or LED glows when ON. It has extra terminals for the lamp: use the datasheet or a continuity test to find the two switch terminals.",
      },
    ],
    watchOuts: [
      "Terminal positions vary: if the rocker has more than two terminals, use a multimeter in continuity mode to find the pair that joins when ON.",
      "These switches carry a mains rating (such as 250 V), but wiring mains power is dangerous and is not for beginners. Use them for low-voltage hobby circuits.",
      "Place the switch in the + wire (series), never across the supply: that would short it.",
      "Check the panel cutout size on the product listing before drilling or cutting the box. Sizes vary.",
    ],
    photoHint: "switch-rocker",
    pins: SWITCH_PINS,
  },
];

/* ------------------------------ connector ------------------------------ */

const DC_JACK: CatalogPart = {
  id: "passive.connector.dc_jack_5521",
  name: "DC Barrel Jack 5.5x2.1 mm",
  kind: "passive",
  category: "Power",
  description:
    "A DC barrel jack is the round socket that a 'wall adapter' plug fits into. This one takes the common 5.5 mm outer / 2.1 mm inner plug. It has an inner pin that touches the centre of the plug (usually +) and a metal sleeve that touches the outside of the plug (usually -). It is sold as a panel-mount jack (with wires or solder lugs) or as a PCB jack (with pins), often with a third switch contact. Wire the centre pin to the + of your project and the sleeve to ground, so a 9 V or 12 V adapter can power it. It does not change the voltage.",
  photoCaption: "DC barrel jack 5.5 x 2.1 mm: black housing with a round hole around a centre pin, and three pins underneath (centre, sleeve and switch).",
  identify:
    "A black plastic box with a round hole about 5.5 mm wide and a thin metal pin in the middle, with two or three legs or solder lugs behind. Panel-mount types have a threaded body and a nut. Compare with the plug: a 5.5 x 2.1 mm plug is common on 9 V and 12 V adapters. Lookalikes: 5.5 x 2.5 mm plugs fit loosely and lose contact; 3.5 x 1.35 mm plugs are smaller.",
  variants: [
    {
      label: "5.5 x 2.1 mm jack (this guide)",
      detail: "Fits the most common Arduino and 12 V adapter plugs. Centre pin is normally +.",
      matchesGuide: true,
    },
    {
      label: "5.5 x 2.5 mm jack",
      detail: "Slightly bigger pin. A 2.1 mm plug is loose in a 2.5 mm jack, and a 2.5 mm plug does not fit a 2.1 mm jack.",
    },
    {
      label: "PCB vs panel mount",
      detail: "Same function. PCB types have rigid pins for soldering onto a board; panel types have lugs or wires.",
    },
  ],
  watchOuts: [
    "Polarity: most adapters are centre-positive, shown by a small symbol with a dot on the + side. Check the label on the adapter, because a centre-negative adapter wired the normal way can destroy your board.",
    "Match the voltage: the jack passes through whatever the adapter gives. A 12 V adapter on a 5 V circuit will burn it, so put a regulator (7805 or buck module) after the jack.",
    "A 3-terminal jack has a switch contact that opens when a plug is inserted: use the two terminals for centre and sleeve unless you know you need the switch.",
    "Check the plug dimensions on the adapter (5.5 x 2.1 mm). A plug that is a loose fit gives flickering power.",
  ],
  photoHint: "dc-jack-5521",
  pins: [
    { id: "+", label: "+ (centre pin)", kinds: ["power"] },
    { id: "-", label: "- (sleeve)", kinds: ["ground"] },
  ],
};

/* ------------------------------ power modules ------------------------------ */

const REGULATOR_7805: CatalogPart = {
  id: "passive.regulator.7805",
  name: "Voltage Regulator 7805 (5V, TO-220)",
  kind: "passive",
  category: "Power",
  description:
    "A 7805 is a linear voltage regulator that turns a higher input voltage (about 7-25 V) into a steady 5 V output. It has three legs: IN, GND (middle) and OUT. Looking at the front (printed side) with the legs pointing down, the order is IN, GND, OUT from left to right. It can supply up to 1 A (1.5 A with a heatsink). Fit a 0.33 µF capacitor from IN to GND and a 0.1 µF capacitor from OUT to GND, close to the legs, as the datasheet suggests (check yours). It wastes the extra voltage as heat: (input volts - 5 V) x current.",
  photoCaption: "7805 voltage regulator in a TO-220 case. Front view, legs down: IN, GND, OUT left to right. The metal tab is connected to GND.",
  identify:
    "A black plastic block about 10 mm wide with a metal tab and a mounting hole on top, three legs underneath, and 7805 (or L7805, LM7805, MC7805) printed on the front. Lookalikes: 7806, 7809 and 7812 (6 V, 9 V and 12 V outputs) look identical, as do TIP120 and MOSFETs in a TO-220 case; read the print. The 78L05 is a smaller TO-92 version (100 mA).",
  variants: [
    {
      label: "7805 (this guide)",
      detail: "Fixed 5 V output, up to about 1 A, TO-220. Needs about 7 V or more at the input.",
      matchesGuide: true,
    },
    {
      label: "78L05 (TO-92)",
      detail: "Small plastic version, 100 mA only. Same function, different shape; pinout order differs, check the datasheet.",
    },
    {
      label: "LM1117-3.3 / AMS1117-3.3",
      detail: "Different part with a 3.3 V output. Do not swap it with the 7805.",
    },
  ],
  watchOuts: [
    "Looking at the printed front with the legs pointing down, the usual order is IN, GND, OUT (left to right). Check the datasheet for your maker if unsure, and never guess: reversed legs can destroy the regulator and what it feeds.",
    "The metal tab is connected to GND (the middle leg). Do not let it touch other metal or a heatsink that is not at ground level.",
    "It needs at least about 7 V at the input to produce 5 V. A 6 V battery pack is too low and a 4xAA pack (6 V) can sag below it.",
    "It runs hot when the input is much higher than 5 V: a 12 V input at 500 mA wastes about 3.5 W as heat, so fit a heatsink or use a buck converter (LM2596 module) instead.",
    "Do not exceed the input maximum: check the datasheet (about 25-35 V depending on the maker). A spike from a motor can kill it.",
  ],
  photoHint: "regulator-7805",
  pins: [
    { id: "IN", label: "IN (input)", kinds: ["power"] },
    { id: "GND", label: "GND", kinds: ["ground"] },
    { id: "OUT", label: "OUT (5V)", kinds: ["power"], voltage: "5v" },
  ],
};

const AMS1117_MODULE: CatalogPart = {
  id: "passive.regulator.ams1117_33",
  name: "AMS1117-3.3 Regulator Module",
  kind: "passive",
  category: "Power",
  description:
    "An AMS1117-3.3 module is a small circuit board that turns a 5 V (or 4.5-12 V) input into a steady 3.3 V output, for powering 3.3 V sensors and boards from a 5 V supply. It is a linear regulator, so the extra voltage is lost as heat. Connect the supply to VIN, ground to GND, and take 3.3 V from VOUT. It supplies up to about 800 mA to 1 A (less in practice, because of heat). Some boards add small capacitors for stability. The pins may be marked VIN, GND, VOUT or 5V, G, 3.3V.",
  photoCaption: "AMS1117-3.3 regulator module: a small board with the regulator chip, two capacitors and input / ground / output pins.",
  identify:
    "A small board, often green or blue, about 2 x 2.5 cm, with a flat black or tan chip (SOT-223 package, a wide tab on one side) marked 1117 or AMS1117 and 3.3 (or 33), two small capacitors, and pins marked VIN, GND and VOUT. Lookalikes: the same board with a 1117-5.0 chip outputs 5 V, and a 1117-ADJ is adjustable; check the marking on the chip.",
  variants: [
    {
      label: "AMS1117-3.3 module (this guide)",
      detail: "Fixed 3.3 V. Input roughly 4.5-12 V (some listings say up to 15 V; stay well below). About 800 mA at best, less when hot.",
      matchesGuide: true,
    },
    {
      label: "AMS1117-5.0 module",
      detail: "Looks the same, but 5 V output. Read the marking on the chip.",
    },
    {
      label: "Buck converter module (LM2596)",
      detail: "Switching type: wastes much less heat at large differences between input and output. A better choice for 12 V in.",
    },
  ],
  watchOuts: [
    "It gets hot when the input is much higher than 3.3 V: (input - 3.3 V) x current is wasted as heat. 5 V in at 500 mA is already about 0.85 W. Stay near 5 V or use a buck converter.",
    "Check the chip marking before powering your 3.3 V board: an AMS1117-5.0 module looks identical and would damage it.",
    "The input must be at least about 1.2-1.3 V above the output, so 4.5 V or more for 3.3 V out.",
    "Label order varies by maker (VIN GND VOUT, or 5V G 3.3V). Read the silkscreen on the board before wiring, and connect the grounds of all parts together.",
  ],
  photoHint: "ams1117-33",
  pins: [
    { id: "VIN", label: "VIN (input)", kinds: ["power"] },
    { id: "GND", label: "GND", kinds: ["ground"] },
    { id: "VOUT", label: "VOUT (3.3V)", kinds: ["power"], voltage: "3v3" },
  ],
};

const LM2596_MODULE: CatalogPart = {
  id: "passive.converter.lm2596_buck",
  name: "LM2596 Buck Converter Module",
  kind: "passive",
  category: "Power",
  description:
    "An LM2596 buck converter module is a small board that steps a higher DC voltage down to a lower one that you set with a trimmer (a tiny screw). It is far more efficient than a linear regulator: little heat even from a 12 V input. It has four connections: IN+ and IN- for the input, OUT+ and OUT- for the output. The input is typically about 4-35 V (check the seller's listing), the output is adjustable from about 1.25 V up to a little below the input (at least 1.5-2 V lower), and it supplies around 2-3 A (with a heatsink for the top end). Use it to power 5 V boards or 3.3 V parts from a battery pack or a 12 V adapter.",
  photoCaption: "LM2596 buck converter module: blue board with a ring inductor, two capacitors, a blue trimmer screw, and IN+ / IN- / OUT+ / OUT- pads on the corners.",
  identify:
    "A blue (or sometimes green) board about 4.5 x 2 cm with a large ring-shaped inductor, two silver capacitors, a black LM2596 chip, a blue box with a brass screw (the trimmer) and four pads in the corners labelled IN+, IN-, OUT+ and OUT-. Some versions add a display. Lookalikes: MT3608 is smaller and steps up; XL4015 and XL6009 modules look similar but have different ratings; read the chip and the listing.",
  variants: [
    {
      label: "LM2596 buck module, adjustable (this guide)",
      detail: "Steps down only. Output about 1.25 V to a little under the input. Setting the output is done with the trimmer and a multimeter.",
      matchesGuide: true,
    },
    {
      label: "Module with a voltmeter display",
      detail: "Same converter with a small display and sometimes buttons. Wired the same way.",
    },
    {
      label: "XL4015 / XL6009 modules",
      detail: "Look similar. XL4015 steps down with a higher current rating; XL6009 steps up. Different part: check the chip.",
    },
  ],
  watchOuts: [
    "Set the output voltage BEFORE you connect your board: power the module from the supply, put a multimeter on OUT+ and OUT-, turn the trimmer slowly until it reads what you want (5.0 V or 3.3 V), then switch off and connect the load. On most boards turning clockwise raises the voltage; verify with the meter.",
    "Polarity matters on both sides: IN+ to supply +, IN- to supply -. There is usually no reverse protection, and a reversed input can destroy the board.",
    "It only steps DOWN. The input must be higher than the output (by about 1.5-2 V at least), or the output simply follows the input minus a bit.",
    "Read the seller's input range before using it on a high-voltage supply: common modules are rated about 35-40 V. A noisy 24 V supply can spike higher.",
    "Output grounds and input grounds are joined on most boards (not isolated): connect all grounds together.",
  ],
  photoHint: "lm2596-module",
  pins: [
    { id: "IN+", label: "IN+ (input +)", kinds: ["power"] },
    { id: "IN-", label: "IN- (input -)", kinds: ["ground"] },
    { id: "OUT+", label: "OUT+ (adjustable)", kinds: ["power"] },
    { id: "OUT-", label: "OUT- (ground)", kinds: ["ground"] },
  ],
};

const MT3608_MODULE: CatalogPart = {
  id: "passive.converter.mt3608_boost",
  name: "MT3608 Boost Converter Module",
  kind: "passive",
  category: "Power",
  description:
    "An MT3608 boost converter module is a tiny board that steps a LOWER DC voltage UP to a higher one that you set with a trimmer (a tiny screw). It lets a 3.7 V LiPo or a pair of AA cells power a 5 V board, or turns 5 V into 9 V or 12 V. It has four connections: IN+ and IN- for the input, OUT+ and OUT- for the output. The input is typically about 2-24 V and the output up to about 28 V (check the listing). The output is always higher than the input, so it can never step down. It supplies a limited current (the rated 2 A is for small boosts; the more you boost, the less current you get).",
  photoCaption: "MT3608 boost converter module: a tiny blue board with an inductor, a blue trimmer screw, and IN+ / IN- / OUT+ / OUT- pads at the corners.",
  identify:
    "A very small blue board about 3.7 x 1.7 cm with a black square inductor (often marked 4R7), a small black chip, a blue trimmer with a brass screw, and four pads labelled VIN+, VIN-, VOUT+, VOUT- (or IN+/IN-/OUT+/OUT-). Lookalikes: LM2596 is larger and steps down; XL6009 is similar but bigger; read the listing.",
  variants: [
    {
      label: "MT3608 boost module (this guide)",
      detail: "Steps up only. Input about 2-24 V, output about 5-28 V (adjustable with the trimmer). Small current at big boosts.",
      matchesGuide: true,
    },
    {
      label: "MT3608 with micro-USB input",
      detail: "Same converter with a micro-USB socket on the input. Wired the same way for the output.",
    },
    {
      label: "XL6009 / LM2577 boost modules",
      detail: "Larger boost modules for higher currents. Wiring is the same, but ratings differ.",
    },
  ],
  watchOuts: [
    "New modules often arrive set to a high output voltage (such as 12-28 V). Always power it from the supply with nothing connected to OUT, measure OUT+ and OUT- with a multimeter, and turn the trimmer to what you need BEFORE connecting a board. On most boards turning clockwise raises the voltage; verify with the meter.",
    "Polarity matters: IN+ to supply +, IN- to supply -. A reversed input usually destroys it.",
    "It only boosts: the output cannot go below the input. Connecting a higher supply to it does not step it down.",
    "Heavy loads at big boosts pull a large current from the input. Powering a 5 V, 1 A load from a 3.7 V LiPo needs about 1.5-2 A from the battery, which makes the module and the battery warm.",
    "Never connect OUT+ to a supply: the board can push the voltage backwards and be damaged.",
  ],
  photoHint: "mt3608-module",
  pins: [
    { id: "IN+", label: "IN+ (input +)", kinds: ["power"] },
    { id: "IN-", label: "IN- (input -)", kinds: ["ground"] },
    { id: "OUT+", label: "OUT+ (adjustable)", kinds: ["power"] },
    { id: "OUT-", label: "OUT- (ground)", kinds: ["ground"] },
  ],
};

const TP4056_MODULE: CatalogPart = {
  id: "passive.charger.tp4056_usbc",
  name: "TP4056 USB-C LiPo Charger Module",
  kind: "passive",
  category: "Power",
  description:
    "A TP4056 module charges one single-cell (1S) lithium-ion or LiPo battery from a 5 V USB-C cable. Plug USB-C into the socket (or feed 5 V to IN+ and IN-), connect the battery to B+ and B-, and it charges to 4.2 V, then stops. A red light shows charging, and a green or blue light shows done (colours vary). On the protected version (two extra small chips) you connect the load to OUT+ and OUT-, and the protection chip cuts power if the battery gets too low or the current is too high. The default charge current is about 1 A (set by a small resistor): too high for small cells.",
  photoCaption: "TP4056 USB-C LiPo charger module: USB-C socket, two indicator LEDs, and solder pads IN+ / IN- / B+ / B- / OUT+ / OUT-.",
  identify:
    "A small board about 2.6 x 1.7 cm with a USB-C socket (older ones have micro-USB), two small LEDs (red and green or blue) and pads marked IN+, IN-, B+ and B- on the corners. The protected version has two extra chips (marked DW01 and 8205 or similar) and four more pads OUT+ and OUT-, so it has 6 pads. The unprotected version has only IN and B pads. Lookalikes: a 5 V boost+charge 'power bank' module has a different chip; a 2S+ charger charges more cells.",
  variants: [
    {
      label: "Protected (DW01 + 8205), 6 pads (this guide)",
      detail: "Battery on B+/B-, load on OUT+/OUT-. Cuts off when the battery is low (about 2.4-2.5 V) or the load shorts. Choose this for a project.",
      matchesGuide: true,
    },
    {
      label: "Unprotected, 4 pads",
      detail: "Charger only. The load must connect to B+/B-, and nothing stops the battery from over-discharging. Use only with a protected cell or accept the risk.",
    },
    {
      label: "Micro-USB version",
      detail: "Same board with a micro-USB socket. Same pads and wiring.",
    },
  ],
  watchOuts: [
    "Polarity: B+ to the battery +, B- to the battery -. A LiPo wire colour is not a guarantee (JST plugs from different makers differ): check the + marking with a multimeter before connecting it. Reverse polarity can start a fire or destroy the cell.",
    "For single-cell lithium (3.7 V nominal, 4.2 V full) only. Do not charge 2S packs, AA cells or 9 V batteries with it. The output at OUT+ is the raw battery voltage (about 3.0-4.2 V), not 5 V and not 3.3 V.",
    "Do not power a 3.3 V board straight from OUT+: 4.2 V is too high. Use a low-dropout 3.3 V regulator, or boost to 5 V (MT3608) and use the board's 5 V input. Check what your board accepts.",
    "The default charge current is about 1 A (set by a small resistor next to the chip, often 1.2 kΩ). For a small cell below roughly 1000 mAh, lower it by changing that resistor (check the TP4056 datasheet table) so the cell is charged at no more than about 1C.",
    "Do not leave a charging cell unattended, and stop if it becomes hot or swollen. The TP4056 has no load sharing: a load running during charge can stop it from finishing.",
  ],
  photoHint: "tp4056-usbc",
  pins: [
    { id: "IN+", label: "IN+ (USB 5V)", kinds: ["power"], voltage: "5v" },
    { id: "IN-", label: "IN- (USB GND)", kinds: ["ground"] },
    { id: "B+", label: "B+ (battery +)", kinds: ["power"] },
    { id: "B-", label: "B- (battery -)", kinds: ["ground"] },
    { id: "OUT+", label: "OUT+ (protected)", kinds: ["power"] },
    { id: "OUT-", label: "OUT- (protected)", kinds: ["ground"] },
  ],
};

/* ------------------------------ electrical data ------------------------------ */

const REGULATED_5V = { nominal: 5, min: 4.75, max: 5.25 } as const;
const REGULATED_3V3 = { nominal: 3.3, min: 3.2, max: 3.4 } as const;

const EXTRA_BASICS_ELECTRICAL: Record<string, PartElectrical> = {
  // Linear regulator: 7 V in is the lowest that keeps 5 V; the TO-220 part is rated far above 25 V
  // but heat makes high inputs a bad idea.
  "passive.regulator.7805": {
    pins: {
      IN: { accepts: { min: 7, max: 25 } },
      OUT: { source: { ...REGULATED_5V } },
    },
  },
  "passive.regulator.ams1117_33": {
    pins: {
      VIN: { accepts: { min: 4.5, max: 15 } },
      VOUT: { source: { ...REGULATED_3V3 } },
    },
  },
  // Adjustable converters: the output voltage is set by the trimmer, so no fixed output is claimed.
  "passive.converter.lm2596_buck": {
    pins: { "IN+": { accepts: { min: 4, max: 35 } } },
  },
  "passive.converter.mt3608_boost": {
    pins: { "IN+": { accepts: { min: 2, max: 24 } } },
  },
  // USB input only; B+ / OUT+ follow the cell, so no fixed voltage is claimed.
  "passive.charger.tp4056_usbc": {
    pins: { "IN+": { accepts: { min: 4, max: 8 } } },
  },
  // Control side is 3.3-5 V logic; load supply is limited by the board (commonly 24 V).
  "passive.mosfet.irf520_module": {
    pins: {
      VCC: { accepts: { min: 3.3, max: 5.5 } },
      "VIN+": { accepts: { min: 0, max: 24 } },
    },
  },
};

const BASIC_PARTS: CatalogPart[] = [
  ...LEDS,
  IR_LED,
  ...RESISTORS,
  CERAMIC_100NF,
  ...ELECTROLYTICS,
  ...DIODES,
  ...BJTS,
  ...MOSFETS,
  ...SWITCHES,
  DC_JACK,
  REGULATOR_7805,
  AMS1117_MODULE,
  LM2596_MODULE,
  MT3608_MODULE,
  TP4056_MODULE,
];

export const EXTRA_BASICS: CatalogPart[] = BASIC_PARTS.map((part) => ({
  ...part,
  electrical: EXTRA_BASICS_ELECTRICAL[part.id],
}));
