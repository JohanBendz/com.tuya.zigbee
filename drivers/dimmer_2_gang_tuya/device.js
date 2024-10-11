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
/*     debug(true);
    this.enableDebug(); */
  
    const { subDeviceId } = this.getData();
    this.log('Sub device ID:', subDeviceId);
  
    // Setup capability listeners and event handlers for each gang
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
    await zclNode.endpoints[1].clusters.basic.readAttributes(['manufacturerName', 'zclVersion', 'appVersion', 'modelId', 'powerSource', 'attributeReportingStatus'])
    .catch(err => {
        this.error('Error when reading device attributes ', err);
    });

    // Register capability listeners specific to this gang
    if (!this.isSubDevice()) {
      // Gang 1 (main device)
      this.registerCapabilityListener('onoff', async (value) => {
        this.log(`onoff first gang:`, value);
        try {
          await this.writeBool(V1_MULTI_GANG_DIMMER_SWITCH_DATA_POINTS.onOffGangOne, value);
        } catch (err) {
          this.error(`Error when writing onOff for first gang: `, err);
          throw err;
        }
      });

      this.registerCapabilityListener('dim', async (value) => {
        const brightness = Math.floor(value * 1000); // Scale to 0-1000
        this.log(`brightness first gang:`, brightness);
        try {
          // If dim value is greater than 0 and the device is off, turn it on
          if (brightness > 0 && !this.getCapabilityValue('onoff')) {
            this.log('Dim level is greater than 0, turning on device');
            await this.writeBool(V1_MULTI_GANG_DIMMER_SWITCH_DATA_POINTS.onOffGangOne, true);
            await this.setCapabilityValue('onoff', true);
          }
      
          // Set the brightness
          await this.writeData32(V1_MULTI_GANG_DIMMER_SWITCH_DATA_POINTS.brightnessGangOne, brightness);
      
          // Turning off device if dim level is 0
          if (brightness === 0) {
            this.log('Dim level is 0, turning off device');
            await this.writeBool(V1_MULTI_GANG_DIMMER_SWITCH_DATA_POINTS.onOffGangOne, false);
            await this.setCapabilityValue('onoff', false);
          }
        } catch (err) {
          this.error(`Error when writing brightness for first gang: `, err);
          throw err;
        }
      });
      

    } else {
      // Gang 2 (subdevice)
      this.registerCapabilityListener('onoff', async (value) => {
        this.log(`onoff second gang:`, value);
        try {
          await this.writeBool(V1_MULTI_GANG_DIMMER_SWITCH_DATA_POINTS.onOffGangTwo, value);
        } catch (err) {
          this.error(`Error when writing onOff for second gang: `, err);
          throw err;
        }
      });

      this.registerCapabilityListener('dim', async (value) => {
        const brightness = Math.floor(value * 1000); // Scale to 0-1000
        this.log(`brightness second gang:`, brightness);
        try {
          // If dim value is greater than 0 and the device is off, turn it on
          if (brightness > 0 && !this.getCapabilityValue('onoff')) {
            this.log('Dim level is greater than 0, turning on second gang');
            await this.writeBool(V1_MULTI_GANG_DIMMER_SWITCH_DATA_POINTS.onOffGangTwo, true);
            await this.setCapabilityValue('onoff', true);
          }
      
          // Set the brightness
          await this.writeData32(V1_MULTI_GANG_DIMMER_SWITCH_DATA_POINTS.brightnessGangTwo, brightness);
      
          // Turning off device if dim level is 0
          if (brightness === 0) {
            this.log('Dim level is 0, turning off second gang');
            await this.writeBool(V1_MULTI_GANG_DIMMER_SWITCH_DATA_POINTS.onOffGangTwo, false);
            await this.setCapabilityValue('onoff', false);
          }
        } catch (err) {
          this.error(`Error when writing brightness for second gang: `, err);
          throw err;
        }
      });
      
    }
  }

  // Process DP reports and update Homey accordingly
  async processDatapoint(data) {
    const dp = data.dp;
    const parsedValue = getDataValue(data);
    const dataType = data.datatype;
    this.log(`Processing DP ${dp}, Data Type: ${dataType}, Parsed Value:`, parsedValue);

    // Differentiate between Gang 1 and Gang 2 by DP
    switch (dp) {
      case V1_MULTI_GANG_DIMMER_SWITCH_DATA_POINTS.onOffGangOne:
        this.log('Received on/off for first gang:', parsedValue);
        // Only update Gang 1 (main device)
        if (!this.isSubDevice()) {
          await this.setCapabilityValue('onoff', parsedValue === true || parsedValue === 1).catch(this.error);
        }
        break;

      case V1_MULTI_GANG_DIMMER_SWITCH_DATA_POINTS.onOffGangTwo:
        this.log('Received on/off for second gang:', parsedValue);
        // Only update Gang 2 (subdevice)
        if (this.isSubDevice()) {
          await this.setCapabilityValue('onoff', parsedValue === true || parsedValue === 1).catch(this.error);
        }
        break;

      case V1_MULTI_GANG_DIMMER_SWITCH_DATA_POINTS.brightnessGangOne:
        this.log('Received dim level for first gang:', parsedValue);
        // Only update Gang 1 (main device)
        if (!this.isSubDevice()) {
          await this.setCapabilityValue('dim', parsedValue / 1000).catch(this.error);
        }
        break;

      case V1_MULTI_GANG_DIMMER_SWITCH_DATA_POINTS.brightnessGangTwo:
        this.log('Received dim level for second gang:', parsedValue);
        // Only update Gang 2 (subdevice)
        if (this.isSubDevice()) {
          await this.setCapabilityValue('dim', parsedValue / 1000).catch(this.error);
        }
        break;

      default:
        this.log('Unhandled DP:', dp, 'with value:', parsedValue);
    }
  }

  onDeleted() {
    this.log('2 Gang dimmer module removed');
  }
}

module.exports = dimmer_2_gang_tuya;
