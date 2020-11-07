'use strict';

const Cluster = require('../Cluster');
const { ZCLDataTypes } = require('../zclTypes');

const COMMANDS = {};

const ATTRIBUTES = {

  /* 0x0000: PhysicalMinLevel (optional, read-only)
   * Description:   Minimum light level the ballast can achieve.
   * Default:       0x01
   * Range:         0x01 – 0xfe
   */
  physicalMinLevel: {
    id: 0,
    type: ZCLDataTypes.uint8,
  },

  /* 0x0001: PhysicalMaxLevel (optional, read-only)
   * Description:   Maximum light level the ballast can achieve.
   * Default:       0xfe
   * Range:         0x01 – 0xfe
   */
  physicalMaxLevel: {
    id: 1,
    type: ZCLDataTypes.uint8,
  },

  /* 0x0002: BallastStatus (mandatory, read-only)
   * Description:   Activity status of the ballast functions.
   * Default:       0b0000 0000
   * Range:         0b0000 00xx
   * Bit  | Ballast Function    | Details
   * 0    | Non-operational     | 0 = The ballast is fully operational.
   *      |                     | 1 = The ballast is not fully operational.
   * 1    | Lamp not in socket  | 0 = All lamps are in their sockets.
   *      |                     | 1 = One or more lamp is not in its socket.
   */
  ballastStatus: {
    id: 2,
    type: ZCLDataTypes.map8('nonOperational', 'lampNotInSocket'),
  },

  /* 0x0010: MinLevel (optional, read/write)
   * Description:   Minimum light level the ballast is permitted to use.
   * Default:       PhysicalMinLevel
   * Range:         0x01 – 0xfe
   */
  minLevel: {
    id: 16,
    type: ZCLDataTypes.uint8,
  },

  /* 0x0011: MaxLevel (optional, read/write)
   * Description:   Maximum light level the ballast is permitted to use.
   * Default:       PhysicalMaxLevel
   * Range:         0x01 – 0xfe
   */
  maxLevel: {
    id: 17,
    type: ZCLDataTypes.uint8,
  },

  /* 0x0012: PowerOnLevel (optional, read/write)
   * Description:   Light level to which the ballast will go when power is applied.
   * Default:       PhysicalMaxLevel
   * Range:
   * 0x01 – 0xfe    = Set to this specific light level.
   * 0xff           = Restore the light level being used prior to power failure.
   */
  powerOnLevel: {
    id: 18,
    type: ZCLDataTypes.uint8,
  },

  /* 0x0013: PowerOnFadeTime (optional, read/write)
   * Description:   Length of time, in tenths of a second, that the ballast takes to move to the
   *  light level specified in PowerOnLevel when power is applied.
   * Default:       0x0000
   * Range:         0x0000 – 0xfffe
   */
  powerOnFadeTime: {
    id: 19,
    type: ZCLDataTypes.uint16,
  },

  /* 0x0014: IntrinsicBallastFactor (optional, read/write)
   * Description:   Percentage the ballast factor of the ballast/lamp combination (see also
   *  5.3), prior to any adjustment.
   * Default:       -
   * Range:         0x00 – 0xfe
   */
  intrinsicBallastFactor: {
    id: 20,
    type: ZCLDataTypes.uint8,
  },

  /* 0x0015: BallastFactorAdjustment (optional, read/write)
   * Description:   Multiplication factor, as a percentage, to be applied to the configured
   *  light output of the lamps
   * Default:       0xff
   * Range:         0x64 – Manufacturer Specific
   */
  ballastFactorAdjustment: {
    id: 21,
    type: ZCLDataTypes.uint8,
  },

  /* 0x0020: LampQuantity (optional, read-only)
   * Description:   Number of lamps connected to this ballast.
   * Default:       -
   * Range:         0x00 – 0xfe
   */
  lampQuantity: {
    id: 32,
    type: ZCLDataTypes.uint8,
  },

  /* 0x0030: LampType (optional, read/write)
   * Description:   Type of lamps (including their wattage) connected to the ballast.
   * Default:       ""
   * Range:         -
   */
  lampType: {
    id: 48,
    type: ZCLDataTypes.string,
  },

  /* 0x0031: LampManufacturer (optional, read/write)
   * Description:   Name of the manufacturer of the currently connected lamps.
   * Default:       ""
   * Range:         -
   */
  lampManufacturer: {
    id: 49,
    type: ZCLDataTypes.string,
  },

  /* 0x0032: LampRatedHours (optional, read/write)
   * Description:   Number of hours of use the lamps are rated for by the manufacturer. A value
   *  of 0xffffff indicates an invalid or unknown time.
   * Default:       0xffffff
   * Range:         0x000000 – 0xfffffe
   */
  lampRatedHours: {
    id: 50,
    type: ZCLDataTypes.uint24,
  },

  /* 0x0033: LampBurnHours (optional, read/write)
   * Description:   Length of time, in hours, the currently connected lamps have been operated,
   *  cumulative since the last re-lamping.
   * Default:       0x000000
   * Range:         0x000000 – 0xfffffe
   */
  lampBurnHours: {
    id: 51,
    type: ZCLDataTypes.uint24,
  },

  /* 0x0034: LampAlarmMode (optional, read/write)
   * Description:   Which attributes MAY cause an alarm notification to be generated. A '‘1’ in
   *  each bit position causes its associated attribute to be able to generate an alarm
   * Default:       0b0000 0000
   * Range:         0b0000 000x
   * Bit  | Attribute
   * 0    | LampBurnHours
   */
  lampAlarmMode: {
    id: 52,
    type: ZCLDataTypes.map8('lampBurnHours'),
  },

  /* 0x0035: LampBurnHoursTripPoint (optional, read/write)
   * Description:   Number of hours the LampBurnHours attribute MAY reach before an alarm is
   *  generated.
   * Default:       0xffffff
   * Range:         0x000000 – 0xfffffe
   */
  lampBurnHoursTripPoint: {
    id: 53,
    type: ZCLDataTypes.uint24,
  },
};

class BallastConfigurationCluster extends Cluster {

  static get ID() {
    return 769; // 0x0301
  }

  static get NAME() {
    return 'ballastConfiguration';
  }

  static get ATTRIBUTES() {
    return ATTRIBUTES;
  }

  static get COMMANDS() {
    return COMMANDS;
  }

}

Cluster.addCluster(BallastConfigurationCluster);

module.exports = BallastConfigurationCluster;
