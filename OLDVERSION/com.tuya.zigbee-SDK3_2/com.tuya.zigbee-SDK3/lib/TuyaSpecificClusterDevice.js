'use strict';

const { ZigBeeDevice } = require("homey-zigbeedriver");

/**
 * Class TuyaSpecificClusterDevice
 * 
 * This class handles writing various data types to a Tuya-specific cluster.
 * It abstracts sending boolean, integer, string, enum, and raw data types to
 * the appropriate Tuya datapoints.
 * 
 * Usage: Extend this class in your ZigBee device driver, and call the appropriate
 * write function (writeBool, writeData32, writeString, writeEnum, writeRaw) based
 * on the type of data you want to send.
 */
class TuyaSpecificClusterDevice extends ZigBeeDevice {

    // Transaction ID Management
    // Tuya requires a transaction ID to be incremented with each command. 
    // This is managed internally within this class.
    _transactionID = 0;
    
    set transactionID(val) {
        this._transactionID = val % 256;  // Ensure transaction ID stays within the range
    }

    get transactionID() {
        return this._transactionID;
    }

    /**
     * Sends a boolean value to the specified datapoint (dp).
     * 
     * @param {number} dp - The datapoint ID
     * @param {boolean} value - The boolean value to write (true/false)
     * @returns {Promise} - Resolves when the command is sent
     */
    async writeBool(dp, value) {
        const data = Buffer.alloc(1);
        data.writeUInt8(value ? 0x01 : 0x00, 0);
        try {
            return await this.zclNode.endpoints[1].clusters.tuya.datapoint({
                status: 0,
                transid: this.transactionID++,
                dp,
                datatype: 1,  // Boolean datatype
                length: 1,
                data
            });
        } catch (err) {
            this.error(`Error writing boolean to dp ${dp}:`, err);
        }
    }

    /**
     * Sends a 32-bit integer value to the specified datapoint (dp).
     * 
     * @param {number} dp - The datapoint ID
     * @param {number} value - The integer value to write
     * @returns {Promise} - Resolves when the command is sent
     */
    async writeData32(dp, value) {
        const data = Buffer.alloc(4);
        data.writeUInt32BE(value, 0);
        try {
            return await this.zclNode.endpoints[1].clusters.tuya.datapoint({
                status: 0,
                transid: this.transactionID++,
                dp,
                datatype: 2,  // 32-bit integer datatype
                length: 4,
                data
            });
        } catch (err) {
            this.error(`Error writing data32 to dp ${dp}:`, err);
        }
    }

    /**
     * Sends a string value to the specified datapoint (dp).
     * 
     * @param {number} dp - The datapoint ID
     * @param {string} value - The string value to write
     * @returns {Promise} - Resolves when the command is sent
     */
    async writeString(dp, value) {
        const data = Buffer.from(String(value), 'latin1');
        try {
            return await this.zclNode.endpoints[1].clusters.tuya.datapoint({
                status: 0,
                transid: this.transactionID++,
                dp,
                datatype: 3,  // String datatype
                length: value.length,
                data
            });
        } catch (err) {
            this.error(`Error writing string to dp ${dp}:`, err);
        }
    }

    /**
     * Sends an enum value to the specified datapoint (dp).
     * 
     * @param {number} dp - The datapoint ID
     * @param {number} value - The enum value to write (must be within the enum range)
     * @returns {Promise} - Resolves when the command is sent
     */
    async writeEnum(dp, value) {
        const data = Buffer.alloc(1);
        data.writeUInt8(value, 0);
        try {
            return await this.zclNode.endpoints[1].clusters.tuya.datapoint({
                status: 0,
                transid: this.transactionID++,
                dp,
                datatype: 4,  // Enum datatype
                length: 1,
                data
            });
        } catch (err) {
            this.error(`Error writing enum to dp ${dp}:`, err);
        }
    }

    /**
     * Sends raw data to the specified datapoint (dp).
     * 
     * @param {number} dp - The datapoint ID
     * @param {Buffer} data - The raw data buffer to write
     * @returns {Promise} - Resolves when the command is sent
     */
    async writeRaw(dp, data) {
        try {
            return await this.zclNode.endpoints[1].clusters.tuya.datapoint({
                status: 0,
                transid: this.transactionID++,
                dp,
                datatype: 0,  // Raw datatype
                length: data.length,
                data
            });
        } catch (err) {
            this.error(`Error writing raw data to dp ${dp}:`, err);
        }
    }
}

module.exports = TuyaSpecificClusterDevice;
