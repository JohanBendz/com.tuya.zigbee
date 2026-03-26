'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
// const { CLUSTER } = require('zigbee-clusters');

class wall_remote_6_gang extends ZigBeeDevice {

    async onNodeInit({zclNode}) {

      this.printNode();

      const node = await this.homey.zigbee.getNode(this);
      node.handleFrame = (endpointId, clusterId, frame, meta) => {
        if (clusterId === 6) {
           this.log("endpointId:", endpointId,", clusterId:", clusterId,", frame:", frame, ", meta:", meta);
           this.log("Frame JSON data:", frame.toJSON());
           frame = frame.toJSON();
           this.buttonCommandParser(endpointId, frame);
        }
      };

      this._buttonPressedTriggerDevice = this.homey.flow.getDeviceTriggerCard('wall_remote_6_gang_buttons')
      .registerRunListener(async (args, state) => {
        return (null, args.action === state.action);
      });
    
    }

    buttonCommandParser(ep, frame) {
      var button = ep === 1 ? 'one' : ep === 2 ? 'two' : ep === 3 ? 'three' : ep === 4 ? 'four' : ep === 5 ? 'five' : 'six';
      var action;
      if (frame.data[3] === 0) {
        action = 'oneClick';
      } else if (frame.data[3] === 1) {
        action = 'twoClicks';
      } else if (frame.data[3] === 2) {
        action = 'longPress';
      }
    
      // Debounce logic for oneClick
      if (!this.doubleClickReceived && action === 'oneClick') {
        this.clickTimeout = setTimeout(() => {
          this._buttonPressedTriggerDevice.trigger(this, {}, { action: `${button}-${action}` })
            .then(() => this.log(`Triggered 6 Gang Wall Remote, action=${button}-${action}`))
            .catch(err => this.error('Error triggering 6 Gang Wall Remote', err));
        }, 300); // Adjust debounce time as needed
      }
    
      // Handle twoClicks immediately, cancel pending oneClick
      if (action === 'twoClicks') {
        clearTimeout(this.clickTimeout);
        this.doubleClickReceived = true;
        this._buttonPressedTriggerDevice.trigger(this, {}, { action: `${button}-${action}` })
          .then(() => this.log(`Triggered 6 Gang Wall Remote, action=${button}-${action}`))
          .catch(err => this.error('Error triggering 6 Gang Wall Remote', err));
    
        setTimeout(() => {
          this.doubleClickReceived = false;
        }, 500); // Adjust time as needed
      }
    
      // Handle long press
      if (action === 'longPress') {
        this._buttonPressedTriggerDevice.trigger(this, {}, { action: `${button}-${action}` })
          .then(() => this.log(`Triggered 6 Gang Wall Remote, action=${button}-${action}`))
          .catch(err => this.error('Error triggering 6 Gang Wall Remote', err));
      }
    }    

    onDeleted() {
      this.log("6 Gang Wall Remote removed");
    }

}

module.exports = wall_remote_6_gang;
