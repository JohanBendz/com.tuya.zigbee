'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const { CLUSTER, Cluster, ZCLDataTypes} = require('zigbee-clusters');
const TuyaOnOffCluster = require('../../lib/TuyaOnOffCluster');

Cluster.addCluster(TuyaOnOffCluster);

class switch_2_gang_metering extends ZigBeeDevice {

  async onNodeInit({zclNode}) {

    this.printNode();

    const { subDeviceId } = this.getData();

    if (!this.isSubDevice()) {
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
    }
    this.log("Device data: ", subDeviceId);

    this.registerCapability('onoff', CLUSTER.ON_OFF, {
        endpoint: subDeviceId === 'secondSwitch' ? 2 : 1,
        getOpts: {
            getOnStart: true,
            pollInterval: 60000
            }
    });

    if (!this.isSubDevice()) {
      await zclNode.endpoints[1].clusters.basic.readAttributes(['manufacturerName', 'zclVersion', 'appVersion', 'modelId', 'powerSource', 'attributeReportingStatus'])
      .catch(err => {
          this.error('Error when reading device attributes ', err);
      });

      // meter_power
      this.registerCapability('meter_power', CLUSTER.METERING, {
        reportParser: value => (value * this.meteringOffset)/100.0,
        getParser: value => (value * this.meteringOffset)/100.0,
        get: 'currentSummationDelivered',
        report: 'currentSummationDelivered',
        getOpts: {
          getOnStart: true,
          pollInterval: 300000
          }
      });
    
      // measure_power
      this.registerCapability('measure_power', CLUSTER.ELECTRICAL_MEASUREMENT, {
        get: 'activePower',
        report: 'activePower',
        reportParser: value => {
          return (value * this.measureOffset)/100;
        },
        getOpts: {
          getOnStart: true,
          pollInterval: this.minReportPower
          }
      });
    
      this.registerCapability('measure_current', CLUSTER.ELECTRICAL_MEASUREMENT, {
        get: 'rmsCurrent',
        report: 'rmsCurrent',
        reportParser: value => {
          return value/1000;
        },
        getOpts: {
          getOnStart: true,
          pollInterval: this.minReportCurrent
        }
      });

      this.registerCapability('measure_voltage', CLUSTER.ELECTRICAL_MEASUREMENT, {
        get: 'rmsVoltage',
        report: 'rmsVoltage',
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

  async resetEnergyMeter() {
    const error = new Error(
      'Energy meter reset is not implemented safely for this device.'
    );
    this.error(error.message);
    throw error;
  }

  onDeleted() {
    const { subDeviceId } = this.getData();
    this.log("2 Gang Switch, channel ", subDeviceId, " removed");
  }

}

module.exports = switch_2_gang_metering;

