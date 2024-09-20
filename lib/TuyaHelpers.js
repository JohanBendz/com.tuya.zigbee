'use strict';
/**
 * Tuya Helpers
 *
 * This file provides a set of utility functions to handle common operations 
 * for Tuya Zigbee devices in a Homey driver. It is designed to streamline the 
 * process of parsing data points (DPs), working with schedules, and handling 
 * raw device data.
 *
 * How to use these helpers in your driver:
 * 
 * 1. **Import the Helper Functions**:
 *    Import the necessary functions from this file into your `device.js` or driver file:
 *    const { getDataValue, parseSchedule, marshalSchedule } = require('../../lib/TuyaHelpers');
 * 
 * 2. **Using `getDataValue`**:
 *    This function decodes and converts Tuya DP values based on their datatype.
 *    It simplifies handling the incoming data from the device.

 *    Example usage:
 *    const value = getDataValue(dpValue);
 *    - `dpValue` is the data point received from the device.
 *    - The function automatically determines the type and converts the value.
 *
 * 3. **Using `marshalSchedule`**:
 *    Use this function to convert a human-readable schedule string into a buffer
 *    that can be sent to Tuya devices. 
 *    
 *    Example usage:
 *    const scheduleBuffer = marshalSchedule(workingDay, weekDayDataPoint, '07:00/21 12:00/18');
 *    - `workingDay` indicates the schedule type (0 for Mon-Sun, 1 for Mon-Fri, etc.).
 *    - `weekDayDataPoint` is the data point ID for the schedule day.
 *    - The schedule string is in the format `HH:MM/Temperature`.
 * 
 * 4. **Using `parseSchedule`**:
 *    This function takes the binary format schedule (received from a device) and converts it 
 *    into a readable string format showing the time and temperature values.
 *    
 *    Example usage:
 *    const scheduleString = parseSchedule(receivedScheduleBytes);
 *    - `receivedScheduleBytes` is the buffer containing the schedule data.
 *    - The output will be a string in the format: '07:00/21 12:00/18'.
 * 
 * 5. **Using `convertMultiByteNumberPayloadToSingleDecimalNumber`**:
 *    This function converts a multi-byte number received as raw data into a single decimal value.
 *    It is particularly useful for Tuya datapoints that send values over multiple bytes, such as 
 *    sensor readings or large numerical data points.
 * 
 *    Example usage:
 *    const decimalValue = convertMultiByteNumberPayloadToSingleDecimalNumber(dataChunks);
 *    - `dataChunks` is the array of raw data bytes received from the device.
 *    - The function processes the array and returns a single decimal number.
 * 
 * These utility functions help standardize how drivers handle Tuya-specific data points and 
 * schedules, allowing for cleaner and more maintainable code.
 */


/**
 * Converts a multi-byte number payload into a single decimal number.
 * This is required for handling Tuya datapoints that send multiple-byte values.
 * 
 * @param {Array} chunks - The raw data bytes received from the Tuya device.
 * @returns {Number} - The resulting decimal number.
 */
const convertMultiByteNumberPayloadToSingleDecimalNumber = (chunks) => {
    let value = 0;
    for (let i = 0; i < chunks.length; i++) {
        value = value << 8;
        value += chunks[i];
    }
    return value;
};

/**
 * Processes and returns the value of a Tuya datapoint (DP).
 * This function handles various data types like raw, boolean, value, string, enum, and bitmap.
 * 
 * @param {Object} dpValue - The datapoint value object received from the Tuya device.
 * @returns {Number|String|Boolean|Array} - The processed datapoint value based on its data type.
 */
