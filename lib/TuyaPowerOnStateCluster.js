'use strict';

const { Cluster, ZCLDataTypes } = require('zigbee-clusters');

// Define custom data types for Tuya E001 cluster
ZCLDataTypes.enum8PowerOnBehavior = ZCLDataTypes.enum8({
  off: 0x00,
  on: 0x01,
  recover: 0x02
});

ZCLDataTypes.enum8RelayStatus = ZCLDataTypes.enum8({
  Off: 0x00,
  On: 0x01,
  Recover: 0x02
});

/**
 * Tuya PowerOn State Cluster - E001 Implementation
 * 
 * This is ONLY the cluster definition for manual instantiation.
 * Use with this.endpoints[ep].addCluster() in device.js
 */
class TuyaPowerOnStateCluster extends Cluster {

  static get ID() {
    return 0xE001; // 57345 decimal
  }

  static get NAME() {
    return 'tuyaPowerOnState'; // Nome usado no addCluster
  }

  static get ATTRIBUTES() {
    return {
      // Main PowerOn attribute - based on sniffer data
      powerOnstate: { 
        id: 0xD010, // 53264
        type: ZCLDataTypes.enum8PowerOnBehavior
      },
      
      // Alternative relay status attribute
      relayStatus: {
        id: 0x8002, // 32770
        type: ZCLDataTypes.enum8RelayStatus
      }
    };
  }

  static get COMMANDS() {
    return {
      // Tuya Data Request command for DP operations
      dataRequest: {
        id: 0x00,
        args: {
          payload: ZCLDataTypes.buffer
        }
      }
    };
  }

  /**
   * 🔋 Write PowerOn Behavior using Tuya DP protocol
   */
  async writePowerOnBehavior(dpValue = 0x02) {
    const payload = Buffer.from([
      0x01,       // dp: 1 = relayStatus / powerOnBehavior
      0x04,       // datatype: enum8
      0x00, 0x01, // data length: 1 byte
      dpValue     // value: 0x00=off, 0x01=on, 0x02=recover
    ]);

    return this.command('dataRequest', { payload }, { 
      manufacturerCode: 0x1002,
      disableDefaultResponse: true 
    });
  }

  /**
   * 📖 Read PowerOn Behavior (if supported)
   */
  async readPowerOnBehavior() {
    try {
      return await this.readAttributes(['powerOnstate'], {
        manufacturerCode: 0x1002
      });
    } catch (error) {
      // Fallback to relayStatus
      return await this.readAttributes(['relayStatus'], {
        manufacturerCode: 0x1002
      });
    }
  }
}

module.exports = TuyaPowerOnStateCluster;