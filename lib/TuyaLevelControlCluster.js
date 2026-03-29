'use strict';

const { LevelControlCluster, ZCLDataTypes } = require('zigbee-clusters');

/**
 * Tuya-flavoured Level Control cluster.
 *
 * This is a safe superset of the standard Level Control cluster:
 * - keeps all normal Level Control attributes and commands
 * - adds Tuya-specific brightness attribute 0xF000
 * - adds Tuya-specific dim command 0xF0
 *
 * Important:
 * This still uses cluster ID 0x0008 / NAME "levelControl" through inheritance,
 * so drivers can keep using CLUSTER.LEVEL_CONTROL.
 */
class TuyaLevelControlCluster extends LevelControlCluster {

  static get ATTRIBUTES() {
    return {
      ...super.ATTRIBUTES,

      // Tuya-specific brightness attribute
      tuyaBrightness: {
        id: 0xF000,
        type: ZCLDataTypes.uint16,
      },
    };
  }

  static get COMMANDS() {
    return {
      ...super.COMMANDS,

      // Tuya-specific dim command
      moveToLevelTuya: {
        id: 0xF0,
        args: {
          level: ZCLDataTypes.uint16,
          transitionTime: ZCLDataTypes.uint16,
        },
      },
    };
  }
}

module.exports = TuyaLevelControlCluster;