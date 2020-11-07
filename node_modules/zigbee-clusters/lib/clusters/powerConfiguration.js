'use strict';

const Cluster = require('../Cluster');
const { ZCLDataTypes } = require('../zclTypes');

const ATTRIBUTES = {
  batteryVoltage: { id: 32, type: ZCLDataTypes.uint8 },
  batteryPercentageRemaining: { id: 33, type: ZCLDataTypes.uint8 },
  batterySize: {
    id: 49,
    type: ZCLDataTypes.enum8({
      noBattery: 0, // 0x00 No battery
      builtIn: 1, // 0x01 Built in
      other: 2, // 0x02 Other
      AA: 3, // 0x03 AA
      AAA: 4, // 0x04 AAA
      C: 5, // 0x05 C
      D: 6, // 0x06 D
      CR2: 7, // 0x07 CR2 (IEC: CR17355 / ANSI: 5046LC)
      CR123A: 8, // 0x08 CR123A (IEC: CR17345 / ANSI: 5018LC)
      unknown: 255, // 0xff Unknown
    }),
  },
  batteryQuantity: { id: 51, type: ZCLDataTypes.uint8 },
  batteryRatedVoltage: { id: 52, type: ZCLDataTypes.uint8 },
  batteryVoltageMinThreshold: { id: 54, type: ZCLDataTypes.uint8 },
};

const COMMANDS = {};

class PowerConfigurationCluster extends Cluster {

  static get ID() {
    return 1;
  }

  static get NAME() {
    return 'powerConfiguration';
  }

  static get ATTRIBUTES() {
    return ATTRIBUTES;
  }

  static get COMMANDS() {
    return COMMANDS;
  }

}

Cluster.addCluster(PowerConfigurationCluster);

module.exports = PowerConfigurationCluster;
