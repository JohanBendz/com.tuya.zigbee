'use strict';

const { debug, Cluster } = require('zigbee-clusters');
const TuyaSpecificCluster = require('../../lib/TuyaSpecificCluster');
const TuyaSpecificClusterDevice = require("../../lib/TuyaSpecificClusterDevice");

Cluster.addCluster(TuyaSpecificCluster);

class dimmer_2_gang_tuya extends TuyaSpecificClusterDevice {

  async onNodeInit({ zclNode }) {
    
    this.printNode();
    debug(true);

    if (!this.isSubDevice()) {
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
        this.error('Failed to configure onOff reporting for gang 1', err);
      });

      await zclNode.endpoints[1].clusters.levelControl.configureReporting({
        attributeId: 'currentLevel',
        minInterval: 0,
        maxInterval: 600,
        minChange: 1,
      }).catch(err => {
        this.error('Failed to configure levelControl reporting for gang 1', err);
      });

    }

    const { subDeviceId } = this.getData();
    this.log('Sub device ID:', subDeviceId);

    if (subDeviceId === 'secondGang') {
      await zclNode.endpoints[2].clusters.onOff.configureReporting({
        attributeId: 'onOff',
        minInterval: 0,
        maxInterval: 600,
        minChange: 1,
      }).catch(err => {
        this.error('Failed to configure onOff reporting for gang 2', err);
      });
  
      await zclNode.endpoints[2].clusters.levelControl.configureReporting({
        attributeId: 'currentLevel',
        minInterval: 0,
        maxInterval: 600,
        minChange: 1,
      }).catch(err => {
        this.error('Failed to configure levelControl reporting for gang 2', err);
      });
    }

    if (!subDeviceId) {
      this.registerCapabilityListener('onoff', async value => {
        this.log('onoff gang 1:', value);
        await this.writeBool(1, value)
        .catch(err => {
          this.error('Error when writing to device: ', err);
        });
      });

      this.registerCapabilityListener('dim', async value => {
        this.log('brightness gang 1:', value * 1000);
        await this.writeData32(2, value * 1000)
        .catch(err => {
          this.error('Error when writing to device: ', err);
        });
      });

    } else if (subDeviceId === 'secondGang') {
      this.registerCapabilityListener('onoff', async value => {
        this.log('onoff gang 2:', value);
        await this.writeBool(3, value)
        .catch(err => {
          this.error('Error when writing to device: ', err);
        });
      });

      this.registerCapabilityListener('dim', async value => {
        this.log('brightness gang 2:', value * 1000);
        await this.writeData32(4, value * 1000)
        .catch(err => {
          this.error('Error when writing to device: ', err);
        });
      });
      
    }
  }

  onDeleted() {
    this.log('2 Gang dimmer module removed');
  }

}

module.exports = dimmer_2_gang_tuya;
