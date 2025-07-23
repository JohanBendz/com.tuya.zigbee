'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const { CLUSTER, Cluster, ZCLDataTypes} = require('zigbee-clusters');
const TuyaOnOffCluster = require('../../lib/TuyaOnOffCluster');

Cluster.addCluster(TuyaOnOffCluster);

class outdoor2socket_1 extends ZigBeeDevice {

  async onNodeInit({zclNode}) {

    await zclNode.endpoints[1].clusters.basic.readAttributes(['manufacturerName', 'zclVersion', 'appVersion', 'modelId', 'powerSource', 'attributeReportingStatus'])
    .catch(err => {
        this.error('Error when reading device attributes ', err);
    });

    this.printNode();
    
    const { subDeviceId } = this.getData();
    this.log('Device data: ', subDeviceId);

    // onOff
    this.registerCapability('onoff', CLUSTER.ON_OFF, {
      getOpts: {
        getOnStart: true,
        pollInterval: 60000
	    }
    });

    this.meteringOffset = this.getSetting('metering_offset');
    this.measureOffset = this.getSetting('measure_offset') * 100;
    this.minReportPower= this.getSetting('minReportPower') * 1000;
    this.minReportCurrent = this.getSetting('minReportCurrent') * 1000;
    this.minReportVoltage = this.getSetting('minReportVoltage') * 1000;

    if (!this.hasCapability('measure_current')) {
      await this.addCapability('measure_current').catch(this.error);
    }

    if (!this.hasCapability('measure_voltage')) {
      await this.addCapability('measure_voltage').catch(this.error);
    }

    // meter_power
    this.registerCapability('meter_power', CLUSTER.METERING, {
      reportParser: value => (value * this.meteringOffset)/100.0,
      getParser: value => (value * this.meteringOffset)/100.0,
      getOpts: {
        getOnStart: true,
        pollInterval: 300000
      }
    });

    // measure_power
    this.registerCapability('measure_power', CLUSTER.ELECTRICAL_MEASUREMENT, {
      reportParser: value => {
        return (value * this.measureOffset)/100;
        },
      getOpts: {
        getOnStart: true,
        pollInterval: this.minReportPower
      }
    });

    this.registerCapability('measure_current', CLUSTER.ELECTRICAL_MEASUREMENT, {
      reportParser: value => {
        return value/100;
        },
      getOpts: {
        getOnStart: true,
        pollInterval: this.minReportCurrent
      }
    });

    this.registerCapability('measure_voltage', CLUSTER.ELECTRICAL_MEASUREMENT, {
      reportParser: value => {
        return value;
        },
      getOpts: {
        getOnStart: true,
        pollInterval: this.minReportVoltage
      }
    });
    
  }

  onDeleted() {
    this.log("Double Outdoor Smart 2 Socket removed");
  }
}

module.exports = outdoor2socket_1;
