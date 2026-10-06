import type { CatalogPart, CatalogPin, PartElectrical, PinKind, VoltageRange } from "../types";

/**
 * Expansion parts: sensors and communication modules (kind "module"). Ids must stay
 * unique and are never removed. Electrical data is applied at the bottom of this file.
 */

const V5: VoltageRange = { min: 4.5, max: 5.5 };
const V3_3_ONLY: VoltageRange = { min: 3.0, max: 3.6 };
const V3_5: VoltageRange = { min: 3.3, max: 5.5 };
/** Breakouts with an onboard regulator that accept a 3 V to 5 V supply. */
const V3_TO_5: VoltageRange = { min: 3.0, max: 5.5 };

const pin = (
  id: string,
  label: string,
  kinds: PinKind[],
  voltage?: "3v3" | "5v",
): CatalogPin => (voltage ? { id, label, kinds, voltage } : { id, label, kinds });
const gnd = (id = "GND", label = "GND") => pin(id, label, ["ground"]);
const vcc = (id = "VCC", label = "VCC", voltage?: "3v3" | "5v") => pin(id, label, ["power"], voltage);

const baseSensors: CatalogPart[] = [
  // ------------------------------------------------------------------ environment
  {
    id: "module.bme280",
    name: "BME280 Temp/Humidity/Pressure",
    kind: "module",
    description:
      "Digital sensor (BME280 chip on a small breakout board) that measures air temperature, relative humidity and barometric pressure, so it can also estimate altitude. It talks I2C (SDA data, SCL clock) at address 0x76 or 0x77, and can also use SPI. The chip runs on 3.3 V (1.71-3.6 V), so power the board from 3.3 V. Typical range: -40 to 85 degrees C, 0-100 % humidity, 300-1100 hPa. Use a BME280 library; the 6-pin board has VCC, GND, SCL, SDA, CSB and SDO.",
    identify:
      "A tiny board, usually purple or blue, with a small metal-lidded square chip (about 2.5 x 2.5 mm) and a 4- or 6-pin header. The BMP280 looks almost the same but has NO humidity sensor, so a board sold as BME280 that reports humidity of 0 or an error is really a BMP280. Colour is not a reliable test: look at the silkscreen/listing text, and check the chip ID your library reads (BME280 reports 0x60, BMP280 reports 0x58 or 0x56/0x57). The BMP280 chip lid is a rectangle; the BME280 lid is square.",
    variants: [
      { label: "6-pin board (VCC GND SCL SDA CSB SDO)", detail: "SDO sets the I2C address: GND gives 0x76, VCC gives 0x77. CSB selects the bus; leave CSB as the board has it for I2C." },
      { label: "4-pin board (VCC GND SCL SDA)", detail: "Address is fixed by a solder pad, usually 0x76. Some boards need the pad bridged for 0x77; check the listing." },
      { label: "5 V-labelled boards", detail: "Some boards add a regulator and level shifter and say 3-5 V on the label. Power them from 3.3 V anyway unless the label clearly says otherwise." },
    ],
    watchOuts: [
      "Power it from 3.3 V. The bare chip is not 5 V tolerant; only boards that clearly say 5 V on the label have a regulator.",
      "If the scan finds nothing at 0x76, try 0x77 (or pass the address to begin()). Libraries often default to 0x77 while the cheap boards sit at 0x76.",
      "Do not call a board with no humidity reading a faulty BME280: it is probably a BMP280. Check the chip ID.",
      "The chip warms itself slightly, so keep it away from regulators, the MCU and any heat source or the temperature will read a degree or two high.",
      "Keep the vent hole in the metal lid clean and do not touch or seal it.",
    ],
    photoCaption: "Small purple BME280 breakout with a square metal-lidded sensor and a 6-pin header",
    photoHint: "bme280",
    pins: [
      vcc("VCC", "VCC", "3v3"),
      gnd(),
      pin("SCL", "SCL", ["i2c"]),
      pin("SDA", "SDA", ["i2c"]),
      pin("CSB", "CSB", ["digital"]),
      pin("SDO", "SDO", ["digital"]),
    ],
  },
  {
    id: "module.bmp280",
    name: "BMP280 Pressure/Temperature",
    kind: "module",
    description:
      "Digital sensor (BMP280 chip on a small breakout board) that measures barometric pressure and temperature, and from pressure can estimate altitude. It has NO humidity sensor (that is the BME280). It talks I2C at address 0x76 or 0x77 (or SPI) and runs on 3.3 V. Typical range: 300-1100 hPa, -40 to 85 degrees C. Pins on the 6-pin board: VCC, GND, SCL, SDA, CSB, SDO; 4-pin boards leave out CSB and SDO.",
    identify:
      "A tiny board, often blue or purple, with a small rectangular metal-lidded chip (about 2.0 x 2.5 mm) and a 4- or 6-pin header. Lookalike: the BME280 has the same board shape plus a humidity sensor and a square lid. Check the listing text and the chip ID your library reads (BMP280 reports 0x58, early samples 0x56/0x57; BME280 reports 0x60). Do not confuse it with the older BMP180, which has a different chip and I2C address 0x77 only.",
    variants: [
      { label: "6-pin board (VCC GND SCL SDA CSB SDO)", detail: "SDO low gives address 0x76, SDO high gives 0x77." },
      { label: "4-pin board (VCC GND SCL SDA)", detail: "Address fixed by a solder pad, usually 0x76. Check the listing." },
      { label: "BMP180 / BMP085", detail: "Older pressure sensors with a different driver and fixed address 0x77. A BMP280 library will not find them." },
    ],
    watchOuts: [
      "There is no humidity reading. If you need humidity use a BME280, DHT11 or DHT22.",
      "Power it from 3.3 V. The chip is a 3.3 V part.",
      "If the I2C scan finds nothing at 0x76, try 0x77 and pass that address to the library.",
      "Pressure changes with weather as well as altitude. For altitude, set the sea-level pressure in the code, otherwise the result drifts by tens of metres.",
      "Keep it away from heat sources: the temperature reading is the chip temperature.",
    ],
    photoCaption: "Small blue BMP280 pressure sensor breakout with a rectangular metal lid and a 4-pin header",
    photoHint: "bmp280",
    pins: [
      vcc("VCC", "VCC", "3v3"),
      gnd(),
      pin("SCL", "SCL", ["i2c"]),
      pin("SDA", "SDA", ["i2c"]),
      pin("CSB", "CSB", ["digital"]),
      pin("SDO", "SDO", ["digital"]),
    ],
  },
  {
    id: "module.ds18b20",
    name: "DS18B20 Temperature Sensor",
    kind: "module",
    description:
      "Digital temperature sensor that talks over a single data wire (the 1-Wire protocol, not I2C). Measures -55 to 125 degrees C, accurate to about 0.5 degrees C from -10 to 85 degrees C, at 9 to 12 bits. Every chip has its own unique 64-bit address, so many sensors can share one data pin. Needs a 4.7 kohm pull-up resistor between DATA and VDD, and the OneWire and DallasTemperature libraries. Runs from 3.0 to 5.5 V. Three wires: GND, DQ (data), VDD.",
    identify:
      "Two common forms. (1) A black TO-92 package (like a small transistor) with a flat face printed DS18B20 and three legs. (2) A waterproof probe: a stainless steel tube about 6 mm wide and 30-50 mm long on a 1 m cable, usually red = VDD, black = GND, yellow or white = DATA (check the seller's note). Lookalike: the same TO-92 package is used for the TMP36 and LM35 (which are analog) and 2N3904 transistors; read the printed name. Counterfeit chips exist and may misbehave; a reading of exactly 85.0 C means no conversion happened, and -127 C means no sensor was found.",
    variants: [
      { label: "Waterproof probe on a cable", detail: "Steel tube sensor, 3 wires. Fine for liquids and soil; do not boil it or leave the cable end submerged." },
      { label: "Bare TO-92 chip", detail: "Hold it with the flat face toward you and the legs down: left GND, middle DQ, right VDD." },
      { label: "3-pin breakout board", detail: "Small board with the pull-up resistor already fitted. Check the silkscreen for the pin order." },
    ],
    watchOuts: [
      "Fit a 4.7 kohm pull-up resistor between DQ and VDD (unless your breakout board already has one), or the sensor is never found.",
      "On a bare TO-92 chip, wiring VDD and GND the wrong way round makes it hot within seconds and can destroy it. Double-check the pin order against the flat face.",
      "A reading of 85.0 C usually means a power or wiring problem (or a missing pull-up), and -127 C means the sensor was not found.",
      "Several sensors can share the same DQ wire and pull-up, but you must read each by its address.",
      "Keep cables short or use shielded cable for runs over a few metres, and do not rely on parasitic (2-wire) power for beginners; use the third wire.",
    ],
    photoCaption: "Black DS18B20 TO-92 chip and a waterproof stainless steel probe on a cable",
    photoHint: "ds18b20",
    pins: [gnd(), pin("DQ", "DQ (data)", ["digital"]), vcc("VDD", "VDD")],
  },
  {
    id: "module.dht11",
    name: "DHT11 Temp/Humidity",
    kind: "module",
    description:
      "Low-cost digital sensor that measures air temperature and relative humidity (0-50 degrees C within about 2 degrees, 20-80 % humidity within about 5 %). It sends the numbers over one data wire with its own timing, which is not I2C or 1-Wire, so use a DHT library. New reading about once per second. Runs from 3.0 to 5.5 V. Pins on the bare 4-pin sensor with the grid facing you, left to right: VCC, DATA, NC (not connected), GND.",
    identify:
      "A BLUE plastic body with a grid of slots on the front and 4 legs (or 3 pins when it is on a small board). The DHT22 / AM2302 looks similar but is WHITE, has a wider range (-40 to 80 degrees C, 0-100 % humidity) and better accuracy; wiring and library are the same, only the sensor type in the code changes. Check the name printed on the side.",
    variants: [
      { label: "Bare 4-pin sensor", detail: "VCC, DATA, NC, GND. Needs a 4.7-10 kohm pull-up from DATA to VCC." },
      { label: "3-pin module on a small board", detail: "Pins usually +, OUT, - with the pull-up already fitted. Check the silkscreen for the pin order." },
    ],
    watchOuts: [
      "With the bare 4-pin sensor, fit a 4.7-10 kohm pull-up between DATA and VCC or the readings fail.",
      "Do not read it more often than about once per second. Faster reads return errors or old values.",
      "The data line follows the supply voltage, so on a 3.3 V board power the sensor from 3.3 V.",
      "It cannot measure below 0 degrees C or above 50 degrees C and the humidity range is narrow; use a DHT22 or BME280 for more.",
      "Keep it away from heat sources (regulators, the board itself) or the readings will be too high.",
    ],
    photoCaption: "Blue DHT11 temperature and humidity sensor with a grid of slots on the front",
    photoHint: "dht11",
    wokwi: { tag: "wokwi-dht22" },
    pins: [
      vcc("VCC", "VCC", "3v3"),
      pin("SDA", "DATA", ["digital"]),
      pin("NC", "NC", ["digital"]),
      gnd(),
    ],
  },
  {
    id: "module.lm35",
    name: "LM35 Analog Temperature Sensor",
    kind: "module",
    description:
      "Analog temperature sensor in a small TO-92 package (looks like a transistor). It outputs 10 millivolts for every degree Celsius, so 250 mV means 25 degrees C. The typical LM35DZ measures 0 to 100 degrees C. It needs a supply of 4 to 30 V, so it will NOT work from a 3.3 V pin; use 5 V. Three legs: +Vs (supply), Vout (the analog signal), GND. Read Vout with an analog input and convert with the board's reference voltage.",
    identify:
      "A small black half-round TO-92 package with a flat face printed LM35 and three legs. With the flat face toward you and legs down, the order from the left is +Vs, Vout, GND. Lookalikes: the TMP36 has the same package but has a 500 mV offset and runs from 2.7 V; the DS18B20 is digital. Always read the printed name.",
    variants: [
      { label: "LM35DZ (0 to 100 degrees C)", detail: "The common hobby chip in TO-92. Cannot read below 0 degrees C without extra parts." },
      { label: "LM35 on a small board", detail: "Same sensor on a board with a 3-pin header. Check the silkscreen for the pin order." },
    ],
    watchOuts: [
      "Power it from 5 V. It does not work from 3.3 V (it needs at least 4 V).",
      "Wrong pin order or reversed power can overheat the chip. Check the flat face and the pin order before powering.",
      "The output is small (about 0.25 V at 25 degrees C), so analog noise matters: average several readings, and with a 5 V Arduino consider the 1.1 V internal reference for better resolution.",
      "On a 3.3 V board the output (under 1.5 V) is safe for an analog input, but the sensor still needs a 5 V supply.",
      "It measures its own temperature, so a long wire or heat nearby will skew the reading.",
    ],
    photoCaption: "Black half-round LM35 temperature sensor with three legs",
    photoHint: "lm35",
    pins: [vcc("VS", "+Vs", "5v"), pin("VOUT", "Vout", ["analog"]), gnd()],
  },
  {
    id: "module.tmp36",
    name: "TMP36 Analog Temperature Sensor",
    kind: "module",
    description:
      "Analog temperature sensor in a TO-92 package. It outputs 10 millivolts per degree Celsius with a 500 mV offset, so 0 degrees C = 0.5 V, 25 degrees C = 0.75 V and negative temperatures work down to -40 degrees C (up to 125 degrees C). Supply 2.7 to 5.5 V, so it works on both 3.3 V and 5 V boards. Three legs: +Vs, Vout, GND. Read Vout with an analog input: degrees C = (volts - 0.5) x 100.",
    identify:
      "A small black half-round TO-92 package with a flat face printed TMP36 and three legs. Lookalikes: LM35 (no offset, needs 4 V or more) and DS18B20 (digital). With the flat face toward you and the legs down, the order from the left is +Vs, Vout, GND. Always read the printed name before wiring.",
    variants: [
      { label: "TMP36 in TO-92", detail: "The common hobby package. Works from 2.7 V up, so fine for 3.3 V boards." },
      { label: "TMP35 / TMP37", detail: "Similar chips with a different scale (10 or 20 mV per degree) and no negative range; the same formula does not apply." },
    ],
    watchOuts: [
      "Check the printed name and the pin order: reversed power makes the chip hot very quickly and can ruin it.",
      "Do not forget the 0.5 V offset in the formula, or the temperature will be 50 degrees too high.",
      "Use the same supply voltage as the analog reference. On a 3.3 V board power it from 3.3 V and scale with 3.3, not 5.",
      "The signal is small and noisy: add a 0.1 uF capacitor from Vout to GND and average several readings.",
      "Long wires pick up noise and body heat changes the reading; keep the sensor close to the board and out of draughts.",
    ],
    photoCaption: "Black half-round TMP36 temperature sensor with three legs",
    photoHint: "tmp36",
    pins: [vcc("VS", "+Vs", "3v3"), pin("VOUT", "Vout", ["analog"]), gnd()],
  },
  // ------------------------------------------------------------------ light, colour, magnetic, proximity
  {
    id: "module.bh1750",
    name: "BH1750 Light Sensor",
    kind: "module",
    description:
      "Digital ambient light sensor (BH1750, often the GY-30 or GY-302 board) that reports brightness directly in lux, from about 1 to 65,000 lux, over I2C. Unlike a photoresistor it needs no analog pin or calibration. I2C address 0x23 when ADDR is low or unconnected, 0x5C when ADDR is high. Needs a BH1750 library. The breakout accepts 3-5 V on VCC. Pins: VCC, GND, SCL, SDA, ADDR.",
    identify:
      "A tiny board, often yellow, blue or purple, with a small clear window sensor (about 3 mm square) near one edge, a 5-pin header and the label BH1750 or GY-302 (or GY-30). Some boards add a sixth pin called DVI; leave it unconnected unless the seller says otherwise. Lookalike: a similar board with a TSL2561 or VEML7700 has a different address and library.",
    variants: [
      { label: "GY-302 / GY-30", detail: "The common breakout with an onboard regulator. Pins VCC, GND, SCL, SDA, ADDR." },
      { label: "Address 0x5C", detail: "Tie ADDR to VCC for 0x5C when you need two sensors on one bus or when 0x23 clashes with another device." },
    ],
    watchOuts: [
      "The chip itself is a 3.3 V part. Power the breakout from 3.3 V unless its label says 3-5 V, and use the label to decide, not guesses.",
      "Leave ADDR unconnected or tied to GND for 0x23; tie it to VCC only for 0x5C.",
      "It measures visible light, not UV or infrared, and the reading depends on the angle; mount it facing the light you care about.",
      "A cover plate or tape over the window will reduce the reading; the lux values are not calibrated to a certified meter.",
      "Do not call the sensor more often than its measurement time (about 120-180 ms in the normal mode).",
    ],
    photoCaption: "Small BH1750 (GY-302) light sensor board with a clear window and a 5-pin header",
    photoHint: "bh1750",
    pins: [
      vcc("VCC", "VCC", "3v3"),
      gnd(),
      pin("SCL", "SCL", ["i2c"]),
      pin("SDA", "SDA", ["i2c"]),
      pin("ADDR", "ADDR", ["digital"]),
    ],
  },
  {
    id: "module.tcs34725",
    name: "TCS34725 Colour Sensor",
    kind: "module",
    description:
      "Digital RGB colour sensor (TCS34725) with a clear channel and an infrared-blocking filter, plus a white LED to light the target. It reports red, green, blue and clear values and can estimate colour temperature and lux. I2C at fixed address 0x29. Needs a TCS34725 library. Sensor chip runs on 3.3 V; the common breakout adds a regulator so it accepts 3.3-5 V on VIN. Pins: VIN, 3V3, GND, SDA, SCL, INT, LED.",
    identify:
      "A small board with a square sensor window in the centre, a white LED on each side (or one beside it), a chip, and a 7-pin header labelled 3V3, SDA, SCL, INT, LED, GND, VIN. Lookalike: the TCS3200 colour sensor board is a larger square with four white LEDs and a frequency output (S0-S3, OUT) instead of I2C; it is a different part and library.",
    variants: [
      { label: "Board with onboard regulator", detail: "VIN accepts about 3.3-5 V and the 3V3 pin is the regulator output. Power it from either VIN or 3V3, not both." },
      { label: "Board without regulator", detail: "Use 3.3 V only. Check the listing." },
    ],
    watchOuts: [
      "Hold the target close (about 3-10 mm) and keep the distance and lighting the same every time. Colour readings change a lot with ambient light.",
      "The LED pin switches the white LED. Pull it low to turn the LED off; leave it as the board has it to keep the LED on.",
      "Do not connect both VIN and 3V3 to supply rails at the same time.",
      "Raw RGB values are not the same as screen colours; calibrate with known white and black samples.",
      "Use 3.3 V logic: the I2C lines are 3.3 V and a 5 V board needs level shifting unless the board shifts them.",
    ],
    photoCaption: "TCS34725 colour sensor board with a square sensor window between white LEDs",
    photoHint: "tcs34725",
    pins: [
      vcc("VIN", "VIN", "5v"),
      vcc("3V3", "3V3", "3v3"),
      gnd(),
      pin("SDA", "SDA", ["i2c"]),
      pin("SCL", "SCL", ["i2c"]),
      pin("INT", "INT", ["digital"]),
      pin("LED", "LED", ["digital"]),
    ],
  },
  {
    id: "module.hall.a3144",
    name: "Hall Sensor A3144 (KY-003)",
    kind: "module",
    description:
      "Digital magnetic sensor: an A3144 Hall effect chip that switches its output when the SOUTH pole of a magnet comes close to the marked face. Used to count rotations, detect a door magnet or find a wheel position. On the KY-003 board the output pin S goes LOW (and an LED lights) while a magnet is near, and HIGH otherwise, via a pull-up on the board. Needs 4.5 V or more, so it is a 5 V part. Pins: S (signal), + (VCC), - (GND).",
    identify:
      "A tiny green or blue board with a black TO-92 chip (three legs, printed A3144 or 3144 on the flat face), a resistor, an LED and a 3-pin header, S + -. Lookalikes: the KY-024 (49E linear Hall, analog) and KY-035 (analog Hall) look nearly the same but measure magnetic field strength continuously; the US1881 is a different digital Hall type. Check the chip marking.",
    variants: [
      { label: "KY-003 module", detail: "Chip on a 3-pin board with a pull-up resistor and LED. The pin labelled + is VCC." },
      { label: "Bare A3144 chip", detail: "Three legs: VCC, GND, OUT (open collector). Needs your own pull-up resistor (about 10 kohm) from OUT to VCC." },
    ],
    watchOuts: [
      "It only reacts to one magnetic pole (south) facing the marked side. If it does nothing, flip the magnet.",
      "It needs about 4.5 V or more, so power it from 5 V. It may not work from 3.3 V.",
      "The output swings up to the supply voltage. If you power it from 5 V while using a 3.3 V board (ESP32, ESP8266, Pico), put a voltage divider or level shifter on the S wire.",
      "Do not mix it up with the analog Hall boards (KY-024, KY-035), which need an analog input and a threshold.",
      "Keep the magnet within a few millimetres to a couple of centimetres; the trigger distance depends on magnet strength.",
    ],
    photoCaption: "Small KY-003 Hall sensor board with a black TO-92 sensor and a 3-pin header",
    photoHint: "hall-a3144",
    pins: [pin("S", "S (signal)", ["digital"]), vcc("VCC", "+ (VCC)", "5v"), gnd("GND", "- (GND)")],
  },
  {
    id: "module.reed.switch",
    name: "Reed Switch Module",
    kind: "module",
    description:
      "Magnetic switch module: a small glass-capsule reed switch that closes when a magnet is brought near it, plus an LM393 comparator so it gives a clean digital output (DO) and sometimes an analog output (AO). Often sold as KY-025. A trimmer sets the sensitivity and an LED shows the output. Good for door and window sensors, bike speed sensors and lids. Runs from 3.3 to 5 V. Pins: VCC, GND, DO, AO.",
    identify:
      "A small blue board with a thin glass capsule (about 14 mm long, with two metal leads inside) soldered to it, a blue trimmer, a small chip (LM393) and a 4-pin header. The same size board with a black TO-92 sensor is a Hall sensor, not a reed switch. A bare reed switch is only the glass capsule with two leads and no electronics.",
    variants: [
      { label: "4-pin module (VCC GND DO AO)", detail: "Use DO for a simple on/off, AO for the raw analog level. Pin order can differ by board; check the silkscreen." },
      { label: "Bare glass reed switch", detail: "Two leads, no polarity: one to a digital pin (with INPUT_PULLUP) and one to GND. No power pin needed." },
    ],
    watchOuts: [
      "The glass capsule is fragile. Do not bend the leads close to the glass or hit it.",
      "Turn the trimmer while the magnet is at the distance you want until the LED just switches.",
      "On many boards DO is LOW when the magnet is near (active LOW), but it varies. Test and flip the logic in your code if needed.",
      "Keep the module and magnet clear of iron/steel, which weakens the field and changes the trigger distance.",
      "Use the signal at the supply voltage level; on a 3.3 V board power the module from 3.3 V.",
    ],
    photoCaption: "Blue reed switch module with a thin glass capsule, a trimmer and a 4-pin header",
    photoHint: "reed-switch",
    pins: [
      vcc("VCC", "VCC", "3v3"),
      gnd(),
      pin("DO", "DO", ["digital"]),
      pin("AO", "AO", ["analog"]),
    ],
  },
  {
    id: "module.tcrt5000",
    name: "TCRT5000 IR Line Sensor",
    kind: "module",
    description:
      "Reflective infrared sensor for line-following robots and short-range detection: an infrared LED and a phototransistor side by side in one component (TCRT5000). White or shiny surfaces reflect more IR than black ones, so it tells a line from the floor. Range is short, about 1 to 25 mm. The module gives a digital output (DO, trimmer sets the threshold) and an analog output (AO). Runs from 3.3 to 5 V. Pins: VCC, GND, DO, AO.",
    identify:
      "A small blue board with a squared plastic component in a rectangle (a clear IR LED and a dark IR receiver side by side, facing down), a blue trimmer, an LM393 chip, two LEDs and a 4-pin header. Lookalike: the IR obstacle avoidance module (FC-51) has two separate domed LEDs and detects objects 2-30 cm away, not a surface at a few millimetres.",
    variants: [
      { label: "4-pin module (VCC GND DO AO)", detail: "The common board. Use DO for line/no line, AO for a graded reading." },
      { label: "Bare TCRT5000 component", detail: "Four legs (LED anode/cathode, phototransistor collector/emitter) that need their own resistors. Not what this entry describes." },
    ],
    watchOuts: [
      "Mount it 3-10 mm above the surface. It does not work well farther than a couple of centimetres.",
      "Strong sunlight and some lamps contain IR and upset the reading; shield the sensor or test it in your final lighting.",
      "Black matte surfaces read as no reflection, shiny black may still reflect. Test on your actual line material.",
      "Tune the trimmer with the sensor over the surface you want to detect, until the LED just changes state.",
      "Use the same voltage as your board's logic: on 3.3 V boards power it from 3.3 V.",
    ],
    photoCaption: "TCRT5000 reflective IR sensor module with an IR LED and receiver, trimmer and 4-pin header",
    photoHint: "tcrt5000",
    pins: [
      vcc("VCC", "VCC", "3v3"),
      gnd(),
      pin("DO", "DO", ["digital"]),
      pin("AO", "AO", ["analog"]),
    ],
  },
  {
    id: "module.ir.obstacle",
    name: "IR Obstacle Avoidance Module",
    kind: "module",
    description:
      "Infrared proximity switch (often the FC-51 board): an IR LED sends out invisible light and a receiver looks for the reflection. When something is in front of it the OUT pin goes LOW and an LED lights; otherwise OUT is HIGH. Detects objects about 2 to 30 cm away, set by a trimmer. It gives only on/off, not a distance. Runs from 3.3 to 5 V. Pins: OUT, GND, VCC.",
    identify:
      "A small blue board with two domed LEDs facing forward side by side (one clear, one dark), a blue trimmer, an LM393 chip, two LEDs and a 3-pin header (OUT, GND, VCC). Lookalike: the TCRT5000 line sensor has the two parts in one block and works at millimetres, and the HC-SR04 ultrasonic sensor measures real distance.",
    variants: [
      { label: "3-pin module (OUT GND VCC)", detail: "The common FC-51 board. Some versions have an EN jumper; leave it fitted." },
      { label: "Adjustable range", detail: "Turn the trimmer to change the detection distance; clockwise or counter-clockwise depends on the board." },
    ],
    watchOuts: [
      "OUT is active LOW: LOW means an object is detected.",
      "Dark and matte objects reflect poorly, so they are detected at shorter range or not at all.",
      "Sunlight and many lamps contain IR and cause false triggers; test outdoors before trusting it.",
      "Point the LEDs straight ahead and keep the module still; reflections from the table or walls can trigger it.",
      "On a 3.3 V board power it from 3.3 V so OUT stays at 3.3 V.",
    ],
    photoCaption: "IR obstacle avoidance module with a clear IR LED and a dark receiver LED facing forward",
    photoHint: "ir-obstacle",
    pins: [pin("OUT", "OUT", ["digital"]), gnd(), vcc("VCC", "VCC", "3v3")],
  },
  {
    id: "module.rain.fc37",
    name: "Rain Sensor (FC-37)",
    kind: "module",
    description:
      "Rain and water-drop detector: a printed sensing pad with bare copper traces (the FC-37 or YL-83 pad) connected by two wires to a small control module with an LM393 comparator. Water bridges the traces and changes the signal. The module gives a digital output (DO, with a trimmer threshold) and an analog output (AO) that lets you tell drizzle from heavy rain. Runs from 3.3 to 5 V. Pins on the module: VCC, GND, DO, AO.",
    identify:
      "Two parts: a flat black PCB pad covered in silver comb-like traces on a cable, and a small blue control board with a trimmer, LM393 chip, two LEDs and a 4-pin header. The look is similar to a resistive soil moisture probe, but the rain pad is a flat comb, not a pair of prongs.",
    variants: [
      { label: "Pad plus control module", detail: "The usual kit. The pad connects to the module by 2 wires; the module connects to the board." },
      { label: "Analog value direction", detail: "On most boards AO gets LOWER the wetter the pad is. Check by dropping water on it." },
    ],
    watchOuts: [
      "Keep the control module dry. Only the pad should get wet; the module is not waterproof.",
      "The copper traces corrode with current flowing through wet water. Power the module from a digital output pin only while reading to make the pad last, or accept that it ages.",
      "Tilt the pad so water runs off; standing water leaves it reading wet.",
      "Use the same voltage as your board's logic level for VCC.",
      "AO is not calibrated; map it to your own wet and dry readings.",
    ],
    photoCaption: "FC-37 rain sensor: black comb pad with silver traces wired to a small control module",
    photoHint: "rain-sensor",
    pins: [
      vcc("VCC", "VCC", "3v3"),
      gnd(),
      pin("DO", "DO", ["digital"]),
      pin("AO", "AO", ["analog"]),
    ],
  },
  {
    id: "module.water.level",
    name: "Water Level Sensor",
    kind: "module",
    description:
      "Simple analog water level sensor: a long board with a row of exposed parallel copper traces. The more of the traces are covered by water, the lower the resistance between them and the higher the analog voltage on the signal pin. Useful for tank full/empty alerts and rough depth, not for precise measurement. Runs from about 3 to 5 V. Three pins: S (signal), + (VCC), - (GND).",
    identify:
      "A narrow green or black board about 6 cm long with ten or so bare copper strips running along it and a 3-pin header at the top. The pin order is often - (GND), + (VCC), S (signal); check the silkscreen. Do not mix it up with the rain sensor (flat comb pad) or the soil probe (two prongs).",
    variants: [
      { label: "3-pin analog board", detail: "The common model. Signal on S goes to an analog input." },
      { label: "With a comparator module", detail: "Some boards add a DO output. Not what this entry describes." },
    ],
    watchOuts: [
      "Only the lower traces may go in water. Keep the header, components and any wires above the water line.",
      "Bare traces corrode quickly while powered. Power the sensor from a digital pin only when reading, or switch it on briefly.",
      "It senses conductivity: tap water works, distilled or very pure water barely conducts and reads as dry.",
      "Readings change with the water's mineral content and temperature, so calibrate it with your own liquid.",
      "Use the board's own logic voltage for VCC, as the signal rises toward the supply voltage.",
    ],
    photoCaption: "Water level sensor board with parallel exposed copper traces and a 3-pin header",
    photoHint: "water-level",
    pins: [pin("S", "S (signal)", ["analog"]), vcc("VCC", "+ (VCC)", "3v3"), gnd("GND", "- (GND)")],
  },
  {
    id: "module.soil.resistive",
    name: "Resistive Soil Moisture Probe (YL-69)",
    kind: "module",
    description:
      "Soil moisture sensor with two metal prongs (the YL-69 or HL-69 probe) wired to a small LM393 control module. Wet soil conducts better, so the analog output AO changes with moisture, and the digital output DO switches at a threshold set by a trimmer. Cheap, but the prongs corrode quickly; a capacitive probe lasts far longer. Runs from 3.3 to 5 V. Pins on the module: VCC, GND, DO, AO.",
    identify:
      "Two parts: a flat fork-shaped board with two metal-coloured prongs, and a small blue control board with a trimmer, LM393 chip, two LEDs and a 4-pin header. The capacitive soil probe is one long uniform board with no bare metal prongs and a regulator chip. Do not confuse it with the rain pad (a flat comb of traces).",
    variants: [
      { label: "Probe plus control module", detail: "The usual kit; a 2-wire cable joins the probe to the module." },
      { label: "Capacitive probe", detail: "A different part that does not corrode. Use the capacitive soil moisture entry instead." },
    ],
    watchOuts: [
      "The prongs corrode within weeks if powered all the time. Power the module from a digital pin only while you read, or accept short life.",
      "Higher AO usually means drier soil on this board. Check by testing in dry and wet soil.",
      "Do not leave it in plain water for days and keep the control module and header dry.",
      "Readings depend on soil type, salt and fertiliser, so calibrate for your own pot.",
      "Use the board's logic voltage for VCC. On a 3.3 V board power it from 3.3 V.",
    ],
    photoCaption: "Resistive soil moisture sensor with two metal prongs wired to a small control module",
    photoHint: "soil-resistive",
    pins: [
      vcc("VCC", "VCC", "3v3"),
      gnd(),
      pin("DO", "DO", ["digital"]),
      pin("AO", "AO", ["analog"]),
    ],
  },
  {
    id: "module.mq135",
    name: "MQ-135 Air Quality Sensor",
    kind: "module",
    description:
      "Gas sensor module (MQ-135) that reacts to ammonia, benzene, alcohol vapours, smoke and general air pollution. It has an internal heater, so it draws about 150 mA and gets warm. It gives an analog output (AO) that rises with more gas and a digital output (DO) with a threshold set by a trimmer. Not a calibrated meter: it gives a trend, not accurate ppm or CO2. Needs 5 V. Pins: VCC, GND, DO, AO.",
    identify:
      "A small board with a round metal-mesh capped sensor about 1.5 cm wide, a blue trimmer, an LM393 chip, two LEDs and a 4-pin header. The MQ family (MQ-2, MQ-3, MQ-7, MQ-9 and others) looks identical; the model number is printed on the board or the sensor cap. Always check the label; they detect different gases.",
    variants: [
      { label: "4-pin module (VCC GND DO AO)", detail: "The common board. Use AO for readings and DO for a simple alarm." },
      { label: "Other MQ sensors", detail: "MQ-2 (smoke/LPG), MQ-7 (carbon monoxide) and others use the same wiring but detect different gases and are separate catalog parts or entries." },
    ],
    watchOuts: [
      "It needs a warm-up before readings settle: allow several minutes each time you power it, and the datasheet suggests a long first burn-in (around 24 hours). The readings drift until then.",
      "The heater makes the metal cap hot. Do not touch it and keep it clear of plastic and wires.",
      "Power it from 5 V. The heater does not work properly at 3.3 V.",
      "AO can reach about 5 V, so on a 3.3 V board (ESP32, ESP8266, Pico) add a voltage divider before the analog pin.",
      "Without calibration, do not treat the numbers as real CO2 or safety values. It is not a safety alarm.",
    ],
    photoCaption: "MQ-135 air quality module with a metal mesh sensor, trimmer and 4-pin header",
    photoHint: "mq135",
    pins: [
      vcc("VCC", "VCC", "5v"),
      gnd(),
      pin("DO", "DO", ["digital"]),
      pin("AO", "AO", ["analog"]),
    ],
  },
  {
    id: "module.max9814",
    name: "MAX9814 Microphone Amplifier",
    kind: "module",
    description:
      "Electret microphone with an automatic-gain-control (AGC) amplifier (MAX9814). It gives a clean analog audio signal on OUT, centred around 1.25 V, that you can sample with an analog input to measure sound level, clap, or record audio. The gain is set to 40, 50 or 60 dB by the GAIN pin, and the A/R pin changes how fast the AGC reacts. Supply 2.7 to 5.5 V. Pins: GND, VDD, GAIN, A/R, OUT.",
    identify:
      "A tiny red or blue board with a round electret microphone capsule about 6 mm wide, a small chip marked 9814 and a 5-pin header. Lookalikes: the KY-038 and similar sound sensor modules have a trimmer and a digital output; the MAX4466 board also has an electret and an amp but with an adjustable trimmer gain instead of AGC. Check the chip marking.",
    variants: [
      { label: "GAIN pin choices", detail: "Per the datasheet: unconnected = 60 dB, GND = 50 dB, VDD = 40 dB. A/R sets attack/release; leave it unconnected unless you need to change it." },
      { label: "Pin names", detail: "Some boards label VDD as VCC or 3V and OUT as Vout. Check the silkscreen." },
    ],
    watchOuts: [
      "OUT swings around a DC offset (about 1.25 V), not around zero. Subtract the average in code before measuring loudness.",
      "The AGC keeps loud and quiet sounds near the same level, so it is poor for measuring absolute volume.",
      "Add a small decoupling capacitor close to the module (about 0.1 uF) if your readings are noisy.",
      "Use the same voltage for VDD as the board's logic level so the signal fits the analog input range.",
      "This board has no digital output. For a yes/no sound trigger use a KY-038-style sensor.",
    ],
    photoCaption: "Small MAX9814 microphone amplifier board with a round electret microphone and a 5-pin header",
    photoHint: "max9814",
    pins: [
      gnd(),
      vcc("VDD", "VDD"),
      pin("GAIN", "GAIN", ["digital"]),
      pin("AR", "A/R", ["digital"]),
      pin("OUT", "OUT", ["analog"]),
    ],
  },
  {
    id: "module.adxl345",
    name: "ADXL345 Accelerometer",
    kind: "module",
    description:
      "3-axis digital accelerometer (ADXL345, often the GY-291 board) that measures acceleration up to +-2, 4, 8 or 16 g, so it senses tilt, shaking, taps and free fall. It talks I2C at address 0x53 (SDO low) or 0x1D (SDO high), or SPI, and has two interrupt outputs INT1 and INT2. Needs an ADXL345 library. Pins on the 8-pin board: GND, VCC, CS, INT1, INT2, SDO, SDA, SCL.",
    identify:
      "A tiny purple or blue board with a small square chip (3 x 5 mm) and an 8-pin header marked GND, VCC, CS, INT1, INT2, SDO, SDA, SCL, often named GY-291. Lookalike: the MPU6050 board is similar in size but has a gyroscope, an 8-pin header with different labels, and address 0x68. Check the chip name.",
    variants: [
      { label: "GY-291", detail: "The common board with a regulator and level handling. I2C by default when CS is tied high." },
      { label: "Address 0x1D", detail: "Tie SDO to VCC for 0x1D instead of the default 0x53." },
    ],
    watchOuts: [
      "For I2C, CS must be high. Most boards already do this; if no device is found, tie CS to VCC.",
      "The chip is a 3.3 V part. Many boards say 3-5 V because of a regulator, but check the label and power from 3.3 V if unsure.",
      "Raw values have an offset. Calibrate with the board lying flat and still.",
      "It does not measure rotation, only acceleration; use an MPU6050 if you need a gyroscope.",
      "Keep wires short and use pull-up resistors if your board does not have them for the I2C lines.",
    ],
    photoCaption: "Small ADXL345 accelerometer board with a tiny chip and an 8-pin header",
    photoHint: "adxl345",
    pins: [
      gnd(),
      vcc("VCC", "VCC", "3v3"),
      pin("CS", "CS", ["digital"]),
      pin("INT1", "INT1", ["digital"]),
      pin("INT2", "INT2", ["digital"]),
      pin("SDO", "SDO", ["digital"]),
      pin("SDA", "SDA", ["i2c"]),
      pin("SCL", "SCL", ["i2c"]),
    ],
  },
  {
    id: "module.qmc5883l",
    name: "QMC5883L / HMC5883L Compass",
    kind: "module",
    description:
      "3-axis magnetometer module (often the GY-271) that senses the Earth's magnetic field so you can compute a compass heading. It talks I2C. The QMC5883L chip answers at address 0x0D; the older HMC5883L answers at 0x1E, and they need different libraries. Pins: VCC, GND, SCL, SDA, DRDY (data ready). The heading needs calibration and must be kept flat and away from metal, motors and wires carrying current.",
    identify:
      "A small board (often blue) with a small square chip and a 5-pin header, sold as GY-271 and often labelled HMC5883L. Many boards labelled HMC5883L actually carry a QMC5883L chip, with a different address and library. Run an I2C scan: 0x0D means QMC5883L, 0x1E means HMC5883L. The chip marking is tiny, so rely on the scan.",
    variants: [
      { label: "QMC5883L (address 0x0D)", detail: "The chip on most cheap GY-271 boards now. Use a QMC5883L library." },
      { label: "HMC5883L (address 0x1E)", detail: "Original chip, now discontinued. Use an HMC5883L library." },
    ],
    watchOuts: [
      "Scan the I2C bus: the chip type decides which library works. A wrong library finds no device.",
      "Move it away from motors, magnets, speakers and steel. Mount it on the far side of your project from power wires.",
      "Calibrate by rotating it slowly in all directions and recording the min and max of each axis.",
      "A heading needs the board kept level; tilt compensation needs an accelerometer as well.",
      "Power from 3.3 V unless the label says 3-5 V; the I2C lines are 3.3 V logic.",
    ],
    photoCaption: "GY-271 compass module with a tiny magnetometer chip and a 5-pin header",
    photoHint: "qmc5883l",
    pins: [
      vcc("VCC", "VCC", "3v3"),
      gnd(),
      pin("SCL", "SCL", ["i2c"]),
      pin("SDA", "SDA", ["i2c"]),
      pin("DRDY", "DRDY", ["digital"]),
    ],
  },
  {
    id: "module.vl53l0x",
    name: "VL53L0X Time-of-Flight Distance Sensor",
    kind: "module",
    description:
      "Laser time-of-flight distance sensor (VL53L0X) that measures the distance to an object in millimetres by timing a pulse of invisible infrared light. Range is about 30 mm to roughly 1.2 m indoors (up to 2 m in good conditions), with a narrow beam, more precise than an ultrasonic sensor at short range. I2C at default address 0x29, which can be changed using the XSHUT pin. Pins: VIN, GND, SCL, SDA, GPIO1 (interrupt), XSHUT.",
    identify:
      "A tiny board with a small rectangular window module (an emitter and a receiver side by side under a clear cover, about 4.4 x 2.4 mm) and a 6-pin header: VIN, GND, SCL, SDA, GPIO1, XSHUT (the common blue GY-VL53L0XV2 style). Lookalikes: the VL53L1X reads up to 4 m and the VL6180X reads only a few centimetres; their libraries differ. Check the chip marking.",
    variants: [
      { label: "Breakout with regulator", detail: "VIN accepts a wider range than the chip. Check the listing; some say 3-5 V and some say 3.3 V only." },
      { label: "Several sensors on one bus", detail: "All use address 0x29, so wire each XSHUT to its own pin, hold all but one in reset and give each a new address in code." },
    ],
    watchOuts: [
      "Power from 3.3 V unless the listing clearly says the board takes 5 V. The chip itself is a 3.3 V part.",
      "Leave XSHUT and GPIO1 unconnected unless you need them. XSHUT is active LOW (low = off).",
      "The sensor works from about 30 mm: closer than that reads wrong.",
      "Black matte surfaces and bright sunlight reduce range and accuracy.",
      "Keep the cover window clean and do not cover it with tape.",
    ],
    photoCaption: "VL53L0X time-of-flight distance sensor board with a small laser window and a 6-pin header",
    photoHint: "vl53l0x",
    pins: [
      vcc("VIN", "VIN", "3v3"),
      gnd(),
      pin("SCL", "SCL", ["i2c"]),
      pin("SDA", "SDA", ["i2c"]),
      pin("GPIO1", "GPIO1", ["digital"]),
      pin("XSHUT", "XSHUT", ["digital"]),
    ],
  },
  {
    id: "module.ina219",
    name: "INA219 Current/Voltage Sensor",
    kind: "module",
    description:
      "High-side current and voltage monitor (INA219) with a built-in 0.1 ohm shunt. It measures the load voltage (up to 26 V) and the current through the load (up to about 3.2 A with the stock shunt), and can calculate power. Reads over I2C at address 0x40 by default (solder jumpers A0 and A1 change it to 0x41, 0x44 or 0x45). Pins: VCC, GND, SCL, SDA for the board; VIN+ and VIN- for the circuit being measured.",
    identify:
      "A small board (often blue, black or red) with a chip marked INA219 (or a code like 219), a small black or green shunt resistor marked R100, a 2-position screw terminal or two pads labelled VIN+ and VIN-, and a 6-pin header. The INA226 and INA260 look similar but have different addresses and libraries.",
    variants: [
      { label: "Header + screw terminal", detail: "Header for VCC, GND, SCL, SDA; terminal block for VIN+ and VIN-." },
      { label: "Address jumpers A0 / A1", detail: "Bridge the pads to change the I2C address and use several sensors on one bus." },
    ],
    watchOuts: [
      "Put it in series with the load on the positive side: supply + goes to VIN+, and VIN- goes to the load. It cannot measure without the current passing through it.",
      "The load's ground must be connected to the microcontroller's GND, or the readings are meaningless.",
      "Do not exceed 26 V on VIN+ / VIN-, or about 3.2 A through the stock shunt. Do not use it on mains.",
      "The VCC for the board is a 3-5.5 V logic supply, separate from the measured circuit. Do not connect the measured supply to VCC unless it is the same safe voltage.",
      "Wires and screw terminals must be tight; loose connections make readings jump and can heat up.",
    ],
    photoCaption: "INA219 current sensor board with a blue screw terminal for the load and a 6-pin header",
    photoHint: "ina219",
    pins: [
      vcc("VCC", "VCC"),
      gnd(),
      pin("SCL", "SCL", ["i2c"]),
      pin("SDA", "SDA", ["i2c"]),
      pin("VIN+", "VIN+", ["power"]),
      pin("VIN-", "VIN-", ["power"]),
    ],
  },
  {
    id: "module.acs712",
    name: "ACS712 Current Sensor",
    kind: "module",
    description:
      "Hall-effect current sensor module (ACS712) in 5 A, 20 A and 30 A versions. The load current flows through the screw terminals IP+ and IP- and the module outputs an analog voltage on OUT: about 2.5 V with no current, rising and falling with the current (185 mV per A on the 5 A model, 100 on the 20 A, 66 on the 30 A). Works for DC and AC. Needs 5 V. Pins: VCC, OUT, GND plus the terminal block IP+ and IP-.",
    identify:
      "A small blue board with a two-position screw terminal, a wide black 8-pin chip marked ACS712 with a suffix like 05B, 20A or 30A (this sets the range), and a 3-pin header VCC, OUT, GND. The range is printed on the chip or board; check it. Lookalike: the INA219 module is also a current sensor but digital (I2C) and for lower currents.",
    variants: [
      { label: "5 A / 20 A / 30 A", detail: "Same layout; sensitivity is 185 / 100 / 66 mV per ampere. Pick the range from the chip marking." },
      { label: "AC use", detail: "Possible but you must sample fast and compute the RMS. Not a beginner mains project; see the safety note." },
    ],
    watchOuts: [
      "MAINS WARNING: do not wire mains voltage (120/230 V) unless you are qualified. A mistake can kill you. Use it on low-voltage DC for learning, and fully insulate and enclose any mains wiring.",
      "Power it from 5 V. OUT idles at about 2.5 V and can reach near 5 V, so on a 3.3 V board (ESP32, ESP8266, Pico) add a voltage divider before the analog pin.",
      "Measure the idle voltage with no current and subtract it (zero offset), because it differs from board to board.",
      "The reading is noisy at small currents; average many samples and do not trust it below a few hundred milliamps.",
      "Do not exceed the rated current for the version you bought; the screw terminals and traces get hot.",
    ],
    photoCaption: "ACS712 current sensor module with a blue screw terminal, wide chip and a 3-pin header",
    photoHint: "acs712",
    pins: [
      vcc("VCC", "VCC", "5v"),
      pin("OUT", "OUT", ["analog"]),
      gnd(),
      pin("IP+", "IP+", ["power"]),
      pin("IP-", "IP-", ["power"]),
    ],
  },
  {
    id: "module.fsr",
    name: "Force Sensitive Resistor (FSR)",
    kind: "module",
    description:
      "A thin pressure-sensing pad whose resistance drops as you press harder (several megohms unpressed down to a few hundred ohms when pressed hard). It has two contacts and no polarity. To read it, wire it in a voltage divider with a fixed resistor (about 10 kohm) and read the middle point with an analog input. Good for detecting presses, a pad you step on, or rough force; it is not an accurate scale.",
    identify:
      "A round or square flexible pad (the round FSR 402 is about 12.7 mm across, a larger square one is about 40 mm) on a thin tail with two metal contacts or two pins at the end. The tail is fragile plastic. Lookalike: a flex sensor is a long thin strip; a load cell is a solid metal bar.",
    variants: [
      { label: "Round pad (about 12.7 mm)", detail: "The common FSR 402 style." },
      { label: "Square pad (about 40 mm)", detail: "Larger area, same wiring." },
    ],
    watchOuts: [
      "Do not solder directly to the tail: the heat melts the plastic. Use a clip, a crimp connector or the supplied pins.",
      "It needs a fixed resistor (about 10 kohm) from the analog pin to GND, with the FSR from the analog pin to VCC, or you will not get a stable reading.",
      "Do not bend the tail sharply and avoid pressing on the edge; spread the load over the round pad.",
      "Readings are only roughly proportional to force and differ between units. Use it for relative levels, not grams.",
      "Use the board's logic voltage as the supply so the divider stays inside the analog input range.",
    ],
    photoCaption: "Round force sensitive resistor pad on a thin flexible tail with two contacts",
    photoHint: "fsr",
    pins: [
      pin("1", "Contact 1", ["analog", "power", "ground"]),
      pin("2", "Contact 2", ["analog", "power", "ground"]),
    ],
  },
  // ------------------------------------------------------------------ positioning & wireless
  {
    id: "module.gps.neo6m",
    name: "GPS NEO-6M Module",
    kind: "module",
    description:
      "GPS receiver (u-blox NEO-6M on a breakout such as the GY-GPS6MV2) that reports position, speed, altitude and the UTC time. It talks serial (UART) at 9600 baud by default, sending NMEA text sentences about once per second, and works with libraries like TinyGPS++. Pins: VCC, GND, TX (module output), RX (module input); some boards also have PPS. Most breakouts have a regulator and accept 3-5 V on VCC, but the serial pins are 3.3 V.",
    identify:
      "A small blue board with a square ceramic patch antenna on top (about 25 mm), a metal-shielded chip, a small backup battery or capacitor, an LED that blinks once the module has a fix, and a 4-pin header (VCC, RX, TX, GND). The NEO-7M and NEO-M8N boards look similar but use different chips and speeds, so check the chip marking. A bare chip without an antenna board is not what this entry describes.",
    variants: [
      { label: "With ceramic patch antenna", detail: "The usual board. Needs a clear view of the sky." },
      { label: "With external antenna (SMA or u.FL)", detail: "Some boards have a plug for a bigger antenna. Plug it in before powering." },
      { label: "Other chips (NEO-7M, NEO-M8N)", detail: "Similar boards but not the NEO-6M; may use a different default baud rate." },
    ],
    watchOuts: [
      "It needs a clear view of the sky. Indoors it usually never gets a fix; take it outdoors or near a window and wait a few minutes for the first fix.",
      "Cross the serial wires: module TX goes to the board's RX pin, module RX goes to the board's TX pin.",
      "The module's RX pin is 3.3 V logic. With a 5 V board put a voltage divider on the board's TX wire (for example 1 kohm and 2 kohm).",
      "Power it from the voltage given on the board's label. Most boards take 3.3-5 V; a board without a regulator must have 3.3 V.",
      "With an Arduino Uno use SoftwareSerial on two other pins, not pins 0 and 1 (those are used for uploading).",
    ],
    photoCaption: "Blue NEO-6M GPS module with a square ceramic antenna on top and a 4-pin header",
    photoHint: "gps-neo6m",
    pins: [
      vcc("VCC", "VCC"),
      pin("RX", "RX", ["uart"]),
      pin("TX", "TX", ["uart"]),
      gnd(),
    ],
  },
  {
    id: "module.hc05",
    name: "HC-05 Bluetooth Serial",
    kind: "module",
    description:
      "Bluetooth Classic serial module (SPP) that makes a wireless serial link between your board and a phone, PC or another HC-05. It can be a master or a slave and is configured with AT commands. Default data speed 9600 baud, default pairing code 1234 (some are 0000). NOT Bluetooth Low Energy, so iPhones cannot use it. Module supply is 3.6-6 V, but the serial pins are 3.3 V. Pins: STATE, RXD, TXD, GND, VCC, EN (also called KEY).",
    identify:
      "A small green carrier board (often the ZS-040) with a silver metal-shielded radio module, a tiny push button, an LED and a 6-pin header STATE, RXD, TXD, GND, VCC, EN. The HC-06 looks very similar but has 4 pins, no button and no EN pin, and can only be a slave. Fast LED blinking (about twice per second) means not paired; slow blinking (every 2 seconds) means AT command mode. Counterfeit clones exist with other firmware.",
    variants: [
      { label: "6-pin board (STATE RXD TXD GND VCC EN)", detail: "The usual HC-05. Hold EN high while powering up, or press the button, to enter AT mode." },
      { label: "HC-06", detail: "Slave only, 4 pins, fewer AT commands. A separate catalog entry." },
      { label: "AT mode baud rate", detail: "AT commands run at 38400 baud in AT mode on a standard HC-05, while normal data mode is 9600. Check the datasheet for your firmware." },
    ],
    watchOuts: [
      "The RXD pin is 3.3 V logic. From a 5 V board (Arduino Uno or Nano) use a voltage divider (for example 1 kohm and 2 kohm) on the board's TX wire. 5 V can damage it over time.",
      "VCC needs 3.6 V or more, so the 3.3 V pin of a board cannot power it. Use 5 V.",
      "Cross the wires: module TXD goes to the board's RX, module RXD goes to the board's TX.",
      "On an Arduino Uno use SoftwareSerial on other pins, or unplug RXD/TXD while uploading (pins 0 and 1 are shared with USB).",
      "Pairing code 1234 is public. Change the password with AT commands if the project matters.",
    ],
    photoCaption: "Green HC-05 Bluetooth module board with a silver shielded module and a 6-pin header",
    photoHint: "hc05",
    pins: [
      pin("STATE", "STATE", ["digital"]),
      pin("RXD", "RXD", ["uart"]),
      pin("TXD", "TXD", ["uart"]),
      gnd(),
      vcc("VCC", "VCC", "5v"),
      pin("EN", "EN (KEY)", ["digital"]),
    ],
  },
  {
    id: "module.hc06",
    name: "HC-06 Bluetooth Serial",
    kind: "module",
    description:
      "Bluetooth Classic serial module (SPP) that can only be a slave: your phone or PC connects to it and it passes the data to your board over serial. Default 9600 baud, default pairing code 1234. A simpler, cheaper version of the HC-05. NOT Bluetooth Low Energy. Module supply is 3.6-6 V, but the serial pins are 3.3 V. Pins: VCC, GND, TXD, RXD (some boards add STATE).",
    identify:
      "A small green carrier board with a silver metal-shielded radio module, an LED and a 4-pin header (often VCC, GND, TXD, RXD). It has no button and no EN pin, unlike the 6-pin HC-05. The LED blinks fast until paired, then stays on. The default name is usually HC-06 or linvor. To confirm, send AT at 9600 baud: a working HC-06 replies OK, and AT+VERSION names the firmware.",
    variants: [
      { label: "4-pin board (VCC GND TXD RXD)", detail: "The usual HC-06. STATE exists on some boards." },
      { label: "AT commands", detail: "Work only while not paired. Some firmware needs no line ending after each command; check your version." },
    ],
    watchOuts: [
      "The RXD pin is 3.3 V logic. From a 5 V board use a voltage divider (for example 1 kohm and 2 kohm) on the board's TX wire.",
      "VCC needs 3.6 V or more, so use 5 V. The 3.3 V pin of a board cannot power it.",
      "Cross the wires: module TXD goes to the board's RX, module RXD goes to the board's TX.",
      "It cannot start a connection by itself. If you need two boards talking, use HC-05 modules (one as master).",
      "Use SoftwareSerial on an Arduino Uno rather than pins 0 and 1, or unplug RXD/TXD while uploading.",
    ],
    photoCaption: "Green HC-06 Bluetooth module board with a silver shielded module and a 4-pin header",
    photoHint: "hc06",
    pins: [
      vcc("VCC", "VCC", "5v"),
      gnd(),
      pin("TXD", "TXD", ["uart"]),
      pin("RXD", "RXD", ["uart"]),
      pin("STATE", "STATE", ["digital"]),
    ],
  },
  {
    id: "module.nrf24l01",
    name: "nRF24L01+ Radio",
    kind: "module",
    description:
      "2.4 GHz wireless transceiver (nRF24L01+) for sending short messages between two or more boards, typically up to about 100 m in the open (more with the PA/LNA version). It talks SPI (SCK, MOSI, MISO, CSN) plus CE (chip enable) and IRQ pins, and works with the RF24 library. Runs on 3.3 V ONLY (1.9-3.6 V). Eight pins in two rows: GND, VCC, CE, CSN, SCK, MOSI, MISO, IRQ. You need at least two modules.",
    identify:
      "A small blue or green board (about 15 x 29 mm) with a metal-lidded chip, a zig-zag PCB antenna on one end and a 2 x 4 pin header on the other. The PA/LNA version has a taller shield and an SMA antenna socket with a rubber duck antenna. The adapter board sold with it (with a regulator) has a socket for the module and a 5 V input. Check which one you have.",
    variants: [
      { label: "Standard (PCB antenna)", detail: "Short range, about 20-100 m in the open." },
      { label: "PA/LNA with external antenna", detail: "Much longer range (about 1 km line of sight) but draws far more current. Attach the antenna before powering." },
      { label: "With 5 V adapter board", detail: "Has a regulator and lets you feed 5 V; the signal pins are still 3.3 V." },
    ],
    watchOuts: [
      "VCC is 3.3 V ONLY. 5 V on VCC destroys it. Pin 1 (GND) is usually marked with a square pad or arrow; check before powering.",
      "Add a capacitor (10 uF to 100 uF, ideally with 100 nF in parallel) right at the module between VCC and GND, or it resets and loses packets. This is the number one cause of problems.",
      "An Arduino's 3.3 V pin is weak; the module's current spikes can make it flaky. Use a separate 3.3 V regulator or the adapter board.",
      "The datasheet says the signal inputs are 5 V tolerant, but check your board and prefer 3.3 V logic or a level shifter on SCK, MOSI, CSN and CE.",
      "Never run a PA/LNA module without its antenna attached.",
    ],
    photoCaption: "Small nRF24L01+ radio board with a zig-zag PCB antenna and a 2 by 4 pin header",
    photoHint: "nrf24l01",
    pins: [
      gnd(),
      vcc("VCC", "VCC", "3v3"),
      pin("CE", "CE", ["digital"]),
      pin("CSN", "CSN", ["spi"]),
      pin("SCK", "SCK", ["spi"]),
      pin("MOSI", "MOSI", ["spi"]),
      pin("MISO", "MISO", ["spi"]),
      pin("IRQ", "IRQ", ["digital"]),
    ],
  },
  {
    id: "module.lora.sx127x",
    name: "LoRa SX1278 / RFM95 Module",
    kind: "module",
    description:
      "Long-range, low-power radio module based on the SX1276/SX1278 family (Ra-02 and RFM95 style boards). It sends small messages many kilometres line of sight at low data rates. It talks SPI (SCK, MOSI, MISO, NSS) plus RST and DIO0 (interrupt), and works with the LoRa library. Runs on 3.3 V ONLY. The frequency band differs by version: 433 MHz is typical for SX1278, 868 or 915 MHz for RFM95. You need two modules.",
    identify:
      "A small board (about 17 x 16 mm for the Ra-02 style) with a metal shield and edge pads, or a breakout with pin headers and an antenna connector or wire. The marking shows SX1278, SX1276 or RFM95/RFM96. The frequency is printed or in the listing: pick the band that is legal in your country. An SX1278 board and an RFM95 board are not interchangeable across 433 and 868/915 MHz.",
    variants: [
      { label: "SX1278 (433 MHz, Ra-02 style)", detail: "Edge pads with 2 mm pitch; usually needs an adapter to fit a breadboard." },
      { label: "RFM95 / SX1276 (868 or 915 MHz)", detail: "Pick 868 MHz in Europe and 915 MHz in the Americas and Australia." },
      { label: "Breakout board", detail: "Pins brought out to a 0.1 inch header; check the silkscreen for the order." },
    ],
    watchOuts: [
      "Attach an antenna BEFORE powering the module. Transmitting with no antenna can damage the output stage.",
      "3.3 V ONLY on power and on all the signal pins. A 5 V board needs a level shifter on SCK, MOSI, NSS and RST.",
      "It can draw over 100 mA while transmitting. Use a decent 3.3 V supply with a 100 uF capacitor close to the module, not a weak board pin.",
      "Antenna length for a wire: about 17 cm for 433 MHz and about 8 cm for 868/915 MHz. Check the listing.",
      "Use only the frequency and power allowed in your country. Both ends must use the same frequency, spreading factor and sync word.",
    ],
    photoCaption: "Small SX1278 LoRa module with a metal shield, edge pads and a wire antenna",
    photoHint: "lora-sx127x",
    pins: [
      vcc("3V3", "3V3", "3v3"),
      gnd(),
      pin("MISO", "MISO", ["spi"]),
      pin("MOSI", "MOSI", ["spi"]),
      pin("SCK", "SCK", ["spi"]),
      pin("NSS", "NSS", ["spi"]),
      pin("RST", "RST", ["digital"]),
      pin("DIO0", "DIO0", ["digital"]),
      pin("DIO1", "DIO1", ["digital"]),
    ],
  },
  {
    id: "module.rfid.rc522",
    name: "RFID RC522 Reader",
    kind: "module",
    description:
      "13.56 MHz RFID reader/writer (MFRC522 chip) that reads the ID and memory of MIFARE Classic cards and key fobs (and NTAG tags) held within about 3 cm. Uses SPI (also I2C or UART on the chip, not on the common board). Runs on 3.3 V ONLY. Eight pins: SDA (this is SS/chip select in SPI), SCK, MOSI, MISO, IRQ, GND, RST, 3.3V. Use the MFRC522 library. It usually ships with a white card and a blue key fob.",
    identify:
      "A small white or blue board (about 40 x 60 mm) with a printed square antenna coil, a chip marked MFRC522 and an 8-pin header on one edge. Lookalikes: the PN532 NFC board is red, has DIP switches and supports more modes; the RDM6300 reads 125 kHz cards and is a different system; the cards are not interchangeable.",
    variants: [
      { label: "Common 8-pin board", detail: "SDA is the SPI chip select (SS) on this board, not I2C data." },
      { label: "Cards and tags", detail: "Reads MIFARE Classic 1K and NTAG. It cannot read encrypted bank cards, many door passes or 125 kHz tags." },
    ],
    watchOuts: [
      "3.3 V ONLY. 5 V on the 3.3V pin damages it. The signal pins are also 3.3 V logic, so use a level shifter or divider from a 5 V board such as an Uno.",
      "The pin labelled SDA is the SPI chip select (SS). It is not an I2C data pin.",
      "Do not write to block 0 or to sector trailers by accident; you can lock a card for good. Read the UID first.",
      "The read range is only about 3 cm and drops with metal behind the card; keep the antenna side toward the card.",
      "Each board needs the 3.3 V supply to deliver around 20-30 mA; a board's 3.3 V pin is usually enough.",
    ],
    photoCaption: "RC522 RFID reader board with a printed antenna coil, an 8-pin header and a blue key fob",
    photoHint: "rc522",
    pins: [
      pin("SDA", "SDA (SS)", ["spi"]),
      pin("SCK", "SCK", ["spi"]),
      pin("MOSI", "MOSI", ["spi"]),
      pin("MISO", "MISO", ["spi"]),
      pin("IRQ", "IRQ", ["digital"]),
      gnd(),
      pin("RST", "RST", ["digital"]),
      vcc("3V3", "3.3V", "3v3"),
    ],
  },
  {
    id: "module.pn532",
    name: "PN532 NFC Reader",
    kind: "module",
    description:
      "13.56 MHz NFC reader/writer (PN532) that reads MIFARE and NTAG cards and phone-based NFC tags at a few centimetres. Three communication modes picked by two small DIP switches on the board: I2C, SPI or HSU (a serial/UART mode). Uses the Adafruit PN532 library or similar. On the common red V3 board the supply is 3.3-5 V (check the label) and the I2C address is 0x24. Pins: VCC, GND, SDA, SCL, SCK, MISO, MOSI, SS, IRQ, RSTO.",
    identify:
      "A red (or blue) board about 43 x 40 mm with a large square printed antenna, a chip marked PN532, two small DIP switches or selector pads and 4-pin headers. The RC522 board is smaller, white or blue, with no DIP switches. The mode table is printed on the board near the switches.",
    variants: [
      { label: "I2C mode", detail: "Set the two switches as shown in the table printed on the board, then connect VCC, GND, SDA and SCL. Address 0x24." },
      { label: "SPI mode", detail: "Set the switches for SPI and use SCK, MISO, MOSI and SS. The PN532 sends bits LSB first, so the library has to handle that." },
      { label: "HSU (UART) mode", detail: "Serial at 115200 baud. Check the pin labels on your board." },
    ],
    watchOuts: [
      "Set the two DIP switches for the mode you wire, and set them with the power off. A wrong setting gives 'PN532 not found'.",
      "The mode table on the board is the reference; the position names (ON, OFF, 0, 1) differ between versions, so check the table, do not guess.",
      "Check the supply label. Many V3 boards take 3.3-5 V through a regulator, but the logic is 3.3 V; use a level shifter from a 5 V board.",
      "Keep the antenna area away from metal for best range.",
      "Not every card is readable. Encrypted cards (bank cards, DESFire passes) are not supported by the simple libraries.",
    ],
    photoCaption: "Red PN532 NFC board with a large square antenna, a chip and a DIP mode switch",
    photoHint: "pn532",
    pins: [
      vcc("VCC", "VCC"),
      gnd(),
      pin("SDA", "SDA", ["i2c"]),
      pin("SCL", "SCL", ["i2c"]),
      pin("SCK", "SCK", ["spi"]),
      pin("MISO", "MISO", ["spi"]),
      pin("MOSI", "MOSI", ["spi"]),
      pin("SS", "SS", ["spi"]),
      pin("IRQ", "IRQ", ["digital"]),
      pin("RSTO", "RSTO", ["digital"]),
    ],
  },
  {
    id: "module.ds3231",
    name: "DS3231 RTC",
    kind: "module",
    description:
      "Real-time clock module (DS3231, often sold as ZS-042) that keeps the date and time while the board is off, using a coin cell. It is far more accurate than the DS1307 (about +-2 ppm, roughly a minute a year) because it has a built-in temperature-compensated crystal, and it also reads temperature. I2C address 0x68, with an AT24C32 EEPROM on the same board at 0x57. Runs from 3.3 to 5 V. Pins: 32K, SQW, SCL, SDA, VCC, GND.",
    identify:
      "A small board, usually blue, with a wide 16-pin chip marked DS3231, a coin cell holder, a small 8-pin EEPROM chip (24C32) and a 6- to 7-pin header (32K, SQW, SCL, SDA, VCC, GND). The DS1307 board looks very similar but has a small 8-pin chip and only runs from 5 V. Check the chip marking. A separate tiny DS3231 board with a ML2032 or no battery holder exists too.",
    variants: [
      { label: "ZS-042 style board", detail: "Has a charging circuit meant for a rechargeable LIR2032 cell. See the battery warning." },
      { label: "Board with a plain holder", detail: "Takes a CR2032 safely. Check the board description before choosing a battery." },
    ],
    watchOuts: [
      "Battery safety: many ZS-042 boards try to charge the coin cell. Fitting a normal CR2032 (not rechargeable) can overheat or leak. Use a rechargeable LIR2032, or disable the charging path (commonly by removing the small resistor marked 201 on the charging path; check a guide for your board revision).",
      "Set the time once from your code; a fresh battery starts unset or wrong.",
      "The pull-up resistors on SDA and SCL go to VCC. On a 3.3 V board power the module from 3.3 V so the I2C lines stay at 3.3 V.",
      "Do not rely on the 32K or SQW pins unless you need them; leave them unconnected.",
      "Scan the I2C bus: you will see two addresses (0x68 for the clock and 0x57 for the EEPROM) on most boards.",
    ],
    photoCaption: "Blue DS3231 real-time clock module with a coin cell holder and a 6-pin header",
    photoHint: "ds3231",
    pins: [
      pin("32K", "32K", ["digital"]),
      pin("SQW", "SQW", ["digital"]),
      pin("SCL", "SCL", ["i2c"]),
      pin("SDA", "SDA", ["i2c"]),
      vcc("VCC", "VCC", "5v"),
      gnd(),
    ],
  },
  // ------------------------------------------------------------------ chips: shift register, expanders, ADC, Wi-Fi
  {
    id: "module.74hc595",
    name: "74HC595 Shift Register",
    kind: "module",
    description:
      "8-bit shift register chip (DIP-16) that gives you 8 extra digital outputs from 3 pins of your board. You send 8 bits in serially on SER with a clock on SRCLK, then pulse RCLK to show them on outputs QA-QH. Chips can be chained: QH' (pin 9) feeds the SER of the next chip. Supply 2-6 V. Each output should be limited to a few milliamps for LEDs (use a resistor); the chip's total must stay within its limits. Pin 1 is QB; QA is pin 15.",
    identify:
      "A black 16-pin DIP chip with a notch (or dot) at one end and the marking 74HC595 (sometimes with a maker prefix and suffix such as SN74HC595N). With the notch at the top, pin 1 is top-left and pin 16 (VCC) is top-right. Lookalikes: 74HCT595 (same, but with TTL-level inputs, good with a 3.3 V board on a 5 V supply), 74HC164 (a different shift register without a latch), and the TPIC6B595 (a power version).",
    variants: [
      { label: "74HC595N (DIP-16)", detail: "The breadboard-friendly one this entry describes." },
      { label: "74HCT595", detail: "Same pinout; its inputs accept normal 3.3 V logic when powered from 5 V." },
      { label: "SMD versions", detail: "Same pinout in a small flat package; not breadboard-friendly." },
    ],
    watchOuts: [
      "Tie OE (pin 13) to GND to enable the outputs, and SRCLR (pin 10) to VCC. If they are left floating the chip does nothing or outputs flicker.",
      "Do not power a 74HC595 from 5 V and drive it from a 3.3 V board: 3.3 V may not count as HIGH. Power it from 3.3 V, or use a 74HCT595 or a level shifter.",
      "Put a 220-330 ohm resistor on every LED output. Keep each output to a few milliamps and the total under the chip's limit; do not drive a motor or relay directly.",
      "Place the notch correctly. Pin numbering runs down the notch side and back up the other.",
      "Add a 0.1 uF decoupling capacitor between VCC and GND close to the chip.",
    ],
    photoCaption: "Black 16-pin DIP 74HC595 shift register chip with a notch at one end",
    photoHint: "74hc595",
    pins: [
      pin("QB", "QB (pin 1)", ["digital"]),
      pin("QC", "QC (pin 2)", ["digital"]),
      pin("QD", "QD (pin 3)", ["digital"]),
      pin("QE", "QE (pin 4)", ["digital"]),
      pin("QF", "QF (pin 5)", ["digital"]),
      pin("QG", "QG (pin 6)", ["digital"]),
      pin("QH", "QH (pin 7)", ["digital"]),
      gnd("GND", "GND (pin 8)"),
      pin("QH_", "QH' (pin 9)", ["digital"]),
      pin("SRCLR", "SRCLR (pin 10)", ["digital"]),
      pin("SRCLK", "SRCLK (pin 11)", ["digital"]),
      pin("RCLK", "RCLK (pin 12)", ["digital"]),
      pin("OE", "OE (pin 13)", ["digital"]),
      pin("SER", "SER (pin 14)", ["digital"]),
      pin("QA", "QA (pin 15)", ["digital"]),
      vcc("VCC", "VCC (pin 16)", "5v"),
    ],
  },
  {
    id: "module.pcf8574",
    name: "PCF8574 I2C GPIO Expander",
    kind: "module",
    description:
      "I2C expander (PCF8574) that adds 8 digital input/output pins (P0-P7) to your board using just SDA and SCL. The same chip is on the back of the common LCD I2C backpack. Address is 0x20-0x27 (PCF8574) or 0x38-0x3F (PCF8574A), set by A0, A1, A2 jumpers or solder pads. An INT pin signals when an input changes. Supply 2.5-6 V. Pins on the module: GND, VCC, SDA, SCL, INT, P0-P7, A0-A2.",
    identify:
      "A small blue board with a 16-pin chip marked PCF8574 (or PCF8574A / PCA8574), a row of 8 pins P0-P7, a few pins GND, VCC, SDA, SCL, INT and three jumper pads A0, A1, A2. The address range tells the version: 0x20-0x27 is PCF8574, 0x38-0x3F is PCF8574A. The MCP23017 is a 16-pin-I/O chip with a different address range and registers.",
    variants: [
      { label: "PCF8574 (0x20-0x27)", detail: "Original chip." },
      { label: "PCF8574A (0x38-0x3F)", detail: "Same functions with a different address block." },
    ],
    watchOuts: [
      "The pins are 'quasi-bidirectional': they can pull LOW strongly (about 25 mA) but only weakly pull HIGH (about 100 uA). Wire LEDs from VCC through a resistor to the pin so the pin sinks the current (the LED lights when you write LOW).",
      "Set the address with A0-A2 and run an I2C scan. Do not guess; the address depends on the pads.",
      "Write HIGH to a pin before using it as an input.",
      "The I2C pull-ups on the module go to VCC. On a 3.3 V board power the module from 3.3 V.",
      "The total current per chip is limited; do not drive motors or a bright LED strip directly.",
    ],
    photoCaption: "Blue PCF8574 I2C expander board with a 16-pin chip, address pads and a pin header",
    photoHint: "pcf8574",
    pins: [
      gnd(),
      vcc("VCC", "VCC", "5v"),
      pin("SDA", "SDA", ["i2c"]),
      pin("SCL", "SCL", ["i2c"]),
      pin("INT", "INT", ["digital"]),
      pin("A0", "A0", ["digital"]),
      pin("A1", "A1", ["digital"]),
      pin("A2", "A2", ["digital"]),
      pin("P0", "P0", ["digital"]),
      pin("P1", "P1", ["digital"]),
      pin("P2", "P2", ["digital"]),
      pin("P3", "P3", ["digital"]),
      pin("P4", "P4", ["digital"]),
      pin("P5", "P5", ["digital"]),
      pin("P6", "P6", ["digital"]),
      pin("P7", "P7", ["digital"]),
    ],
  },
  {
    id: "module.mcp23017",
    name: "MCP23017 I2C GPIO Expander",
    kind: "module",
    description:
      "I2C expander (MCP23017) that adds 16 digital input/output pins in two ports (GPA0-GPA7 and GPB0-GPB7) over just SDA and SCL. Unlike the PCF8574 its pins are proper push-pull outputs (about 25 mA each), have internal pull-up options and two interrupt outputs INTA and INTB. Address 0x20-0x27, set by A0, A1, A2. Supply 1.8-5.5 V. DIP-28 (skinny) package. RESET must be tied HIGH.",
    identify:
      "A black 28-pin chip in a narrow DIP package (7.6 mm / 0.3 inch wide) marked MCP23017, usually with -E/SP at the end. With the notch at the top, pin 1 (GPB0) is top-left and pin 28 (GPA7) is top-right; the pin numbers run down the left side and back up the right. The MCP23S17 looks identical but uses SPI instead of I2C; check the full marking (017 = I2C, S17 = SPI).",
    variants: [
      { label: "MCP23017-E/SP (DIP-28)", detail: "The breadboard-friendly one this entry describes." },
      { label: "Breakout boards", detail: "Small boards with the same chip and pins brought out; labels match the pin names here." },
    ],
    watchOuts: [
      "Tie RESET (pin 18) to VDD. Left floating the chip resets at random.",
      "Never leave A0, A1, A2 floating. Tie each to GND or VDD; the combination sets the address (all to GND gives 0x20).",
      "Pin 10 is VSS (ground) and pin 9 is VDD. The pins labelled NC (11, 14) are not connected.",
      "Configure pin directions in code, because every pin starts as an input.",
      "Add a 0.1 uF capacitor between VDD and VSS close to the chip, and pull-ups on SDA and SCL if the board has none.",
    ],
    photoCaption: "Black 28-pin narrow DIP MCP23017 I2C expander chip with a notch at one end",
    photoHint: "mcp23017",
    pins: [
      pin("GPB0", "GPB0 (pin 1)", ["digital"]),
      pin("GPB1", "GPB1 (pin 2)", ["digital"]),
      pin("GPB2", "GPB2 (pin 3)", ["digital"]),
      pin("GPB3", "GPB3 (pin 4)", ["digital"]),
      pin("GPB4", "GPB4 (pin 5)", ["digital"]),
      pin("GPB5", "GPB5 (pin 6)", ["digital"]),
      pin("GPB6", "GPB6 (pin 7)", ["digital"]),
      pin("GPB7", "GPB7 (pin 8)", ["digital"]),
      vcc("VDD", "VDD (pin 9)", "5v"),
      gnd("VSS", "VSS (pin 10)"),
      pin("SCL", "SCL (pin 12)", ["i2c"]),
      pin("SDA", "SDA (pin 13)", ["i2c"]),
      pin("A0", "A0 (pin 15)", ["digital"]),
      pin("A1", "A1 (pin 16)", ["digital"]),
      pin("A2", "A2 (pin 17)", ["digital"]),
      pin("RESET", "RESET (pin 18)", ["digital"]),
      pin("INTB", "INTB (pin 19)", ["digital"]),
      pin("INTA", "INTA (pin 20)", ["digital"]),
      pin("GPA0", "GPA0 (pin 21)", ["digital"]),
      pin("GPA1", "GPA1 (pin 22)", ["digital"]),
      pin("GPA2", "GPA2 (pin 23)", ["digital"]),
      pin("GPA3", "GPA3 (pin 24)", ["digital"]),
      pin("GPA4", "GPA4 (pin 25)", ["digital"]),
      pin("GPA5", "GPA5 (pin 26)", ["digital"]),
      pin("GPA6", "GPA6 (pin 27)", ["digital"]),
      pin("GPA7", "GPA7 (pin 28)", ["digital"]),
    ],
  },
  {
    id: "module.ads1115",
    name: "ADS1115 16-bit ADC",
    kind: "module",
    description:
      "Precision analog-to-digital converter (ADS1115) with 16-bit resolution and four analog inputs A0-A3 (or two differential pairs), read over I2C. A big step up from the 10-bit or noisy built-in ADC of an Arduino, ESP8266 or ESP32. It has a programmable gain amplifier, a data-ready/alert pin (ALRT) and runs up to 860 samples per second. Address 0x48-0x4B, set by the ADDR pin. Supply 2.0-5.5 V. Pins: VDD, GND, SCL, SDA, ADDR, ALRT, A0-A3.",
    identify:
      "A small board (often blue or teal) with a tiny chip marked ADS1115 and a header of 10 pins, with A0-A3 on one side and I2C on the other. The ADS1015 is the faster 12-bit sibling in the same board shape; check the chip marking and the listing.",
    variants: [
      { label: "ADS1115 (16-bit, 860 SPS)", detail: "This entry. Better accuracy, slower." },
      { label: "ADS1015 (12-bit, 3300 SPS)", detail: "Same board and pinout; different library settings and resolution." },
      { label: "Address by ADDR pin", detail: "GND = 0x48, VDD = 0x49, SDA = 0x4A, SCL = 0x4B." },
    ],
    watchOuts: [
      "Never put more than VDD plus 0.3 V on an analog input, even if the gain setting says +-6.144 V. On a 3.3 V supply, keep inputs at 3.3 V or lower.",
      "Tie ADDR to GND (0x48) or the chosen pin; do not leave it floating.",
      "It is slower than the built-in ADC (up to 860 samples per second); fine for sensors, not for audio.",
      "The signal wires pick up noise: keep them short and the ground common.",
      "Choose the gain for your signal, otherwise the reading is clipped or has poor resolution.",
    ],
    photoCaption: "Teal ADS1115 16-bit ADC breakout with four analog inputs on one side and an I2C header on the other",
    photoHint: "ads1115",
    pins: [
      vcc("VDD", "VDD"),
      gnd(),
      pin("SCL", "SCL", ["i2c"]),
      pin("SDA", "SDA", ["i2c"]),
      pin("ADDR", "ADDR", ["digital"]),
      pin("ALRT", "ALRT", ["digital"]),
      pin("A0", "A0", ["analog"]),
      pin("A1", "A1", ["analog"]),
      pin("A2", "A2", ["analog"]),
      pin("A3", "A3", ["analog"]),
    ],
  },
  {
    id: "module.esp01",
    name: "ESP-01 Wi-Fi Module (ESP8266)",
    kind: "module",
    description:
      "Tiny Wi-Fi module (ESP8266) that adds internet to a board over a serial (UART) link, using the AT command firmware that comes on it (AT commands at 115200 baud, older ones at 9600). It can also be programmed by itself. Runs on 3.3 V ONLY and can draw 200-300 mA or more in bursts, which a board's 3.3 V pin often cannot deliver. Eight pins in two rows: VCC, GND, TX, RX, CH_PD (enable), RST, GPIO0, GPIO2.",
    identify:
      "A small black (ESP-01) or blue (ESP-01S) board about 14 x 25 mm with a metal-shielded chip, an 8-pin 2 x 4 header, a zig-zag PCB antenna and two LEDs. The two rows of pins are too close for a normal breadboard, so people use an adapter board (with a regulator and level shifting) or jumper wires. The ESP-01S has 1 MB flash, the older ESP-01 has 512 KB.",
    variants: [
      { label: "ESP-01", detail: "Older, 512 KB flash (black board)." },
      { label: "ESP-01S", detail: "1 MB flash (blue board). Same pins." },
      { label: "With adapter board", detail: "Has a 3.3 V regulator and level shifter on the serial pins and a 5 V input. Usually the easiest way to use it." },
    ],
    watchOuts: [
      "3.3 V ONLY. 5 V on VCC destroys it. The RX and TX pins are also 3.3 V; from a 5 V board put a voltage divider or level shifter on the board's TX line.",
      "Do not power it from an Arduino 3.3 V pin: it cannot supply the current spikes. Use a separate 3.3 V regulator (AMS1117 type) and a 100 uF capacitor next to the module.",
      "CH_PD (EN) must be tied to 3.3 V or the module stays off. Leave RST and GPIO2 unconnected or pulled up; GPIO0 low at power-up enters flash mode.",
      "The pin order is easy to get wrong because the 2 x 4 header is not symmetric. Use the pinout printed on your adapter or the seller's drawing, not memory.",
      "Cross TX and RX: module TX goes to the board's RX pin, module RX to the board's TX pin.",
    ],
    photoCaption: "Small black ESP-01 Wi-Fi module with a shielded chip, a PCB antenna and a 2 by 4 pin header",
    photoHint: "esp01",
    pins: [
      vcc("VCC", "VCC", "3v3"),
      gnd(),
      pin("TX", "TX", ["uart"]),
      pin("RX", "RX", ["uart"]),
      pin("CH_PD", "CH_PD (EN)", ["digital"]),
      pin("RST", "RST", ["digital"]),
      pin("GPIO0", "GPIO0", ["digital"]),
      pin("GPIO2", "GPIO2", ["digital"]),
    ],
  },
];

