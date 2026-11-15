'use strict';

const { Cluster, ZCLDataTypes } = require('zigbee-clusters');

// Opt-in for the physically verified IH-S09 TS0003 only. This is a normal
// enum8 attribute on E001, not Tuya EF00 datapoints or an OnOff attribute.
class TuyaRelayInputCluster extends Cluster {
  static get ID() { return 0xe001; }
  static get NAME() { return 'tuyaRelayInput'; }
  static get ATTRIBUTES() {
    return {
      ...super.ATTRIBUTES,
      switchType: { id: 0xd030, type: ZCLDataTypes.enum8({ toggle: 0, state: 1, momentary: 2 }) },
    };
  }
}

module.exports = TuyaRelayInputCluster;
