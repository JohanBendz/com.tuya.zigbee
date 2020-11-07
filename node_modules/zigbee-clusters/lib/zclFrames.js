'use strict';

const { ZCLDataType, ZCLDataTypes, ZCLStruct } = require('./zclTypes');

const ZCLFrameControlBitmap = ZCLDataTypes.map8('clusterSpecific', null, 'manufacturerSpecific', 'directionToClient', 'disableDefaultResponse');

const ZCLStandardHeader = ZCLStruct('ZCLStandardHeader', {
  frameControl: ZCLFrameControlBitmap,
  trxSequenceNumber: ZCLDataTypes.data8,
  cmdId: ZCLDataTypes.data8,
  data: ZCLDataTypes.buffer,
});

const ZCLMfgSpecificHeader = ZCLStruct('ZCLMfgSpecificHeader', {
  frameControl: ZCLFrameControlBitmap,
  manufacturerId: ZCLDataTypes.uint16,
  trxSequenceNumber: ZCLDataTypes.data8,
  cmdId: ZCLDataTypes.data8,
  data: ZCLDataTypes.buffer,
});

const ZCLConfigureReportingRecordStruct = ZCLStruct('ConfigureReportingRecord', {
  direction: ZCLDataTypes.enum8({
    reported: 0,
    received: 1,
  }),
  attributeId: ZCLDataTypes.uint16,
  attributeDataType: ZCLDataTypes.uint8,
  minInterval: ZCLDataTypes.uint16,
  maxInterval: ZCLDataTypes.uint16,
  minChange: ZCLDataTypes.buffer,
  timeoutPeriod: ZCLDataTypes.uint16,
});

const ZCLAttributeDataRecord = (withStatus, attributes) => new ZCLDataType(NaN, 'attributeRecord', -3, ((buf, v, i) => {
  const startByte = i;
  i += ZCLDataTypes.uint16.toBuffer(buf, v.id, i);
  if (withStatus) {
    i += ZCLDataTypes.enum8Status.toBuffer(buf, v.status, i);
  }
  if (!withStatus || v.status === 'SUCCESS') {
    i += ZCLDataTypes.uint8.toBuffer(buf, attributes[v.id].type.id, i);
    i += attributes[v.id].type.toBuffer(buf, v.value, i);
  }
  return i - startByte;
}), function fromBuf(buf, i, returnLength) {
  i = i || 0;
  const startByte = i;
  const res = {};
  if (buf.length >= i + Math.abs(this.length)) {
    res.id = ZCLDataTypes.uint16.fromBuffer(buf, i);
    i += ZCLDataTypes.uint16.length;

    if (withStatus) {
      res.status = ZCLDataTypes.enum8Status.fromBuffer(buf, i);
      i += ZCLDataTypes.enum8Status.length;
    }

    if (!withStatus || res.status === 'SUCCESS') {
      const dataTypeId = ZCLDataTypes.uint8.fromBuffer(buf, i);
      i += ZCLDataTypes.uint8.length;

      const DataType = attributes[res.id]
        ? attributes[res.id].type
        : Object.values(ZCLDataTypes).find(type => type && type.id === dataTypeId);
      if (!DataType) throw new TypeError(`Invalid Type for Attribute: ${res.id}`);

      if (attributes[res.id]) {
        res.name = attributes[res.id].name || `unknown_attr_${res.id}`;
      }

      const entry = DataType.fromBuffer(buf, i, true);
      if (DataType.length > 0) {
        i += DataType.length;
        res.value = entry;
      } else {
        res.value = entry.result;
        i += entry.length;
      }
    }
  }
  if (returnLength) {
    return { result: res, length: i - startByte };
  }
  return res;
});

