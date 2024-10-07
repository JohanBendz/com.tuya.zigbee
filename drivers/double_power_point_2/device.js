'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const { CLUSTER } = require('zigbee-clusters');

class doublepowerpoint2 extends ZigBeeDevice {

  async onNodeInit({ zclNode }) {

    this.printNode();

    const { subDeviceId } = this.getData();
    this.log('Device data: ', subDeviceId);

    // Determine endpoint based on subDeviceId
    const endpoint = subDeviceId === 'socketTwo' ? 2 : 1;

    // Register the onOff capability for the correct endpoint
    this.registerCapability('onoff', CLUSTER.ON_OFF, {
      endpoint: endpoint,
      getOpts: {
        getOnStart: true,   // Get current state on startup
        getOnOnline: true,  // Get current state when the device comes online
      }
    });

    if (!this.isSubDevice()) {
      try {
        // Read basic attributes for the first endpoint (main device)
        await zclNode.endpoints[1].clusters.basic.readAttributes(['manufacturerName', 'zclVersion', 'appVersion', 'modelId', 'powerSource', 'attributeReportingStatus']);
        this.log('Basic attributes read successfully');
      } catch (err) {
        this.error('Error when reading device attributes:', err);
      }
    }

    // Attempt to configure instant reporting for the onOff attribute
    try {
      await zclNode.endpoints[endpoint].clusters.onOff.configureReporting({
        attribute: 'onOff',
        minimumReportInterval: 1,
        maximumReportInterval: 600,
        reportableChange: 1,
      });
      this.log('Configured instant reporting for onOff');
    } catch (error) {
      // If reporting fails, log the error and set up fallback polling
      this.error('Failed to configure onOff reporting, setting up fallback polling', error);

      // Set fallback polling for the onOff capability
      this.setCapabilityOptions('onoff', {
        getOpts: {
          getOnStart: true,
          pollInterval: 60000, // Poll every 60 seconds as a fallback
        },
      });
    }

  }

  onDeleted() {
    this.log(`Double Power Point removed`);
  }

}

module.exports = doublepowerpoint2;
