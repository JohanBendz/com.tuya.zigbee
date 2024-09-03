'use strict';

const { debug, Cluster } = require('zigbee-clusters');
const TuyaSpecificCluster = require('../../lib/TuyaSpecificCluster');
const TuyaSpecificClusterDevice = require("../../lib/TuyaSpecificClusterDevice");

Cluster.addCluster(TuyaSpecificCluster);

class dimmer_1_gang_tuya extends TuyaSpecificClusterDevice {

  async onNodeInit({ zclNode }) {
    await super.onNodeInit({ zclNode });

    this.printNode();
    debug(true);

    await zclNode.endpoints[1].clusters.basic.readAttributes('manufacturerName', 'zclVersion', 'appVersion', 'modelId', 'powerSource', 'attributeReportingStatus')
    .catch(err => {
        this.error('Error when reading device attributes ', err);
    });

    await zclNode.endpoints[1].clusters.onOff.configureReporting({
      attributeId: 'onOff',
      minInterval: 0,
      maxInterval: 600,
      minChange: 1,
    }).catch(err => {
      this.error('Failed to configure onOff reporting', err);
    });

    await zclNode.endpoints[1].clusters.levelControl.configureReporting({
      attributeId: 'currentLevel',
      minInterval: 0,
      maxInterval: 600,
      minChange: 1,
    }).catch(err => {
      this.error('Failed to configure levelControl reporting', err);
    });

    this.registerCapabilityListener('onoff', async value => {
      this.log('onoff: ', value);
      await this.writeBool(1, value);
    });

    this.registerCapabilityListener('dim', async value => {
        this.log("brightness: ", value * 1000);
        await this.writeData32(2, value * 1000);
    });
  }

  onDeleted() {
    this.log('1 Gang Dimmer removed');
  }

}

module.exports = dimmer_1_gang_tuya;
