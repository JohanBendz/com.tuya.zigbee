'use strict';

/**
 * TuyaSpecificCluster - CORRIGIDO
 * 
 * This class defines the Tuya-specific Zigbee cluster and its associated commands.
 * It includes the following commands: `datapoint`, `reporting`, `response`, 
 * and `reportingConfiguration`. These commands facilitate communication between
 * Zigbee devices using the Tuya protocol.
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
        id: 0, // Command ID
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
        try {
            this.emit('reporting', response);
        } catch (error) {
            console.error('Error handling reporting event:', error);
        }
    }

    /**
     * Method called when a response command is received.
     * Emits a `response` event with the response data.
     * 
     * @param {Object} response - The response data from the device
     */
    onResponse(response) {
        try {
            this.emit('response', response);
        } catch (error) {
            console.error('Error handling response event:', error);
        }
    }

    /**
     * Method called when a reporting configuration command is received.
     * Emits a `reportingConfiguration` event with the response data.
     * 
     * @param {Object} response - The response data from the device
     */
    onReportingConfiguration(response) {
        try {
            this.emit('reportingConfiguration', response);
        } catch (error) {
            console.error('Error handling reporting configuration event:', error);
        }
    }

    /**
     * CORRIGIDO: Método para lidar com datapoints recebidos
     * Este método é chamado quando um datapoint é recebido do dispositivo
     * 
     * @param {Object} response - Os dados do datapoint recebido
     */
    onDatapoint(response) {
        try {
            this.emit('datapoint', response);
        } catch (error) {
            console.error('Error handling datapoint event:', error);
        }
    }

    /**
     * CORRIGIDO: Override do método bind para registrar handlers adequadamente
     */
    bind() {
        super.bind();
        
        // Registrar handlers para comandos Tuya
        this.on('command', (command) => {
            switch (command.id) {
                case 0x01: // reporting
                    this.onReporting(command);
                    break;
                case 0x02: // response  
                    this.onResponse(command);
                    break;
                case 0x06: // reportingConfiguration
                    this.onReportingConfiguration(command);
                    break;
                case 0x00: // datapoint
                    this.onDatapoint(command);
                    break;
                default:
                    console.warn(`Unknown Tuya command received: ${command.id}`);
            }
        });
    }
}

module.exports = TuyaSpecificCluster;