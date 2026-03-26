'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');

class wall_remote_4_gang_2 extends ZigBeeDevice {

  async onNodeInit({ zclNode }) {
    this.log('Initializing the wall_remote_4_gang_2 device...');
    this.printNode();
  
    const node = await this.homey.zigbee.getNode(this);
    node.handleFrame = (endpointId, clusterId, frame, meta) => {
      
      this.log("Received frame from endpoint");
      this.log("Start of frame log-------");
      this.log("Endpoint ID:", endpointId);
      this.log("Cluster ID:", clusterId);
      this.log("Frame:", frame);
      this.log("Meta:", meta);
      this.log("-------------------------");
      this.log("Frame JSON data:", frame.toJSON());
      this.log("-------------------------");
      this.log("Frame data:", frame.data);
      this.log("End of frame log---------");

      if (clusterId === 6) {
        this.log("endpointId:", endpointId, ", clusterId:", clusterId, ", frame:", frame, ", meta:", meta);
        this.log("Frame JSON data:", frame.toJSON());
        frame = frame.toJSON();
        this.buttonCommandParser(endpointId, frame);
      }

    }

    this._buttonPressedTriggerDevice = this.homey.flow.getDeviceTriggerCard('wall_remote_4_gang_buttons_2')
      .registerRunListener(async (args, state) => {
        return (null, args.action === state.action);
      });
      
  }

  buttonCommandParser(ep, frame) {
    const buttonMap = { 1: 'one', 2: 'two', 3: 'three', 4: 'four' };
    const button = buttonMap[ep] || 'unknown';
    let action;

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
          .then(() => this.log(`Triggered 4 Gang Wall Remote, action=${button}-${action}`))
          .catch(err => this.error('Error triggering 4 Gang Wall Remote', err));
      }, 300); // Adjust debounce time as needed
    }

    // Handle twoClicks immediately, cancel pending oneClick
    if (action === 'twoClicks') {
      clearTimeout(this.clickTimeout);
      this.doubleClickReceived = true;
      this._buttonPressedTriggerDevice.trigger(this, {}, { action: `${button}-${action}` })
        .then(() => this.log(`Triggered 4 Gang Wall Remote, action=${button}-${action}`))
        .catch(err => this.error('Error triggering 4 Gang Wall Remote', err));

      setTimeout(() => {
        this.doubleClickReceived = false;
      }, 500); // Adjust time as needed
    }

    // Handle long press
    if (action === 'longPress') {
      this._buttonPressedTriggerDevice.trigger(this, {}, { action: `${button}-${action}` })
        .then(() => this.log(`Triggered 4 Gang Wall Remote, action=${button}-${action}`))
        .catch(err => this.error('Error triggering 4 Gang Wall Remote', err));

      // Special case: Buttons 2 + 4 long press for mode change
      if (button === 'two' || button === 'four') {
        this.log("Mode change action detected, handle accordingly.");
      }
    }
  }

  onDeleted() {
    this.log("4 Gang Wall Remote removed");
  }
}

module.exports = wall_remote_4_gang_2;
