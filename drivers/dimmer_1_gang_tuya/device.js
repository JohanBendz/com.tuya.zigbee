'use strict';

const { debug, Cluster } = require('zigbee-clusters');
const TuyaSpecificCluster = require('../../lib/TuyaSpecificCluster');
const TuyaSpecificClusterDevice = require("../../lib/TuyaSpecificClusterDevice");
const { getDataValue } = require('../../lib/TuyaHelpers');
const { V1_SINGLE_GANG_DIMMER_SWITCH_DATA_POINTS } = require('../../lib/TuyaDataPoints');

Cluster.addCluster(TuyaSpecificCluster);

class dimmer_1_gang_tuya extends TuyaSpecificClusterDevice {

  async onNodeInit({ zclNode }) {
    this.printNode();
/*     debug(true);
    this.enableDebug(); */

    // Read and log device attributes
    await this._readDeviceAttributes(zclNode);

    // Setup capability listeners for on/off and dim
    await this._setupGang(zclNode);

    // Attach event listeners for Tuya-specific reports (manual state changes)
    if (!this.hasListenersAttached) {
      zclNode.endpoints[1].clusters.tuya.on('reporting', async (value) => {
        try {
          await this.processDatapoint(value);
        } catch (err) {
          this.error('Error processing datapoint:', err);
        }
      });

      zclNode.endpoints[1].clusters.tuya.on('response', async (value) => {
        try {
          await this.processDatapoint(value);
        } catch (err) {
          this.error('Error processing datapoint:', err);
        }
      });

      this.hasListenersAttached = true;
    }
  }

  async _readDeviceAttributes(zclNode) {
    try {
      await zclNode.endpoints[1].clusters.basic.readAttributes(['manufacturerName', 'zclVersion', 'appVersion', 'modelId', 'powerSource', 'attributeReportingStatus']);
    } catch (err) {
      this.error('Error when reading device attributes:', err);
    }
  }

  async _setupGang(zclNode) {
    // Register capability listeners
    this.registerCapabilityListener('onoff', async (value) => {
      this.log('onoff:', value);
      try {
        await this.writeBool(V1_SINGLE_GANG_DIMMER_SWITCH_DATA_POINTS.onOff, value);
      } catch (err) {
        this.error('Error when writing onOff:', err);
        throw err;
      }
    });

    this.registerCapabilityListener('dim', async (value) => {
      const brightness = Math.floor(value * 1000); // Scale to 0-1000
      this.log('brightness:', brightness);
      
      try {
        // If dim value is greater than 0 and the device is off, turn it on
        if (brightness > 0 && !this.getCapabilityValue('onoff')) {
          this.log('Dim level is greater than 0, turning on device');
          await this.writeBool(V1_SINGLE_GANG_DIMMER_SWITCH_DATA_POINTS.onOff, true);
          await this.setCapabilityValue('onoff', true);
        }
    
        // Set the brightness
        await this.writeData32(V1_SINGLE_GANG_DIMMER_SWITCH_DATA_POINTS.brightness, brightness);
    
        // Turning off device if dim level is 0
        if (brightness === 0) {
          this.log('Dim level is 0, turning off device');
          await this.writeBool(V1_SINGLE_GANG_DIMMER_SWITCH_DATA_POINTS.onOff, false);
          await this.setCapabilityValue('onoff', false);
        }
      } catch (err) {
        this.error('Error when writing brightness:', err);
        throw err;
      }
    });
    
    
  }

  // Process DP reports and update Homey accordingly
  async processDatapoint(data) {
    const dp = data.dp;
    const parsedValue = getDataValue(data);
    const dataType = data.datatype;
    this.log(`Processing DP ${dp}, Data Type: ${dataType}, Parsed Value:`, parsedValue);

    switch (dp) {
      case V1_SINGLE_GANG_DIMMER_SWITCH_DATA_POINTS.onOff:
        this.log('Received on/off:', parsedValue);
        await this.setCapabilityValue('onoff', parsedValue === true || parsedValue === 1).catch(this.error);
        break;

      case V1_SINGLE_GANG_DIMMER_SWITCH_DATA_POINTS.brightness:
        this.log('Received dim level:', parsedValue);
        await this.setCapabilityValue('dim', parsedValue / 1000).catch(this.error);
        break;

      default:
        this.log('Unhandled DP:', dp, 'with value:', parsedValue);
    }
  }

  onDeleted() {
    this.log('1 Gang Dimmer removed');
  }
}

module.exports = dimmer_1_gang_tuya;
