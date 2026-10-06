import { describe, expect, it } from "vitest";
import { resolveUpNext, type ProgressStep, type ProgressWire } from "./step-progress";

const steps: ProgressStep[] = [
  {
    id: "s1",
    title: "Place components on the breadboard",
    body: "Insert the ESP32 DevKit. Place the tactile pushbutton and active buzzer into separate rows.",
  },
  {
    id: "s2",
    title: "Connect battery power",
    body: "Connect the battery holder positive to ESP32 VIN and negative to ESP32 GND.",
  },
  {
    id: "s3",
    title: "Wire the active buzzer",
    body: "Connect buzzer pin 1 (SIG) to ESP32 pin D5. Connect buzzer pin 2 (GND) to ESP32 pin GND.",
  },
  {
    id: "s4",
    title: "Wire the pushbutton",
    body: "Connect pushbutton pin 1L to ESP32 pin D4. Connect pushbutton pin 2L to ESP32 pin GND.",
  },
  {
    id: "s5",
    title: "Power on and test",
    body: "Upload your firmware with pin 4 configured as INPUT_PULLUP and pin 5 as OUTPUT.",
  },
];

const wires: ProgressWire[] = [
  { id: "w1", text: "Breadboard hole a6 to Breadboard the - top 6 ground rail" },
  { id: "w2", text: "ESP32 DevKit V1 pin GND to Breadboard the - top 1" },
  { id: "w3", text: "Breadboard hole a13 to Breadboard the - bot 13 ground rail" },
  { id: "w4", text: "ESP32 DevKit V1 pin GND to Breadboard the - bot 1" },
  { id: "w5", text: "ESP32 DevKit V1 pin D5 to Breadboard hole a7" },
  { id: "w6", text: "ESP32 DevKit V1 pin D4 to Breadboard hole a10" },
];

describe("resolveUpNext", () => {
  it("starts on the first step when nothing is ticked", () => {
    const result = resolveUpNext({ steps, wires, tickedWireIds: [], manualStepIds: [] });
    expect(result.currentId).toBe("s1");
    expect(result.doneIds).toEqual([]);
  });

  it("moves up next to the step that still has an open wire", () => {
    const result = resolveUpNext({
      steps,
      wires,
      tickedWireIds: ["w1", "w2", "w3", "w4", "w5"],
      manualStepIds: [],
    });
    expect(result.doneIds).toEqual(["s1", "s2", "s3"]);
    expect(result.currentId).toBe("s4");
  });

  it("lands on the test step only after every wire is ticked", () => {
    const result = resolveUpNext({
      steps,
      wires,
      tickedWireIds: wires.map((wire) => wire.id),
      manualStepIds: [],
    });
    expect(result.doneIds).toEqual(["s1", "s2", "s3", "s4"]);
    expect(result.currentId).toBe("s5");
  });

  it("keeps a manual tick when no wires match", () => {
    const result = resolveUpNext({
      steps: [{ id: "s1", title: "Read the guide", body: "Look at the picture." }],
      wires: [],
      tickedWireIds: [],
      manualStepIds: ["s1"],
    });
    expect(result.currentId).toBeNull();
    expect(result.doneIds).toEqual(["s1"]);
  });
});