const SENSOR_ELECTRICAL: Record<string, PartElectrical> = {
  // BME280 / BMP280 chip is 3.3 V only; the 6 pin boards pass the signals straight through.
  "module.bme280": {
    supply: V3_3_ONLY,
    logic: "3v3",
    inputOnlyPins: ["CSB", "SDO"],
    inputMaxVolts: 3.6,
  },
  "module.bmp280": {
    supply: V3_3_ONLY,
    logic: "3v3",
    inputOnlyPins: ["CSB", "SDO"],
    inputMaxVolts: 3.6,
  },
  "module.ds18b20": { supply: { min: 3.0, max: 5.5 }, logic: "5v", logicFollowsSupply: true },
  "module.dht11": { supply: { min: 3.0, max: 5.5 }, logic: "5v", logicFollowsSupply: true },
  // Analog sensors: the output is a small analog voltage, not a logic level.
  "module.lm35": { supply: { min: 4.0, max: 30 } },
  "module.tmp36": { supply: { min: 2.7, max: 5.5 } },
  "module.bh1750": {
    supply: V3_TO_5,
    logic: "3v3",
    inputOnlyPins: ["ADDR"],
    inputMaxVolts: 3.6,
    inputMaxIsHard: false,
  },
  "module.tcs34725": {
    logic: "3v3",
    pins: {
      "3V3": { accepts: V3_3_ONLY },
      VIN: { accepts: V3_TO_5 },
    },
    inputOnlyPins: ["LED"],
    inputMaxVolts: 3.6,
    inputMaxIsHard: false,
  },
  // A3144 needs 4.5 V or more; its output is a pull-up to the supply.
  "module.hall.a3144": { supply: V5, logic: "5v", logicFollowsSupply: true },
  "module.reed.switch": { supply: V3_5, logic: "5v", logicFollowsSupply: true },
  "module.tcrt5000": { supply: V3_5, logic: "5v", logicFollowsSupply: true },
  "module.ir.obstacle": { supply: V3_5, logic: "5v", logicFollowsSupply: true },
  "module.rain.fc37": { supply: V3_5, logic: "5v", logicFollowsSupply: true },
  "module.water.level": { supply: { min: 3.0, max: 5.5 }, logic: "5v", logicFollowsSupply: true },
  "module.soil.resistive": { supply: V3_5, logic: "5v", logicFollowsSupply: true },
  // MQ heater needs 5 V; the analog output can reach the supply voltage.
  "module.mq135": { supply: V5, logic: "5v", logicFollowsSupply: true },
  "module.max9814": { supply: { min: 2.7, max: 5.5 }, inputOnlyPins: ["GAIN", "AR"] },
  "module.adxl345": {
    supply: V3_TO_5,
    logic: "3v3",
    inputOnlyPins: ["CS", "SDO"],
    inputMaxVolts: 3.6,
    inputMaxIsHard: false,
  },
  "module.qmc5883l": {
    supply: V3_TO_5,
    logic: "3v3",
    inputMaxVolts: 3.6,
    inputMaxIsHard: false,
  },
  "module.vl53l0x": {
    supply: V3_3_ONLY,
    logic: "3v3",
    inputOnlyPins: ["XSHUT"],
    inputMaxVolts: 3.6,
    inputMaxIsHard: false,
  },
  // The VIN+ / VIN- terminals carry the circuit being measured (up to 26 V), not the logic supply.
  "module.ina219": {
    supply: V3_TO_5,
    logic: "5v",
    logicFollowsSupply: true,
    pins: {
      "VIN+": { accepts: { min: 0, max: 26 } },
      "VIN-": { accepts: { min: 0, max: 26 } },
    },
  },
  // IP+ / IP- are the load terminals. Capped at a low voltage on purpose: no mains guides.
  "module.acs712": {
    supply: V5,
    logic: "5v",
    logicFollowsSupply: true,
    pins: {
      "IP+": { accepts: { min: 0, max: 48 } },
      "IP-": { accepts: { min: 0, max: 48 } },
    },
  },
  "module.gps.neo6m": {
    supply: V3_TO_5,
    logic: "3v3",
    inputOnlyPins: ["RX"],
    inputMaxVolts: 3.6,
  },
  // Module VCC is 3.6-6 V (onboard regulator) but the serial pins are 3.3 V.
  "module.hc05": {
    supply: { min: 3.6, max: 6 },
    logic: "3v3",
    inputOnlyPins: ["RXD", "EN"],
    inputMaxVolts: 3.6,
  },
  "module.hc06": {
    supply: { min: 3.6, max: 6 },
    logic: "3v3",
    inputOnlyPins: ["RXD"],
    inputMaxVolts: 3.6,
  },
  // The datasheet allows 5 V on the signal inputs, but boards vary, so only warn.
  "module.nrf24l01": {
    supply: { min: 1.9, max: 3.6 },
    logic: "3v3",
    inputOnlyPins: ["CE", "CSN", "SCK", "MOSI"],
    inputMaxVolts: 3.6,
    inputMaxIsHard: false,
  },
  "module.lora.sx127x": {
    supply: V3_3_ONLY,
    logic: "3v3",
    inputOnlyPins: ["NSS", "SCK", "MOSI", "RST"],
    inputMaxVolts: 3.6,
  },
  "module.rfid.rc522": {
    supply: V3_3_ONLY,
    logic: "3v3",
    inputOnlyPins: ["SDA", "SCK", "MOSI", "RST"],
    inputMaxVolts: 3.6,
  },
  "module.pn532": {
    supply: V3_TO_5,
    logic: "3v3",
    inputOnlyPins: ["SCK", "MOSI", "SS"],
    inputMaxVolts: 3.6,
    inputMaxIsHard: false,
  },
  "module.ds3231": { supply: V3_TO_5, logic: "5v", logicFollowsSupply: true },
  // HC logic: HIGH is 70 % of VCC, so a 3.3 V signal into a 5 V chip is marginal.
  "module.74hc595": {
    supply: { min: 2.0, max: 6.0 },
    logic: "5v",
    logicFollowsSupply: true,
    inputOnlyPins: ["SER", "SRCLK", "RCLK", "OE", "SRCLR"],
    inputHighFraction: 0.7,
  },
  "module.pcf8574": { supply: { min: 2.5, max: 6.0 }, logic: "5v", logicFollowsSupply: true, inputOnlyPins: ["A0", "A1", "A2"] },
  "module.mcp23017": {
    supply: { min: 1.8, max: 5.5 },
    logic: "5v",
    logicFollowsSupply: true,
    inputOnlyPins: ["A0", "A1", "A2", "RESET"],
  },
  "module.ads1115": {
    supply: { min: 2.0, max: 5.5 },
    logic: "5v",
    logicFollowsSupply: true,
    inputOnlyPins: ["ADDR", "A0", "A1", "A2", "A3"],
  },
  "module.esp01": {
    supply: V3_3_ONLY,
    logic: "3v3",
    inputOnlyPins: ["RX", "CH_PD", "RST"],
    inputMaxVolts: 3.6,
  },
};

/** Expansion parts: sensors and communication modules. */
export const EXTRA_SENSORS: CatalogPart[] = baseSensors.map((part) => ({
  ...part,
  electrical: SENSOR_ELECTRICAL[part.id],
}));
