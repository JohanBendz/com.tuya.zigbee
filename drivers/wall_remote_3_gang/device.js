'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const { CLUSTER } = require('zigbee-clusters');

class wall_remote_3_gang extends ZigBeeDevice {

    async onNodeInit({zclNode}) {

        var debounce = 0;
        this.printNode();

        zclNode.endpoints[1].clusters[CLUSTER.POWER_CONFIGURATION.NAME]
        .on('attr.batteryVoltage', this.onBatteryVoltageAttributeReport.bind(this));

        zclNode.endpoints[1].clusters[CLUSTER.POWER_CONFIGURATION.NAME]
        .on('attr.batteryPercentageRemaining', this.onBatteryPercentageRemainingAttributeReport.bind(this));

        const node = await this.homey.zigbee.getNode(this);
        node.handleFrame = (endpointId, clusterId, frame, meta) => {
          if (clusterId === 6) {
            this.log("endpointId:", endpointId,", clusterId:", clusterId,", frame:", frame, ", meta:", meta);
            this.log("Frame JSON data:", frame.toJSON());
            frame = frame.toJSON();
            debounce = debounce+1;
            if (debounce===1){
              this.buttonCommandParser(endpointId, frame);
            } else {
              debounce=0;
            }
          }
        };
  
        this._buttonPressedTriggerDevice = this.homey.flow.getDeviceTriggerCard('wall_remote_3_gang_buttons')
        .registerRunListener(async (args, state) => {
          return (null, args.action === state.action);
        });
      
    }
  
      buttonCommandParser(ep, frame) {
        var button = ep === 1 ? 'left' : ep === 3 ? 'right' : 'center';
        var action = frame.data[3] === 0 ? 'oneClick' : 'twoClicks';
        return this._buttonPressedTriggerDevice.trigger(this, {}, { action: `${button}-${action}` })
        .then(() => this.log(`Triggered Wall Remote 3 Gang, action=${button}-${action}`))
        .catch(err => this.error('Error triggering Wall Remote 3 Gang', err));
      }

      onBatteryVoltageAttributeReport(voltage) {
        const parsedVoltage = voltage / 10;
        this.log('measure_voltage | voltage: ', parsedVoltage);
        this.setCapabilityValue('measure_voltage', parsedVoltage);
      }

      onBatteryPercentageRemainingAttributeReport(batteryPercentage) {
        const batteryThreshold = this.getSetting('batteryThreshold') || 20;
        this.log('measure_battery | batteryPercentage: ', batteryPercentage, 'batteryThreshold: ', batteryThreshold);
        this.setCapabilityValue('measure_battery', batteryPercentage);
        this.setCapabilityValue('alarm_battery', batteryPercentage < batteryThreshold);
      }


    onDeleted(){
		this.log("3 Gang Wall Remote removed")
	}

}

module.exports = wall_remote_3_gang;


