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

// Tuya DataPoint Arguments
const TUYA_DP_ARGS = {
  status: ZCLDataTypes.uint8,
  transid: ZCLDataTypes.uint8,
  dp: ZCLDataTypes.uint8,
  datatype: ZCLDataTypes.uint8,
  length: ZCLDataTypes.data16,
  data: ZCLDataTypes.buffer,
};

// Commands definition for Tuya-specific communication | Gateway → Device
const COMMANDS = {
    /**
     * Command to send a datapoint to a Tuya Zigbee device.
     * 
     * This command is used for sending specific data points (dp) to the device. 
     * The dp defines the action/message of a command frame.
     */
    datapoint: {
        id: 0x00, // Command ID
        args: TUYA_DP_ARGS
    },
    
    /**
     * Command to report a datapoint change from the device | Device → Gateway (proactive)
     * 
     * This command is triggered when the device reports a change in one of its
     * datapoints, allowing the application to update its state.
     */
    reporting: {
        id: 0x01, // Command ID
        args: TUYA_DP_ARGS
    },
    
    /**
     * Command for device responses | Device → Gateway
     * 
     * This command handles the response from a Tuya Zigbee device. The response 
     * includes information about the status, datapoint, and any data sent back 
     * by the device.
     */
    response: {
        id: 0x02, // Command ID
        args: TUYA_DP_ARGS
    },

    // Query all current state
    dataQuery: {
        id: 0x03,
        args: {},
    },

    /**
     * Command for reporting.
     * 
     * This command allows reporting for the Tuya device
     */
    dataReport: {
        id: 0x05,
        args: TUYA_DP_ARGS,
    },

    /**
     * Command for reporting configuration.
     * 
     * This command allows the configuration of reporting for the Tuya device, 
     * setting up how and when the device should report its state or data.
     */
    reportingConfiguration: {
        id: 0x06, // Command ID
        args: TUYA_DP_ARGS
    },

    mcuVersionRequest: {
		id: 0x10,
		args: {
			payload: ZCLDataTypes.buffer,
		},
	},

	mcuVersionResponse: {
		id: 0x11,
		args: {
			payload: ZCLDataTypes.buffer,
		},
	},

    // Time sync request/response
    timeSync: {
        id: 0x24,
        args: {
            payload: ZCLDataTypes.buffer,
        },
	}
    
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

    onDataReport(response) {
        this.emit('reporting', response);
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

    onMcuVersionRequest(payload) {
		this.emit('mcuVersionRequest', payload);
	}

	onMcuVersionResponse(payload) {
		this.emit('mcuVersionResponse', payload);
	}

    onTimeSync(response) {
		this.emit('timeSync', response);
	}
}

// Register the TuyaSpecificCluster with the zigbee-clusters library
Cluster.addCluster(TuyaSpecificCluster);

module.exports = TuyaSpecificCluster;
