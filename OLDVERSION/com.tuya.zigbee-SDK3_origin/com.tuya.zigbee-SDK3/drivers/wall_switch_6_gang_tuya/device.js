'use strict';

const { debug, Cluster } = require('zigbee-clusters');
const TuyaSpecificCluster = require('../../lib/TuyaSpecificCluster');
const TuyaSpecificClusterDevice = require("../../lib/TuyaSpecificClusterDevice");
const { getDataValue } = require('../../lib/TuyaHelpers');
const { V1_MULTI_SWITCH_DATA_POINTS } = require('../../lib/TuyaDataPoints');

Cluster.addCluster(TuyaSpecificCluster);

class wall_switch_6_gang_tuya extends TuyaSpecificClusterDevice {

  async onNodeInit({ zclNode }) {
    this.printNode();
/*     debug(true);
    this.enableDebug(); */

    const { subDeviceId } = this.getData();
    this.log('Sub device ID:', subDeviceId);

    // Setup capability listeners and event handlers for each gang
    if (this.isSubDevice()) {
      // Handle each subdevice based on the subDeviceId
      switch (subDeviceId) {
        case 'secondGang':
          await this._setupGang(zclNode, 'second gang', V1_MULTI_SWITCH_DATA_POINTS.onOffSwitchTwo);
          break;
        case 'thirdGang':
          await this._setupGang(zclNode, 'third gang', V1_MULTI_SWITCH_DATA_POINTS.onOffSwitchThree);
          break;
        case 'fourthGang':
          await this._setupGang(zclNode, 'fourth gang', V1_MULTI_SWITCH_DATA_POINTS.onOffSwitchFour);
          break;
        case 'fifthGang':
          await this._setupGang(zclNode, 'fifth gang', V1_MULTI_SWITCH_DATA_POINTS.onOffSwitchFive);
          break;
        case 'sixthGang':
          await this._setupGang(zclNode, 'sixth gang', V1_MULTI_SWITCH_DATA_POINTS.onOffSwitchSix);
          break;
      }
    } else {
      // Main device for the first gang
      await this._setupGang(zclNode, 'first gang', V1_MULTI_SWITCH_DATA_POINTS.onOffSwitchOne);
    }

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

  async _setupGang(zclNode, gangName, dpOnOff) {
    // Register capability listener for on/off for each gang
    this.registerCapabilityListener('onoff', async (value) => {
      this.log(`${gangName} on/off:`, value);
      try {
        await this.writeBool(dpOnOff, value);
      } catch (err) {
        this.error(`Error when writing onOff for ${gangName}:`, err);
        throw err;
      }
    });
  }

  // Process DP reports and update Homey accordingly
  async processDatapoint(data) {
    const dp = data.dp;
    const parsedValue = getDataValue(data);
    const dataType = data.datatype;
    const { subDeviceId } = this.getData(); 
    this.log(`Processing DP ${dp}, Data Type: ${dataType}, Parsed Value:`, parsedValue);

    // Differentiate between gangs by DP
    switch (dp) {
      case V1_MULTI_SWITCH_DATA_POINTS.onOffSwitchOne:
        this.log('Received on/off for first gang:', parsedValue);
        if (!this.isSubDevice()) {
          await this.setCapabilityValue('onoff', parsedValue).catch(this.error);
        }
        break;

      case V1_MULTI_SWITCH_DATA_POINTS.onOffSwitchTwo:
        this.log('Received on/off for second gang:', parsedValue);
        if (subDeviceId === 'secondGang') {
          await this.setCapabilityValue('onoff', parsedValue).catch(this.error);
        }
        break;

      case V1_MULTI_SWITCH_DATA_POINTS.onOffSwitchThree:
        this.log('Received on/off for third gang:', parsedValue);
        if (subDeviceId === 'thirdGang') {
          await this.setCapabilityValue('onoff', parsedValue).catch(this.error);
        }
        break;

      case V1_MULTI_SWITCH_DATA_POINTS.onOffSwitchFour:
        this.log('Received on/off for fourth gang:', parsedValue);
        if (subDeviceId === 'fourthGang') {
          await this.setCapabilityValue('onoff', parsedValue).catch(this.error);
        }
        break;

      case V1_MULTI_SWITCH_DATA_POINTS.onOffSwitchFive:
        this.log('Received on/off for fifth gang:', parsedValue);
        if (subDeviceId === 'fifthGang') {
          await this.setCapabilityValue('onoff', parsedValue).catch(this.error);
        }
        break;

      case V1_MULTI_SWITCH_DATA_POINTS.onOffSwitchSix:
        this.log('Received on/off for sixth gang:', parsedValue);
        if (subDeviceId === 'sixthGang') {
          await this.setCapabilityValue('onoff', parsedValue).catch(this.error);
        }
        break;

      default:
        this.log('Unhandled DP:', dp, 'with value:', parsedValue);
    }
  }

  onDeleted() {
    this.log('6 Gang Wall Switch removed');
  }
}

module.exports = wall_switch_6_gang_tuya;
