'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const { CLUSTER, Cluster, ZCLDataTypes } = require('zigbee-clusters');
const TuyaOnOffCluster = require('../../lib/TuyaOnOffCluster');

Cluster.addCluster(TuyaOnOffCluster);

class doublepowerpoint extends ZigBeeDevice {

  async onNodeInit({ zclNode }) {

    await zclNode.endpoints[1].clusters.basic.readAttributes('manufacturerName', 'zclVersion', 'appVersion', 'modelId', 'powerSource', 'attributeReportingStatus')
      .catch(err => {
        this.error('Error when reading device attributes ', err);
      });

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

    // Add missing capabilities if not already present
    if (!this.hasCapability('measure_current')) {
      await this.addCapability('measure_current').catch(this.error);
    }

    if (!this.hasCapability('measure_voltage')) {
      await this.addCapability('measure_voltage').catch(this.error);
    }

    // Determine endpoint based on subDeviceId
    const endpoint = subDeviceId === 'seconddoublepowerpoint' ? 2 : 1;

    this.log(`Registering capabilities for endpoint ${endpoint}`);

    // Register capabilities for the determined endpoint
    try {
      this.registerCapabilities(zclNode, { endpoint });
    } catch (error) {
      this.error(`Error registering capabilities for endpoint ${endpoint}:`, error);
    }
  }

  registerCapabilities(zclNode, options) {
    const endpoint = options.endpoint;

    // onOff capability
    this.registerCapability('onoff', CLUSTER.ON_OFF, options, {
      getOpts: {
        getOnStart: true,
        pollInterval: 60000
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
    const { subDeviceId } = this.getData();
    const endpoint = subDeviceId === 'seconddoublepowerpoint' ? 2 : 1;
    this.log(`Double Power Point, channel ${endpoint} removed`);
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

module.exports = doublepowerpoint;
