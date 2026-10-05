import type { PhotoQueriesOverride } from "../types";

/** Curated outside-photo search phrases for the expansion basics parts, keyed by part id. */
export const EXTRA_BASICS_QUERIES: Record<string, PhotoQueriesOverride> = {
  // LEDs
  "passive.led.yellow": ["5mm yellow LED", "Yellow LED"],
  "passive.led.blue": ["Blue light emitting diodes", "Blue LED"],
  "passive.led.white": ["5mm LED white", "White LED"],
  "passive.led.orange": ["Orange LED", "5 mm Tinted Orange LED"],
  "passive.led.ir940": ["Infrared LED", "IR LED"],

  // Resistors
  "passive.resistor.100": { commons: ["100 ohm resistor", "axial lead resistors"], wikipedia: ["Resistor"] },
  "passive.resistor.330": { commons: ["330 ohm resistor", "axial lead resistors"], wikipedia: ["Resistor"] },
  "passive.resistor.470": { commons: ["470 ohm resistor", "axial lead resistors"], wikipedia: ["Resistor"] },
  "passive.resistor.2k2": { commons: ["axial lead resistors", "carbon film resistor"], wikipedia: ["Resistor"] },
  "passive.resistor.4k7": { commons: ["axial lead resistors", "carbon film resistor"], wikipedia: ["Resistor"] },
  "passive.resistor.47k": { commons: ["47k resistor", "axial lead resistors"], wikipedia: ["Resistor"] },
  "passive.resistor.100k": { commons: ["100k resistor", "axial lead resistors"], wikipedia: ["Resistor"] },
  "passive.resistor.1m": { commons: ["1M resistor", "axial lead resistors"], wikipedia: ["Resistor"] },

  // Capacitors
  "passive.capacitor.ceramic.100nf": {
    commons: ["100 nF capacitor", "ceramic disc capacitor", "Ceramic capacitor"],
    wikipedia: ["Ceramic capacitor"],
  },
  "passive.capacitor.electrolytic.10uf": {
    commons: ["electrolytic capacitor 10uF", "Electrolytic capacitor"],
    wikipedia: ["Electrolytic capacitor"],
  },
  "passive.capacitor.electrolytic.100uf": {
    commons: ["electrolytic capacitor 100uF", "Electrolytic capacitor"],
    wikipedia: ["Electrolytic capacitor"],
  },
  "passive.capacitor.electrolytic.1000uf": {
    commons: ["Elko 1000uF", "Electrolytic capacitor"],
    wikipedia: ["Electrolytic capacitor"],
  },

  // Diodes
  "passive.diode.1n4007": { commons: ["1N4007 diode", "1N4007"], wikipedia: ["Diode"] },
  "passive.diode.1n4148": { commons: ["1N4148 diode", "1N4148"], wikipedia: ["Diode"] },
  "passive.diode.1n5819": { commons: ["1N5819", "Schottky diode"], wikipedia: ["Schottky diode"] },
  "passive.diode.zener.5v1": { commons: ["Zener diode", "1N829 Zener Diode"], wikipedia: ["Zener diode"] },

  // Transistors
  "passive.transistor.2n2222": { commons: ["2N2222", "PN2222"], wikipedia: ["2N2222"] },
  "passive.transistor.2n3904": { commons: ["2N3904 transistor", "2N3904"], wikipedia: ["2N3904"] },
  "passive.transistor.bc547": {
    commons: ["BC547 transistor", "BC547"],
    wikipedia: ["Bipolar junction transistor"],
  },
  "passive.transistor.tip120": { commons: ["TIP120", "TIP122", "Darlington transistor"], wikipedia: ["Darlington transistor"] },
  "passive.mosfet.irlz44n": { commons: ["IRLZ44N", "TO-220 transistor"], wikipedia: ["MOSFET"] },
  "passive.mosfet.irf520_module": ["IRF520", "MOSFET module"],

  // Switches and connectors
  "passive.switch.toggle_spst": { commons: ["toggle switch", "On-Off Switch"], wikipedia: ["Toggle switch"] },
  "passive.switch.rocker": ["rocker switch", "Toggle Rocker Switch"],
  "passive.connector.dc_jack_5521": {
    commons: ["DC barrel jack", "DC power connector"],
    wikipedia: ["DC connector"],
  },

  // Power modules
  "passive.regulator.7805": { commons: ["7805", "LM7805", "L7805CV"], wikipedia: ["78xx"] },
  "passive.regulator.ams1117_33": ["AMS1117"],
  "passive.converter.lm2596_buck": ["LM2596 module", "buck converter module"],
  "passive.converter.mt3608_boost": ["MT3608", "boost converter module"],
  "passive.charger.tp4056_usbc": ["TP4056"],
};
