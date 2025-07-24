'use strict';

const { ZigbeeDevice } = require('homey-meshdriver');

class wall_remote_1_gang extends ZigbeeDevice {
  async onInit({zclNode}) {
    this.printNode();
    this.registerCapability('onoff', 'genOnOff');
    this.registerCapability('measure_battery', 'genPowerCfg');
    this.registerCapability('alarm_battery', 'genPowerCfg');
  }
}

module.exports = wall_remote_1_gang;