const getDataValue = (dpValue) => {
    switch (dpValue.datatype) {
        case TUYA_DATA_TYPES.raw:
            return dpValue.data;
        case TUYA_DATA_TYPES.bool:
            return dpValue.data[0] === 1;
        case TUYA_DATA_TYPES.value:
            return convertMultiByteNumberPayloadToSingleDecimalNumber(dpValue.data);
        case TUYA_DATA_TYPES.string:
            return String.fromCharCode(...dpValue.data);
        case TUYA_DATA_TYPES.enum:
            return dpValue.data[0];
        case TUYA_DATA_TYPES.bitmap:
            return convertMultiByteNumberPayloadToSingleDecimalNumber(dpValue.data);
        default:
            throw new Error(`Unsupported datatype: ${dpValue.datatype}`);
    }
};

/**
 * TUYA_DATA_TYPES defines the possible data types a Tuya datapoint (DP) can use.
 * This is used to interpret the received data from Tuya devices and process it accordingly.
 */
const TUYA_DATA_TYPES = {
    raw: 0,    // [ bytes ]: Raw data, used for manufacturer-specific or custom data.
    bool: 1,   // [0/1]: Boolean values for on/off, true/false states.
    value: 2,  // [ 4 byte value ]: Numeric values (e.g., temperature, humidity).
    string: 3, // [ N byte string ]: Textual data (e.g., device names, error messages).
    enum: 4,   // [ 0-255 ]: Enumerated values, typically used for mode or state selection.
    bitmap: 5  // [ 1,2,4 bytes ]: Bitfields representing multiple boolean values in a single number.
};

/**
 * Data point mapping for each weekday. Each day is represented by a unique bitmask.
 * This is primarily used in Tuya scheduling systems for thermostats or similar devices.
 */
const dataPointTodayByte = {
    108: 1,  // Monday
    112: 2,  // Tuesday
    109: 4,  // Wednesday
    113: 8,  // Thursday
    110: 16, // Friday
    114: 32, // Saturday
    111: 64  // Sunday
};

/**
 * Parses a schedule byte array into a human-readable format.
 * This is useful for devices that use schedules, like thermostats, 
 * where each time period in the day is represented by a 3-byte segment.
 * 
 * @param {Array} bytes - The byte array containing the schedule data.
 * @returns {String} - A string representation of the schedule (e.g., '08:30/22.5 12:00/18').
 */
const parseSchedule = (bytes) => {
    const maxPeriodsInDay = 10;  // The maximum number of periods a Tuya device can handle.
    const periodSize = 3;        // Each period consists of 3 bytes (time and temperature).
    const schedule = [];

    for (let i = 0; i < maxPeriodsInDay; i++) {
        const time = bytes[i * periodSize];
        const totalMinutes = time * 10;
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;
        const temperature = (bytes[i * periodSize + 1] << 8 | bytes[i * periodSize + 2]) / 10;
        
        // Format the time as HH:MM and pair it with the temperature.
        schedule.push(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}/${temperature}`);
        
        // Stop if the period covers 24 hours.
        if (hours === 24) break;
    }

    return schedule.join(' ');
};

/**
 * Marshals a schedule into a byte array that can be sent to a Tuya device.
 * This function converts a human-readable schedule into the format required by the device.
 * 
 * @param {String} workingDay - The working day mode (0 = Mon-Sun, 1 = Mon-Fri/Sat-Sun, 2 = Separate).
 * @param {Number} weekDayDataPoint - The day of the week (from dataPointTodayByte).
 * @param {String} scheduleString - The human-readable schedule (e.g., '08:30/22.5 12:00/18').
 * @returns {Buffer} - The marshaled schedule ready to be sent to the device.
 */
const marshalSchedule = (workingDay, weekDayDataPoint, scheduleString) => {
    const payload = [];
    const schedule = scheduleString.split(' ');
    
    if (schedule.length < 2 || schedule.length > 10) {
        throw new Error('Invalid schedule: it must have between 2 and 10 periods.');
    }

    switch (workingDay) {
        case "0": // Mon-Sun
            payload.push(127);
            break;
        case "1": // Mon-Fri, Sat+Sun
            payload.push([114, 111].indexOf(weekDayDataPoint) === -1 ? 31 : dataPointTodayByte[weekDayDataPoint]);
            break;
        case "2": // Separate
            payload.push(dataPointTodayByte[weekDayDataPoint]);
            break;
        default:
            throw new Error('Invalid workingDay setting: must be 0, 1, or 2.');
    }

    // Parsing the schedule string
    let prevHour = 0;

    schedule.forEach((period) => {
        const [time, temperature] = period.split('/');
        const [hours, minutes] = time.split(':').map(Number);
        const temp = parseFloat(temperature);

        if (hours < 0 || hours > 24 || minutes % 10 !== 0 || temp < 5 || temp > 30 || temp % 0.5 !== 0) {
            throw new Error(`Invalid period entry: ${period}`);
        }

        if (prevHour > hours) {
            throw new Error(`Invalid time sequence: the hour of the next segment can't be less than the previous one.`);
        }
        prevHour = hours;

        const segment = (hours * 60 + minutes) / 10;
        const tempHexArray = convertDecimalValueTo2ByteHexArray(temp * 10);
        payload.push(segment, ...tempHexArray);
    });

    // Add technical periods to pad out the day
    for (let i = 0; i < 10 - schedule.length; i++) {
        payload.push(144, 0, 180); // Default 24 hours, 18 degrees
    }

    return Buffer.from(payload);
};

