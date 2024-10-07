"use strict";

const { ZigBeeDevice } = require("homey-zigbeedriver");

class smart_remote_1b extends ZigBeeDevice {
  async onNodeInit({ zclNode }) {
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

        // Parse the frame data to detect the type of click
        this.buttonCommandParser(frame);
      }
    };

    this._buttonPressedTriggerDevice = this.homey.flow
      .getDeviceTriggerCard("smart_remote_1_button")
      .registerRunListener(async (args, state) => {
        return args.action === state.action;
      });
  }

  buttonCommandParser(frame) {
    // Assuming frame[3] holds the click type: 0 for single click, 1 for double click
    let action;
    if (frame[3] === 0) {
      action = "oneClick";
    } else if (frame[3] === 1) {
      action = "twoClicks";
    } else {
      action = "unknown"; // Handle any unexpected values
      this.log("Unknown click action detected:", frame[3]);
    }

    return this._buttonPressedTriggerDevice
      .trigger(this, {}, { action })
      .then(() => this.log(`Triggered 1 button Smart Remote, action=${action}`))
      .catch((err) => this.error("Error triggering 1 button Smart Remote", err));
  }

  onDeleted() {
    this.log("1 button Smart Remote Controller has been removed");
  }
}

module.exports = smart_remote_1b;
