const dir = "/photos/sensors";

/** Thumbnails for the expansion sensors parts, keyed by photoHint. Original illustrations (see public/photos/sensors/README.md). */
export const EXTRA_SENSORS_MEDIA: Record<string, string> = {
  // Environment
  bme280: `${dir}/bme280.svg`,
  bmp280: `${dir}/bmp280.svg`,
  ds18b20: `${dir}/ds18b20.svg`,
  dht11: `${dir}/dht11.svg`,
  lm35: `${dir}/lm35.svg`,
  tmp36: `${dir}/tmp36.svg`,
  // Light, magnetic, proximity, water, air, motion, current
  bh1750: `${dir}/bh1750.svg`,
  tcs34725: `${dir}/tcs34725.svg`,
  "hall-a3144": `${dir}/hall-a3144.svg`,
  "reed-switch": `${dir}/reed-switch.svg`,
  tcrt5000: `${dir}/tcrt5000.svg`,
  "ir-obstacle": `${dir}/ir-obstacle.svg`,
  "rain-sensor": `${dir}/rain-sensor.svg`,
  "water-level": `${dir}/water-level.svg`,
  "soil-resistive": `${dir}/soil-resistive.svg`,
  mq135: `${dir}/mq135.svg`,
  max9814: `${dir}/max9814.svg`,
  adxl345: `${dir}/adxl345.svg`,
  qmc5883l: `${dir}/qmc5883l.svg`,
  vl53l0x: `${dir}/vl53l0x.svg`,
  ina219: `${dir}/ina219.svg`,
  acs712: `${dir}/acs712.svg`,
  fsr: `${dir}/fsr.svg`,
  // Positioning and wireless
  "gps-neo6m": `${dir}/gps-neo6m.svg`,
  hc05: `${dir}/hc05.svg`,
  hc06: `${dir}/hc06.svg`,
  nrf24l01: `${dir}/nrf24l01.svg`,
  "lora-sx127x": `${dir}/lora-sx127x.svg`,
  rc522: `${dir}/rc522.svg`,
  pn532: `${dir}/pn532.svg`,
  ds3231: `${dir}/ds3231.svg`,
  // Chips and expanders
  "74hc595": `${dir}/74hc595.svg`,
  pcf8574: `${dir}/pcf8574.svg`,
  mcp23017: `${dir}/mcp23017.svg`,
  ads1115: `${dir}/ads1115.svg`,
  esp01: `${dir}/esp01.svg`,
};