/**
 * Converts a decimal temperature value into a 2-byte hex array.
 * This is used to format temperature values before sending them to Tuya devices.
 * 
 * @param {Number} value - The decimal temperature value.
 * @returns {Array} - A 2-byte hex array representing the temperature.
 */
function convertDecimalValueTo2ByteHexArray(value) {
    const hexValue = Number(value).toString(16).padStart(4, '0');
    const chunk1 = hexValue.substring(0, 2);
    const chunk2 = hexValue.substring(2);
    return [parseInt(chunk1, 16), parseInt(chunk2, 16)];
}

/**
 * Sets the minimum brightness level for the specified gang.
 * 
 * @param {object} device - The device instance
 * @param {number} value - Brightness level (0-1000)
 * @param {string} gang - Specifies which gang (One or Two)
 */
async function setMinimumBrightness(device, value, gang = 'One') {
    const dp = gang === 'One' ? 3 : 9;
    await device.writeData32(dp, value);
}

/**
 * Sets the maximum brightness level for the specified gang.
 * 
 * @param {object} device - The device instance
 * @param {number} value - Brightness level (0-1000)
 * @param {string} gang - Specifies which gang (One or Two)
 */
async function setMaximumBrightness(device, value, gang = 'One') {
    const dp = gang === 'One' ? 5 : 11;
    await device.writeData32(dp, value);
}

/**
 * Configures the type of light source.
 * 
 * @param {object} device - The device instance
 * @param {number} value - Enum value representing light source type
 * @param {string} gang - Specifies which gang (One or Two)
 */
async function setTypeOfLightSource(device, value, gang = 'One') {
    const dp = gang === 'One' ? 4 : 10;
    await device.writeEnum(dp, value);
}

/**
 * Sets the power-on status setting.
 * 
 * @param {object} device - The device instance
 * @param {number} value - Enum value for power-on behavior
 */
async function setPowerOnStatus(device, value) {
    const dp = 14;
    await device.writeEnum(dp, value);
}

/**
 * Sets the switch type.
 * 
 * @param {object} device - The device instance
 * @param {number} value - Enum value for switch type
 */
async function setSwitchType(device, value) {
    const dp = 17;
    await device.writeEnum(dp, value);
}


// Export the helper functions for reuse in Tuya drivers
module.exports = {
    getDataValue,
    parseSchedule,
    marshalSchedule,
    convertMultiByteNumberPayloadToSingleDecimalNumber,
    setMinimumBrightness,
    setMaximumBrightness,
    setTypeOfLightSource,
    setPowerOnStatus,
    setSwitchType
};
