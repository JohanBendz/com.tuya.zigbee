'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const { CLUSTER, Cluster, ZCLDataTypes} = require('zigbee-clusters');
const TuyaOnOffCluster = require('../../lib/TuyaOnOffCluster');

Cluster.addCluster(TuyaOnOffCluster);

class doublepowerpoint extends ZigBeeDevice {

  async onNodeInit({zclNode}) {

    await zclNode.endpoints[1].clusters.basic.readAttributes('manufacturerName', 'zclVersion', 'appVersion', 'modelId', 'powerSource', 'attributeReportingStatus')
    .catch(err => {
        this.error('Error when reading device attributes ', err);
    });

    this.printNode();
    console.log(zclNode.endpoints);
    
    const { subDeviceId } = this.getData();
    this.log('Device data: ', subDeviceId);

    this.meteringOffset = this.getSetting('metering_offset');
    this.measureOffset = this.getSetting('measure_offset') * 100;
    this.minReportPower = this.getSetting('minReportPower') * 1000;
    this.minReportCurrent = this.getSetting('minReportCurrent') * 1000;
    this.minReportVoltage = this.getSetting('minReportVoltage') * 1000;

    if (!this.hasCapability('measure_current')) {
      await this.addCapability('measure_current').catch(this.error);
    }

    if (!this.hasCapability('measure_voltage')) {
      await this.addCapability('measure_voltage').catch(this.error);
    }

    // Endpoint 1
    try {
      this.registerCapabilities(zclNode, { endpoint: 1 });
    } catch (error) {
      this.error('Error registering capabilities for endpoint 1:', error);
    }

    // Endpoint 2
    try {
      if (this.getData().subDeviceId === 'seconddoublepowerpoint') {
        this.registerCapabilities(zclNode, { endpoint: 2 });
      }
    } catch (error) {
      this.error('Error registering capabilities for endpoint 2:', error);
    }

  }

  registerCapabilities(zclNode, options) {
    const endpoint = options.endpoint;

    // onOff
    this.registerCapability('onoff', CLUSTER.ON_OFF, options, {
      getOpts: {
        getOnStart: true,
        pollInterval: 60000
      }
    });

    if (endpoint === 1) {
      // meter_power
      this.registerCapability('meter_power', CLUSTER.METERING, options, {
        reportParser: value => (value * this.meteringOffset)/100.0,
        getParser: value => (value * this.meteringOffset)/100.0,
        getOpts: {
          getOnStart: true,
          pollInterval: 300000
        }
      });

      // measure_power
      this.registerCapability('measure_power', CLUSTER.ELECTRICAL_MEASUREMENT, options, {
        reportParser: value => {
          return (value * this.measureOffset)/100;
        },
        getOpts: {
          getOnStart: true,
          pollInterval: this.minReportPower
        }
      });

      this.registerCapability('measure_current', CLUSTER.ELECTRICAL_MEASUREMENT, options, {
        reportParser: value => {
          return value/1000;
        },
        getOpts: {
          getOnStart: true,
          pollInterval: this.minReportCurrent
        }
      });

      this.registerCapability('measure_voltage', CLUSTER.ELECTRICAL_MEASUREMENT, options, {
        reportParser: value => {
          return value;
        },
        getOpts: {
          getOnStart: true,
          pollInterval: this.minReportVoltage
        }
      });
    }

  }

  onDeleted() {
    this.log("Double Power Point removed")
  }

  async onSettings({oldSettings, newSettings, changedKeys}) {
    // Check if specific settings have changed
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
