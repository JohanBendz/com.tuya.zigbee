'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const { CLUSTER, Cluster, ZCLDataTypes} = require('zigbee-clusters');
const TuyaOnOffCluster = require('../../lib/TuyaOnOffCluster');

Cluster.addCluster(TuyaOnOffCluster);

class switch_2_gang_metering extends ZigBeeDevice {

  async onNodeInit({zclNode}) {

    this.printNode();

    this.meteringOffset = this.getSetting('metering_offset');
    this.measureOffset = this.getSetting('measure_offset') * 100;
    this.minReportPower= this.getSetting('minReportPower') * 1000;
    this.minReportCurrent = this.getSetting('minReportCurrent') * 1000;
    this.minReportVoltage = this.getSetting('minReportVoltage') * 1000;

    if (!this.hasCapability('measure_current')) {
      await this.addCapability('measure_current').catch(this.error);;
    }

    if (!this.hasCapability('measure_voltage')) {
      await this.addCapability('measure_voltage').catch(this.error);;
    }

    const { subDeviceId } = this.getData();
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
    
      this.registerCapability('resetEnergyMeter', 'resetEnergyMeter');

    }

  }

  async resetEnergyMeter() {
    try {
      // Endpoint: 1 Cluster: 0x00 Command: 0 Payload:
      await this.zclNode.endpoints[1].clusters.basic.doCommand('0');
      this.log("Energy meter reset successfully");
    } catch (err) {
      this.error("Failed to reset energy meter", err);
    }
  }

  onDeleted(){
  this.log("2 Gang Switch, channel ", subDeviceId, " removed")
	}

}

module.exports = switch_2_gang_metering;

