'use strict';

const debug = require('debug')('zigbee-clusters');

function getPropertyDescriptor(obj, name) {
  if (!obj) return;

  // eslint-disable-next-line consistent-return
  return Object.getOwnPropertyDescriptor(obj, name)
    || getPropertyDescriptor(Object.getPrototypeOf(obj), name);
}

module.exports = {
  debug,
  getPropertyDescriptor,
};
