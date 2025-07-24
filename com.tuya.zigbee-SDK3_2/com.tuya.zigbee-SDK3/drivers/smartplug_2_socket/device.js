'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const { CLUSTER, Cluster, ZCLDataTypes} = require('zigbee-clusters');
const TuyaOnOffCluster = require('../../lib/TuyaOnOffCluster');

Cluster.addCluster(TuyaOnOffCluster);

class smartplug_2_socket extends ZigBeeDevice {

  async onNodeInit({zclNode}) {
    const { subDeviceId } = this.getData();

    this.printNode();
    this.log("Device data: ", subDeviceId);

    // onOff
    this.registerCapability('onoff', CLUSTER.ON_OFF, {
      endpoint: subDeviceId === 'secondSocket' ? 2 : 1,
      getOpts: {
        getOnStart: true,
        pollInterval: 60000
	    }
    });

    if (!this.isSubDevice()) {
      this.meteringOffset = this.getSetting('metering_offset');
      this.measureOffset = this.getSetting('measure_offset') * 100;
      this.minReportPower= this.getSetting('minReportPower') * 1000;
      this.minReportCurrent = this.getSetting('minReportCurrent') * 1000;
      this.minReportVoltage = this.getSetting('minReportVoltage') * 1000;

      try {
        const relayStatus = await this.zclNode.endpoints[1].clusters.onOff.readAttributes(['relayStatus']);
        const childLock = await this.zclNode.endpoints[1].clusters.onOff.readAttributes(['childLock']);
        const indicatorMode = await this.zclNode.endpoints[1].clusters.onOff.readAttributes(['indicatorMode']);

        this.log("Relay Status supported by device");

        await this.setSettings({
          relay_status : ZCLDataTypes.enum8RelayStatus.args[0][relayStatus.relayStatus].toString(),
          indicator_mode: ZCLDataTypes.enum8IndicatorMode.args[0][indicatorMode.indicatorMode].toString(),
          child_lock: childLock.childLock ? "1" : "0",
        });
      } catch (error) {
        this.log("This device does not support Relay Control", error);
      }

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

      await zclNode.endpoints[1].clusters.basic.readAttributes(['manufacturerName', 'zclVersion', 'appVersion', 'modelId', 'powerSource', 'attributeReportingStatus'])
        .catch(err => {
          this.error('Error when reading device attributes ', err);
        });
    }
    
  }

  onDeleted() {
    const { subDeviceId } = this.getData();

    this.log("Double Socket Smart Plug, channel ", subDeviceId, " removed");
  }

  async onSettings({oldSettings, newSettings, changedKeys}) {
    let parsedValue = 0;

    if (changedKeys.includes('relay_status')) {
      parsedValue = parseInt(newSettings.relay_status);
      await this.zclNode.endpoints[1].clusters.onOff.writeAttributes({ relayStatus: parsedValue });
    }

    if (changedKeys.includes('indicator_mode')) {
      parsedValue = parseInt(newSettings.indicator_mode);
      await this.zclNode.endpoints[1].clusters.onOff.writeAttributes({ indicatorMode: parsedValue });
    }

    if (changedKeys.includes('child_lock')) {
      parsedValue = parseInt(newSettings.child_lock);
      await this.zclNode.endpoints[1].clusters.onOff.writeAttributes({ childLock: parsedValue });
    }
  }
}

module.exports = smartplug_2_socket;
