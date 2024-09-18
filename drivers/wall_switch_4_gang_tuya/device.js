'use strict';

const { Cluster } = require('zigbee-clusters');
const TuyaSpecificCluster = require('../../lib/TuyaSpecificCluster');
const TuyaSpecificClusterDevice = require("../../lib/TuyaSpecificClusterDevice");
const { V1_MULTI_SWITCH_DATA_POINTS } = require('../../lib/TuyaDataPoints');
const { getDataValue } = require('../../lib/TuyaHelpers');

Cluster.addCluster(TuyaSpecificCluster);

class wall_switch_4_gang_tuya extends TuyaSpecificClusterDevice {

  async onNodeInit({ zclNode }) {
    this.printNode();

    const { subDeviceId } = this.getData();
    this.log('Sub device ID:', subDeviceId);

    // Set up listeners for each gang
    if (this.isSubDevice()) {
      // Subdevices for second, third, and fourth gangs
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
      }
    } else {
      // Main device for first gang
      await this._setupGang(zclNode, 'first gang', V1_MULTI_SWITCH_DATA_POINTS.onOffSwitchOne);
    }

    // Attach event listeners for Tuya-specific reports and responses
    zclNode.endpoints[1].clusters.tuya.on("reporting", value => this.processResponse(value));
    zclNode.endpoints[1].clusters.tuya.on("response", value => this.processResponse(value));
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

  async processResponse(data) {
    const dp = data.dp;
    const parsedValue = getDataValue(data);

    switch (dp) {
      case V1_MULTI_SWITCH_DATA_POINTS.onOffSwitchOne:
        await this.setCapabilityValue('onoff', parsedValue).catch(this.error);
        break;
      case V1_MULTI_SWITCH_DATA_POINTS.onOffSwitchTwo:
        await this.setCapabilityValue('onoff', parsedValue).catch(this.error);
        break;
      case V1_MULTI_SWITCH_DATA_POINTS.onOffSwitchThree:
        await this.setCapabilityValue('onoff', parsedValue).catch(this.error);
        break;
      case V1_MULTI_SWITCH_DATA_POINTS.onOffSwitchFour:
        await this.setCapabilityValue('onoff', parsedValue).catch(this.error);
        break;
      default:
        this.log('Unhandled DP:', dp, 'with value:', parsedValue);
    }
  }

  onDeleted() {
    this.log('4 Gang Wall Switch removed');
  }
}

module.exports = wall_switch_4_gang_tuya;