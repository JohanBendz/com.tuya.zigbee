'use strict';

const Homey = require('homey');
const { ZigBeeDevice } = require('homey-zigbeedriver');
const { debug, CLUSTER } = require('zigbee-clusters');

class smartplug extends ZigBeeDevice {
		
	async onNodeInit({zclNode}) {

		this.enableDebug();
		debug(true);
		this.printNode();

    if (this.hasCapability('onoff')) {
      this.registerCapability('onoff', CLUSTER.ON_OFF, {
        getOpts: {
          getOnStart: true,
        },
        endpointId: this.getClusterEndpoint(CLUSTER.ON_OFF),
        reportOpts: {
          configureAttributeReporting: {
            minInterval: 0,
            maxInterval: 36000,
            minChange: 1,
          },
        },
      });
    }

    if (this.hasCapability('measure_power')) {
      this.registerCapability('meter_power', CLUSTER.METERING, {
        getOpts: {
          getOnStart: true,
        },
        endpointId: this.getClusterEndpoint(CLUSTER.METERING),
      });
      await this.configureAttributeReporting([
        {
          endpointId: this.getClusterEndpoint(CLUSTER.METERING),
          cluster: CLUSTER.METERING,
          attributeName: 'instantaneousDemand',
          minInterval: 0,
          maxInterval: 600,
          minChange: 1,
        },
      ]);
    }

    if (this.hasCapability('meter_power')) {
      this.registerCapability('meter_power', CLUSTER.METERING, {
        getOpts: {
          getOnStart: true,
        },
        endpointId: this.getClusterEndpoint(CLUSTER.METERING),
      });
      await this.configureAttributeReporting([
        {
          endpointId: this.getClusterEndpoint(CLUSTER.METERING),
          cluster: CLUSTER.METERING,
          attributeName: 'currentSummationDelivered',
          minInterval: 0,
          maxInterval: 600,
          minChange: 1,
        },
      ]);
    }

  }

	onDeleted(){
		this.log("Smart Plug removed")
	}

}

module.exports = smartplug;