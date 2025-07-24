'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const { CLUSTER, Cluster, ZCLDataTypes} = require('zigbee-clusters');
const TuyaOnOffCluster = require('../../lib/TuyaOnOffCluster');

Cluster.addCluster(TuyaOnOffCluster);

class switch_4_gang_metering extends ZigBeeDevice {

  async onNodeInit({zclNode}) {

    this.printNode();
    console.log(zclNode.endpoints);

    const { subDeviceId } = this.getData();
    this.log('Device data: ', subDeviceId);

    // Setting offsets and report intervals
    this.meteringOffset = this.getSetting('metering_offset');
    this.measureOffset = this.getSetting('measure_offset') * 100;
    this.minReportPower = this.getSetting('minReportPower') * 1000;
    this.minReportCurrent = this.getSetting('minReportCurrent') * 1000;
    this.minReportVoltage = this.getSetting('minReportVoltage') * 1000;

    // Determine endpoint based on subDeviceId
    const endpoint = subDeviceId === 'secondSwitch' ? 2 : subDeviceId === 'thirdSwitch' ? 3 : subDeviceId === 'fourthSwitch' ? 4 : 1;
    this.log(`Registering capabilities for endpoint ${endpoint}`);

    // Register only applicable capabilities based on the endpoint
    try {
      if (endpoint === 1) {

        await zclNode.endpoints[1].clusters.basic.readAttributes(['manufacturerName', 'zclVersion', 'appVersion', 'modelId', 'powerSource', 'attributeReportingStatus'])
        .catch(err => {
          this.error('Error when reading device attributes ', err);
        });

        // Register all capabilities for the first endpoint
        this.registerCapabilities(zclNode, { endpoint });
      } else {
        // Register only onoff for the endpoint
        this.registerCapability('onoff', CLUSTER.ON_OFF, { endpoint }, {
          getOpts: {
            getOnStart: true
          }
        });
      }
    } catch (error) {
      this.error(`Error registering capabilities for endpoint ${endpoint}:`, error);
    }

    // Attempt to configure instant reporting for the onOff attribute
    try {
      await zclNode.endpoints[endpoint].clusters.onOff.configureReporting({
        attribute: 'onOff',
        minimumReportInterval: 1, // Minimum interval in seconds (instant reporting)
        maximumReportInterval: 600, // Maximum interval in seconds
        reportableChange: 1, // Report on any change
      });
      this.log('Configured instant reporting for onOff');
    } catch (error) {
      // If reporting fails, log the error and set up fallback polling
      this.error('Failed to configure onOff reporting, setting up fallback polling', error);
      
      // Directly set the fallback polling interval without re-registering the capability
      this.setCapabilityOptions('onoff', {
        getOpts: {
          getOnStart: true,
          pollInterval: 60000, // Poll every 60 seconds as a fallback
        },
      });
    }

  }

  registerCapabilities(zclNode, options) {
    const endpoint = options.endpoint;

    // onOff capability
    this.registerCapability('onoff', CLUSTER.ON_OFF, options, {
      getOpts: {
        getOnStart: true
      }
    });

    // Only for endpoint 1 (main device), register additional capabilities
    if (endpoint === 1) {
      // meter_power capability
      this.registerCapability('meter_power', CLUSTER.METERING, options, {
        reportParser: value => (value * this.meteringOffset) / 100.0,
        getParser: value => (value * this.meteringOffset) / 100.0,
        getOpts: {
          getOnStart: true,
          pollInterval: 300000
        }
      });

      // measure_power capability
      this.registerCapability('measure_power', CLUSTER.ELECTRICAL_MEASUREMENT, options, {
        reportParser: value => (value * this.measureOffset) / 100,
        getOpts: {
          getOnStart: true,
          pollInterval: this.minReportPower
        }
      });

      // measure_current capability
      this.registerCapability('measure_current', CLUSTER.ELECTRICAL_MEASUREMENT, options, {
        reportParser: value => value / 1000,
        getOpts: {
          getOnStart: true,
          pollInterval: this.minReportCurrent
        }
      });

      // measure_voltage capability
      this.registerCapability('measure_voltage', CLUSTER.ELECTRICAL_MEASUREMENT, options, {
        reportParser: value => value,
        getOpts: {
          getOnStart: true,
          pollInterval: this.minReportVoltage
        }
      });
    }
  }

  onDeleted() {
    this.log(`Double Power Point removed`);
  }

  async onSettings({ oldSettings, newSettings, changedKeys }) {
    // Check if specific settings have changed and update accordingly
    if (changedKeys.includes('metering_offset')) {
      this.meteringOffset = newSettings.metering_offset;
    }
    if (changedKeys.includes('measure_offset')) {
      this.measureOffset = newSettings.measure_offset * 100;
    }
    if (changedKeys.includes('minReportPower')) {
      this.minReportPower = newSettings.minReportPower * 1000;
    }
    if (changedKeys.includes('minReportCurrent')) {
      this.minReportCurrent = newSettings.minReportCurrent * 1000;
    }
    if (changedKeys.includes('minReportVoltage')) {
      this.minReportVoltage = newSettings.minReportVoltage * 1000;
    }
  }

}

module.exports = switch_4_gang_metering;

