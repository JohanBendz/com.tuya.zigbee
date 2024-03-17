'use strict';

const { Cluster, ZCLDataTypes} = require('zigbee-clusters');

const ATTRIBUTES = {

};

const COMMANDS = {

    datapoint: {
        id: 0,
        args: {
            'status': ZCLDataTypes.uint8,
            'transid':  ZCLDataTypes.uint8,
            'dp': ZCLDataTypes.uint8,
            'datatype': ZCLDataTypes.uint8,
            'length': ZCLDataTypes.data16,
            'data': ZCLDataTypes.buffer
        }
    },
    reporting: {
        id: 0x01,
        args: {
            'status': ZCLDataTypes.uint8,
            'transid': ZCLDataTypes.uint8,
            'dp': ZCLDataTypes.uint8,
            'datatype': ZCLDataTypes.uint8,
            'length': ZCLDataTypes.data16,
            'data': ZCLDataTypes.buffer
        }
    },
    response: {
        id: 0x02,
        args: {
            'status': ZCLDataTypes.uint8,
            'transid': ZCLDataTypes.uint8,
            'dp': ZCLDataTypes.uint8,
            'datatype': ZCLDataTypes.uint8,
            'length': ZCLDataTypes.data16,
            'data': ZCLDataTypes.buffer
        }
    },
    reportingConfiguration: {
        id: 0x06,
        args: {
            'status': ZCLDataTypes.uint8,
            'transid': ZCLDataTypes.uint8,
            'dp': ZCLDataTypes.uint8,
            'datatype': ZCLDataTypes.uint8,
            'length': ZCLDataTypes.data16,
            'data': ZCLDataTypes.buffer
        }
    },
};

class TuyaSpecificCluster extends Cluster {

    static get ID() {
        return 61184;
    }

    static get NAME() {
        return 'tuya';
    }

    static get ATTRIBUTES() {
        return ATTRIBUTES;
    }

    static get COMMANDS() {
        return COMMANDS;
    }

    onReporting(response) {
        this.emit(`reporting`, response)
    }

    onResponse(response) {
        this.emit(`response`, response)
    }

    onReportingConfiguration(response) {
        this.emit(`reportingConfiguration`, response)
    }

}

Cluster.addCluster(TuyaSpecificCluster);

module.exports = TuyaSpecificCluster;


// datatype
// ---------------------------------------------
// 0x00 	RAW
// 0x01 	BOOL    1 byte
// 0x02 	VALUE   4 byte unsigned integer
// 0x03 	STRING  variable length string
// 0x04     ENUM    1 byte enum
// 0x05     FAULT   1 byte bitmap

// dp
// ---------------------------------------------
// "dp" describes the action/message of a command frame.
// "dp" is composed by a type ("datatype") and an device dependant identifier ("dataidentifier").
// "transid" is a counter and a response will have the same transid as the command.
// "Status" and "fn" are always 0.

// Christmas Lights
// ---------------------------------------------
// 0x01 	control         	bool 	0/1 - off/on
// 0x02 	mode                enum 	0/1/2 - White/Color/Effect
// 0x03 	percent_luminance 	value 	current luminance percentage
// 0x04     (unknown)
// 0x05 	color               string 	current color
// 0x06     Effect              string  current effect (4 or 10 byte buffer, 1th=? 2nd=effect, 3rd&4th=speed 0-64) base = 30 30 30 30 eq first effect with speed 0. Adding color bring length from 4 byte to 10 byte.
// 0x07 	fault           	bitmap 	Anything but 0 means something went wrong (untested)
//
// Effects
// 30   Steady
// 31   Snow
// 32   Rainbow
// 33   Snake
// 34   Twinkle
// 35   Fireworks
// 36   Horizontal Flag
// 37   Waves
// 38   Up and Down
// 39   Vintage
// 61   Fading
// 62   Collide
// 63   Strobe
// 64   Sparkles
// 65   Carnaval
// 66   Glow

// Windows Covering
// ---------------------------------------------
// 0x01 	control         	enum 	open, stop, close, continue
// 0x02 	percent_control 	value 	0-100% control
// 0x03 	percent_state 	    value 	Report from motor about current percentage
// 0x04 	control_back     	enum 	Configures motor direction (untested)
// 0x05 	work_state       	enum 	Supposedly shows if motor is opening or closing, always 0 for me though
// 0x06 	situation_set 	    enum 	Configures if 100% equals to fully closed or fully open (untested)
// 0x07 	fault           	bitmap 	Anything but 0 means something went wrong (untested)

