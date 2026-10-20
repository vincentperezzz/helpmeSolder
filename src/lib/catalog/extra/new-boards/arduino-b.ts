import type { NewBoardsGroup } from "./_helpers";
import { ana, BOARD_3V3, dig, digRange, gnd, i2c, pin, power, spi, uart, USB_5V, vinRange } from "./_helpers";

/** Arduino Nano ESP32, Nano 33 IoT and MKR WiFi 1010: three 3.3 V boards (two of them use the classic Nano footprint). */
const group: NewBoardsGroup = {
  parts: [
    {
      id: "board.arduino.nano.esp32",
      name: "Arduino Nano ESP32",
      kind: "board",
      description:
        "A Nano-sized Arduino built on a u-blox NORA-W106 module, which contains an ESP32-S3 chip with Wi-Fi and Bluetooth LE. It runs at 3.3 V (NOT 5 V like the classic Nano) and has a USB-C port. Header pins: D0-D13, analog pins A0-A7, 3V3, VBUS (5 V from USB), VIN and GND. Default buses: I2C on A4 (SDA) and A5 (SCL), SPI on D13 (SCK), D12 (CIPO) and D11 (COPI) with D10 as chip select, serial on D0 (RX) and D1 (TX). It also has a small RGB LED and a yellow LED on D13. There is no 5V pin: the VBUS pin gives 5 V only while the board is powered over USB.",
      photoCaption:
        "Arduino Nano ESP32: small Nano-shaped board with a USB-C port at one end, a shiny metal radio module at the other end and a pin row along each long side.",
      identify:
        "The same size as an Arduino Nano (about 4.5 x 1.8 cm) with two rows of 15 pins, but it has a USB-C connector and a silver metal Wi-Fi module with the text NORA-W106 or ESP32-S3 at the far end. The silkscreen says NANO ESP32. A small reset button sits near the USB port and there is an RGB LED. Do not confuse it with the Nano ESP32 look-alikes from other makers, which have different pin labels.",
      variants: [
        {
          label: "Nano ESP32 (this guide)",
          detail: "NORA-W106-10B module (ESP32-S3), 16 MB flash, 3.3 V logic, USB-C. Sold with or without header pins already soldered.",
          matchesGuide: true,
        },
        {
          label: "Nano ESP32 without headers",
          detail: "Same board with bare castellated edge holes. You solder pins or wires to it yourself; the pin names are identical.",
          matchesGuide: true,
        },
        { label: "Arduino Nano (classic) / Nano Every", detail: "5 V boards in the same footprint. They are NOT the same electrically; check the text on the chip and the connector (mini/micro-USB, not USB-C)." },
      ],
      watchOuts: [
        "3.3 V BOARD: although it fits in the classic Nano footprint, every pin is 3.3 V and is NOT 5 V tolerant. A 5 V sensor output, a 5 V Arduino pin or a 5 V shield wired straight to a pin can permanently damage it. Use a level shifter or a voltage divider.",
        "Two pin-numbering modes: in the Arduino IDE (Tools > Pin Numbering) you can pick the Arduino names (D2, A0, default) or raw chip GPIO numbers. They are different things: for example D2 is chip GPIO5 and A1 is GPIO2. Use the D/A names in a sketch unless you know you switched to GPIO mode, and do not mix the two.",
        "There is no 5V pin. The VBUS pin carries 5 V only while the board is powered over USB-C; when you power the board from VIN, VBUS is off. To run 5 V parts from a battery or VIN, use a separate 5 V supply.",
        "VIN accepts about 6-21 V (never above 21 V) and the board steps it down to 3.3 V. Do not push more than 5 V into the USB-C port. Do not connect VIN and USB to two different power supplies at once.",
        "Pins are weak: the chip can source up to about 40 mA and sink about 28 mA, but keep it to 10-20 mA. Always use a resistor with an LED and never drive a motor, relay coil or buzzer directly from a pin.",
        "I2C defaults to A4 (SDA) and A5 (SCL), so those two pins are not free for analog use when an I2C part is attached. Analog reads on A4-A7 (chip ADC2) may become unreliable while Wi-Fi is running; prefer A0-A3 for analog sensors in Wi-Fi projects.",
        "The RGB LED is active-low: writing LOW turns a colour on. The yellow LED (LED_BUILTIN) shares the D13 pin with SPI SCK, so it flickers whenever SPI is used.",
        "The two extra header pins B0 and B1 are boot-mode pins, not general I/O. Leave them unconnected. If a sketch locks up the board, double-tap the reset button to enter the bootloader and upload again.",
        "Wi-Fi is 2.4 GHz only (no 5 GHz networks). The D0/D1 serial is a separate hardware serial port from the USB serial; check the board's cheat sheet for the exact port name in your Arduino core version.",
      ],
      photoHint: "arduino-nano-esp32",
      pins: [
        uart("D0", "D0 (RX)"),
        uart("D1", "D1 (TX)"),
        dig("D2"),
        dig("D3"),
        dig("D4"),
        dig("D5"),
        dig("D6"),
        dig("D7"),
        dig("D8"),
        dig("D9"),
        spi("D10", "D10 (CS)"),
        spi("D11", "D11 (COPI)"),
        spi("D12", "D12 (CIPO)"),
        spi("D13", "D13 (SCK)"),
        ana("A0"),
        ana("A1"),
        ana("A2"),
        ana("A3"),
        pin("A4", "A4 (SDA)", ["analog", "digital", "i2c"]),
        pin("A5", "A5 (SCL)", ["analog", "digital", "i2c"]),
        ana("A6"),
        ana("A7"),
        power("3V3", "3V3", "3v3"),
        power("VBUS", "VBUS (5V USB)", "5v"),
        power("VIN", "VIN (6-21V)"),
        gnd("GND.1"),
        gnd("GND.2"),
      ],
      electrical: BOARD_3V3({
        // 5 V from the USB-C port; not present when the board runs from VIN.
        VBUS: USB_5V,
        VIN: vinRange(6, 21, 9),
      }),
    },
    {
      id: "board.arduino.nano33.iot",
      name: "Arduino Nano 33 IoT",
      kind: "board",
      description:
        "A Nano-sized Arduino with a SAMD21 Cortex-M0+ chip and a u-blox NINA-W102 module that adds Wi-Fi and Bluetooth. It runs at 3.3 V (NOT 5 V like the classic Nano) and has a micro-USB port. It also carries an accelerometer/gyroscope chip and a crypto chip. Header pins: D0-D13, analog A0-A7 (A0 can also be a DAC output), 3V3, VUSB, VIN and GND. Default buses: I2C on A4 (SDA) and A5 (SCL), SPI on D11 (MOSI), D12 (MISO), D13 (SCK) with D10 as chip select, serial on D0 (RX) and D1 (TX). D13 drives the built-in LED.",
      photoCaption:
        "Arduino Nano 33 IoT: small Nano-shaped board with a micro-USB port at one end, a silver radio module at the other end and a pin row along each long side.",
      identify:
        "Same size as an Arduino Nano (about 4.5 x 1.8 cm) with two rows of 15 pins and a micro-USB connector. A silver shielded module marked NINA-W102 sits at the end away from the USB port. The silkscreen says NANO 33 IoT. A small button and a green power LED are near the USB port. It is easy to confuse with the Nano 33 BLE and Nano Every, which have different chips and pins.",
      variants: [
        {
          label: "Nano 33 IoT (this guide)",
          detail: "SAMD21 plus NINA-W102 Wi-Fi/Bluetooth, 3.3 V logic, micro-USB. Sold with or without header pins already soldered.",
          matchesGuide: true,
        },
        { label: "Nano 33 BLE / BLE Sense", detail: "Nordic nRF52840 chip, no Wi-Fi, different pin functions. Not covered by this guide." },
        { label: "Nano Every / classic Nano", detail: "5 V boards in the same footprint. Not the same electrically." },
      ],
      watchOuts: [
        "3.3 V BOARD: although it fits in the classic Nano footprint, every pin is 3.3 V and is NOT 5 V tolerant. A 5 V sensor output, a 5 V Arduino pin or a 5 V shield wired straight to a pin can permanently damage it. Use a level shifter or a voltage divider.",
        "The pin labelled 5V / VUSB is NOT a 5 V output by default. It connects to the USB 5 V rail only after you bridge a small solder jumper (SJ1) on the underside of the board. Without it, 5 V parts get no power from this pin; bring your own 5 V supply or bridge the jumper.",
        "VIN accepts roughly 5-18 V (21 V is the absolute maximum, never exceed it). Use 5-12 V for a cooler board. Do not connect VIN and USB to two different power supplies at once.",
        "Pins are weak: the SAMD21 chip is rated for only about 7 mA per pin. Use a resistor with an LED, and never drive a motor, relay coil or buzzer directly from a pin; use a transistor or a driver board.",
        "A4 (SDA) and A5 (SCL) have built-in pull-up resistors and are the default I2C pins, so avoid using them as analog inputs. The on-board motion sensor and crypto chip are on a separate internal bus, but make sure your I2C parts do not use the same address as theirs.",
        "ADC inputs read 0-3.3 V (12-bit). A0 can also output an analog voltage (DAC). Analog reference (AREF) is on its own pin; leave it unconnected unless you know you need it.",
        "Wi-Fi is 2.4 GHz only and is handled by the separate NINA module (use the WiFiNINA library). Do not reprogram the NINA firmware unless you know what you are doing.",
        "If a sketch locks up the board, double-tap the reset button to enter the bootloader and upload again. Use a micro-USB cable that carries data, not a charge-only cable.",
      ],
      photoHint: "arduino-nano-33-iot",
      pins: [
        uart("D0", "D0 (RX)"),
        uart("D1", "D1 (TX)"),
        dig("D2"),
        dig("D3"),
        dig("D4"),
        dig("D5"),
        dig("D6"),
        dig("D7"),
        dig("D8"),
        dig("D9"),
        spi("D10", "D10 (CS)"),
        spi("D11", "D11 (MOSI)"),
        spi("D12", "D12 (MISO)"),
        spi("D13", "D13 (SCK)"),
        ana("A0", "A0 (DAC)"),
        ana("A1"),
        ana("A2"),
        ana("A3"),
        pin("A4", "A4 (SDA)", ["analog", "digital", "i2c"]),
        pin("A5", "A5 (SCL)", ["analog", "digital", "i2c"]),
        ana("A6"),
        ana("A7"),
        power("3V3", "3V3", "3v3"),
        power("VUSB", "VUSB (5V, jumper)", "5v"),
        power("VIN", "VIN (5-18V)"),
        gnd("GND.1"),
        gnd("GND.2"),
      ],
      electrical: BOARD_3V3({
        // Only connected to the USB 5 V rail when solder jumper SJ1 is bridged, so no guaranteed source.
        VUSB: { accepts: { min: 4.5, max: 5.5 } },
        VIN: vinRange(5, 18, 9),
      }),
    },
    {
      id: "board.arduino.mkr.wifi1010",
      name: "Arduino MKR WiFi 1010",
      kind: "board",
      description:
        "A compact Arduino with a SAMD21 Cortex-M0+ chip and a u-blox NINA-W102 module for Wi-Fi and Bluetooth, running at 3.3 V (NOT 5 V). It has a micro-USB port and a built-in Li-Po battery charger with a 2-pin JST battery connector and a charging LED. The two header rows hold: AREF, A0-A6 (A0 is also a DAC output) and D0-D5 on the left side, and D6-D14, RESET, GND, VCC (3.3 V out), VIN and 5V on the right side. I2C is on D11 (SDA) and D12 (SCL), SPI on D8 (MOSI), D9 (SCK) and D10 (MISO), serial on D14 (TX) and D13 (RX). The built-in LED is on D6.",
      photoCaption:
        "Arduino MKR WiFi 1010: slim board with a micro-USB port and a small battery connector at one end and a silver Wi-Fi module at the other.",
      identify:
        "A slim board about 6.1 x 2.5 cm with a row of 14 pins on each long side, a micro-USB port in the middle of one short end with a small 2-pin white battery connector beside it, and a silver NINA-W102 Wi-Fi module at the other end. The silkscreen says MKR WiFi 1010. The MKR1000 and MKR WiFi 1010 look similar; the module name tells them apart.",
      variants: [
        {
          label: "MKR WiFi 1010 (this guide)",
          detail: "SAMD21 plus NINA-W102 Wi-Fi/Bluetooth, 3.3 V logic, micro-USB, Li-Po charger. Sold with or without header pins soldered.",
          matchesGuide: true,
        },
        { label: "MKR WiFi 1000", detail: "Older Wi-Fi-only variant with a different radio chip. Same pin layout but check the label." },
        { label: "Other MKR boards (Zero, GSM, NB, Vidor)", detail: "Same header layout and sizes with different radios or features. Not covered by this guide." },
      ],
      watchOuts: [
        "3.3 V BOARD: every pin is 3.3 V and is NOT 5 V tolerant. A 5 V sensor output or a 5 V Arduino pin wired straight to a pin can permanently damage it. Use a level shifter or a voltage divider.",
        "VIN is a 5 V input, NOT a 7-12 V input like on an Uno or Nano. Feeding 9 V or 12 V into VIN can destroy the board. Stay at about 5 V (6 V at the very most).",
        "The 5V pin is not a regulated 5 V supply. It is connected to the USB 5 V rail, so it only has 5 V while the board is powered over USB. Running from a battery or VIN gives no 5 V on this pin. The pin printed VCC is the 3.3 V output.",
        "The battery connector is a 2-pin JST for a single-cell 3.7 V Li-Po. Check the polarity of your battery plug before connecting it (some batteries are wired the opposite way round and would be destroyed). The charger is fixed at a minimum of about 512 mA, so do not use a very small cell; use a battery of roughly 700 mAh or more.",
        "Pins are weak: the SAMD21 chip is rated for only about 7 mA per pin. Use a resistor with an LED, and never drive a motor, relay coil or buzzer directly from a pin; use a transistor or a driver board.",
        "I2C is on D11 (SDA) and D12 (SCL), not on the analog pins. Analog inputs read 0-3.3 V (12-bit). A0 can also output an analog voltage (DAC). AREF is a reference input; leave it unconnected unless you need it.",
        "Wi-Fi is 2.4 GHz only and is handled by the separate NINA module (use the WiFiNINA library). The orange charging LED lights while a battery charges.",
        "If a sketch locks up the board, double-tap the reset (short the RESET pin to GND twice quickly) to enter the bootloader and upload again. Use a micro-USB cable that carries data, not a charge-only cable.",
      ],
      photoHint: "arduino-mkr-wifi-1010",
      pins: [
        ...[0, 1, 2, 3, 4, 5, 6, 7].map((n) => dig(`D${n}`)),
        spi("D8", "D8 (MOSI)"),
        spi("D9", "D9 (SCK)"),
        spi("D10", "D10 (MISO)"),
        i2c("D11", "D11 (SDA)"),
        i2c("D12", "D12 (SCL)"),
        uart("D13", "D13 (RX)"),
        uart("D14", "D14 (TX)"),
        ana("A0", "A0 (DAC)"),
        ana("A1"),
        ana("A2"),
        ana("A3"),
        ana("A4"),
        ana("A5"),
        ana("A6"),
        power("3V3", "VCC (3.3V)", "3v3"),
        power("5V", "5V (USB)", "5v"),
        power("VIN", "VIN (5V)"),
        gnd("GND"),
      ],
      electrical: BOARD_3V3({
        // 5 V from USB only; not a regulated rail.
        "5V": USB_5V,
        VIN: vinRange(5, 6, 5),
      }),
    },
  ],
  media: {
    "arduino-nano-esp32": "/assets/boards/arduino-nano-esp32.svg",
    "arduino-nano-33-iot": "/assets/boards/arduino-nano-33-iot.svg",
    "arduino-mkr-wifi-1010": "/assets/boards/arduino-mkr-wifi-1010.svg",
  },
  queries: {
    "board.arduino.nano.esp32": ["Arduino Nano ESP32", "Arduino Nano ESP32 ABX00083"],
    "board.arduino.nano33.iot": ["Arduino Nano 33 IoT -BLE", "Arduino Nano 33 IoT"],
    "board.arduino.mkr.wifi1010": ["Arduino MKR WiFi 1010", "MKR WiFi 1010 -1000"],
  },
};

export default group;
