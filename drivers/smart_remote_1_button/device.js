"use strict";

const { ZigBeeDevice } = require("homey-zigbeedriver");

class smart_remote_1b extends ZigBeeDevice {
  async onNodeInit({ zclNode }) {
    var debounce = 0;
    this.printNode();

    const node = await this.homey.zigbee.getNode(this);
    node.handleFrame = (endpointId, clusterId, frame, meta) => {
      if (clusterId === 6) {
        this.log(
          "endpointId:",
          endpointId,
          ", clusterId:",
          clusterId,
          ", frame:",
          frame,
          ", meta:",
          meta
        );
        this.log("Frame JSON data:", frame.toJSON());
        debounce = debounce + 1;
        if (debounce === 1) {
          this.buttonCommandParser(frame);
        } else {
          debounce = 0;
        }
      }
    };

    this._buttonPressedTriggerDevice = this.homey.flow
      .getDeviceTriggerCard("smart_remote_1_button")
      .registerRunListener(async (args, state) => {
        return null, args.action === state.action;
      });
  }

  buttonCommandParser(frame) {
    var action = frame[3] === 0 ? "oneClick" : "twoClicks";
    return this._buttonPressedTriggerDevice
      .trigger(this, {}, { action: `${action}` })
      .then(() => this.log(`Triggered 1 button Smart Remote, action=${action}`))
      .catch((err) => this.error("Error triggering 1 button Smart Remote", err));
  }

  onDeleted() {
    this.log("1 button Smart Remote Controller has been removed");
  }
}

module.exports = smart_remote_1b;
