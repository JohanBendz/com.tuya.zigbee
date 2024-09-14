'use strict';

const { debug, Cluster } = require('zigbee-clusters');
const TuyaSpecificCluster = require('../../lib/TuyaSpecificCluster');
const TuyaSpecificClusterDevice = require("../../lib/TuyaSpecificClusterDevice");
const { getDataValue } = require('../../lib/TuyaHelpers');
const { V1_MULTI_GANG_DIMMER_SWITCH_DATA_POINTS } = require('../../lib/TuyaDataPoints');

Cluster.addCluster(TuyaSpecificCluster);

class dimmer_2_gang_tuya extends TuyaSpecificClusterDevice {

  async onNodeInit({ zclNode }) {
    this.printNode();
    debug(true);

    const { subDeviceId } = this.getData();
    this.log('Sub device ID:', subDeviceId);

    // Fetch and log responses from standard clusters
    await this._fetchStandardClusters(zclNode);

    // If the device is not a subdevice, set up the first gang
    if (!this.isSubDevice()) {
      await this._setupGang(zclNode, 'first gang', V1_MULTI_GANG_DIMMER_SWITCH_DATA_POINTS.onOffGangOne, V1_MULTI_GANG_DIMMER_SWITCH_DATA_POINTS.brightnessGangOne);
    }

    // If it's the second gang subdevice
    if (subDeviceId === 'secondGang') {
      await this._setupGang(zclNode, 'second gang', V1_MULTI_GANG_DIMMER_SWITCH_DATA_POINTS.onOffGangTwo, V1_MULTI_GANG_DIMMER_SWITCH_DATA_POINTS.brightnessGangTwo);
    }

    // Listen for incoming DP reports from the Tuya-specific cluster
    zclNode.endpoints[1].clusters.tuya.on("reporting", async (value) => {
      try {
        await this.processDatapoint(value);
      } catch (err) {
        this.error('Error processing datapoint:', err);
      }
    });

    zclNode.endpoints[1].clusters.tuya.on("response", async (value) => {
      try {
        await this.processDatapoint(value);
      } catch (err) {
        this.error('Error processing datapoint:', err);
      }
    });
  }

  async _fetchStandardClusters(zclNode) {
    try {
        // Read attributes from standard clusters
        const onOffCluster = await zclNode.endpoints[1].clusters.onOff.readAttributes('onOff');
        const levelCluster = await zclNode.endpoints[1].clusters.levelControl.readAttributes('currentLevel');
        const basicCluster = await zclNode.endpoints[1].clusters.basic.readAttributes('manufacturerName', 'modelId');

        this.log('Standard Cluster Data:');
        this.log('OnOff Cluster:', onOffCluster);
        this.log('Level Control Cluster:', levelCluster);
        this.log('Basic Cluster:', basicCluster);
    } catch (err) {
        this.error('Error fetching standard cluster attributes:', err);
    }
  }

  async _setupGang(zclNode, gangName, dpOnOff, dpDim) {
    // Read attributes for endpoint 1 (same for both gangs)
    await zclNode.endpoints[1].clusters.basic.readAttributes(/* attributes */)
      .catch(err => {
        this.error(`Error when reading device attributes for ${gangName}`, err);
      });

    // Register capability listeners for on/off and dim capabilities
    this.registerCapabilityListener('onoff', async (value) => {
      this.log(`onoff ${gangName}:`, value);
      try {
        // Use writeBool for on/off DPs
        await this.writeBool(dpOnOff, value);
      } catch (err) {
        this.error(`Error when writing onOff for ${gangName}: `, err);
      }
    });

    this.registerCapabilityListener('dim', async (value) => {
      const brightness = Math.floor(value * 1000); // Scale to 0-1000
      this.log(`brightness ${gangName}:`, brightness);
      try {
        // Use writeData32 for brightness DPs
        await this.writeData32(dpDim, brightness);
      } catch (err) {
        this.error(`Error when writing brightness for ${gangName}: `, err);
      }
    });
  }

  // Process DP reports and update Homey accordingly
  async processDatapoint(data) {
    const dp = data.dp;
    const dataType = data.datatype;
    const parsedValue = getDataValue(data);
    this.log(`Processing DP ${dp}, Data Type: ${dataType}, Parsed Value:`, parsedValue);

    switch (dp) {
      // Gang 1
      case V1_MULTI_GANG_DIMMER_SWITCH_DATA_POINTS.onOffGangOne:
        this.log('Received on/off for first gang:', parsedValue);
        await this.setCapabilityValue('onoff', parsedValue === true || parsedValue === 1);
        break;

      case V1_MULTI_GANG_DIMMER_SWITCH_DATA_POINTS.brightnessGangOne:
        this.log('Received dim level for first gang:', parsedValue);
        await this.setCapabilityValue('dim', parsedValue / 1000);
        break;

      // Gang 2
      case V1_MULTI_GANG_DIMMER_SWITCH_DATA_POINTS.onOffGangTwo:
        this.log('Received on/off for second gang:', parsedValue);
        await this.setCapabilityValue('onoff', parsedValue === true || parsedValue === 1);
        break;

      case V1_MULTI_GANG_DIMMER_SWITCH_DATA_POINTS.brightnessGangTwo:
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
