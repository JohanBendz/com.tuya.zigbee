'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const { CLUSTER } = require('zigbee-clusters');
const OnOffBoundCluster = require('../../lib/OnOffBoundCluster');

class test_device_wall_remote_3_gang extends ZigBeeDevice {

    async onNodeInit({zclNode}) {

        this.enableDebug();
        this.printNode();

        const node = await this.homey.zigbee.getNode(this);
        node.handleFrame = (endpointId, clusterId, frame, meta) => {
          this.log("frame data! endpointId:", endpointId,", clusterId:", clusterId,", frame:", frame, ", meta:", meta);
        };

        zclNode.endpoints[1].bind(CLUSTER.ON_OFF.NAME, new OnOffBoundCluster({
            onSetOn: this.log("Left button pressed On"),
            onSetOff: this.log("Left button pressed Off"),
            offWithEffect: this.log("Left button pressed Off with effect")
        }));

        zclNode.endpoints[2].bind(CLUSTER.ON_OFF.NAME, new OnOffBoundCluster({
            onSetOn: this.log("Middle button pressed On"),
            onSetOff: this.log("Middle button pressed Off"),
            offWithEffect: this.log("Middle button pressed Off with effect")
        }));

        zclNode.endpoints[3].bind(CLUSTER.ON_OFF.NAME, new OnOffBoundCluster({
            onSetOn: this.log("Right button pressed On"),
            onSetOff: this.log("Right button pressed Off"),
            offWithEffect: this.log("Right button pressed Off with effect")
        }));

        // alarm_battery
        if (this.hasCapability('alarm_battery')) {				
            this.batteryThreshold = 20;
                    this.registerCapability('alarm_battery', CLUSTER.POWER_CONFIGURATION, {
                        getOpts: {
                        getOnStart: true,
                        },
                        endpoints: 2,
                        reportOpts: {
                            configureAttributeReporting: {
                                minInterval: 0, // No minimum reporting interval
                                maxInterval: 60000, // Maximally every ~16 hours
                                minChange: 10, // Report when value changed by 10
                            },
                        },
            });
        }


    }

    onDeleted(){
		this.log("Test Device - 3 Gang Wall Remote removed")
	}

}

module.exports = test_device_wall_remote_3_gang;