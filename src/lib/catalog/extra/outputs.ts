import type { CatalogPart, CatalogPin, PartElectrical, PinKind, VoltageRange } from "../types";

/**
 * Expansion parts: motors, relays, drivers and other outputs (kind "module").
 * Ids must stay unique and never be removed. Electrical data is applied at the bottom
 * of this file from OUTPUTS_ELECTRICAL, the same way modules.ts does it.
 *
 * Pin-kind notes for this group:
 * - Motor, solenoid and relay-contact terminals are kind "digital" on purpose: they are
 *   switched or polarity-free connections, and "digital" lets them join a power rail or
 *   ground without the wiring check calling it a short.
 * - Only the pins that really are a supply are kind "power" (with a voltage when it is 3.3 V or 5 V).
 */

const pin = (id: string, label: string, kind: PinKind, voltage?: "3v3" | "5v"): CatalogPin => ({
  id,
  label,
  kinds: [kind],
  ...(voltage ? { voltage } : {}),
});
const dig = (id: string, label: string = id) => pin(id, label, "digital");
const gnd = (id: string, label: string = id) => pin(id, label, "ground");
const ana = (id: string, label: string = id) => pin(id, label, "analog");
const pwr = (id: string, label: string = id, voltage?: "3v3" | "5v") => pin(id, label, "power", voltage);

