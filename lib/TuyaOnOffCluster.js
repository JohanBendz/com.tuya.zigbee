'use strict';

const { ZCLDataTypes, OnOffCluster} = require('zigbee-clusters');

ZCLDataTypes.enum8IndicatorMode = ZCLDataTypes.enum8({
  Off                     : 0x00,
  Status                  : 0x01,
  Position                : 0x02
});
ZCLDataTypes.enum8RelayStatus = ZCLDataTypes.enum8({
  Off                    : 0x00,
  On                     : 0x01,
  Remember               : 0x02
});

class TuyaOnOffCluster extends OnOffCluster {

  static get ATTRIBUTES() {
    return {
      ...super.ATTRIBUTES,
      childLock: { id: 0x8000, type: ZCLDataTypes.bool},
      indicatorMode: { id: 0x8001, type: ZCLDataTypes.enum8IndicatorMode},
      relayStatus: { id: 0x8002, type: ZCLDataTypes.enum8RelayStatus}
    };
  }
}

module.exports = TuyaOnOffCluster;

/*
Attribute power_on_state:

- manage cluster
- TuyaZBOnOffRestorePowerCluster (Endpoint id: 1, Id: 0x0006, Type: in)
- power_on_state (id: 0x8002)
- get Value
- change Value field to 0,1 or 2
- Set Value
0 = off
1 = on
2 = last state
*/