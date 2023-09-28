'use strict';

const { debug, Cluster } = require('zigbee-clusters');
const TuyaSpecificCluster = require('../../lib/TuyaSpecificCluster');
const TuyaSpecificClusterDevice = require("../../lib/TuyaSpecificClusterDevice");

Cluster.addCluster(TuyaSpecificCluster);

class dimmer_2_gang_tuya extends TuyaSpecificClusterDevice {

  async onNodeInit({ zclNode }) {
    await super.onNodeInit({ zclNode });

    this.printNode();
    debug(true);

    await zclNode.endpoints[1].clusters.basic.readAttributes('manufacturerName', 'zclVersion', 'appVersion', 'modelId', 'powerSource', 'attributeReportingStatus')
    .catch(err => {
        this.error('Error when reading device attributes ', err);
    });

    const { subDeviceId } = this.getData();
    this.log('Sub device ID:', subDeviceId);

    if (!subDeviceId) {
      this.registerCapabilityListener('onoff', async value => {
        this.log('onoff gang 1:', value);
        await this.writeBool(1, value);
      });

      this.registerCapabilityListener('dim', async value => {
        this.log('dim gang 1:', value * 100);
        await this.writeData32(2, value * 100);
      });
    } else if (subDeviceId === 'secondGang') {
      this.registerCapabilityListener('onoff', async value => {
        this.log('onoff gang 2:', value);
        await this.writeBool(3, value);
      });

      this.registerCapabilityListener('dim', async value => {
        this.log('dim gang 2:', value * 100);
        await this.writeData32(4, value * 100);
      });
    }
  }

  onDeleted() {
    this.log('2 Gang dimmer module removed');
  }

}

module.exports = dimmer_2_gang_tuya;
