'use strict';

const
    assert = require('assert'),
    JsonBuffer = require('./../libs/class.JsonBuffer');

let buffer;
let recentMs = Date.now();


describe('JsonBuffer', () => {

    context('properties', () => {
        beforeEach(() => {buffer = new JsonBuffer()});

        it('should return correct value from length property', () => {
            assert.strictEqual(buffer.length, 0);
        });

        it('should return correct value from createTimeMs property', () => {
            assert.strictEqual(buffer.createTimeMs, buffer._createTimeMs);
            assert.strictEqual(buffer.createTimeMs > recentMs, true);
        });

        it('should return correct value from lastAppendTimeMs property', () => {
            assert.strictEqual(buffer.lastAppendTimeMs, 0);
        });

        it('shouold return correct value from lastMessageTimeMs property', () => {
            assert.strictEqual(buffer.lastMessageTimeMs, 0);
        });
    });

    describe('append function (no delimiter)', () => {
        beforeEach(() => {buffer = new JsonBuffer()});

        it('should append Buffer data to buffer', () => {
            const data = Buffer.from('{ "partial":', 'utf8');
            buffer.append(data, []);
            assert.strictEqual(buffer.length, data.length);
        });

        it('should fill output array with parsed objects', () => {
            const data = Buffer.from('{"property":"value"}', 'utf8');
            const outputArr = [];
            buffer.append(data, outputArr);
            assert.strictEqual(outputArr.length, 1);
            assert.deepEqual(outputArr[0], {property:'value'});
        });

        it('should NOT fill output array if data in buffer is not yet parsable', () => {
            const data = Buffer.from('{"property":', 'utf8');
            const outputArr = [];
            buffer.append(data, outputArr);
            assert.strictEqual(outputArr.length, 0);
        });


        it('should NOT fill error array if data in buffer is not yet parsable', () => {
            const data = Buffer.from('{"property":', 'utf8');
            const messageArr = [];
            const errorArr = [];
            buffer.append(data, messageArr, errorArr);
            assert.strictEqual(errorArr.length, 0);
        });

        it('should NOT fill error array if data in buffer is parsed', () => {
            const data = Buffer.from('{"property":"value"}', 'utf8');
            const outputArr = [];
            const errorArr = [];
            buffer.append(data, outputArr, errorArr);
            assert.strictEqual(errorArr.length, 0);
        });

        it('should return array of parsed objects once buffer data is complete', () => {
            const outputArr = [];
            buffer.append(Buffer.from('{"property":', 'utf8'), outputArr);
            buffer.append(Buffer.from('"value"}', 'utf8'), outputArr);
            assert.strictEqual(outputArr.length, 1);
            assert.deepEqual(outputArr[0], {property:'value'});
        });

        it('should clear buffer once contents are parsed', () => {
            const outputArr = [];
            buffer.append(Buffer.from('{"property":', 'utf8'), outputArr);
            buffer.append(Buffer.from('"value"}', 'utf8'), outputArr);
            assert.strictEqual(buffer.length, 0);
        });
    });

    describe('append function (delimiter)', () => {
        beforeEach(() => {buffer = new JsonBuffer('\n')});

        it('should append Buffer data to buffer', () => {
            const data = Buffer.from('{ "partial":', 'utf8');
            buffer.append(data, []);
            assert.strictEqual(buffer.length, data.length);
        });

        it('should NOT parse a segment until a delimiter is detected', () => {
            const data = Buffer.from('{"property":"value"}', 'utf8');
            const outputArr = [];
            buffer.append(data, outputArr);
            assert.strictEqual(outputArr.length, 0);
        });

        it('should fill output array with parsed objects', () => {
            const data = Buffer.from('{"property":"value"}\n', 'utf8');
            const outputArr = [];
            buffer.append(data, outputArr);
            assert.strictEqual(outputArr.length, 1);
            assert.deepEqual(outputArr[0], {property:'value'});
        });

        it('should NOT fill output array if data in buffer is not yet parsable', () => {
            const data = Buffer.from('{"property":', 'utf8');
            const outputArr = [];
            buffer.append(data, outputArr);
            assert.strictEqual(outputArr.length, 0);
        });


        it('should NOT fill error array if data in buffer is not yet parsable', () => {
            const data = Buffer.from('{"property":', 'utf8');
            const messageArr = [];
            const errorArr = [];
            buffer.append(data, messageArr, errorArr);
            assert.strictEqual(errorArr.length, 0);
        });

        it('should fill error array if segment is not parseable', () => {
            const data = Buffer.from('{"property":\n', 'utf8');
            const messageArr = [];
            const errorArr = [];
            buffer.append(data, messageArr, errorArr);
            assert.strictEqual(errorArr.length, 1);
        });

        it('should NOT fill error array if data in buffer is parsed', () => {
            const data = Buffer.from('{"property":"value"}', 'utf8');
            const outputArr = [];
            const errorArr = [];
            buffer.append(data, outputArr, errorArr);
            assert.strictEqual(errorArr.length, 0);
        });

        it('should return array of parsed objects once buffer data is complete', () => {
            const outputArr = [];
            buffer.append(Buffer.from('{"property":', 'utf8'), outputArr);
            buffer.append(Buffer.from('"value"}', 'utf8'), outputArr);
            buffer.append(Buffer.from('\n', 'utf8'), outputArr);
            assert.strictEqual(outputArr.length, 1);
            assert.deepEqual(outputArr[0], {property:'value'});
        });

        it('should clear buffer once contents are parsed', () => {
            const outputArr = [];
            buffer.append(Buffer.from('{"property":', 'utf8'), outputArr);
            buffer.append(Buffer.from('"value"}\n', 'utf8'), outputArr);
            assert.strictEqual(buffer.length, 0);
        });

        it('should only parse completed segments', () => {
            const outputArr = [];
            buffer.append(Buffer.from('{"property":', 'utf8'), outputArr);
            buffer.append(Buffer.from('"value"}\n{"property2":', 'utf8'), outputArr);
            assert.strictEqual(outputArr.length, 1);
        });

        it('should parse all completed segments', () => {
            const outputArr = [];
            buffer.append(Buffer.from('{"property":', 'utf8'), outputArr);
            buffer.append(Buffer.from('"value"}\n{"property2":', 'utf8'), outputArr);
            buffer.append(Buffer.from('"value2"}\n', 'utf8'), outputArr);
            assert.strictEqual(outputArr.length, 2);
            assert.deepEqual(outputArr[0], {property:'value'});
            assert.deepEqual(outputArr[1], {property2:'value2'});
        });
    });

    describe('reset function', () => {
        beforeEach(() => {buffer = new JsonBuffer()});

        it('should clear contents of buffer', () => {
            buffer.append(Buffer.from('{"property"', 'utf8'), []);
            buffer.reset();
            assert.strictEqual(buffer.length, 0);
        });
    });
});