export type SensorOption = {
  id: string;
  label: string;
  when: string;
  pinsHint: string;
};

export type SensorCategory = {
  category: string;
  options: SensorOption[];
};

export const sensorCategories: SensorCategory[] = [
  {
    category: "Environment",
    options: [
      {
        id: "module.dht22",
        label: "DHT22 temp/humidity",
        when: "Indoor climate, greenhouse, weather station with digital readout.",
        pinsHint: "VCC, DATA (one-wire digital), GND; often 10k pull-up on DATA.",
      },
      {
        id: "module.ntc.temp",
        label: "NTC temperature",
        when: "Simple analog temperature with a thermistor divider.",
        pinsHint: "NTC + fixed resistor to form analog voltage on an ADC pin.",
      },
      {
        id: "module.soil.moisture",
        label: "Soil moisture (capacitive probe)",
        when: "Plant watering, garden beds, potted plants.",
        pinsHint: "VCC, GND, A0 analog out (D0 optional threshold).",
      },
    ],
  },
  {
    category: "Distance / motion",
    options: [
      {
        id: "module.hc-sr04",
        label: "HC-SR04 ultrasonic",
        when: "Distance in cm, obstacle avoidance, level sensing.",
        pinsHint: "VCC 5V, TRIG + ECHO digital pins, GND.",
      },
      {
        id: "module.pir",
        label: "PIR motion",
        when: "Room occupancy, security trigger, auto lights.",
        pinsHint: "VCC, GND, OUT digital (often open-drain).",
      },
    ],
  },
  {
    category: "Light / IR",
    options: [
      {
        id: "module.photoresistor",
        label: "Photoresistor (LDR)",
        when: "Ambient light level, dusk/dawn, simple brightness.",
        pinsHint: "LDR divider to analog pin; series resistor required.",
      },
      {
        id: "module.flame",
        label: "Flame sensor",
        when: "Fire detection, burner monitoring.",
        pinsHint: "VCC, GND, analog and/or digital DO.",
      },
      {
        id: "module.ir.receiver",
        label: "IR receiver (38 kHz)",
        when: "TV remote decode, IR beam break.",
        pinsHint: "VCC, GND, OUT to digital interrupt pin.",
      },
    ],
  },
  {
    category: "Sound",
    options: [
      {
        id: "module.sound.big",
        label: "Big sound sensor module",
        when: "Louder environments, clap/knock detection.",
        pinsHint: "VCC, GND, AO analog and/or DO digital.",
      },
      {
        id: "module.sound.small",
        label: "Small sound sensor module",
        when: "Quiet rooms, voice proximity.",
        pinsHint: "VCC, GND, AO analog and/or DO digital.",
      },
    ],
  },
  {
    category: "IMU / force",
    options: [
      {
        id: "module.mpu6050",
        label: "MPU6050 IMU",
        when: "Tilt, acceleration, orientation, motion gestures.",
        pinsHint: "I2C SDA/SCL plus VCC and GND (3.3V logic).",
      },
      {
        id: "module.hx711",
        label: "HX711 load cell amp",
        when: "Scales, force measurement with a strain gauge.",
        pinsHint: "DT + SCK to MCU; E+/E− and A+/A− to load cell.",
      },
      {
        id: "module.heart.beat",
        label: "Heart-beat (pulse) sensor",
        when: "Pulse rate projects, fingertip PPG demos.",
        pinsHint: "VCC, GND, analog or digital signal pin.",
      },
    ],
  },
  {
    category: "Input",
    options: [
      {
        id: "module.joystick",
        label: "Joystick module",
        when: "2-axis control, game input, pan/tilt.",
        pinsHint: "VCC, GND, VRx/VRy analog, SW optional button.",
      },
      {
        id: "module.ky-040",
        label: "KY-040 rotary encoder",
        when: "Menu navigation, dial input with detents.",
        pinsHint: "CLK, DT, SW (button), plus VCC and GND.",
      },
      {
        id: "module.tilt",
        label: "Tilt switch",
        when: "Orientation alarm, simple tip detection.",
        pinsHint: "Two terminals to digital input with pull-up.",
      },
      {
        id: "passive.pushbutton",
        label: "Pushbutton",
        when: "User trigger, mode select, debounced click.",
        pinsHint: "One side to GPIO, other to GND or VCC with pull resistor.",
      },
    ],
  },
];
