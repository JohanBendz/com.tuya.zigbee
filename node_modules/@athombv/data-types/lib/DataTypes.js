'use strict';

const util = require('util');
const DataType = require('./DataType');

function dataToBuf(buf, v, i) {
  if (!Buffer.isBuffer(buf)) throw new TypeError('expected buffer');
  if (!Buffer.isBuffer(v)) throw new TypeError('expected buffer');
  if (v.length !== this.length) throw new TypeError('invalid buffer size');
  return v.copy(buf, i);
}
function dataFromBuf(buf, i) {
  if (!Buffer.isBuffer(buf)) throw new TypeError('expected buffer');
  return buf.slice(i, i + this.length);
}

function boolToBuf(buf, v, i) {
  if (v == null) v = 0xff;
  else if (v) v = 0x01;
  else v = 0x00;
  return buf.writeUInt8(v, i);
}

function boolFromBuf(buf, i) {
  if (buf.length - i < this.length) return null;
  const v = buf.readUInt8(i);
  if (v === 0xff) return null;
  if (v === 0x00) return false;
  return true;
}

class Bitmap {

  constructor(bytes, bits, setBits) {
    if (!Buffer.isBuffer(bytes) && Number.isFinite(bytes)) bytes = Buffer.alloc(bytes);
    this._buffer = bytes;
    this._fields = bits;
    if (setBits) this.setBits(setBits);

    const properties = this._fields.reduce((res, key, i) => (key ? Object.assign(res, {
      [key]: {
        enumerable: true,
        get: () => {
          return this.getBit(i);
        },
        set: val => {
          return this.setBit(i, val);
        },
      },
    }) : res), {});
    Object.defineProperties(this, properties);
  }

  setBit(i, value = true) {
    const octet = Math.floor(i / 8);
    if (value) {
      this._buffer[octet] |= 1 << (i % 8);
    } else this._buffer[octet] &= (~(1 << (i % 8))) & 0xFF;
  }

  getBit(i) {
    const octet = Math.floor(i / 8);
    return !!(this._buffer[octet] & (1 << (i % 8)));
  }

  clearBit(i) {
    return this.setBit(i, false);
  }

  setBits(bits) {
    if (Number.isFinite(bits) && !Array.isArray(bits)) {
      this._buffer.writeUIntLE(bits, 0, this._buffer.length);
    } else if (Array.isArray(bits)) {
      bits
        .map(v => {
          if (typeof v !== 'string') throw new TypeError(`${v} is an invalid field`);
          const idx = this._fields.indexOf(v);
          if (idx < 0) throw new TypeError(`${v} is an invalid field`);
          return idx;
        })
        // eslint-disable-next-line no-return-assign
        .forEach(v => this._buffer[Math.floor(v / 8)] |= 1 << (v % 8));
    } else {
      throw new Error('not_implemented');
    }
  }

  getBits() {
    const res = [];
    for (let i = 0; i < this._buffer.length; i++) {
      const byte = this._buffer[i];
      for (let j = 0; j < 8; j++) {
        if (byte & (1 << j)) res.push(this._fields[i * 8 + j]);
      }
    }
    return res;
  }

  get length() {
    return this._buffer.length;
  }

  static fromBuffer(buf, i, len, args) {
    i = i || 0;
    return new Bitmap(buf.slice(i, i + len), args);
  }

  static toBuffer(buf, i, length, args, v) {
    i = i || 0;
    buf = buf.slice(i, i + length);
    if (!(v instanceof Bitmap)) {
      v = new Bitmap(buf, args, v);
    }
    return v.toBuffer(buf, i);
  }

  toArray() {
    return this.getBits();
  }

  toBuffer(buf, i) {
    i = i || 0;
    if (!buf) buf = Buffer.alloc(this._buffer.length);
    return this._buffer.copy(buf, i);
  }

  copy() {
    return new Bitmap(this.length, this._fields, this.getBits());
  }

  toJSON() {
    return this._buffer.toJSON();
  }

  inspect() {
    const res = this.getBits();
    return `Bitmap [ ${res.join(', ')} ]`;
  }

  [Symbol.for('nodejs.util.inspect.custom')]() {
    return this.inspect();
  }

}

