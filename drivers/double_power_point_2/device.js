'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const { CLUSTER, Cluster, ZCLDataTypes } = require('zigbee-clusters');

class doublepowerpoint2 extends ZigBeeDevice {

  async onNodeInit({ zclNode }) {

    this.printNode();
    console.log(zclNode.endpoints);

    const { subDeviceId } = this.getData();
    this.log('Device data: ', subDeviceId);

    // Determine endpoint based on subDeviceId
    const endpoint = subDeviceId === 'socketTwo' ? 2 : 1;
    this.log(`Registering capabilities for endpoint ${endpoint}`);

    if (endpoint === 1) {
      await zclNode.endpoints[1].clusters.basic.readAttributes('manufacturerName', 'zclVersion', 'appVersion', 'modelId', 'powerSource', 'attributeReportingStatus')
      .catch(err => {
        this.error('Error when reading device attributes ', err);
      });
    }

    try {
      // Register the onoff capability without polling initially
      this.registerCapability('onoff', CLUSTER.ON_OFF, { endpoint }, {
        getOpts: {
          getOnStart: true
        }
      });
    } catch (error) {
      this.error(`Error registering capabilities for endpoint ${endpoint}:`, error);
    }

    // Attempt to configure instant reporting for the onOff attribute
    try {
      await zclNode.endpoints[endpoint].clusters.onOff.configureReporting({
        attribute: 'onOff',
        minimumReportInterval: 1, // Minimum interval in seconds (instant reporting)
        maximumReportInterval: 600, // Maximum interval in seconds
        reportableChange: 1, // Report on any change
      });
      this.log('Configured instant reporting for onOff');
    } catch (error) {
      // If reporting fails, log the error and set up fallback polling
      this.error('Failed to configure onOff reporting, setting up fallback polling', error);
      
      // Directly set the fallback polling interval without re-registering the capability
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
