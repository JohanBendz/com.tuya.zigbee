'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const { Cluster, debug, CLUSTER } = require('zigbee-clusters');
const TuyaSpecificCluster = require('../../lib/TuyaSpecificCluster')

Cluster.addCluster(TuyaSpecificCluster);

class christmas_lights extends ZigBeeDevice {
    zclNode;

    async onNodeInit({ zclNode }) {
        this.zclNode = zclNode;
        
        debug(true);
        this.printNode();

        // Handler for on/off
        this.registerCapabilityListener('onoff', async (value) => {
            return this.writeBool(1, value);
        });

        // Handler for switching modes
        this.registerCapabilityListener('lidl_xmas_mode', async (mode) => {
            // Actually switch modes
            const valMap = {white: 0, color: 1, effect: 2};
            await this.writeEnum(2,valMap[mode]);
            // Then call methods to also set last chosen dim level or color
            switch (mode) {
                case 'color':
                    return this.setColor({});
                case 'white':
                    // Update light_saturation such that color in App is white
                    await this.setCapabilityValue('light_saturation',0);
                    return this.setWhiteDim({});
                case 'effect':
                    return this.writeString(6,'0e32ff0000fe7023ffc836d4ff421efe4312d3fc004ef9e80ff9');
            }
        });

        // Handler for dim
        this.registerCapabilityListener('dim', async (dim) => {
            // Check the current mode
            const mode = this.getCapabilityValue('lidl_xmas_mode');
            switch (mode) {
                case 'color': // In color mode set color again but with new dim level
                    return this.setColor({dim});
                case 'white': // In white mode simply directly set dim
                default:
                    return this.setWhiteDim({dim});
            }
        });

        // Handler for color
        this.registerMultipleCapabilityListener(['light_hue','light_saturation'],(values,options) => {
            // When choosing a color, actually switch to color mode
            this.setCapabilityValue('lidl_xmas_mode','color');
            // Then set the color based on newly selected value
            return this.setColor(values);
        },500);

    }

    async setColor({dim,light_hue,light_saturation}) {
        if (dim===undefined) dim = this.getCapabilityValue('dim');
        if (light_hue===undefined) light_hue = this.getCapabilityValue('light_hue');
        if (light_saturation===undefined) light_saturation = this.getCapabilityValue('light_saturation');
        return this.writeString(5,this.make4String(light_hue * 360) + this.make4String(light_saturation * 1000) + this.make4String(dim * 1000))
    }

    async setWhiteDim({dim}) {
        if (dim===undefined) dim = this.getCapabilityValue('dim');
        return this.writeData32(3,dim*1000);
    }

    effectMap = {
        steady: '00',
        snow: '01',
        rainbow: '02',
        snake: '03',
        twinkle: '04',
        firework: '08',
        horizontal_flag: '06',
        waves: '07',
        updown: '08',
        vintage: '09',
        fading: '0a',
        collide: '0b',
        strobe: '0c',
        sparkles: '0d',
        carnaval: '0e',
        glow: '0f'
    }

    async StartEffect(args) {
        // Switch to effect mode
        await this.writeEnum(2,2);
        this.setCapabilityValue('lidl_xmas_mode', 'effect');
        let es = this.effectMap[args.effect_name];
        const speed = String(args.effect_speed);
        if (speed.length == 1) es += '0';
        es += speed;
        for (let i=0;i<9;i++) {
            const color = args['effect_color_' + i];
            if (color === '#fff') break;
            es += color.substr(1).toLowerCase();
        }
        return this.writeString(6,es);
    }

    //region String Helper Functions
    make4String(v) {
        let s = Math.round(v).toString(16);
        if(s.length===4) return s;
        else if(s.length===3) return '0'+s;
        else if(s.length===2) return '00'+s;
        else if(s.length===1) return '000' + s;
        else return '0000';
    }
    //endregion

    //region Tuya Datapoint Functions
    _transactionID = 0;
    set transactionID(val) {
        this._transactionID = val % 256;
    }
    get transactionID() {
        return this._transactionID;
    }

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

    async writeEnum(dp, value) {
        const data = Buffer.alloc(1);
        data.writeUInt8(value, 0);
        return this.zclNode.endpoints[1].clusters.tuya.datapoint({
            status: 0,
            transid: this.transactionID++,
            dp,
            datatype: 4,
            length: 1,
            data
        });
    }

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

    async writeString(dp, value) {
        const data = Buffer.from(String(value),'latin1');
        return this.zclNode.endpoints[1].clusters.tuya.datapoint({
            status: 0,
            transid: this.transactionID++,
            dp,
            datatype: 3,
            length: value.length,
            data
        });
    }
    //endregion

    onDeleted(){
		this.log("Christmas Lights removed")
	}

}

module.exports = christmas_lights;