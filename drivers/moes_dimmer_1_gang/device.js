'use strict';

const Homey = require('homey');
const { ZigBeeDevice } = require('homey-zigbeedriver');
const { Cluster, debug, CLUSTER } = require('zigbee-clusters');
const TuyaSpecificCluster = require('../../lib/TuyaSpecificCluster')

debug(true);

Cluster.addCluster(TuyaSpecificCluster);

class moes_dimmer_1_gang extends ZigBeeDevice {

    async onNodeInit({zclNode}) {

        this.printNode();

        this.registerCapabilityListener("onoff", async (value) => {
          this.log("onoff: ", value);
          await this.writeBool(1,value);
        });

        this.registerCapabilityListener("dim", async (value) => {
          this.log("dim: ", value*1000);
          await this.writeData32(2,value*1000);
        });
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
		this.log("Moes 1 Gang Dimmer removed")
	}

}

module.exports = moes_dimmer_1_gang;
