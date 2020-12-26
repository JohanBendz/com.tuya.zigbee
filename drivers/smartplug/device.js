'use strict';

const Homey = require('homey');
const { ZigBeeDevice } = require('homey-zigbeedriver');
const { debug, CLUSTER } = require('zigbee-clusters');

class smartplug extends ZigBeeDevice {
		
	async onNodeInit({zclNode}) {

		this.enableDebug();
		debug(true);
		this.printNode();

    this.registerCapability('onoff', CLUSTER.ON_OFF, {
      get: 'onOff',
      getOpts: {
        getOnStart: true,
      },
      endpoint: this.getClusterEndpoint(CLUSTER.ON_OFF),
      report: 'onOff',
      reportOpts: {
        configureAttributeReporting: {
          minInterval: 0,
          maxInterval: 300,
          minChange: 1,
        },
      },
    });

    this.registerCapability('meter_power', CLUSTER.METERING, {
      get: 'currentSummationDelivered',
      getOpts: {
        getOnStart: true,
      },
      endpoint: this.getClusterEndpoint(CLUSTER.METERING),
      report: 'currentSummationDelivered',
      reportOpts: {
        configureAttributeReporting: {
          minInterval: 0,
          maxInterval: 600,
          minChange: 1,
        },
      },
    });

    this.registerCapability('measure_power', CLUSTER.METERING, {
      get: 'instantaneousDemand',
      getOpts: {
        getOnStart: true,
      },
      endpoint: this.getClusterEndpoint(CLUSTER.METERING),
      report: 'instantaneousDemand',
      reportOpts: {
        configureAttributeReporting: {
          minInterval: 0,
          maxInterval: 600,
          minChange: 1,
        },
      },
    });

/*     if (this.isFirstInit()){
      await this.configureAttributeReporting([
        {
          endpointId: this.getClusterEndpoint(CLUSTER.METERING),
          cluster: CLUSTER.METERING,
          attributeName: 'instantaneousDemand',
          minInterval: 0,
          maxInterval: 600,
          minChange: 1,
        },
        {
          endpointId: this.getClusterEndpoint(CLUSTER.METERING),
          cluster: CLUSTER.METERING,
          attributeName: 'currentSummationDelivered',
          minInterval: 0,
          maxInterval: 600,
          minChange: 1,
        },
      ]);
    } */
    
  }

	onDeleted(){
		this.log("Smart Plug removed")
	}

}

module.exports = smartplug;

