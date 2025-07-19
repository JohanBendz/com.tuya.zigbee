'use strict';

const { ZigBeeDevice } = require("homey-zigbeedriver");

/**
 * Class TuyaSpecificClusterDevice - ENHANCED PRODUCTION
 * Updated with TS000x-inspired conservative retry logic
 * 
 * This class handles writing various data types to a Tuya-specific cluster.
 * It abstracts sending boolean, integer, string, enum, and raw data types to
 * the appropriate Tuya datapoints with optimized retry mechanism.
 * 
 * Version: 3.1.0 - Enhanced retry logic inspired by TS000x reliability
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
     * Sends a boolean value to the specified datapoint (dp) with enhanced retry logic.
     * Optimized for responsiveness - shorter delays to prevent double-click issues.
     *
     * @param {number} dp - The datapoint ID
     * @param {boolean} value - The boolean value to write (true/false)
     * @param {number} maxRetries - Number of retry attempts (default 2 - conservative like TS000x)
     * @param {number} baseDelay - Base delay for retries in ms (default 300ms - responsive)
     * @returns {Promise} - Resolves when the command is sent successfully or retries are exhausted
     */
    async writeBool(dp, value, maxRetries = 2, baseDelay = 300) {
        const data = Buffer.alloc(1);
        data.writeUInt8(value ? 0x01 : 0x00, 0);
        return this._sendTuyaDatapoint(dp, 1, 1, data, maxRetries, baseDelay);
    }

    /**
     * Sends a 32-bit integer value to the specified datapoint (dp) with enhanced retry logic.
     *
     * @param {number} dp - The datapoint ID
     * @param {number} value - The integer value to write
     * @param {number} maxRetries - Number of retry attempts (default 2)
     * @param {number} baseDelay - Base delay for retries in ms (default 300ms)
     * @returns {Promise} - Resolves when the command is sent successfully or retries are exhausted
     */
    async writeData32(dp, value, maxRetries = 2, baseDelay = 300) {
        const data = Buffer.alloc(4);
        data.writeUInt32BE(value, 0);
        return this._sendTuyaDatapoint(dp, 2, 4, data, maxRetries, baseDelay);
    }

    /**
     * Sends a string value to the specified datapoint (dp) with enhanced retry logic.
     *
     * @param {number} dp - The datapoint ID
     * @param {string} value - The string value to write
     * @param {number} maxRetries - Number of retry attempts (default 2)
     * @param {number} baseDelay - Base delay for retries in ms (default 300ms)
     * @returns {Promise} - Resolves when the command is sent successfully or retries are exhausted
     */
    async writeString(dp, value, maxRetries = 2, baseDelay = 300) {
        const stringValue = String(value);
        const data = Buffer.from(stringValue, 'latin1');
        return this._sendTuyaDatapoint(dp, 3, stringValue.length, data, maxRetries, baseDelay);
    }

    /**
     * Sends an enum value to the specified datapoint (dp) with enhanced retry logic.
     *
     * @param {number} dp - The datapoint ID
     * @param {number} value - The enum value to write (must be within the enum range)
     * @param {number} maxRetries - Number of retry attempts (default 2)
     * @param {number} baseDelay - Base delay for retries in ms (default 300ms)
     * @returns {Promise} - Resolves when the command is sent successfully or retries are exhausted
     */
    async writeEnum(dp, value, maxRetries = 2, baseDelay = 300) {
        const data = Buffer.alloc(1);
        data.writeUInt8(value, 0);
        return this._sendTuyaDatapoint(dp, 4, 1, data, maxRetries, baseDelay);
    }

    /**
     * Sends raw data to the specified datapoint (dp) with enhanced retry logic.
     *
     * @param {number} dp - The datapoint ID
     * @param {Buffer} data - The raw data buffer to write
     * @param {number} maxRetries - Number of retry attempts (default 2)
     * @param {number} baseDelay - Base delay for retries in ms (default 300ms)
     * @returns {Promise} - Resolves when the command is sent successfully or retries are exhausted
     */
    async writeRaw(dp, data, maxRetries = 2, baseDelay = 300) {
        return this._sendTuyaDatapoint(dp, 0, data.length, data, maxRetries, baseDelay);
    }

    /**
     * Internal helper to send Tuya datapoint commands with responsive retry logic.
     * Balanced approach: reliable retries without blocking UI responsiveness.
     * 
     * @param {number} dp - The datapoint ID.
     * @param {number} datatype - The Tuya datatype ID.
     * @param {number} length - The length of the data.
     * @param {Buffer} data - The data buffer.
     * @param {number} maxRetries - Number of retry attempts.
     * @param {number} baseDelay - Base delay for retries.
     * @returns {Promise} - Resolves on success, rejects on failure after retries.
     * @private
     */
    async _sendTuyaDatapoint(dp, datatype, length, data, maxRetries, baseDelay) {
        // Input validation
        if (dp < 0 || dp > 255) {
            throw new Error(`Invalid datapoint ID: ${dp}. Must be between 0 and 255.`);
        }

        if (!Buffer.isBuffer(data)) {
            throw new Error('Data must be a Buffer instance');
        }

        let lastError;
        
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                this.log(`Sending DP ${dp}, Datatype ${datatype}, Try ${attempt}/${maxRetries}`);
                
                // Check if Tuya cluster is available
                if (!this.zclNode || !this.zclNode.endpoints[1] || !this.zclNode.endpoints[1].clusters.tuya) {
                    throw new Error('Tuya cluster not available or device not properly initialized');
                }

                const response = await this.zclNode.endpoints[1].clusters.tuya.datapoint({
                    status: 0,
                    transid: this.transactionID++,
                    dp,
                    datatype,
                    length,
                    data
                });
                
                this.log(`DP ${dp} sent successfully.`);
                return response;
                
            } catch (err) {
                lastError = err;
                this.error(`Error sending DP ${dp} (attempt ${attempt}/${maxRetries}): ${err.message}`);
                
                if (attempt < maxRetries) {
                    // Responsive retry: 300ms, 600ms (fast enough to prevent double-click)
                    const waitTime = baseDelay * attempt;
                    this.debug(`Waiting ${waitTime}ms before retry ${attempt + 1}...`);
                    await new Promise(resolve => setTimeout(resolve, waitTime));
                }
            }
        }
        
        // All retries exhausted
        throw new Error(`Failed to send DP ${dp} after ${maxRetries} attempts: ${lastError.message}`);
    }

    /**
     * Enhanced debug logging with device context
     */
    debug(message, data = null) {
        if (this.debugEnabled) {
            const timestamp = new Date().toISOString();
            const deviceName = this.getName() || 'TuyaDevice';
            
            if (data) {
                console.log(`[${timestamp}] [${deviceName}] DEBUG: ${message}`, data);
            } else {
                console.log(`[${timestamp}] [${deviceName}] DEBUG: ${message}`);
            }
        }
    }

    /**
     * Check if device is ready for Tuya communication
     */
    isDeviceReady() {
        return !!(this.zclNode && 
                 this.zclNode.endpoints && 
                 this.zclNode.endpoints[1] && 
                 this.zclNode.endpoints[1].clusters && 
                 this.zclNode.endpoints[1].clusters.tuya);
    }

    /**
     * Wait for device to be ready with timeout
     */
    async waitForDeviceReady(timeout = 10000) {
        const startTime = Date.now();
        
        while (!this.isDeviceReady()) {
            if (Date.now() - startTime > timeout) {
                throw new Error('Device not ready within timeout period');
            }
            await new Promise(resolve => setTimeout(resolve, 100));
        }
    }

    /**
     * Enhanced onNodeInit with robust device readiness check
     */
    async onNodeInit(props) {
        await super.onNodeInit(props);
        
        // Wait for device to be ready
        try {
            await this.waitForDeviceReady();
            this.debug('Tuya device is ready for communication');
        } catch (error) {
            this.error('Device failed to become ready:', error);
            throw error;
        }
    }

    /**
     * Get device transaction statistics and retry configuration
     */
    getTransactionStats() {
        return {
            currentTransactionId: this._transactionID,
            deviceReady: this.isDeviceReady(),
            deviceName: this.getName() || 'Unknown',
            retryConfig: {
                maxRetries: 2,      // Conservative approach
                baseDelay: 300,     // Responsive delay (anti double-click)
                backoffType: 'linear' // Linear instead of exponential
            }
        };
    }

    /**
     * Reset transaction ID (useful for testing or recovery)
     */
    resetTransactionId() {
        this._transactionID = 0;
        this.debug('Transaction ID reset to 0');
    }

    /**
     * Bulk command sending with delay (useful for multiple DPs)
     * TS000x-inspired approach for multiple commands
     */
    async sendBulkCommands(commands, delayBetween = 100) {
        const results = [];
        
        for (let i = 0; i < commands.length; i++) {
            const cmd = commands[i];
            
            try {
                let result;
                switch (cmd.type) {
                    case 'bool':
                        result = await this.writeBool(cmd.dp, cmd.value);
                        break;
                    case 'enum':
                        result = await this.writeEnum(cmd.dp, cmd.value);
                        break;
                    case 'data32':
                        result = await this.writeData32(cmd.dp, cmd.value);
                        break;
                    case 'string':
                        result = await this.writeString(cmd.dp, cmd.value);
                        break;
                    case 'raw':
                        result = await this.writeRaw(cmd.dp, cmd.value);
                        break;
                    default:
                        throw new Error(`Unknown command type: ${cmd.type}`);
                }
                
                results.push({ success: true, dp: cmd.dp, result });
                
                // Delay between commands (except last one)
                if (i < commands.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, delayBetween));
                }
                
            } catch (error) {
                results.push({ success: false, dp: cmd.dp, error: error.message });
                this.error(`Bulk command failed for DP ${cmd.dp}:`, error);
            }
        }
        
        return results;
    }
}

module.exports = TuyaSpecificClusterDevice;