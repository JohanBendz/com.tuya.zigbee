'use strict';

const { debug, Cluster } = require('zigbee-clusters');
const TuyaSpecificCluster = require('../../lib/TuyaSpecificCluster');
const TuyaSpecificClusterDevice = require('../../lib/TuyaSpecificClusterDevice');
const { getDataValue, setPowerOnStatus } = require('../../lib/TuyaHelpers');
const { V2_MULTI_GANG_DIMMER_SWITCH_DATA_POINTS } = require('../../lib/TuyaDataPoints');

Cluster.addCluster(TuyaSpecificCluster);

class Dimmer3GangTuya extends TuyaSpecificClusterDevice {
  async onNodeInit({ zclNode }) {
    this.printNode();
    debug(false); // Logs detalhados ativados
    // this.enableDebug();

    const { subDeviceId } = this.getData();
    this.log('Sub device ID:', subDeviceId);

    // Read and store firmware version and other attributes
    const attributes = await zclNode.endpoints[1].clusters.basic
      .readAttributes(['manufacturerName', 'zclVersion', 'appVersion', 'modelId', 'powerSource'])
      .catch(err => {
        this.error('Error reading device attributes:', err);
        return {};
      });

    if (attributes.appVersion) {
      this.setStoreValue('firmwareVersion', attributes.appVersion).catch(this.error);
      this.log('Firmware version:', attributes.appVersion);
    } else {
      this.log('Firmware version not available');
    }

    if (this.isSubDevice()) {
      if (subDeviceId === 'secondGang') {
        await this._setupGang(
          zclNode,
          'second controller',
          V2_MULTI_GANG_DIMMER_SWITCH_DATA_POINTS.onOffGangTwo,
          V2_MULTI_GANG_DIMMER_SWITCH_DATA_POINTS.brightnessGangTwo
        );
      } else if (subDeviceId === 'thirdGang') {
        await this._setupGang(
          zclNode,
          'third controller',
          V2_MULTI_GANG_DIMMER_SWITCH_DATA_POINTS.onOffGangThree,
          V2_MULTI_GANG_DIMMER_SWITCH_DATA_POINTS.brightnessGangThree
        );
      }
    } else {
      await this._setupGang(
        zclNode,
        'first controller',
        V2_MULTI_GANG_DIMMER_SWITCH_DATA_POINTS.onOffGangOne,
        V2_MULTI_GANG_DIMMER_SWITCH_DATA_POINTS.brightnessGangOne
      );

      // Initialize power on state (default to 'memory' if not set)
      const currentPowerOnState = this.getStoreValue('powerOnState') || 'memory';
      await this.setPowerOnState(currentPowerOnState);
    }

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

  async _setupGang(zclNode, controllerName, dpOnOff, dpDim) {
    this.registerCapabilityListener('onoff', async (value) => {
      this.log(`Sending onoff ${controllerName}:`, value);
      await this._writeWithRetry(dpOnOff, value, 'bool', controllerName);
    });

    this.registerCapabilityListener('dim', async (value) => {
      const level = Math.floor(value * 1000); // Scale to 0-1000
      this.log(`Sending level ${controllerName}:`, level);
      try {
        if (level > 0 && !this.getCapabilityValue('onoff')) {
          this.log(`Level > 0, turning on ${controllerName}`);
          await this._writeWithRetry(dpOnOff, true, 'bool', controllerName);
          await this.setCapabilityValue('onoff', true);
        }

        await this._writeWithRetry(dpDim, level, 'data32', controllerName);

        if (level === 0) {
          this.log(`Level is 0, turning off ${controllerName}`);
          await this._writeWithRetry(dpOnOff, false, 'bool', controllerName);
          await this.setCapabilityValue('onoff', false);
        }
      } catch (err) {
        this.error(`Error adjusting level for ${controllerName}:`, err);
        throw err;
      }
    });
  }

  // Método para configurar o powerOnState internamente
  async setPowerOnState(value) {
    const powerOnValue = { off: 0, on: 1, memory: 2 }[value];
    if (powerOnValue === undefined) {
      this.error('Invalid power on state value:', value);
      return;
    }
    try {
      await setPowerOnStatus(this, powerOnValue);
      await this.setStoreValue('powerOnState', value);
      this.log('Power on state set to:', value);
    } catch (err) {
      this.error('Error setting power on state:', err);
    }
  }

  async _writeWithRetry(dp, value, type, controllerName, retries = 2, timeout = 15000) {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        this.log(`Attempt ${attempt} to write ${type} to DP ${dp} for ${controllerName}:`, value);
        const writeMethod = type === 'bool' ? this.writeBool : this.writeData32;
        return await Promise.race([
          writeMethod.call(this, dp, value),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), timeout))
        ]);
      } catch (err) {
        this.error(`Attempt ${attempt} failed for DP ${dp} (${controllerName}):`, err);
        if (attempt === retries) throw err;
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1s before retry
      }
    }
  }

  async processDatapoint(data) {
    const dp = data.dp;
    const parsedValue = getDataValue(data);
    const dataType = data.datatype;
    this.log(`Processing DP ${dp}, Data Type: ${dataType}, Parsed Value:`, parsedValue);

    switch (dp) {
      case V2_MULTI_GANG_DIMMER_SWITCH_DATA_POINTS.onOffGangOne:
        if (!this.isSubDevice()) {
          await this.setCapabilityValue('onoff', parsedValue === true || parsedValue === 1).catch(this.error);
        }
        break;

      case V2_MULTI_GANG_DIMMER_SWITCH_DATA_POINTS.brightnessGangOne:
        if (!this.isSubDevice()) {
          await this.setCapabilityValue('dim', parsedValue / 1000).catch(this.error);
        }
        break;

      case V2_MULTI_GANG_DIMMER_SWITCH_DATA_POINTS.onOffGangTwo:
        if (this.isSubDevice() && this.getData().subDeviceId === 'secondGang') {
          await this.setCapabilityValue('onoff', parsedValue === true || parsedValue === 1).catch(this.error);
        }
        break;

      case V2_MULTI_GANG_DIMMER_SWITCH_DATA_POINTS.brightnessGangTwo:
        if (this.isSubDevice() && this.getData().subDeviceId === 'secondGang') {
          await this.setCapabilityValue('dim', parsedValue / 1000).catch(this.error);
        }
        break;

      case V2_MULTI_GANG_DIMMER_SWITCH_DATA_POINTS.onOffGangThree:
        if (this.isSubDevice() && this.getData().subDeviceId === 'thirdGang') {
          await this.setCapabilityValue('onoff', parsedValue === true || parsedValue === 1).catch(this.error);
        }
        break;

      case V2_MULTI_GANG_DIMMER_SWITCH_DATA_POINTS.brightnessGangThree:
        if (this.isSubDevice() && this.getData().subDeviceId === 'thirdGang') {
          await this.setCapabilityValue('dim', parsedValue / 1000).catch(this.error);
        }
        break;

      case V2_MULTI_GANG_DIMMER_SWITCH_DATA_POINTS.powerOnStatusSetting:
        this.log('Received power on state:', parsedValue);
        if (!this.isSubDevice()) {
          const powerOnMap = { 0: 'off', 1: 'on', 2: 'memory' };
          const state = powerOnMap[parsedValue];
          await this.setStoreValue('powerOnState', state).catch(this.error);
          this.log('Power on state updated in store:', state);
        }
        break;

      default:
        this.log('Unhandled DP:', dp, 'with value:', parsedValue);
    }
  }

  onDeleted() {
    this.log('3 Gang controller removed');
  }
}

module.exports = Dimmer3GangTuya;