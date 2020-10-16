'use strict';

const { BasicCluster, ZCLDataTypes, ZCLDataType } = require('zigbee-clusters');

const TUYA_ATTRIBUTES = {
  1: { name: 'batteryVoltage' }, // type: ZCLDataTypes.uint16
  3: { name: 'cpuTemperature' }, // type: ZCLDataTypes.int8
  // 4: { name: 'unknown_4' }, // type: ZCLDataTypes.uint16
  5: { name: 'rssi' }, // type: ZCLDataTypes.uint16
  6: { name: 'txCount' }, // type: ZCLDataTypes.uint40
  // 8: { name: 'unknown_8' }, // type: ZCLDataTypes.uint16
  // 10: { name: 'unknown_10' }, // type: ZCLDataTypes.uint16
  11: { name: 'humidity' }, // type: ZCLDataTypes.uint16
  100: { name: 'state' }, // type: ZCLDataTypes.uint32, this can be on/off, temperature, etc.
  101: { name: 'state1' }, // ZCLDataTypes.uint16
  102: { name: 'pressure' }, // type: ZCLDataTypes.uint16

};

class TuyaBasicCluster extends BasicCluster {

  static get ATTRIBUTES() {
    return {
      ...super.ATTRIBUTES,
      xiaomiLifeline: {
        id: 65281,
        type: XiaomiLifelineDataRecordArray,
        manufacturerId: 0x115F,
      },
    };
  }

}

module.exports = TuyaBasicCluster;