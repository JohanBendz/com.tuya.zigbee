'use strict';

const Homey = require('homey');
const { TuyaSpecificClusterDevice } = require('zigbee-clusters');

class dimmer_2_gang_tuya extends TuyaSpecificClusterDevice {

  async onNodeInit({ zclNode }) {
    await super.onNodeInit({ zclNode });

    this.printNode();

    this.registerCapabilityListener('onoff.gang_1', async value => {
      this.log('onoff gang 1:', value);
      await this.writeBool(1, value);
    });

    this.registerCapabilityListener('dim.gang_1', async value => {
      this.log('dim gang 1:', value * 100);
      await this.writeData32(2, value * 100);
    });

    this.registerCapabilityListener('onoff.gang_2', async value => {
      this.log('onoff gang 2:', value);
      await this.writeBool(3, value);
    });

    this.registerCapabilityListener('dim.gang_2', async value => {
      this.log('dim gang 2:', value * 100);
      await this.writeData32(4, value * 100);
    });
  }

  onDeleted() {
    this.log('2 Gang Dimmer removed');
  }

}

module.exports = dimmer_2_gang_tuya;