function bitmapToBuf(buf, v, i) {
  return Bitmap.toBuffer(buf, i, this.length, this.args, v);
}

function bitmapFromBuf(buf, i) {
  return Bitmap.fromBuffer(buf, i, this.length, this.args);
}

function uintToBuf(buf, v, i) {
  return buf.writeUIntLE(v, i, this.length) - i;
}

function uintFromBuf(buf, i) {
  if (buf.length - i < this.length) return 0;
  return buf.readUIntLE(i, this.length);
}

function uintToBufBE(buf, v, i) {
  return buf.writeUIntBE(v, i, this.length) - i;
}

function uintFromBufBE(buf, i) {
  return buf.readUIntBE(i, this.length);
}

function intToBuf(buf, v, i) {
  return buf.writeIntLE(v, i, this.length) - i;
}

function intFromBuf(buf, i) {
  if (buf.length - i < this.length) return 0;
  return buf.readIntLE(i, this.length);
}

function floatToBuf(buf, v, i) {
  return buf.writeFloatLE(v, i) - i;
}

function floatFromBuf(buf, i) {
  return buf.readFloatLE(i);
}

function doubleToBuf(buf, v, i) {
  return buf.writeDoubleLE(v, i) - i;
}

function doubleFromBuf(buf, i) {
  return buf.readDoubleLE(i);
}

function bufferToBuf(buf, v, i) {
  const countSize = Math.abs(this.length);
  if (!Buffer.isBuffer(v) && v.toBuffer) v = v.toBuffer();
  if (!Buffer.isBuffer(v) && v.buffer) v = Buffer.from(v.buffer, v.byteOffset, v.byteLength);
  if (!Buffer.isBuffer(v)) throw new TypeError(`expected buffer, got ${util.inspect(v)}`);

  if (countSize) {
    buf.writeUIntLE(v.length, i, countSize);
  }

  return v.copy(buf, i + countSize) + countSize;
}

function bufferFromBuf(buf, i, returnLength) {
  i = i || 0;
  const countSize = Math.abs(this.length);
  const size = countSize ? buf.readUIntLE(i, countSize) : 0;
  const res = countSize
    ? buf.slice(i + countSize, i + countSize + size)
    : buf.slice(i + countSize);

  if (size > res.length) {
    res.isPartial = true;
  } // TODO: FIXME

  if (returnLength) {
    return {
      result: res,
      length: res.length + countSize,
    };
  }
  return res;
}


function arrayToBuf(buf, v, i) {
  i = i || 0;
  v = typeof v !== 'undefined' ? v : [];
  const [Type] = this.args;
  const countSize = Math.abs(this.length);
  let size = countSize;
  if (!Array.isArray(v)) throw new TypeError(`expected array, got ${v}`);
  if (countSize) {
    buf.writeIntLE(v.length, i, countSize);
  }
  // eslint-disable-next-line guard-for-in,no-restricted-syntax
  for (const j in v) {
    const res = Type.toBuffer(buf, v[j], i + size);
    if (Type.length > 0) size += Type.length;
    else if (Buffer.isBuffer(res)) size += res.length;
    else size += res;
  }
  return size;
}

function arrayFromBuf(buf, i, returnLength) {
  i = i || 0;
  const [Type] = this.args;
  const countSize = Math.abs(this.length);


  const count = (countSize) ? buf.readUIntLE(i, countSize) : Infinity;
  let length = countSize;
  const res = [];
  while (i + length < buf.length && res.length < count) {
    const entry = Type.fromBuffer(buf, i + length, true);
    if (Type.length > 0) {
      res.push(entry);
      length += Type.length;
    } else {
      if (entry.length <= 0) break;
      res.push(entry.result);
      length += entry.length;
    }
  }
  if (returnLength) {
    return {
      result: res, length,
    };
  }
  return res;
}

function enumToBuf(buf, v, i) {
  if (typeof v === 'string') {
    v = this.args[0][v];
  }
  if (typeof v === 'undefined') throw new TypeError('unknown enum value');
  return uintToBuf.call(this, buf, v, i);
}

