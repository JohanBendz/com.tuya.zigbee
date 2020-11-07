'use strict';

// eslint-disable-next-line node/no-unpublished-require
const Homey = require('homey');

class ZigBeeDriver extends Homey.Driver {

  /**
   * @private
   * @type {Map<Token, ZCLNode>}
   */
  _zclNodes = new Map();

}

module.exports = ZigBeeDriver;
