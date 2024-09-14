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
  
    // Setup capability listeners and event handlers
    if (this.isSubDevice()) {
      // Subdevice (Second Gang)
      await this._setupGang(zclNode, 'second gang', V1_MULTI_GANG_DIMMER_SWITCH_DATA_POINTS.onOffGangTwo, V1_MULTI_GANG_DIMMER_SWITCH_DATA_POINTS.brightnessGangTwo);
    } else {
      // Main device (First Gang)
      await this._setupGang(zclNode, 'first gang', V1_MULTI_GANG_DIMMER_SWITCH_DATA_POINTS.onOffGangOne, V1_MULTI_GANG_DIMMER_SWITCH_DATA_POINTS.brightnessGangOne);
    }
  
    // Attach event listeners only once per physical device
    if (!this.hasListenersAttached) {
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
  
      this.hasListenersAttached = true;
    }
  }  

  async _setupGang(zclNode, gangName, dpOnOff, dpDim) {
    // Read attributes for endpoint 1 (same for both gangs)
    await zclNode.endpoints[1].clusters.basic.readAttributes('manufacturerName', 'zclVersion', 'appVersion', 'modelId', 'powerSource', 'attributeReportingStatus')
    .catch(err => {
        this.error('Error when reading device attributes ', err);
    });

    // Register capability listeners
    this.registerCapabilityListener('onoff', async (value) => {
      this.log(`onoff ${gangName}:`, value);
      try {
        await this.writeBool(dpOnOff, value);
      } catch (err) {
        this.error(`Error when writing onOff for ${gangName}: `, err);
        throw err; // Rethrow error to notify Homey of the failure
      }
    });

    this.registerCapabilityListener('dim', async (value) => {
      const brightness = Math.floor(value * 1000); // Scale to 0-1000
      this.log(`brightness ${gangName}:`, brightness);
      try {
        await this.writeData32(dpDim, brightness);
      } catch (err) {
        this.error(`Error when writing brightness for ${gangName}: `, err);
        throw err; // Rethrow error to notify Homey of the failure
      }
    });
  }

  // Process DP reports and update Homey accordingly
  async processDatapoint(data) {
    const dp = data.dp;
    const parsedValue = getDataValue(data);
    const dataType = data.datatype;
    this.log(`Processing DP ${dp}, Data Type: ${dataType}, Parsed Value:`, parsedValue);
  
    let targetDevice;
  
    // Determine which device instance should handle this DP
    if (dp === V1_MULTI_GANG_DIMMER_SWITCH_DATA_POINTS.onOffGangOne || dp === V1_MULTI_GANG_DIMMER_SWITCH_DATA_POINTS.brightnessGangOne) {
      // Main device (First Gang)
      targetDevice = this.getDriver().getDevices().find(d => !d.isSubDevice());
    } else if (dp === V1_MULTI_GANG_DIMMER_SWITCH_DATA_POINTS.onOffGangTwo || dp === V1_MULTI_GANG_DIMMER_SWITCH_DATA_POINTS.brightnessGangTwo) {
      // Subdevice (Second Gang)
      targetDevice = this.getDriver().getDevices().find(d => d.isSubDevice());
    }
  
    if (!targetDevice) {
      this.error('Target device not found for DP:', dp);
      return;
    }
  
    // Update the capability of the target device
    switch (dp) {
      case V1_MULTI_GANG_DIMMER_SWITCH_DATA_POINTS.onOffGangOne:
      case V1_MULTI_GANG_DIMMER_SWITCH_DATA_POINTS.onOffGangTwo:
        this.log(`Received on/off for ${targetDevice.isSubDevice() ? 'second' : 'first'} gang:`, parsedValue);
        await targetDevice.setCapabilityValue('onoff', parsedValue === true || parsedValue === 1).catch(this.error);
        break;
  
      case V1_MULTI_GANG_DIMMER_SWITCH_DATA_POINTS.brightnessGangOne:
      case V1_MULTI_GANG_DIMMER_SWITCH_DATA_POINTS.brightnessGangTwo:
        this.log(`Received dim level for ${targetDevice.isSubDevice() ? 'second' : 'first'} gang:`, parsedValue);
        await targetDevice.setCapabilityValue('dim', parsedValue / 1000).catch(this.error);
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
