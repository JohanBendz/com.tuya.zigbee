'use strict';

const { debug, Cluster } = require('zigbee-clusters');
const TuyaSpecificCluster = require('../../lib/TuyaSpecificCluster');
const TuyaSpecificClusterDevice = require("../../lib/TuyaSpecificClusterDevice");
const { getDataValue } = require('../../lib/TuyaHelpers');
const { MULTI_GANG_DIMMER_SWITCH_DATA_POINTS } = require('../../lib/TuyaDataPoints');

Cluster.addCluster(TuyaSpecificCluster);

class dimmer_2_gang_tuya extends TuyaSpecificClusterDevice {

  async onNodeInit({ zclNode }) {
    this.printNode();
    debug(true);

    const { subDeviceId } = this.getData();
    this.log('Sub device ID:', subDeviceId);

    // If the device is not a subdevice, set up the first gang
    if (!this.isSubDevice()) {
      await this._setupGang(zclNode, 'first gang', MULTI_GANG_DIMMER_SWITCH_DATA_POINTS.onOffGangOne, MULTI_GANG_DIMMER_SWITCH_DATA_POINTS.brightnessGangOne);
    }

    // If it's the second gang subdevice
    if (subDeviceId === 'secondGang') {
      await this._setupGang(zclNode, 'second gang', MULTI_GANG_DIMMER_SWITCH_DATA_POINTS.onOffGangTwo, MULTI_GANG_DIMMER_SWITCH_DATA_POINTS.brightnessGangTwo);
    }

    // Listen for incoming DP reports from the Tuya-specific cluster
    zclNode.endpoints[1].clusters.tuya.on("reporting", value => this.processDatapoint(value));
    zclNode.endpoints[1].clusters.tuya.on("response", value => this.processDatapoint(value));
  }

  async _setupGang(zclNode, gangName, dpOnOff, dpDim) {
    // Read attributes for endpoint 1 (same for both gangs)
    await zclNode.endpoints[1].clusters.basic.readAttributes('manufacturerName', 'zclVersion', 'appVersion', 'modelId', 'powerSource', 'attributeReportingStatus')
      .catch(err => {
        this.error(`Error when reading device attributes for ${gangName}`, err);
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
    const parsedValue = getDataValue(data); // Use the helper function

    switch (dp) {
      case MULTI_GANG_DIMMER_SWITCH_DATA_POINTS.onOffGangOne: // On/off for gang 1
        this.log('Received on/off for first gang:', parsedValue);
        await this.setCapabilityValue('onoff', parsedValue === 1);
        break;
      case MULTI_GANG_DIMMER_SWITCH_DATA_POINTS.brightnessGangOne: // Dim level for gang 1
        this.log('Received dim level for first gang:', parsedValue);
        await this.setCapabilityValue('dim', parsedValue / 1000);
        break;
      case MULTI_GANG_DIMMER_SWITCH_DATA_POINTS.onOffGangTwo: // On/off for gang 2 (subdevice)
        this.log('Received on/off for second gang:', parsedValue);
        await this.setCapabilityValue('onoff', parsedValue === 1);
        break;
      case MULTI_GANG_DIMMER_SWITCH_DATA_POINTS.brightnessGangTwo: // Dim level for gang 2 (subdevice)
        this.log('Received dim level for second gang:', parsedValue);
        await this.setCapabilityValue('dim', parsedValue / 1000);
        break;
      default:
        this.debug('Unhandled DP:', dp, parsedValue);
    }
  }

  onDeleted() {
    this.log('2 Gang dimmer module removed');
  }
}

module.exports = dimmer_2_gang_tuya;
