'use strict';

/**
 * TuyaSpecificCluster
 * 
 * This class defines the Tuya-specific Zigbee cluster and its associated commands.
 * It includes the following commands: `datapoint`, `reporting`, `response`, 
 * and `reportingConfiguration`. These commands facilitate communication between
 * Zigbee devices using the Tuya protocol.
 * 
 * Usage:
 * This class is used as part of the Zigbee driver for devices that support the 
 * Tuya Zigbee protocol. The commands can be extended or customized based on 
 * the device's needs.
 * 
 * Make sure to register this cluster using `Cluster.addCluster(TuyaSpecificCluster)` 
 * in your driver file.
 */

const { Cluster, ZCLDataTypes } = require('zigbee-clusters');

// Attributes definition (currently empty, can be extended as needed)
const ATTRIBUTES = {};

// Commands definition for Tuya-specific communication
const COMMANDS = {
    /**
     * Command to send a datapoint to a Tuya Zigbee device.
     *
     * This command is used for sending specific data points (dp) to the device.
     * The dp defines the action/message of a command frame.
     */
    datapoint: {
        id: 0x00, // Command ID
        args: {
            status: ZCLDataTypes.uint8,    // Status byte
            transid: ZCLDataTypes.uint8,   // Transaction ID
            dp: ZCLDataTypes.uint8,        // Datapoint ID
            datatype: ZCLDataTypes.uint8,  // Datatype ID (boolean, enum, etc.)
            length: ZCLDataTypes.data16,   // Length of data
            data: ZCLDataTypes.buffer      // Data payload
        }
    },

    /**
     * Command for time sync request/response.
     *
     * Device sends this command to request time sync.
     * Host responds with the same command containing UTC and local timestamps.
     * Request payload: sequence number (2 bytes)
     * Response payload: sequence number (2 bytes) + UTC time (4 bytes) + Local time (4 bytes)
     */
    mcuSyncTime: {
        id: 0x24, // Command ID for time sync
        args: {
            data: ZCLDataTypes.buffer  // Raw data buffer
        }
    },
    
    /**
     * Command to report a datapoint change from the device.
     * 
     * This command is triggered when the device reports a change in one of its
     * datapoints, allowing the application to update its state.
     */
    reporting: {
        id: 0x01, // Command ID
        args: {
            status: ZCLDataTypes.uint8,    // Status byte
            transid: ZCLDataTypes.uint8,   // Transaction ID
            dp: ZCLDataTypes.uint8,        // Datapoint ID
            datatype: ZCLDataTypes.uint8,  // Datatype ID
            length: ZCLDataTypes.data16,   // Length of data
            data: ZCLDataTypes.buffer      // Data payload
        }
    },
    
    /**
     * Command for device responses.
     * 
     * This command handles the response from a Tuya Zigbee device. The response 
     * includes information about the status, datapoint, and any data sent back 
     * by the device.
     */
    response: {
        id: 0x02, // Command ID
        args: {
            status: ZCLDataTypes.uint8,    // Status byte
            transid: ZCLDataTypes.uint8,   // Transaction ID
            dp: ZCLDataTypes.uint8,        // Datapoint ID
            datatype: ZCLDataTypes.uint8,  // Datatype ID
            length: ZCLDataTypes.data16,   // Length of data
            data: ZCLDataTypes.buffer      // Data payload
        }
    },
    
    /**
     * Command for reporting configuration.
     * 
     * This command allows the configuration of reporting for the Tuya device, 
     * setting up how and when the device should report its state or data.
     */
    reportingConfiguration: {
        id: 0x06, // Command ID
        args: {
            status: ZCLDataTypes.uint8,    // Status byte
            transid: ZCLDataTypes.uint8,   // Transaction ID
            dp: ZCLDataTypes.uint8,        // Datapoint ID
            datatype: ZCLDataTypes.uint8,  // Datatype ID
            length: ZCLDataTypes.data16,   // Length of data
            data: ZCLDataTypes.buffer      // Data payload
        }
    },
};

/**
 * TuyaSpecificCluster Class
 * 
 * This class extends the base Cluster class from the zigbee-clusters library and 
 * defines custom behavior for the Tuya Zigbee protocol.
 * 
 * Methods:
 * - onReporting(response): Emits a `reporting` event when a reporting command is received.
 * - onResponse(response): Emits a `response` event when a response command is received.
 * - onReportingConfiguration(response): Emits a `reportingConfiguration` event when a 
 *    reporting configuration command is received.
 */
class TuyaSpecificCluster extends Cluster {
    
    // Static properties defining the cluster's ID and name
    static get ID() {
        return 61184;  // Tuya-specific cluster ID
    }

    static get NAME() {
        return 'tuya';  // Cluster name
    }

    static get ATTRIBUTES() {
        return ATTRIBUTES;  // Attributes defined (currently empty)
    }

    static get COMMANDS() {
        return COMMANDS;  // Commands defined for the cluster
    }

    /**
     * Method called when a reporting command is received.
     * Emits a `reporting` event with the response data.
     * 
     * @param {Object} response - The response data from the device
     */
    onReporting(response) {
        this.emit('reporting', response);
    }

    /**
     * Method called when a response command is received.
     * Emits a `response` event with the response data.
     * 
     * @param {Object} response - The response data from the device
     */
    onResponse(response) {
        this.emit('response', response);
    }

    /**
     * Method called when a reporting configuration command is received.
     * Emits a `reportingConfiguration` event with the response data.
     *
     * @param {Object} response - The response data from the device
     */
    onReportingConfiguration(response) {
        this.emit('reportingConfiguration', response);
    }

    /**
     * Method called when a time sync request (command 0x24) is received from the device.
     * Emits a 'mcuSyncTime' event that device classes can listen to for handling time sync
     * with proper timezone support via this.homey.clock.getTimezone().
     *
     * @param {Object} response - The time sync request data from the device
     */
    onMcuSyncTime(response) {
        this.emit('mcuSyncTime', response);
    }

    /**
     * Send a time sync response to the device.
     * This method should be called from device classes that have access to the Homey timezone.
     *
     * @param {number} seqNum - The sequence number from the request
     * @param {number} localTime - Local timestamp in seconds (used for display on device)
     * @returns {Promise} - Promise that resolves when the response is sent
     */
    sendTimeSyncResponse(seqNum, localTime) {
        const responseData = Buffer.alloc(10);
        responseData.writeUInt16BE(seqNum, 0);
        responseData.writeUInt32BE(localTime, 2);  // Send local time as "UTC" for display
        responseData.writeUInt32BE(localTime, 6);

        return this.mcuSyncTime({ data: responseData });
    }
}

// Register the TuyaSpecificCluster with the zigbee-clusters library
Cluster.addCluster(TuyaSpecificCluster);

module.exports = TuyaSpecificCluster;