const EXTRA_OUTPUT_PARTS: CatalogPart[] = [
  /* ------------------------------ small motors and fans ------------------------------ */
  {
    id: "module.motor.dc",
    name: "DC Hobby Motor (3-6 V)",
    kind: "module",
    category: "Output",
    description:
      "The small brushed DC motor found in toys and hobby kits (often called a 130 or 280 size motor). Give it a few volts and the shaft spins; swap the two wires and it spins the other way. It has two terminals (M1 and M2) and no polarity. It draws far more current than a board pin can give (often 100 mA running and 500 mA or more when stalled), so it must be switched by a transistor or a motor driver board such as an L298N or TB6612FNG, never connected to a GPIO pin.",
    identify:
      "A silver or black metal can about 25 mm long and 20 mm wide, with a thin shaft sticking out of one end and two metal solder tabs on the other. The rating is stamped on the can or listed in the shop description, commonly 3 V to 6 V. Lookalikes: a coin vibration motor is flat and round, a stepper motor has four or five wires, and a servo has a plastic case with a gear horn.",
    variants: [
      { label: "130 size, 3-6 V", detail: "The usual hobby motor this entry describes. Check the rated voltage on the can or in the listing." },
      { label: "Geared motor with yellow plastic gearbox", detail: "Same kind of motor with a gearbox: slower and stronger. Check the listing for the rated voltage; many are 3-6 V, some are 12 V." },
      { label: "12 V or 24 V motors", detail: "Larger motors for bigger projects need a motor driver rated for that voltage and a matching supply. They are not covered by the 3-6 V numbers here." },
    ],
    watchOuts: [
      "Never connect the motor to a GPIO pin. A pin can give about 20 mA and a motor wants hundreds of milliamps. Use a driver board or a transistor with the motor on its own supply.",
      "Put a flyback diode across the motor terminals (stripe toward the positive side) when you switch it with a bare transistor. The spike when the motor turns off can destroy the transistor. Driver boards like the L298N already handle this.",
      "Run the motor from its own battery or supply and join the grounds with the board. A motor starting up can drag a shared 5 V rail down and reset the board.",
      "The stall current is much higher than the running current. Size the supply and the driver for the stall figure, and do not hold the shaft still while powered.",
      "For quieter electrical noise, solder a 100 nF ceramic capacitor across the motor terminals.",
    ],
    photoCaption: "Small silver DC hobby motor with a shaft and two solder tabs",
    photoHint: "dc-motor",
    pins: [dig("M1", "M1 (motor wire)"), dig("M2", "M2 (motor wire)")],
  },
  {
    id: "module.motor.vibration",
    name: "Vibration Motor (coin)",
    kind: "module",
    category: "Output",
    description:
      "A flat coin-sized motor with a small off-centre weight on its shaft. When it spins the whole motor shakes, which is how a phone buzzes. It has two wires: red is V+ and black is GND. Supply is commonly 3 V, but some are rated for 5 V, so check the label or listing. It draws tens of milliamps, which is close to or over what a GPIO pin should give, so switch it with a transistor (with a flyback diode) or use a ready-made vibration motor driver module.",
    identify:
      "A silver disc about 10 mm wide and 3 mm thick, with a red and a black wire attached (sometimes a sticky pad on the back). It looks like a thick coin. Lookalikes: a coin-shaped piezo buzzer is thinner and has no weight inside, and a regular DC motor has a visible shaft.",
    variants: [
      { label: "Bare coin motor, 2 wires", detail: "The part this entry describes. Rated voltage varies, so read the listing." },
      { label: "Driver module", detail: "A small board with a transistor and a three-pin header (signal, power, ground). Wire it like a sensor module and check the silkscreen." },
      { label: "Cylinder (ERM) motor", detail: "A small cylinder with a weight on the shaft. Behaves the same way but uses more current." },
    ],
    watchOuts: [
      "Do not drive it straight from a GPIO pin if the label says more than about 20 mA. Use a transistor, and add a flyback diode across the motor.",
      "Check the rated voltage on the label before choosing 3.3 V or 5 V. Running a 3 V motor at 5 V shortens its life and can burn it out.",
      "Fix it to something with double-sided tape or a clip. It can shake itself loose, and a loose motor tugs on the thin wires.",
      "The thin wires break easily where they meet the motor. Do not bend them close to the body.",
    ],
    photoCaption: "Flat round coin vibration motor with a red and a black wire",
    photoHint: "vibration-motor",
    pins: [pwr("V+", "V+ (red)"), gnd("GND", "GND (black)")],
  },
  {
    id: "module.fan.5v",
    name: "Mini Fan (5 V)",
    kind: "module",
    category: "Output",
    description:
      "A small brushless fan (typically 30 to 50 mm square) for cooling electronics or for a simple airflow project. Connect the red wire to 5 V and the black wire to GND and it spins. It has its own motor controller inside, so it does not need a flyback diode, but it can still draw more than a GPIO pin should give (often 100 to 300 mA). To turn it on and off from a board, switch it with a transistor or MOSFET, or run it from a motor driver board.",
    identify:
      "A square plastic frame with a spinning impeller, four screw holes in the corners and a thin cable with a small connector. The label gives the voltage (5 V, 12 V or 24 V) and the current. Lookalikes: a 12 V fan looks identical but will not run well on 5 V, and 3-wire and 4-wire fans add a speed-sensing wire (and a PWM wire) to the red and black.",
    variants: [
      { label: "2 wires (red + black)", detail: "The part this entry describes: red to 5 V, black to ground." },
      { label: "3 wires (tach) or 4 wires (tach + PWM)", detail: "PC-style fans add a yellow wire that outputs speed pulses, and a fourth wire that takes a PWM speed signal. Only wire the extra pins if you know the fan's pinout." },
      { label: "12 V fans", detail: "Common in PC cases. They need a 12 V supply and will not suit a 5 V rail." },
    ],
    watchOuts: [
      "Check the voltage on the label. A 12 V fan on 5 V runs slowly or not at all, and a 5 V fan on 12 V is damaged.",
      "A fan can draw 100 to 300 mA. A small board's 5 V pin may not supply that along with everything else, so use a separate 5 V supply and join the grounds.",
      "Do not drive it directly from a GPIO pin. Use a transistor or a MOSFET to switch it, or connect it to the 5 V rail through a switch.",
      "Polarity matters: red is positive and black is ground. Reversed, it does not run and brushless fans can be damaged.",
    ],
    photoCaption: "Small square black 5 V fan with a two-wire cable",
    photoHint: "fan-5v",
    pins: [pwr("V+", "V+ (red, 5V)", "5v"), gnd("GND", "GND (black)")],
  },

  /* ------------------------------ servos ------------------------------ */
  {
    id: "module.servo.mg996r",
    name: "Servo Motor MG996R (standard size)",
    kind: "module",
    category: "Output",
    description:
      "A larger, stronger hobby servo than the tiny SG90 in this catalog, with metal gears. Like any servo it turns its horn to a set angle (about 0 to 180 degrees) and holds it, using a PWM-style pulse on the signal wire (a Servo library does this). Three wires: GND (brown or black), V+ (red) and PWM/SIG (orange or yellow). It needs a supply of roughly 4.8 to 7.2 V (check the label) and can draw an ampere or more when pushing hard, so power it from a separate supply, not from the board.",
    identify:
      "A standard-size servo about 40 mm long, 20 mm wide and 40 mm tall, with metal gears, mounting ears on both sides and a splined output shaft. The cable ends in a 3-pin female plug. It looks like the MG996R, MG995, DS3218 and similar models. The 9 g SG90 is far smaller. Check the listing for 180 degrees (positional) versus 360 or continuous.",
    variants: [
      { label: "MG996R / MG995 (180 degree)", detail: "Positional servo with metal gears. This is the part this entry describes." },
      { label: "Continuous rotation version", detail: "Looks the same but spins at a chosen speed instead of holding an angle. See the continuous rotation servo entry." },
      { label: "Clones", detail: "Many cheap clones exist; torque and supply range vary. Trust the label on your servo over this entry." },
    ],
    watchOuts: [
      "Use a separate 5 to 6 V supply that can give at least 2 A, and join its ground to the board's ground. The board's 5 V pin cannot power a servo this size.",
      "A stalled servo draws a lot of current and gets hot. Do not hold the horn against the stop or force it by hand while powered.",
      "Add a large capacitor (470 to 1000 uF) across the servo supply to reduce brownouts when it starts moving.",
      "The signal wire usually works with 3.3 V logic, but check the listing. Wire order: brown or black = GND, red = V+, orange or yellow = signal.",
      "Heavy and jittery? Servos buzz when the supply sags. Fix the supply before changing the code.",
    ],
    photoCaption: "Large dark MG996R style servo with a metal horn and a three-wire cable",
    photoHint: "servo-mg996r",
    wokwi: { tag: "wokwi-servo" },
    pins: [gnd("GND"), pwr("V+", "V+", "5v"), dig("PWM", "PWM/SIG")],
  },
  {
    id: "module.servo.continuous",
    name: "Continuous Rotation Servo (360)",
    kind: "module",
    category: "Output",
    description:
      "A servo with its position feedback removed, so it spins around and around instead of holding an angle. The signal wire sets speed and direction rather than position: with a Servo library, about 90 means stop, below 90 is one direction and above 90 is the other, and the further from 90 the faster. It is the simplest way to build a small wheeled robot. Three wires: GND (brown or black), V+ (red, about 4.8 to 6 V) and PWM/SIG (orange or yellow). Power it from a separate supply when under load.",
    identify:
      "Looks like a normal small servo (for example the SG90 or FS90R family, about 23 x 12 x 29 mm) with a 3-wire cable and a round or cross-shaped horn. The listing says continuous rotation, 360 degree or FS90R. It is easy to buy the wrong one: check the words continuous or 360 in the listing. Many have a small trimmer hole on the case for setting the stop point.",
    variants: [
      { label: "FS90R / FS90R-style micro", detail: "Small and cheap. Speed is set by the pulse width, around 1.5 ms means stop." },
      { label: "Modified standard servo", detail: "A positional servo with its feedback removed (a hobby modification). Behaves the same but the stop point may need trimming." },
      { label: "Larger continuous servos", detail: "Bigger bodies for bigger wheels. They draw more current, so check the label." },
    ],
    watchOuts: [
      "It will not hold an angle. If your code uses write(90) as an angle it simply stops. Do not use it where you need a position.",
      "The stop point may creep. If it keeps turning slowly at 90, turn the small trimmer on the case with a screwdriver until it stops.",
      "Power it from a separate 5 V supply when it carries a load, join the grounds together, and do not run it from the board's 5 V pin if it moves a robot.",
      "Wire order: brown or black = GND, red = V+, orange or yellow = signal. Supply is about 4.8-6 V; check the label.",
    ],
    photoCaption: "Small continuous rotation servo with a round horn and a circular arrow mark",
    photoHint: "servo-continuous",
    wokwi: { tag: "wokwi-servo" },
    pins: [gnd("GND"), pwr("V+", "V+", "5v"), dig("PWM", "PWM/SIG")],
  },

  /* ------------------------------ steppers and stepper drivers ------------------------------ */
  {
    id: "module.stepper.28byj48",
    name: "28BYJ-48 Stepper + ULN2003 Driver Board (5 V)",
    kind: "module",
    category: "Output",
    description:
      "A small, cheap geared stepper motor (28BYJ-48, usually 5 V) that comes with a ULN2003 driver board. The motor turns in precise small steps, about 2048 full steps per revolution through its gearbox (about 4096 in half-step mode), which is slow but strong enough for small jobs. The board has four signal inputs IN1 to IN4 from your board, a + and - pair for the 5 V motor supply, a white 5-pin socket the motor plugs into, and four LEDs showing which coil is on. A small jumper on the board connects or removes motor power.",
    identify:
      "A blue round motor about 28 mm wide with a short 5-wire cable ending in a white keyed plug, plus a small green or blue board with a ULN2003 chip, 4 LEDs, a white 5-pin socket, a pin header IN1 to IN4 and a +/- pair. The 12 V version of the motor looks the same, so read the label or listing. Lookalike: NEMA 17 stepper motors are much larger and need the A4988 or DRV8825 style driver instead.",
    variants: [
      { label: "5 V version", detail: "The common one, about 240 mA when running. This entry describes this version." },
      { label: "12 V version", detail: "Looks identical but is meant for a 12 V supply; the driver board supply range is printed on the board. Do not run the 5 V version from 12 V." },
      { label: "Board only", detail: "The ULN2003 board is also sold alone; it drives the same motor as long as the plug and supply match." },
    ],
    watchOuts: [
      "Power the board's + and - from a separate 5 V supply, not the board's 5 V pin, if you run several motors or other loads. Join the grounds together.",
      "The wires go IN1, IN2, IN3, IN4 to four GPIO pins. With the Arduino Stepper library the pin order is usually IN1, IN3, IN2, IN4 (a common cause of a motor that only vibrates). Check the library example.",
      "Do not pull the white plug or the power jumper with power on. The coils are inductive and a sudden cut can stress the driver.",
      "It is slow (a few revolutions per minute at most) and the geared shaft has some play. It is not for precise fast positioning.",
      "The coils stay powered when stopped and can get warm. Turn the pins LOW when the motor is idle.",
    ],
    photoCaption: "Blue 28BYJ-48 stepper motor with its five-wire plug next to a ULN2003 driver board with four LEDs",
    photoHint: "stepper-28byj48",
    pins: [
      dig("IN1"),
      dig("IN2"),
      dig("IN3"),
      dig("IN4"),
      pwr("VCC", "+ (5V motor supply)", "5v"),
      gnd("GND", "- (GND)"),
    ],
  },
  {
    id: "module.driver.a4988",
    name: "A4988 Stepper Driver",
    kind: "module",
    category: "Output",
    description:
      "A small driver board that runs a bipolar stepper motor (like a NEMA 17) from just two signals: STEP (one pulse = one step) and DIR (direction). It has 16 pins in two rows of 8. The motor supply (VMOT, about 8 to 35 V) and ground (GND) power the motor, and a separate logic supply (VDD, 3 to 5.5 V) powers the chip's logic. The four outputs 1A, 1B, 2A and 2B go to the two motor coils. MS1, MS2 and MS3 select full, half, quarter, eighth or sixteenth steps. A small trimmer sets the current limit for the motor.",
    identify:
      "A tiny PCB about 15 x 20 mm, usually red (green, blue and black copies exist), with 8 pins along each long side, a brass trimmer screw on top and a small black chip (often with a tiny stick-on heatsink). Pin names on the silkscreen: ENABLE, MS1-MS3, RESET, SLEEP, STEP, DIR, and VMOT, GND, 2B, 2A, 1A, 1B, VDD, GND. Lookalike: the DRV8825 has the same footprint but a different current setting and microstep table, and a purple or blue board is sometimes either.",
    variants: [
      { label: "Standard A4988", detail: "About 1 A per coil without cooling and up to about 2 A with a heatsink and airflow (check your board's listing)." },
      { label: "Black edition and clones", detail: "Same pinout. The sense resistor value can differ, which changes the Vref formula; check the seller's data." },
      { label: "DRV8825", detail: "Drop-in size but different. See the DRV8825 entry; do not swap them without re-setting the current limit." },
    ],
    watchOuts: [
      "Never connect or disconnect the motor while VMOT is powered. It can destroy the driver.",
      "Put a capacitor of at least 47 uF (100 uF is better) across VMOT and GND right next to the board. Without it the driver can be damaged by voltage spikes.",
      "Set the motor current limit with the trimmer before running it: measure Vref and use the formula for your sense resistor (many boards: current = Vref / (8 x 0.068); clones may use 0.05 or 0.1 ohm, so check the seller's data). Too high overheats the motor and driver.",
      "RESET and SLEEP must both be pulled high for the driver to run. On the usual board, wire RESET to SLEEP. ENABLE is active low (LOW = on) and may be left unconnected to stay enabled.",
      "Do not exceed the motor current the label shows, and add a heatsink and airflow if you run near 1 A or more.",
    ],
    photoCaption: "Small A4988 style stepper driver board with a black heatsink on the chip and a brass trimmer",
    photoHint: "driver-a4988",
    pins: [
      dig("ENABLE", "ENABLE"),
      dig("MS1"),
      dig("MS2"),
      dig("MS3"),
      dig("RESET"),
      dig("SLEEP"),
      dig("STEP"),
      dig("DIR"),
      pwr("VMOT", "VMOT (8-35V motor +)"),
      gnd("GND", "GND (motor)"),
      dig("2B"),
      dig("2A"),
      dig("1A"),
      dig("1B"),
      pwr("VDD", "VDD (3-5V logic)"),
      gnd("GND2", "GND (logic)"),
    ],
  },
  {
    id: "module.driver.drv8825",
    name: "DRV8825 Stepper Driver",
    kind: "module",
    category: "Output",
    description:
      "A stepper driver board with the same shape and similar pin names as the A4988, but a higher voltage range and up to 1/32 microstepping. It runs a bipolar stepper motor from STEP and DIR signals. The motor supply (VMOT, about 8.2 to 45 V) and GND power the motor; there is no separate logic supply pin (the board makes its own). M0, M1 and M2 select the step size, FAULT reports a problem, and the outputs 1A, 1B, 2A and 2B go to the motor coils. A trimmer sets the current limit.",
    identify:
      "A tiny PCB about 15 x 20 mm, usually purple or blue, with 8 pins on each long side, a brass trimmer screw and a black chip that often has a stick-on heatsink. Silkscreen: ENABLE, M0, M1, M2, RESET, SLEEP, STEP, DIR, FAULT on one side; VMOT, GND, 2B, 2A, 1A, 1B, GND on the other. It looks almost the same as an A4988, but the A4988 has VDD and an extra GND where the DRV8825 has FAULT and M0. Mixing them up is a common cause of burnt boards.",
    variants: [
      { label: "Standard DRV8825", detail: "About 1.5 A per coil without cooling and up to about 2.2 A with a heatsink and airflow (check your board's listing)." },
      { label: "Clones", detail: "The sense resistor and trimmer wiring can differ, which changes the Vref formula. Read the seller's data." },
      { label: "A4988", detail: "Same footprint, different pinout on the logic side and different microstep table. See the A4988 entry." },
    ],
    watchOuts: [
      "Never connect or disconnect the motor while VMOT is powered. It can destroy the driver.",
      "Add a capacitor of at least 47 uF (100 uF is better) across VMOT and GND next to the board, because voltage spikes kill these drivers quickly.",
      "Set the current limit with the trimmer before running. On many boards current is roughly 2 x Vref, but the exact formula depends on the sense resistor, so check the seller's data and measure Vref.",
      "The A4988 and DRV8825 are not interchangeable pin-for-pin. Swapping one for the other without re-checking the pinout can destroy the board.",
      "RESET and SLEEP need to be high for the driver to run (check the documentation of your board). ENABLE is active low. FAULT is an open-drain, active-low output; use a pull-up on that input.",
    ],
    photoCaption: "Small purple DRV8825 style stepper driver board with a black heatsink on the chip and a brass trimmer",
    photoHint: "driver-drv8825",
    pins: [
      dig("ENABLE", "ENABLE"),
      dig("M0"),
      dig("M1"),
      dig("M2"),
      dig("RESET"),
      dig("SLEEP"),
      dig("STEP"),
      dig("DIR"),
      dig("FAULT", "FAULT (output)"),
      pwr("VMOT", "VMOT (8.2-45V motor +)"),
      gnd("GND", "GND (motor)"),
      dig("2B"),
      dig("2A"),
      dig("1A"),
      dig("1B"),
      gnd("GND2", "GND (logic)"),
    ],
  },

  /* ------------------------------ DC motor drivers ------------------------------ */
  {
    id: "module.driver.l298n",
    name: "L298N Dual Motor Driver Board",
    kind: "module",
    category: "Output",
    description:
      "A red driver board with an L298N dual H-bridge chip that can run two small DC motors (or one stepper) with speed and direction control. Each motor has two direction inputs (IN1/IN2 for motor A, IN3/IN4 for motor B) and an enable pin (ENA, ENB) that takes a PWM signal for speed. Motor power (about 5 to 35 V) goes to the 12V screw terminal, GND is shared, and 5V is the board's logic supply pin. Outputs OUT1 to OUT4 go to the motor terminals. It handles about 2 A per channel in the chip rating but wastes a lot of power as heat.",
    identify:
      "A red square board about 43 x 43 mm with a tall black heatsink, three green screw terminal blocks (motor A, motor B, and a 3-way power block labelled 12V, GND, 5V), a small 'enable' jumper cap on ENA and ENB, and a 6-pin header. The L298N chip is the one under the heatsink. Lookalikes: the smaller L9110 board and L293D based boards run lower current; the TB6612FNG is cooler and more efficient.",
    variants: [
      { label: "Standard red L298N board", detail: "The part this entry describes. It has a jumper that selects whether the onboard 5V regulator is used." },
      { label: "Mini versions", detail: "Smaller boards using the same chip. Pin names can differ, so follow the silkscreen on yours." },
      { label: "TB6612FNG / L9110", detail: "Newer or lighter boards that do the same job with different pins. See their entries." },
    ],
    watchOuts: [
      "The chip wastes about 2 V as heat, so a 6 V supply gives the motor only about 4 V. Use a supply a bit above the motor's rating and keep an eye on the heatsink.",
      "Keep the 5V-enable jumper on only if the motor supply is 12 V or less. With the jumper on, the 5V terminal becomes an output you can use to power a small board. With a supply above 12 V, remove the jumper and feed the 5V pin from your board instead.",
      "Do not feed 5 V into the 5V terminal while the jumper is on and the motor supply is connected. The two sources fight and the regulator can be damaged.",
      "Join the driver's GND to the board's GND, or the control signals will not work.",
      "Remove the ENA/ENB jumpers if you want PWM speed control, and connect ENA/ENB to a PWM pin. With the jumper on, the motor is always at full speed.",
    ],
    photoCaption: "Red L298N motor driver board with a tall black heatsink and three green screw terminals",
    photoHint: "driver-l298n",
    pins: [
      pwr("VS", "12V (motor supply)"),
      gnd("GND"),
      pwr("5V", "5V (logic)", "5v"),
      dig("ENA"),
      dig("IN1"),
      dig("IN2"),
      dig("IN3"),
      dig("IN4"),
      dig("ENB"),
      dig("OUT1"),
      dig("OUT2"),
      dig("OUT3"),
      dig("OUT4"),
    ],
  },
  {
    id: "module.driver.l293d",
    name: "L293D Dual H-Bridge Chip (DIP-16)",
    kind: "module",
    category: "Output",
    description:
      "A 16-pin chip that runs up to two small DC motors (or one stepper) in both directions. Each half has an enable pin (EN1,2 and EN3,4, can take PWM for speed), two inputs and two outputs. Pins: VCC1 (pin 16) is the logic supply (4.5 to 7 V), VCC2 (pin 8) is the motor supply (4.5 to 36 V), and four GND pins (4, 5, 12, 13) join to ground and help cool the chip. It supplies about 600 mA per channel (1.2 A peak) and has built-in diodes for the motor's voltage spikes.",
    identify:
      "A black rectangular chip with 16 legs (8 on each side) and a half-moon notch on one short end; pin 1 is just left of the notch (top, when the notch is at the top). The marking says L293D. The L293 (without the D) is a similar chip but has no built-in diodes. The SN754410 is a pin-compatible lookalike. Do not mix the chip up with the L298N board, which is much larger and has its own board.",
    variants: [
      { label: "L293D (with diodes)", detail: "Built-in diodes: fine for small motors. This entry describes this chip." },
      { label: "L293 / L293B (no diodes)", detail: "Same pinout but needs external diodes; check the markings." },
      { label: "SN754410", detail: "Pin-compatible, a little stronger (1 A); also has built-in diodes." },
    ],
    watchOuts: [
      "Both VCC1 (logic, 5 V) and VCC2 (motor) must be connected, and all grounds must be joined. Leaving VCC1 off is a classic cause of a dead motor.",
      "The chip handles about 600 mA per channel; a motor that stalls can draw more. Do not use it for bigger motors.",
      "The chip gets warm. Keep the four GND pins connected to a ground plane or add a small heatsink if motors run for long.",
      "Check the pin 1 notch before inserting it in a breadboard. Reversing the chip destroys it quickly.",
      "Pins 1 and 9 (the enables) must be high for the outputs to work. Connect them to 5 V or a PWM pin.",
    ],
    photoCaption: "Black 16-pin DIP chip with a half-moon notch, the shape of an L293D",
    photoHint: "chip-l293d",
    pins: [
      dig("EN12", "1 EN1,2"),
      dig("IN1", "2 IN1"),
      dig("OUT1", "3 OUT1"),
      gnd("GND4", "4 GND"),
      gnd("GND5", "5 GND"),
      dig("OUT2", "6 OUT2"),
      dig("IN2", "7 IN2"),
      pwr("VCC2", "8 VCC2 (motor +)"),
      dig("EN34", "9 EN3,4"),
      dig("IN3", "10 IN3"),
      dig("OUT3", "11 OUT3"),
      gnd("GND12", "12 GND"),
      gnd("GND13", "13 GND"),
      dig("OUT4", "14 OUT4"),
      dig("IN4", "15 IN4"),
      pwr("VCC1", "16 VCC1 (logic 5V)", "5v"),
    ],
  },
  {
    id: "module.driver.tb6612fng",
    name: "TB6612FNG Dual Motor Driver",
    kind: "module",
    category: "Output",
    description:
      "A small, efficient breakout board for two DC motors (or one stepper), better than the L298N for battery projects because it wastes much less power as heat. For each motor there are two direction inputs (AIN1/AIN2, BIN1/BIN2) and a PWM speed input (PWMA, PWMB). STBY must be HIGH to enable the chip. VM is the motor supply (about 4.5 to 13.5 V), VCC is the logic supply (2.7 to 5.5 V), and AO1/AO2 and BO1/BO2 go to the motors. It supplies about 1.2 A continuous per channel (more in short bursts).",
    identify:
      "A tiny breadboard-friendly board, usually red, about 20 x 20 mm, with a very small black chip, a row of pins on each side and silkscreen labels AIN1, AIN2, PWMA, BIN1, BIN2, PWMB, STBY, VM, VCC, GND, AO1, AO2, BO1, BO2. Lookalikes: DRV8833 and L9110 boards are tiny too but have different pin names and lower limits.",
    variants: [
      { label: "Generic breakout", detail: "The part this entry describes. Pin order differs between sellers, so follow the silkscreen." },
      { label: "Motor-shield versions", detail: "Plug-in shields with the same chip; pins are fixed by the shield." },
    ],
    watchOuts: [
      "STBY must be pulled HIGH or the chip stays off and the motors do not move. Tie it to VCC or a GPIO.",
      "VM (motor supply) and VCC (logic supply) are separate pins. Connect both, and join all the grounds together.",
      "Do not exceed about 13.5 V on VM. It runs 1.2 A continuous per channel; check the rating on your breakout.",
      "Many breakouts come without the header pins soldered. Solder them before using it on a breadboard.",
      "Swap the two wires of a motor (AO1 and AO2) if it turns the wrong way; you do not need to change the code.",
    ],
    photoCaption: "Small red TB6612FNG style dual motor driver breakout with a tiny black chip and rows of pins",
    photoHint: "driver-tb6612",
    pins: [
      pwr("VM", "VM (motor +, 4.5-13.5V)"),
      pwr("VCC", "VCC (logic)"),
      gnd("GND"),
      dig("AIN1"),
      dig("AIN2"),
      dig("PWMA"),
      dig("BIN1"),
      dig("BIN2"),
      dig("PWMB"),
      dig("STBY"),
      dig("AO1"),
      dig("AO2"),
      dig("BO1"),
      dig("BO2"),
    ],
  },

  /* ------------------------------ relays ------------------------------ */
  {
    id: "module.relay.1ch",
    name: "Relay Module 1-Channel (5 V)",
    kind: "module",
    category: "Output",
    description:
      "A ready-made board with one relay (an electrically controlled switch), a driver transistor, and usually an optocoupler (a small chip that keeps your board electrically separate from the relay side). On the control side: VCC (5 V), GND and IN (the signal from your board). On the switch side, three screw terminals: COM (common), NO (normally open, connected to COM only when the relay is on) and NC (normally closed, connected to COM when the relay is off). Warning: the switch side can carry mains voltage; keep low-voltage projects away from it.",
    identify:
      "A blue board about 50 x 26 mm with one blue cube-shaped relay (often marked SRD-05VDC), a green 3-way screw terminal blocks, a 3-pin header (some have an extra jumper), an LED or two, and a small transistor. 'Active low' or 'Active high' is printed in the listing. Lookalikes: solid-state relay modules have a white block instead of a blue cube, and 2/4/8-channel modules look the same with more relays.",
    variants: [
      { label: "Active-low trigger (most common)", detail: "The relay turns ON when IN is pulled LOW (to GND) and OFF when it is HIGH. Some boards have a jumper to choose high or low trigger." },
      { label: "Active-high trigger", detail: "The relay turns ON when IN is HIGH. Check the listing or test it before wiring a load." },
      { label: "3.3 V and 12 V coil versions", detail: "The relay coil comes in several voltages. Check the label on the cube and match the supply." },
    ],
    watchOuts: [
      "SAFETY: never wire mains voltage (110 or 230 V) on a breadboard or without supervision. Mains can kill. If a guide needs a relay for a mains load, have someone qualified do that part, use an enclosed project box, and keep the low-voltage side separate.",
      "Check the trigger type. An active-low relay is ON when the pin is LOW, which also means it can click ON at boot while the pin floats. Set the pin HIGH first in your code.",
      "A relay coil draws about 70 to 90 mA, which is too much for some small boards' 5 V pin along with other parts. A separate 5 V supply with a shared ground is safer.",
      "On a 3.3 V board (ESP32, Pico) a 5 V module may not switch off properly with a 3.3 V HIGH. Check the listing for 3.3 V support or use a level shifter or a transistor.",
      "Check the contact rating printed on the relay (for example 10 A at 250 V AC, 30 V DC). Never exceed it, and a motor or lamp load needs a lot more margin.",
    ],
    photoCaption: "Blue one-channel relay module with a blue relay cube and green screw terminals",
    photoHint: "relay-1ch",
    pins: [
      pwr("VCC", "VCC (5V)", "5v"),
      gnd("GND"),
      dig("IN", "IN (signal)"),
      dig("COM", "COM (common)"),
      dig("NO", "NO (normally open)"),
      dig("NC", "NC (normally closed)"),
    ],
  },
  {
    id: "module.relay.2ch",
    name: "Relay Module 2-Channel (5 V)",
    kind: "module",
    category: "Output",
    description:
      "A board with two independent relays, each with its own signal pin (IN1, IN2) and its own three screw terminals (COM, NO, NC). The control side has VCC, GND and a separate JD-VCC pin. A jumper links JD-VCC to VCC; with the jumper on, the relays and the logic share one 5 V supply. Remove it and give JD-VCC its own 5 V supply to keep the relay coils completely electrically separate from your board (the optocouplers then do their job). Warning: the switch side can carry mains voltage.",
    identify:
      "A blue board about 50 x 38 mm with two blue relay cubes, two green 3-way screw terminal blocks, a 4-pin or 5-pin header (VCC, IN1, IN2, GND and sometimes JD-VCC), a jumper cap next to the header (the JD-VCC jumper), two small optocouplers and two LEDs. 1-channel and 4-channel boards look similar with fewer or more relays.",
    variants: [
      { label: "Active-low trigger (most common)", detail: "Each relay turns ON when its IN pin is pulled LOW and OFF when it is HIGH." },
      { label: "Active-high or jumper selectable", detail: "A few boards switch ON with HIGH or have a jumper to choose. Check your listing." },
      { label: "With and without optocouplers", detail: "Cheaper boards skip them. Only boards with optocouplers can be fully isolated from the relay supply." },
    ],
    watchOuts: [
      "SAFETY: never wire mains voltage (110 or 230 V) on a breadboard or without supervision. Mains can kill. Use an enclosed project box, keep low-voltage and mains wiring well apart, and have someone qualified do any mains wiring.",
      "JD-VCC jumper: leave it ON to power the relays from the VCC pin. For isolation, remove it, power JD-VCC from a separate 5 V supply and connect only GND with VCC from the board's supply (grounds then only meet through the signal).",
      "Active-low means a pin LOW turns the relay ON. At boot, floating pins can click the relay on, so set the pins HIGH early in the code.",
      "Two coils draw around 150 to 180 mA together. A small board's 5 V pin may not cope, so use a separate supply with a shared ground.",
      "A 3.3 V board's HIGH may not turn the relay fully off. Check the listing, or use the 3.3 V option on the module if it has one.",
    ],
    photoCaption: "Blue two-channel relay module with two relay cubes and green screw terminals",
    photoHint: "relay-2ch",
    pins: [
      pwr("VCC", "VCC (5V)", "5v"),
      gnd("GND"),
      pwr("JD-VCC", "JD-VCC (relay 5V)", "5v"),
      dig("IN1"),
      dig("IN2"),
      dig("COM1", "COM1"),
      dig("NO1", "NO1"),
      dig("NC1", "NC1"),
      dig("COM2", "COM2"),
      dig("NO2", "NO2"),
      dig("NC2", "NC2"),
    ],
  },
  {
    id: "module.relay.4ch",
    name: "Relay Module 4-Channel (5 V)",
    kind: "module",
    category: "Output",
    description:
      "A board with four independent relays, each with its own signal pin (IN1 to IN4) and its own three screw terminals (COM, NO, NC), so one board can switch four lamps, pumps or valves. The control header has VCC, GND, JD-VCC and the four inputs. A jumper links JD-VCC to VCC; remove it and feed JD-VCC from a separate 5 V supply to keep the relay coils isolated from your board. Four coils draw a lot of current, so this board needs a decent 5 V supply. Warning: the switch side can carry mains voltage.",
    identify:
      "A blue board about 75 x 55 mm with four blue relay cubes in a row, four green 3-way screw terminal blocks, four optocouplers, four LEDs and a header with a jumper cap near it. 8-channel and 16-channel boards look the same with more relays.",
    variants: [
      { label: "Active-low trigger (most common)", detail: "Each relay turns ON when its IN pin is pulled LOW." },
      { label: "Active-high", detail: "Each relay turns ON when its IN pin is HIGH. Check the listing." },
      { label: "Shield versions", detail: "Plug-in boards for specific microcontroller boards. Pins are fixed by the shield." },
    ],
    watchOuts: [
      "SAFETY: never wire mains voltage (110 or 230 V) on a breadboard or without supervision. Mains can kill. Use an enclosed project box, keep low-voltage and mains wiring well apart, and have someone qualified do any mains wiring.",
      "Four coils can draw about 300 to 360 mA with all relays on. Do not power them from a small board's 5 V pin. Use the JD-VCC pin with a separate 5 V supply and remove the jumper.",
      "Active-low means a pin LOW turns the relay ON. Set the pins HIGH in setup() as early as possible so all four do not click on at start-up.",
      "Do not switch a load larger than the contact rating on the relay (printed on the cube, for example 10 A at 250 V AC). Motors and lamps draw much more at start-up.",
      "On a 3.3 V board, check that a 3.3 V HIGH really turns the relay off. If not, use a level shifter or a transistor.",
    ],
    photoCaption: "Blue four-channel relay module with four relay cubes and green screw terminals",
    photoHint: "relay-4ch",
    pins: [
      pwr("VCC", "VCC (5V)", "5v"),
      gnd("GND"),
      pwr("JD-VCC", "JD-VCC (relay 5V)", "5v"),
      dig("IN1"),
      dig("IN2"),
      dig("IN3"),
      dig("IN4"),
      dig("COM1", "COM1"),
      dig("NO1", "NO1"),
      dig("NC1", "NC1"),
      dig("COM2", "COM2"),
      dig("NO2", "NO2"),
      dig("NC2", "NC2"),
      dig("COM3", "COM3"),
      dig("NO3", "NO3"),
      dig("NC3", "NC3"),
      dig("COM4", "COM4"),
      dig("NO4", "NO4"),
      dig("NC4", "NC4"),
    ],
  },
  {
    id: "module.relay.ssr",
    name: "Solid-State Relay Module (SSR, 5 V control)",
    kind: "module",
    category: "Output",
    description:
      "A relay with no moving parts: a small electronic switch inside a block that turns a load on and off silently when the control pin is driven. A 5 V input (VCC, GND and a signal pin) controls two screw terminals (LOAD1 and LOAD2) on the output side. There is no NO and NC choice; the load is simply on or off. Many module boards (about 2 A) are AC-only: they switch alternating-current loads and will not work with DC. Warning: the load side may carry mains voltage.",
    identify:
      "A red or blue small board with a white or black rectangular block (the SSR, usually no bigger than a thumbnail on module versions) with 4 pins or 4 solder tabs, a 3-pin header (VCC, GND, signal), two screw terminals for the load, and an LED. A relay module with a blue cube clicks; an SSR is silent. Heavier SSRs (for example the 25 or 40 A type) are separate blocks with 4 screws, not small modules.",
    variants: [
      { label: "AC-output SSR module (about 2 A)", detail: "Switches mains-type AC loads only. Check the listing and the label for the maximum load." },
      { label: "DC-output SSR", detail: "Switches DC loads only, and polarity matters. Never use an AC-only module for a DC load or the reverse." },
      { label: "Standalone SSR blocks", detail: "Larger and must be on a heatsink. Not a beginner part." },
    ],
    watchOuts: [
      "SAFETY: the output side is designed for mains-voltage loads. Never wire mains on a breadboard or without supervision. Use an enclosed box, and have someone qualified do any mains wiring.",
      "An AC-only SSR will not switch a DC load, and a DC-only SSR will not work for AC. Read the label before wiring.",
      "An SSR is never fully off: it leaks a small current. Tiny LED lamps may glow faintly even when it is off.",
      "Check the maximum load current on the label and stay well below it; a hot SSR on a larger load needs a heatsink.",
      "The control pin may need 3 to 5 V. On a 3.3 V board check the listing before relying on it.",
    ],
    photoCaption: "Solid-state relay module: a white block on a red board with screw terminals and a pin header",
    photoHint: "relay-ssr",
    pins: [
      pwr("VCC", "VCC (5V)", "5v"),
      gnd("GND"),
      dig("IN", "IN (signal)"),
      dig("LOAD1", "LOAD1"),
      dig("LOAD2", "LOAD2"),
    ],
  },
  {
    id: "module.solenoid.12v",
    name: "Solenoid (12 V push-pull)",
    kind: "module",
    category: "Output",
    description:
      "An electromagnet with a metal plunger that is pulled in (or pushed out) when current flows through its coil, used in door locks, vending machines and tapping mechanisms. It is a two-wire coil, usually rated 12 V (check the label), and draws an ampere or more when on. A board pin cannot drive it. Wire the positive wire (V+) to the 12 V supply and the other wire (SW) to the drain of a logic-level MOSFET (or to a relay), with the MOSFET source to ground and a flyback diode across the coil.",
    identify:
      "A small open-frame (U-shaped metal frame around a copper coil with a plunger sticking out) or tubular (a metal cylinder) component about 30 to 60 mm long with two wires. The label lists the voltage (12 V is common, 5 V and 24 V exist), current and duty cycle. Lookalike: a lock-style door solenoid has a bolt; a solenoid valve for water has hose fittings.",
    variants: [
      { label: "Open-frame push-pull", detail: "The part this entry describes. It pulls the plunger in when powered; a spring returns it." },
      { label: "Tubular", detail: "Same operation in a round housing." },
      { label: "Lock or valve versions", detail: "Same electrical idea with a bolt or a valve body. Check the label voltage and current." },
    ],
    watchOuts: [
      "Never connect a solenoid to a GPIO pin. Switch it with a logic-level N-channel MOSFET (or a relay) on the negative side, and run the MOSFET gate from the pin through a small resistor.",
      "Always put a flyback diode across the coil (stripe toward the positive wire). Without it the spike when the solenoid turns off destroys the MOSFET.",
      "Check the duty cycle on the label. Many solenoids may be on only a few seconds at a time and get hot if held on.",
      "Use a separate 12 V supply (not the board) that can give the current on the label, and join its ground to the board's ground.",
    ],
    photoCaption: "Open-frame push-pull solenoid with a copper coil and a steel plunger",
    photoHint: "solenoid-12v",
    pins: [pwr("V+", "V+ (12V)"), dig("SW", "SW (switched side)")],
  },

  /* ------------------------------ sound ------------------------------ */
  {
    id: "module.buzzer.passive",
    name: "Passive Buzzer",
    kind: "module",
    category: "Output",
    description:
      "A passive buzzer has no oscillator inside, so unlike the active buzzer in this catalog (module.buzzer.active), which beeps one fixed tone when you give it power, it makes sound only when your board sends it a changing signal. You choose the pitch: tone(pin, 440) on an Arduino, or PWM (for example ledcWriteTone on an ESP32) at the frequency you want, so you can play melodies and different beeps. Pin 1 is the + side (signal) and goes to a GPIO pin; pin 2 goes to ground.",
    identify:
      "A black plastic cylinder about 12 mm wide with two legs. The bottom of a passive buzzer shows a bare green circuit board, while an active buzzer is sealed with black epoxy underneath. Test: put 5 V on it directly; a passive buzzer makes only a click, an active one beeps. Modules (KY-006) are small boards with a 3-pin header (signal S, middle, ground -).",
    variants: [
      { label: "Bare buzzer, 2 legs", detail: "The part this entry describes. Pin 1 is the signal side (often marked +)." },
      { label: "Module with 3 pins", detail: "A small breakout with pins S, middle and -. Follow the silkscreen; the middle pin may be unused." },
      { label: "Active buzzer", detail: "Looks almost the same but beeps with plain HIGH/LOW; see the Buzzer entry." },
    ],
    watchOuts: [
      "Use tone() or a PWM output, not digitalWrite(HIGH). A steady HIGH on a passive buzzer only gives one click.",
      "It draws a few tens of milliamps, which is fine for most pins, but for a louder or bigger buzzer use a transistor.",
      "On an ESP32 or other board where tone() is not available, use the board's PWM / LEDC functions to set the frequency.",
      "Make sure you bought a passive buzzer when you want melodies. If the listing says active or has a built-in oscillator it can only beep one tone.",
    ],
    photoCaption: "Round black passive buzzer seen from the side with its green circuit board underneath",
    photoHint: "buzzer-passive",
    wokwi: { tag: "wokwi-buzzer" },
    pins: [dig("1", "1 (SIG)"), gnd("2", "2 (GND)")],
  },
  {
    id: "module.speaker.8ohm",
    name: "Speaker (8 ohm, small)",
    kind: "module",
    category: "Output",
    description:
      "A small round speaker, typically 8 ohm and 0.25 to 3 W, that plays real sound once an amplifier drives it. Two wires or solder tabs (SPK+ and SPK-). A microcontroller pin cannot drive it directly: a GPIO pin gives a thin, quiet buzz and risks damage. Use an amplifier module such as a PAM8403 or LM386 board (see their entries), or the DFPlayer Mini's built-in amplifier for a small speaker.",
    identify:
      "A round or oval metal-framed speaker, from about 20 mm to 57 mm across, with a paper or plastic cone and two solder tabs or two wires. The impedance (8 ohm, 4 ohm) and power (for example 0.5 W or 3 W) are printed on the magnet or in the listing. Lookalikes: a piezo buzzer is a flat disc without a cone; a headphone speaker has a plug.",
    variants: [
      { label: "8 ohm, 0.5 W to 3 W", detail: "The usual small speaker. Match the listed power to your amplifier." },
      { label: "4 ohm", detail: "Louder with the same amplifier, but draws more current. Check the amplifier's rating." },
      { label: "Speaker in a box", detail: "Sounds fuller. The electrical connection is the same." },
    ],
    watchOuts: [
      "Do not connect it to a GPIO pin or to GND and 5 V. Use an amplifier module.",
      "Do not connect either speaker terminal to ground when you use a PAM8403 or other bridge-tied amplifier. The two outputs are both active and grounding one can damage it. Use the amplifier's L+/L- terminals only.",
      "Do not play at a power higher than the speaker's rating. A 0.5 W speaker on a 3 W amplifier will distort and can burn.",
      "A speaker without a box sounds thin. Mount it in a small enclosure for more bass.",
    ],
    photoCaption: "Small round 8 ohm speaker with a paper cone and two solder tabs",
    photoHint: "speaker-8ohm",
    pins: [ana("SPK+", "SPK+"), ana("SPK-", "SPK-")],
  },
  {
    id: "module.amp.pam8403",
    name: "PAM8403 Amplifier Module (stereo, 5 V)",
    kind: "module",
    category: "Output",
    description:
      "A tiny class-D stereo amplifier board that turns a weak audio signal into enough power to drive small speakers. Power it from 5 V (the chip accepts about 2.5 to 5.5 V, so a USB supply works). Audio goes in on L and R (with a shared ground) and the two speakers connect to the L+/L- and R+/R- terminals. A volume knob on the board sets the level. It gives up to about 3 W per channel into 4 ohm at the chip's limit, less at 8 ohm and when the supply is weak.",
    identify:
      "A small blue board about 21 x 20 mm with a PAM8403 or '8403' chip, a round volume potentiometer, a 3-pin audio input (L, G, R) or solder pads, two 2-pin screw terminals or pads for speakers and a pair of 5 V power pads (often a micro-USB or 2 pads). Lookalikes: the LM386 board is mono and has a bigger blue trimmer, and the PAM8610 board is larger.",
    variants: [
      { label: "With volume potentiometer", detail: "The part this entry describes." },
      { label: "USB-powered variant", detail: "Same chip with a USB connector for 5 V power." },
      { label: "Mono use", detail: "Use only the left channel and ignore the right." },
    ],
    watchOuts: [
      "Do not connect the speaker's minus terminal to ground. The outputs are bridge-tied (both active) and grounding either damages the amplifier.",
      "Power it with a clean 5 V supply that can give at least 500 mA to 1 A. A weak supply makes hum, crackle or resets of the board.",
      "Use a speaker rated for the power (small 8 ohm speakers often 0.5 W to 3 W). Too loud a setting can burn a small speaker.",
      "Keep the input wires short and use a shared ground between the audio source and the module to avoid hum.",
      "Input from a 3.3 V DAC or an ESP32 pin can be quiet; use the volume knob and check the connection polarity.",
    ],
    photoCaption: "Small blue PAM8403 style stereo amplifier board with a volume knob and green terminals",
    photoHint: "amp-pam8403",
    pins: [
      pwr("VCC", "5V", "5v"),
      gnd("GND"),
      ana("L", "L (audio in)"),
      ana("R", "R (audio in)"),
      ana("L+", "L+ (speaker)"),
      ana("L-", "L- (speaker)"),
      ana("R+", "R+ (speaker)"),
      ana("R-", "R- (speaker)"),
    ],
  },
  {
    id: "module.amp.lm386",
    name: "LM386 Amplifier Module (mono)",
    kind: "module",
    category: "Output",
    description:
      "A simple mono audio amplifier board built around the LM386 chip. It takes a small audio signal on IN and drives a small speaker from its output, using the module's supply and a volume trimmer. Typical modules accept about 5 to 12 V (check the listing; the LM386 chip itself is rated 4 to 12 V in the common versions) and give a few hundred milliwatts with an 8 ohm speaker. The speaker's second wire goes to GND on this module, unlike a PAM8403.",
    identify:
      "A small blue board about 40 x 20 mm with an 8-pin LM386 chip, a large blue trimmer for volume, a 3-pin header (VCC, GND, IN), two speaker pads or a 2-pin header and a few capacitors. Lookalikes: the PAM8403 board is stereo with a round knob and drives the speaker differently.",
    variants: [
      { label: "Default gain (about 20)", detail: "Most modules; the volume trimmer sets the level." },
      { label: "Gain pad bridged (about 200)", detail: "Some boards let you solder across pads to raise the gain; more noise too." },
    ],
    watchOuts: [
      "Check the supply range in the listing. Most boards take 5 to 12 V; do not exceed it.",
      "Connect the input to a low-level audio source. A GPIO pin driving it directly makes a noisy, harsh sound.",
      "Use an 8 ohm speaker with a power rating of at least 0.5 W. The module gets warm on long, loud use.",
      "Keep the audio and power grounds together, and keep the input leads short to avoid hum and buzzing.",
    ],
    photoCaption: "Blue LM386 style audio amplifier module with a big volume trimmer",
    photoHint: "amp-lm386",
    pins: [
      pwr("VCC", "VCC"),
      gnd("GND"),
      ana("IN", "IN (audio in)"),
      ana("OUT", "OUT (speaker +)"),
    ],
  },
  {
    id: "module.mp3.dfplayer",
    name: "DFPlayer Mini MP3 Module",
    kind: "module",
    category: "Output",
    description:
      "A tiny MP3 and WAV player with a microSD slot and a small built-in amplifier. Load sound files on a FAT32 microSD card and tell it which track to play over a serial connection (RX/TX at 9600 baud) from your board. It can drive a small speaker directly on SPK1 and SPK2 (about 3 W maximum), or send line-level audio from DAC_L and DAC_R to an amplifier. VCC takes about 3.2 to 5 V, and its serial pins use 3.3 V logic. BUSY goes LOW while a file plays.",
    identify:
      "A tiny black square board about 20 x 20 mm with a silver microSD card slot on the top, a black chip in the middle and 16 gold pins, 8 on each side. Pin 1 is next to the VCC marking. Pin names: VCC, RX, TX, DAC_R, DAC_L, SPK_1, GND, SPK_2 on one side; BUSY, USB-, USB+, ADKEY2, ADKEY1, IO2, GND, IO1 on the other. Some clones use different chips that behave differently.",
    variants: [
      { label: "Original (YX5200 / MP3-TF-16P)", detail: "The version most libraries and tutorials assume." },
      { label: "Clone chips (GD3200B, MH2024K)", detail: "Same pins but some commands behave differently. If a tutorial does not work, try a different library or buy a known-good module." },
    ],
    watchOuts: [
      "Put a 1 kilohm resistor in series with the RX line when the board runs at 5 V. The module's logic is 3.3 V and a direct 5 V signal can cause noise or damage.",
      "It must be formatted FAT32. Put the sound files in a folder named mp3 with names like 0001.mp3. The numbers matter.",
      "A speaker connected to SPK_1 and SPK_2 must be 8 ohm or higher and must not be connected to ground. Use DAC_L/DAC_R and an amplifier for bigger speakers.",
      "Power it from a good supply; the module draws brief peaks. A 100 uF capacitor across VCC and GND helps with clicks and resets.",
      "Many modules only play after the card is fully inserted. If it is silent, check the card, the files and the library example.",
    ],
    photoCaption: "Tiny DFPlayer Mini MP3 board with a silver microSD slot and two rows of eight pins",
    photoHint: "dfplayer-mini",
    pins: [
      pwr("VCC", "VCC (3.2-5V)", "5v"),
      dig("RX", "RX (to board TX)"),
      dig("TX", "TX (to board RX)"),
      ana("DAC_R", "DAC_R (audio out)"),
      ana("DAC_L", "DAC_L (audio out)"),
      ana("SPK_1", "SPK_1 (speaker)"),
      gnd("GND"),
      ana("SPK_2", "SPK_2 (speaker)"),
      dig("BUSY", "BUSY (output)"),
      dig("USB-", "USB-"),
      dig("USB+", "USB+"),
      ana("ADKEY2", "ADKEY2"),
      ana("ADKEY1", "ADKEY1"),
      dig("IO2", "IO2 (button)"),
      gnd("GND2", "GND"),
      dig("IO1", "IO1 (button)"),
    ],
  },
  {
    id: "module.siren.alarm",
    name: "Alarm Siren (buzzer-style)",
    kind: "module",
    category: "Output",
    description:
      "A loud electronic alarm siren with a built-in oscillator (and sometimes a rising-falling tone). Give it power and it wails; remove the power and it stops. Two wires: red is V+ and black is GND. The voltage rating varies by model, often 6 to 12 V DC, and it can draw hundreds of milliamps. Always check the label. Switch it from a board with a relay or a MOSFET, never straight from a GPIO pin.",
    identify:
      "A black or white plastic box or horn-shaped unit about 40 to 60 mm across, with a speaker horn on the front and two flying leads (red and black). The label lists the voltage, current and loudness in decibels. Lookalikes: a small active buzzer is much smaller and quieter; a 220 V mains siren is a different product and not for this catalog.",
    variants: [
      { label: "Piezo siren (DC)", detail: "A loud shrill tone. The part this entry describes." },
      { label: "Electronic horn / 12 V siren", detail: "Bigger and louder; check the current on the label and use a heavy-duty switch." },
    ],
    watchOuts: [
      "Check the voltage and current on the label before choosing a supply. Using too low a voltage makes a weak sound; using too high a voltage damages it.",
      "Switch it with a relay module or a MOSFET and give it its own supply. A GPIO pin cannot supply that current.",
      "It is very loud (often over 100 dB). Test it away from your ears, and add a switch or a way to silence it.",
      "Polarity: red to V+ and black to GND. Reversed, many sirens do not sound and some are damaged.",
    ],
    photoCaption: "Black plastic alarm siren with a flared horn and a red and black wire",
    photoHint: "siren-alarm",
    pins: [pwr("V+", "V+ (red)"), gnd("GND", "GND (black)")],
  },

  /* ------------------------------ lights ------------------------------ */
  {
    id: "module.led.strip.ws2812b",
    name: "LED Strip WS2812B (addressable, 5 V)",
    kind: "module",
    category: "Output",
    description:
      "A flexible strip of tiny addressable RGB LEDs (WS2812B, often sold as NeoPixel strip). Each LED has its own controller chip, so one data wire from your board sets the colour of every LED individually (the FastLED or NeoPixel library does this). Three connections: 5V, DIN (data in, from the board) and GND. The strip is powered at 5 V, and each LED can draw up to about 60 mA at full white, so a metre of 60 LEDs can need over 3 A. DOUT at the far end can feed a second strip.",
    identify:
      "A thin white or black flexible tape 10 mm wide with square 5 mm LEDs in a row, a 3-pin JST-style connector or solder pads at each end labelled 5V, DIN (or DI) and GND, and cut marks every LED. Arrows show the data direction. Lookalikes: 12 V addressable strips (WS2811 based) need a 12 V supply; 4-pin analog RGB strips have no data pin and are a different part.",
    variants: [
      { label: "WS2812B, 30/60/144 LEDs per metre", detail: "The part this entry describes. More LEDs per metre means more current." },
      { label: "WS2811 / 12 V strips", detail: "Addressable but at 12 V and three LEDs per chip; do not power them from 5 V." },
      { label: "SK6812 RGBW", detail: "Similar protocol with an extra white LED; use the matching library setting." },
    ],
    watchOuts: [
      "Use a separate 5 V supply sized for the strip, about 60 mA per LED at full white (for example 3 A for 60 LEDs), and join its ground to the board's ground. The board's 5 V pin cannot power more than a few LEDs.",
      "Connect GND first and the data line second. Put a 300 to 500 ohm resistor in series with the data line and a 1000 uF capacitor across the strip's supply to protect the first LED.",
      "On a 3.3 V board the data signal may be too low for 5 V LEDs. If it flickers, use a level shifter (a 74AHCT125 chip works well).",
      "Data flows one way: the board goes to DIN, never to DOUT.",
      "Do not run all LEDs at full white for long; they get hot. Limit brightness in your code.",
    ],
    photoCaption: "Flexible white addressable LED strip with small square RGB LEDs and a three-wire connector",
    photoHint: "led-strip-ws2812b",
    pins: [
      pwr("5V", "5V", "5v"),
      dig("DIN", "DIN (data in)"),
      dig("DOUT", "DOUT (data out)"),
      gnd("GND"),
    ],
  },
  {
    id: "module.led.strip.rgb12v",
    name: "LED Strip RGB 12 V (analog, 4-wire)",
    kind: "module",
    category: "Output",
    description:
      "A flexible strip of RGB LEDs that all show the same colour at the same time. It has four connections: V+ (12 V, red wire) and one wire per colour (R, G, B). To mix a colour you switch each colour wire to ground with a logic-level N-channel MOSFET driven by a PWM pin. The colour wires must never connect to a GPIO pin directly: they carry the whole LED current, often an ampere or more per colour on a long strip.",
    identify:
      "A flexible tape about 10 mm wide with 5050 RGB LED chips (and small resistors) every 5 cm or so, a 4-pin connector or solder pads labelled 12V (or +), R, G, B at each end. Lookalikes: addressable strips have 3 pins (5V, DIN, GND) and a data signal; 5 V and 24 V strips look identical, so check the label.",
    variants: [
      { label: "12 V common anode (usual)", detail: "V+ is shared and each colour is switched on its ground side. This entry describes this type." },
      { label: "5 V and 24 V versions", detail: "Same layout with a different supply. Use a supply that matches the label." },
      { label: "RGBW and RGB+CCT", detail: "Add a fifth wire for white; each wire needs its own MOSFET." },
    ],
    watchOuts: [
      "Never drive the R, G and B wires from a GPIO pin. Use three logic-level N-channel MOSFETs (or a ready-made RGB MOSFET driver board) with the source at ground and the gate on a PWM pin through a resistor.",
      "Use a 12 V supply sized for the strip: a full metre of 5050 LEDs can draw 1 to 2 A. Join the supply's ground to the board's ground.",
      "Do not power it from 5 V; it will be dim and the colours will be wrong. Do not power it above 12 V either.",
      "Long strips drop voltage along the way, so the far end looks dim. Feed the power in at both ends for long runs.",
      "The tape can get warm. Do not leave a roll bundled up while lit.",
    ],
    photoCaption: "Flexible white analog RGB LED strip with chunky LEDs and a four-pin connector",
    photoHint: "led-strip-12v",
    pins: [pwr("V+", "V+ (12V)"), dig("R"), dig("G"), dig("B")],
  },
  {
    id: "module.led.highpower",
    name: "High-Power / COB LED (1 W to 50 W)",
    kind: "module",
    category: "Output",
    description:
      "A very bright LED, from a 1 W star-shaped LED to a flat COB (chip-on-board) panel of 10 to 50 W, mounted on an aluminium base. It has two connections: anode (+) and cathode (-). Unlike a small LED, you do not use a resistor. You need a constant-current LED driver sized for the LED, plus a heatsink. A board pin cannot run it, and connecting it straight to a battery or a power supply can destroy it in seconds.",
    identify:
      "A round or square aluminium plate (often 20 mm star shape for 1 W to 3 W, or a larger flat panel for COB) with a yellow or white phosphor surface on top and two solder pads marked + and -. The listing gives the power in watts, the forward voltage (for example 3 V for a 1 W white, 30 to 36 V for a 50 W COB) and the current (for example 350 mA or 700 mA).",
    variants: [
      { label: "1 W to 3 W star", detail: "Small and bright. Usually needs a driver of 350 to 700 mA, as the listing says." },
      { label: "COB panels 10 W to 50 W", detail: "Large, bright and hot. Needs a proper constant-current driver and a large heatsink." },
      { label: "Colour options", detail: "Warm white, cool white, red, green, blue and RGB versions. RGB ones have more pins." },
    ],
    watchOuts: [
      "Use a constant-current LED driver rated for this LED's current and voltage. Never connect it to a battery or a bench supply without current limiting.",
      "Mount it on a heatsink before you power it. Without one a high-power LED overheats and fails in seconds.",
      "Never look directly at a lit high-power LED. It can damage your eyes.",
      "Dim it with a driver that has a dimming input or by PWM on the driver's enable pin, not by switching the LED directly from a GPIO pin.",
      "COB LEDs may need a driver with a high output voltage; check the listing for the forward voltage range.",
    ],
    photoCaption: "Square white high-power LED on a round aluminium star base",
    photoHint: "led-highpower",
    pins: [dig("A", "A (anode +)"), dig("K", "K (cathode -)")],
  },
  {
    id: "module.laser.650nm",
    name: "Laser Diode Module 650 nm (red dot)",
    kind: "module",
    category: "Output",
    description:
      "A small red laser pointer module that makes a bright red dot. It is built into a small brass tube with a lens and a tiny circuit board with a resistor. A typical module runs from about 3 to 5 V and draws a few tens of milliamps. The 3-pin breakout version (for example the KY-008) has pins S (signal), a middle pin and - (GND); the 2-wire version has a red and a black lead. Check the listing for which pin is which. Laser safety: never point it at eyes, people or animals.",
    identify:
      "A brass or aluminium cylinder about 6 mm wide and 10 to 12 mm long with a glass lens at one end and a small board with a 3-pin header (S, middle, -) or two flying leads at the other. The listing says 650 nm, 5 mW (or less). Lookalikes: a green or blue-violet laser module looks the same but is a different wavelength and strength.",
    variants: [
      { label: "3-pin KY-008 style module", detail: "Pins S (signal), a middle pin and - (GND). On some clones the middle pin is +5 V and on others it is not connected; check the silkscreen and listing." },
      { label: "2-wire laser dot module", detail: "A red (+) and a black (-) lead. Often 3 to 5 V." },
      { label: "Line and cross lasers", detail: "Different lens heads, same electrical idea." },
    ],
    watchOuts: [
      "EYE SAFETY: never look into the beam or at its reflection, never point it at a person or animal, and do not aim it at windows or mirrors. Even a 5 mW laser can damage eyes. Keep it out of children's reach.",
      "Do not exceed the voltage on the listing (usually 5 V). More voltage damages the diode immediately.",
      "Use the resistor on the module or add your own; a bare laser diode needs a current-limiting circuit.",
      "Let it turn off when not in use; the module gets hot if left on, and a hot diode dims quickly.",
    ],
    photoCaption: "Small brass cylinder laser diode module with a lens, a small board with pins and a thin red beam",
    photoHint: "laser-650nm",
    pins: [dig("S", "S (signal)"), pwr("VCC", "Middle (+5V or NC)", "5v"), gnd("GND", "- (GND)")],
  },
  {
    id: "module.rgb.ky016",
    name: "RGB LED Module (KY-016)",
    kind: "module",
    category: "Output",
    description:
      "A tiny board with a clear 5 mm RGB LED (common cathode) and four header pins: R, G, B and GND (-). It is the ready-to-use version of the loose RGB LED in this catalog (module.rgb-led): no need to wire up a breadboard. Drive each colour pin with a PWM output (analogWrite) to mix colours; set a pin HIGH for full brightness of that colour and LOW for off. Most boards carry small resistors so they can run on 5 V; check your listing and the board.",
    identify:
      "A small green or blue square board about 25 x 18 mm with a clear 5 mm RGB LED on top and a 4-pin header. The silkscreen reads R, G, B and a minus (-) or GND (some print G, R, B in a different order, so follow the board). Lookalikes: a plain 5 mm RGB LED has long leads and no board, and addressable LED modules have a chip and a DIN pin.",
    variants: [
      { label: "Common-cathode KY-016", detail: "The part this entry describes: GND is the shared pin and a colour pin HIGH lights that colour." },
      { label: "Common-anode versions", detail: "A few modules share the positive side. Colours then light when their pin is LOW." },
      { label: "Without resistors", detail: "If you cannot see small resistors on the board, add a 220 ohm resistor on each colour pin." },
    ],
    watchOuts: [
      "Check the pin order on the silkscreen before wiring; not every module has R, G, B, GND in the same order.",
      "If your board has no onboard resistors, add a 220 ohm resistor in each colour line. Without them the LED or the pin can burn out.",
      "Use PWM-capable pins (marked with ~ on an Arduino) to mix colours. On a plain digital pin you only get the 7 basic colours.",
      "Red, green and blue are not equally bright on one resistor value. Tune each channel in your code for white.",
    ],
    photoCaption: "Small green board with a clear RGB LED and four header pins, the KY-016 style module",
    photoHint: "rgb-ky016",
    pins: [dig("R"), dig("G"), dig("B"), gnd("GND", "- (GND)")],
  },
];

