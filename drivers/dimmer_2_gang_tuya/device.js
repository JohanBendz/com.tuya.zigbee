'use strict';

const { debug, Cluster } = require('zigbee-clusters');
const TuyaSpecificCluster = require('../../lib/TuyaSpecificCluster');
const TuyaSpecificClusterDevice = require("../../lib/TuyaSpecificClusterDevice");

Cluster.addCluster(TuyaSpecificCluster);

class dimmer_2_gang_tuya extends TuyaSpecificClusterDevice {

  async onNodeInit({ zclNode }) {
    
    this.printNode();
    debug(true);

    const { subDeviceId } = this.getData();
    this.log('Sub device ID:', subDeviceId);

    // If the device is not a subdevice, set up the first gang
    if (!this.isSubDevice()) {
      await this._setupGang(zclNode, 1, 'first gang', 1, 2); // DP 1 for on/off, DP 2 for dim
    }

    // If it's the second gang subdevice
    if (subDeviceId === 'secondGang') {
      await this._setupGang(zclNode, 1, 'second gang', 3, 4); // DP 3 for on/off, DP 4 for dim
    }

    // Listen for incoming DP reports from the device
    zclNode.endpoints[1].clusters.tuya.on("datapoint", value => this.processDatapoint(value));
  }

  async _setupGang(zclNode, endpoint, gangName, dpOnOff, dpDim) {
    // Read attributes for endpoint 1 (same for both gangs)
    await zclNode.endpoints[1].clusters.basic.readAttributes('manufacturerName', 'zclVersion', 'appVersion', 'modelId', 'powerSource', 'attributeReportingStatus')
      .catch(err => {
        this.error(`Error when reading device attributes for ${gangName}`, err);
      });

    // Configure reporting for on/off cluster
    await zclNode.endpoints[1].clusters.onOff.configureReporting({
      attributeId: 'onOff',
      minInterval: 0,
      maxInterval: 600,
      minChange: 1,
    }).catch(err => {
      this.error(`Failed to configure onOff reporting for ${gangName}`, err);
    });

    // Configure reporting for level control (brightness)
    await zclNode.endpoints[1].clusters.levelControl.configureReporting({
      attributeId: 'currentLevel',
      minInterval: 0,
      maxInterval: 600,
      minChange: 1,
    }).catch(err => {
      this.error(`Failed to configure levelControl reporting for ${gangName}`, err);
    });

    // Register capability listeners for on/off and dim capabilities
    this.registerCapabilityListener('onoff', async (value) => {
      this.log(`onoff ${gangName}:`, value);
      await this.writeBool(dpOnOff, value) // Use the appropriate DP for on/off
        .catch(err => {
          this.error(`Error when writing onOff for ${gangName}: `, err);
        });
    });

    this.registerCapabilityListener('dim', async (value) => {
      const brightness = Math.floor(value * 1000); // Scale to 0-1000
      this.log(`brightness ${gangName}:`, brightness);
      await this.writeData32(dpDim, brightness) // Use the appropriate DP for dim
        .catch(err => {
          this.error(`Error when writing brightness for ${gangName}: `, err);
        });
    });
  }

  // Process DP reports and update Homey accordingly
  async processDatapoint(data) {
    const dp = data.dp;
    const value = data.data;

    switch (dp) {
      case 1: // On/off for gang 1
        this.setCapabilityValue('onoff', value[0] === 1);
        break;
      case 2: // Dim level for gang 1
        this.setCapabilityValue('dim', value[0] / 1000);
        break;
      case 3: // On/off for gang 2 (subdevice)
        this.setCapabilityValue('onoff', value[0] === 1);
        break;
      case 4: // Dim level for gang 2 (subdevice)
        this.setCapabilityValue('dim', value[0] / 1000);
        break;
      default:
        this.debug('Unhandled DP:', dp, value);
    }
  }

  onDeleted() {
    this.log('2 Gang dimmer module removed');
  }

}

module.exports = dimmer_2_gang_tuya;
