'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const { CLUSTER, Cluster, ZCLDataTypes } = require('zigbee-clusters');

class doublepowerpoint extends ZigBeeDevice {

  async onNodeInit({ zclNode }) {

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
    const endpoint = subDeviceId === 'socketTwo' ? 2 : 1;
    this.log(`Registering capabilities for endpoint ${endpoint}`);

    // Register only applicable capabilities based on the endpoint
    try {
      if (endpoint === 1) {

        await zclNode.endpoints[1].clusters.basic.readAttributes('manufacturerName', 'zclVersion', 'appVersion', 'modelId', 'powerSource', 'attributeReportingStatus')
        .catch(err => {
          this.error('Error when reading device attributes ', err);
        });

        // Register all capabilities for the first endpoint
        this.registerCapabilities(zclNode, { endpoint });
      } else {
        // Register only onoff for the second endpoint
        this.registerCapability('onoff', CLUSTER.ON_OFF, { endpoint }, {
          getOpts: {
            getOnStart: true,
            pollInterval: 60000
          }
        });
      }
    } catch (error) {
      this.error(`Error registering capabilities for endpoint ${endpoint}:`, error);
    }

  }

  async registerCapabilities(zclNode, { endpoint }) {
    // Register onOff capability with the correct options structure
    this.registerCapability('onoff', CLUSTER.ON_OFF, { endpoint }, {
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
  
    // Register additional capabilities with configureReporting instead of polling
    if (endpoint === 1) {
      try {
        // Configure reporting for meter_power
        await zclNode.endpoints[endpoint].clusters.metering.configureReporting({
          attribute: 'currentSummationDelivered',
          minimumReportInterval: 10, // Minimum reporting interval
          maximumReportInterval: 600, // Maximum reporting interval
          reportableChange: 10, // Report when the value changes by 10 units
        });
        this.log('Configured reporting for meter_power');
  
        // Configure reporting for measure_power
        await zclNode.endpoints[endpoint].clusters.electricalMeasurement.configureReporting({
          attribute: 'activePower',
          minimumReportInterval: 10,
          maximumReportInterval: this.minReportPower,
          reportableChange: 1,
        });
        this.log('Configured reporting for measure_power');
  
        // Configure reporting for measure_current
        await zclNode.endpoints[endpoint].clusters.electricalMeasurement.configureReporting({
          attribute: 'rmsCurrent',
          minimumReportInterval: 10,
          maximumReportInterval: this.minReportCurrent,
          reportableChange: 1,
        });
        this.log('Configured reporting for measure_current');
  
        // Configure reporting for measure_voltage
        await zclNode.endpoints[endpoint].clusters.electricalMeasurement.configureReporting({
          attribute: 'rmsVoltage',
          minimumReportInterval: 10,
          maximumReportInterval: this.minReportVoltage,
          reportableChange: 1,
        });
        this.log('Configured reporting for measure_voltage');
      } catch (error) {
        this.error('Failed to configure reporting for some attributes:', error);
      }
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

module.exports = doublepowerpoint;