/* ------------------------------ electrical data ------------------------------ */

const V5: VoltageRange = { min: 4.5, max: 5.5 };

const relay5v: PartElectrical = {
  pins: {
    VCC: { accepts: V5 },
    "JD-VCC": { accepts: V5 },
  },
};

const OUTPUTS_ELECTRICAL: Record<string, PartElectrical> = {
  // Small hobby motors: 1.5-6 V covers the usual 130-size motor; a 12 V motor is a different part.
  "module.motor.dc": {
    pins: { M1: { accepts: { min: 1.5, max: 6 } }, M2: { accepts: { min: 1.5, max: 6 } } },
  },
  "module.fan.5v": { supply: V5 },
  // Standard hobby servo range, wider top end than the SG90 entry.
  "module.servo.mg996r": { supply: { min: 4.5, max: 7.2 }, logic: "5v", inputOnlyPins: ["PWM"] },
  "module.servo.continuous": { supply: { min: 4.5, max: 6 }, logic: "5v", inputOnlyPins: ["PWM"] },
  // 5 V motor version; the 12 V version is covered in the text.
  "module.stepper.28byj48": {
    supply: V5,
    inputOnlyPins: ["IN1", "IN2", "IN3", "IN4"],
  },
  "module.driver.a4988": {
    pins: { VMOT: { accepts: { min: 8, max: 35 } }, VDD: { accepts: { min: 3, max: 5.5 } } },
    inputOnlyPins: ["ENABLE", "MS1", "MS2", "MS3", "RESET", "SLEEP", "STEP", "DIR"],
  },
  "module.driver.drv8825": {
    pins: { VMOT: { accepts: { min: 8.2, max: 45 } } },
    inputOnlyPins: ["ENABLE", "M0", "M1", "M2", "RESET", "SLEEP", "STEP", "DIR"],
  },
  "module.driver.l298n": {
    pins: { VS: { accepts: { min: 5, max: 35 } }, "5V": { accepts: V5 } },
    inputOnlyPins: ["ENA", "ENB", "IN1", "IN2", "IN3", "IN4"],
  },
  "module.driver.l293d": {
    pins: { VCC1: { accepts: { min: 4.5, max: 7 } }, VCC2: { accepts: { min: 4.5, max: 36 } } },
    inputOnlyPins: ["EN12", "EN34", "IN1", "IN2", "IN3", "IN4"],
  },
  "module.driver.tb6612fng": {
    pins: { VM: { accepts: { min: 4.5, max: 13.5 } }, VCC: { accepts: { min: 2.7, max: 5.5 } } },
    inputOnlyPins: ["AIN1", "AIN2", "PWMA", "BIN1", "BIN2", "PWMB", "STBY"],
  },
  "module.relay.1ch": { supply: V5, inputOnlyPins: ["IN"] },
  "module.relay.2ch": { ...relay5v, inputOnlyPins: ["IN1", "IN2"] },
  "module.relay.4ch": { ...relay5v, inputOnlyPins: ["IN1", "IN2", "IN3", "IN4"] },
  "module.relay.ssr": { supply: { min: 3, max: 5.5 }, inputOnlyPins: ["IN"] },
  "module.solenoid.12v": { pins: { "V+": { accepts: { min: 10, max: 14 } } } },
  // PAM8403 chip rating; the speaker pins are bridge-tied and never ground.
  "module.amp.pam8403": { supply: { min: 2.5, max: 5.5 }, inputOnlyPins: ["L", "R"] },
  "module.amp.lm386": { supply: { min: 4, max: 12 }, inputOnlyPins: ["IN"] },
  "module.mp3.dfplayer": {
    logic: "3v3",
    supply: { min: 3.2, max: 5 },
    inputOnlyPins: ["RX", "IO1", "IO2"],
    inputMaxVolts: 3.6,
    inputMaxIsHard: false,
  },
  "module.led.strip.ws2812b": {
    supply: V5,
    logic: "5v",
    logicFollowsSupply: true,
    inputOnlyPins: ["DIN"],
    inputHighFraction: 0.7,
  },
  "module.led.strip.rgb12v": { pins: { "V+": { accepts: { min: 11, max: 13.5 } } } },
  "module.laser.650nm": { supply: { min: 3, max: 5.5 }, inputOnlyPins: ["S"] },
  "module.rgb.ky016": { inputOnlyPins: ["R", "G", "B"] },
};

export const EXTRA_OUTPUTS: CatalogPart[] = EXTRA_OUTPUT_PARTS.map((part) => ({
  ...part,
  electrical: OUTPUTS_ELECTRICAL[part.id],
}));
