'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const { CLUSTER, Cluster, ZCLDataTypes } = require('zigbee-clusters');
const TuyaOnOffCluster = require('../../lib/TuyaOnOffCluster');

Cluster.addCluster(TuyaOnOffCluster);

class doublepowerpoint extends ZigBeeDevice {

  async onNodeInit({ zclNode }) {
    const { subDeviceId } = this.getData();

    this.log('Device data: ', subDeviceId);

    // Determine endpoint based on subDeviceId
    const endpoint = subDeviceId === 'socketTwo' ? 2 : 1;
    this.log(`Registering capabilities for endpoint ${endpoint}`);

    if (endpoint === 1) {
      // Main device owns the metering capabilities and settings.
      this.initializeReportingSettings();
      await this.ensureCapabilities();
    }

    // Register capabilities based on the endpoint
    try {
      if (endpoint === 1) {
        await this.readBasicAttributes(zclNode, endpoint);
      }

      // Register on/off for both endpoints; metering only for endpoint 1.
      await this.registerCapabilities(zclNode, { endpoint });

    } catch (error) {
      this.error(`Error registering capabilities for endpoint ${endpoint}:`, error);
    }
  }

  initializeReportingSettings() {
    this.meteringOffset = this.getSetting('metering_offset');
    this.measureOffset = this.getSetting('measure_offset') * 100;
    this.minReportPower = this.getSetting('minReportPower') * 1000;
    this.minReportCurrent = this.getSetting('minReportCurrent') * 1000;
    this.minReportVoltage = this.getSetting('minReportVoltage') * 1000;
  }

  async ensureCapabilities() {
    if (!this.hasCapability('measure_current')) {
      await this.addCapability('measure_current').catch(this.error);
    }

    if (!this.hasCapability('measure_voltage')) {
      await this.addCapability('measure_voltage').catch(this.error);
    }
  }

  async readBasicAttributes(zclNode, endpoint) {
    try {
      await zclNode.endpoints[endpoint].clusters.basic.readAttributes(
        ['manufacturerName', 'zclVersion', 'appVersion', 'modelId', 'powerSource', 'attributeReportingStatus']
      );
      this.log('Basic attributes read successfully');
    } catch (error) {
      this.error('Error when reading device attributes:', error);
    }
  }

  async registerCapabilities(zclNode, { endpoint }) {
    // Register onOff capability with the correct options
    this.registerCapability('onoff', CLUSTER.ON_OFF, {
      endpoint,
      getOpts: {
        getOnStart: true
      }
    });

    // Attempt to configure instant reporting for the onOff attribute
    try {
      await zclNode.endpoints[endpoint].clusters.onOff.configureReporting({
        attribute: 'onOff',
        minimumReportInterval: 1, // Minimum interval in seconds (instant reporting)
        maximumReportInterval: 600, // Maximum interval in seconds
        reportableChange: 1, // Report on any change
      });
      this.log(`Configured instant reporting for onOff on endpoint ${endpoint}`);
    } catch (error) {
      this.error(`Failed to configure onOff reporting for endpoint ${endpoint}, continuing without configured reporting`, error);
    }

    if (endpoint === 1) {
      this.registerMeteringCapabilities();
      await this.configureMeteringReporting(zclNode, endpoint);
    }
  }

  registerMeteringCapabilities() {
    this.registerCapability('meter_power', CLUSTER.METERING, {
      endpoint: 1,
      get: 'currentSummationDelivered',
      report: 'currentSummationDelivered',
      reportParser: value => (value * this.meteringOffset) / 100.0,
      getParser: value => (value * this.meteringOffset) / 100.0,
      getOpts: {
        getOnStart: true,
        pollInterval: 300000,
      },
    });

    this.registerCapability('measure_power', CLUSTER.ELECTRICAL_MEASUREMENT, {
      endpoint: 1,
      get: 'activePower',
      report: 'activePower',
      reportParser: value => (value * this.measureOffset) / 100,
      getOpts: {
        getOnStart: true,
        pollInterval: this.minReportPower,
      },
    });

    this.registerCapability('measure_current', CLUSTER.ELECTRICAL_MEASUREMENT, {
      endpoint: 1,
      get: 'rmsCurrent',
      report: 'rmsCurrent',
      reportParser: value => value / 1000,
      getOpts: {
        getOnStart: true,
        pollInterval: this.minReportCurrent,
      },
    });

    this.registerCapability('measure_voltage', CLUSTER.ELECTRICAL_MEASUREMENT, {
      endpoint: 1,
      get: 'rmsVoltage',
      report: 'rmsVoltage',
      reportParser: value => value,
      getOpts: {
        getOnStart: true,
        pollInterval: this.minReportVoltage,
      },
    });
  }

  async configureMeteringReporting(zclNode, endpoint) {
    try {
      await zclNode.endpoints[endpoint].clusters.metering.configureReporting({
        attribute: 'currentSummationDelivered',
        minimumReportInterval: 10,
        maximumReportInterval: 600,
        reportableChange: 10,
      });
      this.log('Configured reporting for meter_power');

      await zclNode.endpoints[endpoint].clusters.electricalMeasurement.configureReporting({
        attribute: 'activePower',
        minimumReportInterval: 10,
        maximumReportInterval: this.minReportPower / 1000,
        reportableChange: 1,
      });
      this.log('Configured reporting for measure_power');

      await zclNode.endpoints[endpoint].clusters.electricalMeasurement.configureReporting({
        attribute: 'rmsCurrent',
        minimumReportInterval: 10,
        maximumReportInterval: this.minReportCurrent / 1000,
        reportableChange: 1,
      });
      this.log('Configured reporting for measure_current');

      await zclNode.endpoints[endpoint].clusters.electricalMeasurement.configureReporting({
        attribute: 'rmsVoltage',
        minimumReportInterval: 10,
        maximumReportInterval: this.minReportVoltage / 1000,
        reportableChange: 1,
      });
      this.log('Configured reporting for measure_voltage');
    } catch (error) {
      this.error('Failed to configure reporting for some attributes:', error);
    }
  }

  onDeleted() {
    this.log('Double Power Point removed');
  }

  async onSettings({ oldSettings, newSettings, changedKeys }) {
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
