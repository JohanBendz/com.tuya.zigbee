'use strict';

const Homey = require('homey');
const { ZigBeeDevice } = require('homey-zigbeedriver');
const { debug, CLUSTER, Cluster } = require('zigbee-clusters');
const TuyaPowerOnStateCluster = require('../../lib/TuyapowerOnState');

Cluster.addCluster(TuyaPowerOnStateCluster);

class valvecontroller extends ZigBeeDevice {

    async onNodeInit({zclNode}) {

        this.printNode();

        this.registerCapability('onoff', CLUSTER.ON_OFF);

        await zclNode.endpoints[1].clusters.basic.readAttributes('manufacturerName', 'zclVersion', 'appVersion', 'modelId', 'powerSource', 'attributeReportingStatus')
        .catch(err => {
            this.error('Error when reading device attributes ', err);
        });

    }

    async onSettings(oldSettings, newSettings, changedKeysArr) {
        if (changedKeysArr.includes('powerOnState')) {
          const value = newSettings.powerOnState; // get the updated value
      
          // Convert value to its corresponding enum value
          let powerOnStateValue;
          switch(value) {
            case 'off':
              powerOnStateValue = 0;
              break;
            case 'on':
              powerOnStateValue = 1;
              break;
            case 'recover':
              powerOnStateValue = 2;
              break;
            default:
              throw new Error('Invalid Power On State value');
          }
      
          // Update the device's attribute
          await this.setPowerOnState(powerOnStateValue);
        }
    }

    async setPowerOnState(value) {
        try {
            await this.zclNode.endpoints[1].clusters.TuyaPowerOnStateCluster.writeAttributes({ powerOnstate: value });
            this.log(`Set Power On State to: ${value}`);
        } catch (error) {
            this.error(`Error setting Power On State: ${error}`);
        }
    }    

    onDeleted(){
		this.log("Valve Controller removed")
	}

}

module.exports = valvecontroller;