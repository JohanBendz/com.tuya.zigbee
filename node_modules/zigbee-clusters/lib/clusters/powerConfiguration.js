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
  batteryAlarmState: {
    id: 62,
    type: ZCLDataTypes.map32(
      'batteryThresholdBatterySource1',
      'batteryThreshold1BatterySource1',
      'batteryThreshold2BatterySource1',
      'batteryThreshold3BatterySource1',
      'reserved4',
      'reserved5',
      'reserved6',
      'reserved7',
      'reserved8',
      'reserved9',
      'batteryThresholdBatterySource2',
      'batteryThreshold1BatterySource2',
      'batteryThreshold2BatterySource2',
      'batteryThreshold3BatterySource2',
      'reserved14',
      'reserved15',
      'reserved16',
      'reserved17',
      'reserved18',
      'reserved19',
      'batteryThresholdBatterySource3',
      'batteryThreshold1BatterySource3',
      'batteryThreshold2BatterySource3',
      'batteryThreshold3BatterySource3',
      'reserved24',
      'reserved25',
      'reserved26',
      'reserved27',
      'reserved28',
      'reserved29',
      'mainsPowerSupplyLostUnavailable',
    ),
  },
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