function enumFromBuf(buf, i) {
  const val = uintFromBuf.call(this, buf, i);
  return Object.keys(this.args[0]).find(k => this.args[0][k] === val);
}

function utf8StringToBuf(buf, v, i) {
  v = Buffer.from(String(v), 'utf8');
  const length = Math.abs(this.length);

  i = buf.writeUIntLE(v.length, i, length);
  return v.copy(buf, i) + length;
}

function utf8StringFromBuf(buf, i, returnLength) {
  i = i || 0;
  let length = Math.abs(this.length);
  const size = buf.readUIntLE(i, length);
  const result = buf.slice(i + length, i + length + size);
  length += result.length;

  let parsedResult = result.toString('utf8');
  parsedResult = parsedResult.split('\u0000')[0]; // Remove everything after string terminator
  // eslint-disable-next-line no-control-regex
  parsedResult = parsedResult.replace(/[\u0000-\u001F](\[(B|C|D|A))?/g, ''); // Replace remaining
  parsedResult = parsedResult.trim(); // Trim excessive white space

  if (returnLength) {
    return {
      result: parsedResult,
      length,
    };
  }
  return parsedResult;
}

function utf8FixedStringToBuf(buf, v, i) {
  v = Buffer.from(String(v), 'utf8').slice(0, this.length);
  return v.copy(buf, i);
}

function utf8FixedStringFromBuf(buf, i) {
  i = i || 0;
  const result = buf.slice(i, i + this.length);

  let parsedResult = result.toString('utf8');
  parsedResult = parsedResult.split('\u0000')[0]; // Remove everything after string terminator
  // eslint-disable-next-line no-control-regex
  parsedResult = parsedResult.replace(/[\u0000-\u001F](\[(B|C|D|A))?/g, ''); // Replace remaining
  parsedResult = parsedResult.trim(); // Trim excessive white space

  return parsedResult;
}

function uint4ToBuf(buf, v, i) {
  const isNibble = !Number.isInteger(i);
  i = Math.floor(i);
  if (isNibble) {
    v = (buf[i]) | (v & 0xF);
  } else {
    v = (v & 0xF) << 4;
  }
  buf.writeUInt8(v, i, this.length);
  return buf.halfByte ? 0 : 1;
}

function uint4FromBuf(buf, i) {
  const isNibble = !Number.isInteger(i);
  i = Math.floor(i);
  let res = buf.readUInt8(i, this.length);
  if (isNibble) {
    res &= 0xF;
  } else {
    res = (res >> 4) & 0xF;
  }
  return res;
}

function enum4ToBuf(buf, v, i) {
  if (typeof v === 'string') {
    v = this.args[0][v];
  }
  if (typeof v === 'undefined') throw new TypeError('unknown enum value');
  return uint4ToBuf.call(this, buf, v, i);
}

function enum4FromBuf(buf, i) {
  const val = uint4FromBuf.call(this, buf, i);
  return Object.keys(this.args[0]).find(k => this.args[0][k] === val);
}

function bitmap4ToBuf(buf, v, i) {
  const newBuf = Buffer.alloc(1);
  Bitmap.toBuffer(newBuf, 0, 1, this.args, v);
  return uint4ToBuf.call(this, buf, newBuf[0], i);
}

function bitmap4FromBuf(buf, i) {
  const newBuf = Buffer.from([uint4FromBuf.call(this, buf, i)]);
  return Bitmap.fromBuffer(newBuf, 0, 1, this.args);
}


function EUI64ToBuf(buf, v, i) {
  v = Buffer.from(
    v
      // eslint-disable-next-line no-useless-escape
      .replace(/(^0x)|\-|\:|\s/g, '')
      .match(/.{1,2}/g)
      .reverse()
      .join(''),
    'hex',
  );
  return dataToBuf.call(this, buf, v, i);
}

function EUI64FromBuf(buf, i) {
  return Array.from(dataFromBuf.call(this, buf, i))
    .reverse()
    .map(n => (n < 16 ? '0' : '') + n.toString(16))
    .join(':');
}

function key128ToBuf(buf, v, i) {
  v = Buffer.from(
    // eslint-disable-next-line no-useless-escape
    v.replace(/(^0x)|\-|\:|\s/g, ''),
    'hex',
  );
  return dataToBuf.call(this, buf, v, i);
}

function key128FromBuf(buf, i) {
  return Array.from(dataFromBuf.call(this, buf, i))
    .map(n => (n < 16 ? '0' : '') + n.toString(16))
    .join(':');
}

/* eslint-disable */
const DataTypes = {
  noData      :               new DataType(0  , 'noData'       , 0   , (buf, v, i) => null   , (buf, i) => ({result:null, length: 0})),

  data8       :               new DataType(8  , 'data8'        , 1   , uintToBufBE           , uintFromBufBE               ),
  data16      :               new DataType(9  , 'data16'       , 2   , uintToBufBE           , uintFromBufBE               ),
  data24      :               new DataType(10 , 'data24'       , 3   , uintToBufBE           , uintFromBufBE               ),
  data32      :               new DataType(11 , 'data32'       , 4   , uintToBufBE           , uintFromBufBE               ),
  data40      :               new DataType(12 , 'data40'       , 5   , dataToBuf             , dataFromBuf                 ),
  data48      :               new DataType(13 , 'data48'       , 6   , dataToBuf             , dataFromBuf                 ),
  data56      :               new DataType(14 , 'data56'       , 7   , dataToBuf             , dataFromBuf                 ),
  data64      :               new DataType(15 , 'data64'       , 8   , dataToBuf             , dataFromBuf                 ),

  bool        :               new DataType(16 , 'bool'         , 1   , boolToBuf             , boolFromBuf                 ),

  map8        :  (...arg) =>  new DataType(24 , 'map8'         , 1   , bitmapToBuf           , bitmapFromBuf     , ...arg  ),
  map16       :  (...arg) =>  new DataType(25 , 'map16'        , 2   , bitmapToBuf           , bitmapFromBuf     , ...arg  ),
  map24       :  (...arg) =>  new DataType(26 , 'map24'        , 3   , bitmapToBuf           , bitmapFromBuf     , ...arg  ),
  map32       :  (...arg) =>  new DataType(27 , 'map32'        , 4   , bitmapToBuf           , bitmapFromBuf     , ...arg  ),
  map40       :  (...arg) =>  new DataType(28 , 'map40'        , 5   , bitmapToBuf           , bitmapFromBuf     , ...arg  ),
  map48       :  (...arg) =>  new DataType(29 , 'map48'        , 6   , bitmapToBuf           , bitmapFromBuf     , ...arg  ),
  map56       :  (...arg) =>  new DataType(30 , 'map56'        , 7   , bitmapToBuf           , bitmapFromBuf     , ...arg  ),
  map64       :  (...arg) =>  new DataType(31 , 'map64'        , 8   , bitmapToBuf           , bitmapFromBuf     , ...arg  ),

  uint8       :               new DataType(32 , 'uint8'        , 1   , uintToBuf             , uintFromBuf                 ),
  uint16      :               new DataType(33 , 'uint16'       , 2   , uintToBuf             , uintFromBuf                 ),
  uint24      :               new DataType(34 , 'uint24'       , 3   , uintToBuf             , uintFromBuf                 ),
  uint32      :               new DataType(35 , 'uint32'       , 4   , uintToBuf             , uintFromBuf                 ),
  uint40      :               new DataType(36 , 'uint40'       , 5   , uintToBuf             , uintFromBuf                 ),
  uint48      :               new DataType(37 , 'uint48'       , 6   , uintToBuf             , uintFromBuf                 ),

  //TODO:These exceed JS limits, turn to bigInts later
//uint56      :               new DataType(38 , 'uint56'       , 7   , uintToBuf             , uintFromBuf                 ),
//uint64      :               new DataType(39 , 'uint64'       , 8   , uintToBuf             , uintFromBuf                 ),

  int8        :               new DataType(40 , 'int8'         , 1   , intToBuf              , intFromBuf                  ),
  int16       :               new DataType(41 , 'int16'        , 2   , intToBuf              , intFromBuf                  ),
  int24       :               new DataType(42 , 'int24'        , 3   , intToBuf              , intFromBuf                  ),
  int32       :               new DataType(43 , 'int32'        , 4   , intToBuf              , intFromBuf                  ),
  int40       :               new DataType(44 , 'int40'        , 5   , intToBuf              , intFromBuf                  ),
  int48       :               new DataType(45 , 'int48'        , 6   , intToBuf              , intFromBuf                  ),

  //TODO:These exceed JS limits, turn to bigInts later
//int56       :               new DataType(46 , 'int56'        , 7   , intToBuf              , intFromBuf                  ),
//int64       :               new DataType(47 , 'int64'        , 8   , intToBuf              , intFromBuf                  ),

  enum8       :  (...arg) =>  new DataType(48 , 'enum8'        , 1   , enumToBuf             , enumFromBuf       , ...arg  ),
  enum16      :  (...arg) =>  new DataType(49 , 'enum16'       , 2   , enumToBuf             , enumFromBuf       , ...arg  ),
  enum32      :  (...arg) =>  new DataType(NaN, 'enum32'       , 4   , enumToBuf             , enumFromBuf       , ...arg  ),

  //TODO: javascript has no native semi precision floats
//semi        :               new DataType(56 , 'semi'         , 2   , semiToBuf             , semiFromBuf                 ),
  single      :               new DataType(57 , 'single'       , 4   , floatToBuf            , floatFromBuf                ),
  double      :               new DataType(58 , 'double'       , 8   , doubleToBuf           , doubleFromBuf               ),

  octstr      :               new DataType(65 , 'octstr'       , -1  , bufferToBuf           , bufferFromBuf               ),
  string      :               new DataType(66 , 'string'       , -1  , utf8StringToBuf       , utf8StringFromBuf           ),
// octstr16    :               new DataType(67 , 'octstr16'     , -2  , ),
// string16    :               new DataType(68 , 'string16'     , -2  , ),

// array       :               new DataType(72 , 'array'        , -1  , ),
// struct      :               new DataType(76 , 'struct'       , -1  , ),
// set         :               new DataType(80 , 'set'          , -1  , ),
// bag         :               new DataType(81 , 'bag'          , -1  , ),

// ToD         :               new DataType(224, 'ToD'          , 4   , ),
// date        :               new DataType(225, 'date'         , 4   , ),
// UTC         :               new DataType(226, 'UTC'          , 4   , ),

// clusterId   :               new DataType(232, 'clusterId'    , 2   , ),
// attribId    :               new DataType(233, 'attribId'     , 2   , ),

// bacOID      :               new DataType(234, 'bacOID'       , 4   , ),
  EUI64       :               new DataType(240, 'EUI64'        , 8   , EUI64ToBuf            , EUI64FromBuf                ),
  key128      :               new DataType(241, 'key128'       , 16  , key128ToBuf           , key128FromBuf               ),

// unk         :               new DataType(255, 'unk'          , 0   , ),

  ///INTERNAL TYPES
  uint4       :               new DataType(NaN, 'uint4'        , 0.5 , uint4ToBuf            , uint4FromBuf                ),
  enum4       :  (...arg) =>  new DataType(NaN, 'enum4'        , 0.5 , enum4ToBuf            , enum4FromBuf      , ...arg  ),
  map4        :  (...arg) =>  new DataType(NaN, 'map4'         , 0.5 , bitmap4ToBuf          , bitmap4FromBuf    , ...arg  ),

  buffer      :               new DataType(NaN, '_buffer'      , -0  , bufferToBuf           , bufferFromBuf               ),
  buffer8     :               new DataType(NaN, '_buffer8'     , -1  , bufferToBuf           , bufferFromBuf               ),
  buffer16    :               new DataType(NaN, '_buffer16'    , -2  , bufferToBuf           , bufferFromBuf               ),
  Array0      :  (...arg) =>  new DataType(NaN, '_Array0'      , -0  , arrayToBuf            , arrayFromBuf      , ...arg  ),
  Array8      :  (...arg) =>  new DataType(NaN, '_Array8'      , -1  , arrayToBuf            , arrayFromBuf      , ...arg  ),
  FixedString :     (len) =>  new DataType(NaN, '_FixedString' , len , utf8FixedStringToBuf  , utf8FixedStringFromBuf      ),
};
/* eslint-enable */
module.exports = DataTypes;
