"use strict";

const { ZigBeeDevice } = require("homey-zigbeedriver");
const { CLUSTER } = require('zigbee-clusters');

class smart_remote_1b extends ZigBeeDevice {
  async onNodeInit({ zclNode }) {
    this.printNode();

    // Bind the OnOff cluster for handling button events
    await zclNode.endpoints[1].clusters[CLUSTER.ON_OFF].bind();

    // Handle the frame for button events
    zclNode.handleFrame = (endpointId, clusterId, frame, meta) => {
        if (clusterId === 6) { // OnOff cluster
            this.log("endpointId:", endpointId, ", clusterId:", clusterId, ", frame:", frame, ", meta:", meta);
            this.buttonCommandParser(frame);
        }
    };

    await this.configureAttributeReporting([
      {
          endpointId: 1,
          cluster: CLUSTER.POWER_CONFIGURATION,
          attributeName: 'batteryPercentageRemaining',
          minInterval: 60, // Minimum interval (1 minute)
          maxInterval: 21600, // Maximum interval (6 hours)
          minChange: 1, // Report changes greater than 1%
      }
    ]);

    zclNode.endpoints[1].clusters[CLUSTER.POWER_CONFIGURATION].on('report', (report) => {
      if (report.batteryPercentageRemaining !== undefined) {
        const batteryPercentage = report.batteryPercentageRemaining / 2; // Convert to percentage
        this.log('Battery percentage received:', batteryPercentage);

        this.setCapabilityValue('measure_battery', batteryPercentage).catch((err) => {
          this.error('Failed to update battery level', err);
        });
      }
    });

  };

  buttonCommandParser(frame) {
    let action;

  if ((frame[0] === 0xfd || frame[0] === 253) && frame[1] === 0) {
        action = "oneClick"; // Short release
    } else if ((frame[0] === 0xfd || frame[0] === 253) && frame[1] === 1) {
        action = "twoClicks"; // Double press
    } else {
        action = "unknown";
        this.log("Unknown click action detected:", frame[1]);
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