// Switch
// ---------------------------------------------
// 0x01 	Button 1
// 0x02 	Button 2
// 0x03 	Button 3
// 0x04 	(Unknown)
// 0x0D     All buttons

// Thermostat
// ---------------------------------------------
// 0x04     Preset
// 0x6C     Auto / Manu
// 0x65     Manu / Off
// 0x6E     Low battery
// 0x02     Actual temperature
// 0x03     Thermostat temperature
// 0x14     Valve
// 0x15     Battery level
// 0x6A     Mode

// Various Sensors
// ---------------------------------------------
// 0x03     Presence detection (with 0x04)
// 0x65     Water leak (with 0x01)

// Sensor and light use same cluster, so we need to make a choice for devices that have both.
// Some devices have sensornode AND lightnode, so we need to use the good one.

// *lightNodes* (Unsure what this means)
//
// Window Coverings
// ---------------------------------------------
// dp   0x0407  starting moving
// dp   0x0105  configuration done
// dp   0x0401
//      data    0x02    open
//      data    0x00    close
//      data    0x01    stop
// dp   0x0202  going to position
// dp   0x0203  position reached
//
// Switch
// ---------------------------------------------
// dp   0x0101  1 GANG  Endpoint 1 (0x01)
// dp   0x0102  2 GANG  Endpoint 2 (0x02)
// dp   0x0103  3 GANG  Endpoint 3 (0x03)
//

// *sensorNodes* (Unsure what this means)
//
// dp   0x0068  window open information
//      valve       dp & 0xFF
//      temperature (dp >> 8) && 0xFF
//      minute      (dp >> 16) && 0xFF
//
// dp   0x0101  off / running for Moe
//      data    0   off
//      data    1   heat
//
// dp   0x0107  Childlock status
//      data    0 or 1 (false/true)
//
// dp   0x0112  Window open status
//      data    0 or 1 (false/true)
//
// dp   0x0114  Valve state on / off
//      data    0 or 1 (false/true)
//
// dp   0x0128  Childlock status for moe
//      data    0 or 1 (false/true)
//
// dp   0x0165  off / on > [off = off, on = heat]
//      data    0 or 1 (off/manu)
//
// dp   0x0168  Alarm
//      data    0 or 1 (false/true)
//
// dp   0x016A  Away mode
//      data    0 or 1 (false/true)
//
// dp   0x016c  manual / auto
//      data    0 or 1 (heat/auto)
//
// dp   0x016E  Low battery
//      data    0 or 1 (false/true)
//
// dp   0x0202: Thermostat heatsetpoint
//      data    temp = (data & 0xFFFF)*10
//
// dp   0x0203  Thermostat current temperature
//      data    temp = (data & 0xFFFF)*10
//
// dp   0x0210  Thermostat heatsetpoint for moe
//      data    temp = (data & 0xFFFF)*100
//
// dp   0x0215  battery
//      data    battery = (data & 0xFF)
//
// dp   0x0218  Thermostat current temperature for moe
//      data    temp = (data & 0xFFFF)*10
//
// dp   0x022c  temperature calibration (offset)
//      data    temp = (data & 0xFFFF)*10
//
// dp   0x0266  min temperature limit (temperature for modelId "GbxAXL2")
//      data    temp = (data & 0xFFFF)*10
//
// dp   0x0267  max temperature limit (setpoint for modelId "GbxAXL2" )
//      data    temp = (data & 0xFFFF)*10
//
// dp   0x0269  siren temperature, Boost time
//      data    temp = (data & 0xFFFF)*10
//
// dp   0x026A  Siren Humidity
//      data    humidity = (data & 0xFFFF)*10
//
// dp   0x026D  Valve position
//      data    valve = (data & 0xFF) (on = valve > 3)
//
// dp   0x0402  preset for moe  "auto"
// dp   0x0403  preset for moe  "program"
//
// dp   0x0404  preset
//      data    0   "holiday"
//      data    1   "auto"
//      data    2   "manual"
//      data    3   "confort"
//      data    4   "eco"
//      data    5   "boost"
//      data    6   "complex"
//
// dp   0x046a  mode
//      data    0   "auto"
//      data    1   "heat"
//      data    2   "off"
//
// dp   0x0569  Low battery
//      data    0 or 1 (false/true)


