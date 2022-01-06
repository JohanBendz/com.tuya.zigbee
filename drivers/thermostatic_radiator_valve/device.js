'use strict';

const Homey = require('homey');
const { ZigBeeDevice } = require('homey-zigbeedriver');
const { Cluster, debug, CLUSTER } = require('zigbee-clusters');
const TuyaSpecificCluster = require('../../lib/TuyaSpecificCluster')

//debug(true);

Cluster.addCluster(TuyaSpecificCluster);

class thermostatic_radiator_valve extends ZigBeeDevice {

    async onNodeInit({zclNode}) {

        this.printNode();

        this.registerCapabilityListener("target_temperature", async (value) => {
                this.log("target_temperature: ", value);
                this.setCapabilityValue('target_temperature',value);
                await this.writeData32(103,value*10);
        });

        this.registerCapabilityListener("onoff", async (value) => {
          this.log("onoff: ", value);
          await this.writeBool(101,value);

          if (value) {
            const target_temperature = this.getCapabilityValue('target_temperature');
            this.log("target_temperature: ", target_temperature);
            await this.writeData32(103,target_temperature*10);
            }
        });

        const node = await this.homey.zigbee.getNode(this);
        node.handleFrame = (endpointId, clusterId, frame, meta) => {
            //this.log("endpointId:", endpointId,", clusterId:", clusterId,", frame:", frame, ", meta:", meta);
            //this.log("Frame JSON data:", frame.toJSON());

            if (clusterId === 61184 && frame[5] === 103) {
              this.log("Changed on the value to temperature:", frame[12]/10);
              if (this.getCapabilityValue('target_temperature') != frame[12]/10){
                this.log("Different:", frame[12]/10," vs", this.getCapabilityValue('target_temperature'));

                this.setCapabilityValue('target_temperature',frame[12]/10);
              }
            }

        };

    }

    //region Tuya Datapoint Functions
    _transactionID = 0;
    set transactionID(val) {
        this._transactionID = val % 256;
    }
    get transactionID() {
        return this._transactionID;
    }

    // int type value
    async writeData32 (dp, value) {
        const data = Buffer.alloc(4);
        data.writeUInt32BE(value,0);
        return this.zclNode.endpoints[1].clusters.tuya.datapoint({
            status: 0,
            transid: this.transactionID++,
            dp,
            datatype: 2,
            length: 4,
            data
        });
    }

    // Boolean
    async writeBool(dp, value) {
        const data = Buffer.alloc(1);
        data.writeUInt8(value ? 0x01 : 0x00,0);
        return this.zclNode.endpoints[1].clusters.tuya.datapoint({
            status: 0,
            transid: this.transactionID++,
            dp,
            datatype: 1,
            length: 1,
            data
        });
    }

    onDeleted(){
      this.log("Thermostatic Radiator Valve removed")
	   }
}

module.exports = thermostatic_radiator_valve;
