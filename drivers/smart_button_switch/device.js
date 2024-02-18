'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
// const { CLUSTER } = require('zigbee-clusters');

class smart_button_switch extends ZigBeeDevice {

    async onNodeInit({zclNode}) {
        this.printNode();

        const node = await this.homey.zigbee.getNode(this);
        node.handleFrame = (endpointId, clusterId, frame, meta) => {
          if (clusterId === 6) {
            this.log("endpointId:", endpointId,", clusterId:", clusterId,", frame:", frame, ", meta:", meta);
            this.log("Frame JSON data:", frame.toJSON());
            frame = frame.toJSON();
            this.buttonCommandParser(frame);
          }
        };
  
        this._buttonPressedTriggerDevice = this.homey.flow.getDeviceTriggerCard('smart_button_switch_buttons')
        .registerRunListener(async (args, state) => {
          return (null, args.action === state.action);
        });
      
    }
  
      buttonCommandParser(frame) {
        var action = frame.data[3] === 0 ? 'oneClick' : 'twoClicks';
        return this._buttonPressedTriggerDevice.trigger(this, {}, { action: `${action}` })
        .then(() => this.log(`Triggered Smart Button Switch, action=${action}`))
        .catch(err => this.error('Error triggering Smart Button Switch', err));
      }


    onDeleted(){
		this.log("Smart Button Switch removed")
	}

}

module.exports = smart_button_switch;