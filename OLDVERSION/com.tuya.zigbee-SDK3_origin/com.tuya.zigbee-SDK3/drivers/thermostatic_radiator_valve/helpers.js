const getDataValue = (dpValue) => {
    const convertMultiByteNumberPayloadToSingleDecimalNumber = (chunks) => {
        let value = 0;

        for (let i = 0; i < chunks.length; i++) {
            value = value << 8;
            value += chunks[i];
        }

        return value;
    };

    switch (dpValue.datatype) {
        case TUYA_DATA_TYPES.raw:
            return dpValue.data;
        case TUYA_DATA_TYPES.bool:
            return dpValue.data[0] === 1;
        case TUYA_DATA_TYPES.value:
            return convertMultiByteNumberPayloadToSingleDecimalNumber(dpValue.data);
        case TUYA_DATA_TYPES.string:
            let dataString = '';
            for (let i = 0; i < dpValue.data.length; ++i) {
                dataString += String.fromCharCode(dpValue.data[i]);
            }
            return dataString;
        case TUYA_DATA_TYPES.enum:
            return dpValue.data[0];
        case TUYA_DATA_TYPES.bitmap:
            return convertMultiByteNumberPayloadToSingleDecimalNumber(dpValue.data);
    }
}

const TUYA_DATA_TYPES = {
    raw: 0, // [ bytes ]
    bool: 1, // [0/1]
    value: 2, // [ 4 byte value ]
    string: 3, // [ N byte string ]
    enum: 4, // [ 0-255 ]
    bitmap: 5, // [ 1,2,4 bytes ] as bits
};

const THERMOSTAT_DATA_POINTS = {
    preset: 2,
    openWindow: 8,
    frostProtection: 10,
    targetTemperature: 16,
    holidayTemperature: 21,
    currentTemperature: 24,
    localTemperatureCalibration: 27,
    batteryLevel: 35,
    openWindowTemperature: 102,
    comfortTemperature: 104,
    ecoTemperature: 105,
    schedule: 106,
    scheduleMonday: 108,
    scheduleWednesday: 109,
    scheduleFriday: 110,
    scheduleSunday: 111,
    scheduleTuesday: 112,
    scheduleThursday: 113,
    scheduleSaturday: 114,
    workingDay: 31
}

const dataPointTodayByte = {
    108: 1, // monday
    112: 2,
    109: 4,
    113: 8,
    110: 16,
    114: 32,
    111: 64, // sunday
};

const parseSchedule = (bytes) => {
    // day split to 10 min segments = total 144 segments
    const maxPeriodsInDay = 10;
    const periodSize = 3;
    const schedule = [];

    for (let i = 0; i < maxPeriodsInDay; i++) {
        const time = bytes[i * periodSize];
        const totalMinutes = time * 10;
        const hours = totalMinutes / 60;
        const rHours = Math.floor(hours);
        const minutes = (hours - rHours) * 60;
        const rMinutes = Math.round(minutes);
        const strHours = rHours.toString().padStart(2, '0');
        const strMinutes = rMinutes.toString().padStart(2, '0');
        const tempHexArray = [bytes[i * periodSize + 1], bytes[i * periodSize + 2]];
        const tempRaw = Buffer.from(tempHexArray).readUIntBE(0, tempHexArray.length);
        const temp = tempRaw / 10;
        schedule.push(strHours + ":" + strMinutes + "/" + temp);
        if (rHours === 24) break;
    }

    return schedule.join(' ');
}

const marshalSchedule = (workingDay, weekDayDataPoint, scheduleString) => {
    const payload = [];
    switch (workingDay) {
        case "0": // Mon-Sun
            payload.push(127);
            break;
        case "1": // Mon-Fri, Sat+Sun
            if ([114, 111].indexOf(weekDayDataPoint) === -1) { // saturday or sunday ?
                payload.push(31);
            } else {
                payload.push(dataPointTodayByte[weekDayDataPoint]);
            }
            break;
        case "2": // Separate
            payload.push(dataPointTodayByte[weekDayDataPoint]);
            break;
        default:
            throw new Error('Invalid "workingDay" setting:' + workingDay);
    }

    // day split to 10 min segments = total 144 segments
    const maxPeriodsInDay = 10;
    // TODO check scheduleString against RegEx?!
    const schedule = scheduleString.split(' ');
    const schedulePeriods = schedule.length;
    if (schedulePeriods > 10) throw new Error('There cannot be more than 10 periods in the schedule: ' + scheduleString);
    if (schedulePeriods < 2) throw new Error('There cannot be less than 2 periods in the schedule: ' + scheduleString);
    let prevHour;

    for (const period of schedule) {
        const timeTemp = period.split('/');
        const hm = timeTemp[0].split(':', 2);
        const h = parseInt(hm[0]);
        const m = parseInt(hm[1]);
        const temp = parseFloat(timeTemp[1]);
        if (h < 0 || h > 24 || m < 0 || m >= 60 || m % 10 !== 0 || temp < 5 || temp > 30 || temp % 0.5 !== 0) {
            throw new Error('Invalid hour, minute or temperature of: ' + period);
        } else if (prevHour > h) {
            throw new Error(`The hour of the next segment can't be less than the previous one: ${prevHour} > ${h}`);
        }
        prevHour = h;
        const segment = (h * 60 + m) / 10;
        const tempHexArray = convertDecimalValueTo2ByteHexArray(temp * 10);
        payload.push(segment, ...tempHexArray);
    }

    // Add "technical" periods to be valid payload
    for (let i = 0; i < maxPeriodsInDay - schedulePeriods; i++) {
        // by default it sends 9000b2, it's 24 hours and 18 degrees
        payload.push(144, 0, 180);
    }

    return Buffer.from(payload);
}

function convertDecimalValueTo2ByteHexArray(value) {
    const hexValue = Number(value).toString(16).padStart(4, '0');
    const chunk1 = hexValue.substring(0, 2);
    const chunk2 = hexValue.substring(2);
    return [chunk1, chunk2].map((hexVal) => parseInt(hexVal, 16));
}

module.exports = { getDataValue, parseSchedule, marshalSchedule, THERMOSTAT_DATA_POINTS }
