'use strict';

const { Cluster, ZCLDataTypes } = require('zigbee-clusters');

ZCLDataTypes.enum8IndicatorMode = ZCLDataTypes.enum8({
  Off                     : 0x00,
  Status                  : 0x01,
  Position                : 0x02
});

ZCLDataTypes.enum8RelayStatus = ZCLDataTypes.enum8({
  Off                    : 0x00,
  On                     : 0x01,
  Recover               : 0x02
});

class TuyaPowerOnStateCluster extends Cluster {

  static get CLUSTER_ID() {
    return 57345;
  }

  static get ATTRIBUTES() {
    return {
      powerOnstate: { 
        id: 53264, 
        type: ZCLDataTypes.enum8({
          off: 0, 
          on: 1, 
          Recover: 2,
        })
      }
    };
  }
}

module.exports = TuyaPowerOnStateCluster;

