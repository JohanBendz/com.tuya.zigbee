'use strict';

const { ZCLDataTypes} = require('zigbee-clusters');

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

class TuyaOnOffCluster extends OnOffCluster {

  static get ATTRIBUTES() {
    return {
      ...super.ATTRIBUTES,
      powerOnstate: { id: 53264, type: ZCLDataTypes.enum8 ({
        off: 0, // OFF (0) - off after power loss (default)
        on: 1, // ON (1) - on after power loss
        Recover: 2, // RECOVER (2) - last state after power loss
        })
      }
    };
  }
}

module.exports = TuyaPowerOnStateCluster;
