/**
 * File: drivers/lcdtemphumidsensor/driver.js
 * Version: 4.2.0 - Simplified
 * Description: Driver for LCD Temperature & Humidity Sensor TS0201 _TZ3000_ywagc4rj
 */

'use strict';

const { ZigBeeDriver } = require("homey-zigbeedriver");

class LcdTempHumidSensorDriver extends ZigBeeDriver {

  onInit() {
    this.log('LCD Temperature & Humidity Sensor driver v4.2.0 initialized');
  }

  async onPairListDevices() {
    return [];
  }
}

module.exports = LcdTempHumidSensorDriver;