const ZCLConfigureReportingRecords = ({ withStatus } = {}) => new ZCLDataType(
  NaN,
  'configureReportingRecords',
  -0,
  ((buf, value, i) => {
    // toBuffer
    const startByte = i;

    // Loop each configure reporting record
    for (const configureReportingRecord of value) {
      // Remove the minChange property (because its size will vary)
      const { minChange, direction } = configureReportingRecord;

      // Check if this record is expected to have a status field
      if (withStatus) {
        ZCLDataTypes.enum8Status.toBuffer(buf, configureReportingRecord.status, i);
        i += ZCLDataTypes.enum8Status.length;
      }

      ZCLConfigureReportingRecordStruct.fields.direction
        .toBuffer(buf, configureReportingRecord.direction, i);
      i += ZCLConfigureReportingRecordStruct.fields.direction.length;

      ZCLConfigureReportingRecordStruct.fields.attributeId
        .toBuffer(buf, configureReportingRecord.attributeId, i);
      i += ZCLConfigureReportingRecordStruct.fields.attributeId.length;

      // Nothing further to parse if it was not a success
      if (withStatus && configureReportingRecord.status !== 'SUCCESS') {
        continue;
      }

      if (direction === 'reported') {
        // Determine the type of the minChange property (equal to attributeDataType of this record)
        const minChangeDataType = Object.values(ZCLDataTypes)
          .find(DataType => DataType.id === configureReportingRecord.attributeDataType);

        ZCLConfigureReportingRecordStruct.fields.attributeDataType
          .toBuffer(buf, configureReportingRecord.attributeDataType, i);
        i += ZCLConfigureReportingRecordStruct.fields.attributeDataType.length;

        ZCLConfigureReportingRecordStruct.fields.minInterval
          .toBuffer(buf, configureReportingRecord.minInterval, i);
        i += ZCLConfigureReportingRecordStruct.fields.minInterval.length;

        ZCLConfigureReportingRecordStruct.fields.maxInterval
          .toBuffer(buf, configureReportingRecord.maxInterval, i);
        i += ZCLConfigureReportingRecordStruct.fields.maxInterval.length;

        if (minChangeDataType && typeof minChange === 'number') {
          minChangeDataType.toBuffer(buf, minChange, i);
          i += minChangeDataType.length;
        }
      } else {
        ZCLConfigureReportingRecordStruct.fields.timeoutPeriod
          .toBuffer(buf, configureReportingRecord.timeoutPeriod, i);
        i += ZCLConfigureReportingRecordStruct.fields.timeoutPeriod.length;
      }
    }

    return i - startByte;
  }), ((buf, i, returnLength) => {
    // fromBuffer
    i = i || 0;
    // Keep a reference to the current buffer index while reading it
    const startByte = i;
    const res = [];

    // Read the entire buffer
    while (buf.length > i) {
      // Parse status only if part of record struct (the read configuration response has a
      // status field whereas the configure reporting command does not)
      let status;

      // Check if this record is expected to have a status field
      if (withStatus) {
        status = ZCLDataTypes.enum8Status.fromBuffer(buf, i);
        i += ZCLDataTypes.enum8Status.length;
      }

      // Parse direction
      const direction = ZCLConfigureReportingRecordStruct.fields.direction.fromBuffer(buf, i);
      i += 1;

      // Parse attributeId
      const attributeId = ZCLConfigureReportingRecordStruct.fields.attributeId.fromBuffer(buf, i);
      i += 2;

      // Check if the status is success, only then we need to continue parsing for other values
      if (withStatus && status !== 'SUCCESS') {
        // Buffer parsing is complete
        res.push({ status, direction, attributeId });

        // Continue reading the buffer in a next iteration
        continue;
      }

      // eslint-disable-next-line default-case
      switch (direction) {
        // Only if the direction is 'reported' are the minInterval/maxInterval and minChange
        // properties available
        case 'reported': {
          // Parse attributeDataType, we need this to find the respective ZCLDataType in the
          // next step
          const attributeDataType = ZCLConfigureReportingRecordStruct.fields.attributeDataType
            .fromBuffer(buf, i);
          i += 1;

          // Find the respective ZCLDataType, we need it later on to determine if the data type
          // is analog or discrete
          const parsedAttributeDataType = Object.values(ZCLDataTypes)
            .find(x => x.id === attributeDataType);

          // Parse minInterval
          const minInterval = ZCLDataTypes.uint16.fromBuffer(buf, i);
          i += 2;

          // Parse maxInterval
          const maxInterval = ZCLDataTypes.uint16.fromBuffer(buf, i);
          i += 2;

          // If the ZCLDataType is not analog there will be no minChange field
          if (!parsedAttributeDataType.isAnalog) {
            const resultRecord = {
              direction, attributeId, attributeDataType, minInterval, maxInterval,
            };
            if (withStatus) resultRecord.status = status;
            res.push(resultRecord);

            // Continue reading the buffer in a next iteration
            continue;
          }

          // Apparently the ZCLDataType is analog so we should parse the minChange field
          const minChange = ZCLDataTypes[parsedAttributeDataType.shortName]
            .fromBuffer(buf, i);
          i += parsedAttributeDataType.length;

          const resultRecord = {
            direction,
            attributeId,
            attributeDataType,
            minInterval,
            maxInterval,
            minChange,
          };

          if (withStatus) resultRecord.status = status;
          res.push(resultRecord);

          // Buffer parsing is complete
          break;
        }

        // If the direction is 'received' we only have to parse the
        case 'received': {
          // timeoutPeriod
          // Parse timeout period
          const timeoutPeriod = ZCLConfigureReportingRecordStruct.fields.timeoutPeriod
            .fromBuffer(buf, i);
          i += 2;

          const resultRecord = {
            direction, attributeId, timeoutPeriod,
          };

          if (withStatus) resultRecord.status = status;
          res.push(resultRecord);

          // Buffer parsing is complete
          break;
        }
      }
    }

    if (returnLength) {
      return { result: res, length: i - startByte };
    }
    return res;
  }),
);

module.exports = {
  ZCLStandardHeader,
  ZCLMfgSpecificHeader,
  ZCLAttributeDataRecord,
  ZCLConfigureReportingRecords,
};
