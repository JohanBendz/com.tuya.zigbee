'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
// const { CLUSTER } = require('zigbee-clusters');

class smart_button_switch extends ZigBeeDevice {

    async onNodeInit({zclNode}) {
        const node = await this.homey.zigbee.getNode(this);
        node.handleFrame = (endpointId, clusterId, frame, meta) => {
          if (clusterId === 6) {
            frame = frame.toJSON();
            this.buttonCommandParser(frame);
          }
        };
      
    }
  
      buttonCommandParser(frame) {
        var action = frame.data[3] === 0 ? 'oneClick' : 'twoClicks';
        return this.driver.buttonTrigger.trigger(this, {}, { action: `${action}` })
        .then(() => this.log(`Triggered Smart Button Switch, action=${action}`))
        .catch(err => this.error('Error triggering Smart Button Switch', err));
      }


    onDeleted(){
		this.log("Smart Button Switch removed")
	}

}

module.exports = smart_button_switch;