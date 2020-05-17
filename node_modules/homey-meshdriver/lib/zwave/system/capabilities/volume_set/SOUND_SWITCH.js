'use strict';

module.exports = {
  get: 'SOUND_SWITCH_CONFIGURATION_GET',
  set: 'SOUND_SWITCH_CONFIGURATION_SET',
  getOpts: {
    getOnStart: true,
  },
  setParserV1(value) {
    return {
      Volume: value * 100,
      'Default Tone Identifier': 1
    }
  },
  report: 'SOUND_SWITCH_CONFIGURATION_REPORT',
  reportParserV1: report => {
    if (report && report.hasOwnProperty('Volume') && typeof report.Volume === 'number') {
      return report.Volume / 100;
    }
    return null;
 }
}
