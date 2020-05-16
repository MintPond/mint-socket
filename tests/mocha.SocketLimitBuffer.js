'use strict';

const
    assert = require('assert'),
    SocketLimitBuffer = require('./../libs/class.SocketLimitBuffer');

let buffer;

function globalBe() {
    buffer = new SocketLimitBuffer(3);
}


describe('SocketLimitBuffer', () => {

    context('properties', () => {
        beforeEach(globalBe);

        it('should return correct value from the capacity property', () => {
            assert.strictEqual(buffer.capacity, 3);
        });

        it('should return correct value from the size property', () => {
            assert.strictEqual(buffer.size, 0);
        });
    });

    describe('increment function', () => {
        beforeEach(globalBe);

        it('should increment size property if size is less than capacity', () => {
            buffer.increment(2);
            assert.strictEqual(buffer.size, 1);
        });

        it('should NOT increment size property if size is equal to capacity', () => {
            buffer.increment(2);
            buffer.increment(3);
            buffer.increment(4);
            assert.strictEqual(buffer.size, 3);
            buffer.increment(4);
            assert.strictEqual(buffer.size, 3);
        });
    });

    describe('getTotalSince function', () => {
        beforeEach(globalBe);

        it('should return correct number of increments since the specified time (1)', done => {
            const startMs = Date.now();
            setTimeout(() => {
                buffer.increment(1);
            }, 50);
            setTimeout(() => {
                buffer.increment(2);
            }, 100);
            setTimeout(() => {
                buffer.increment(3);
            }, 150);
            setTimeout(() => {
                const count = buffer.getTotalSince(startMs);
                assert.strictEqual(count, 6);
                done();
            }, 200);
        });

        it('should return correct number of increments since the specified time (2)', done => {
            const startMs = Date.now();
            setTimeout(() => {
                buffer.increment(1);
            }, 100);
            setTimeout(() => {
                buffer.increment(2);
            }, 150);
            setTimeout(() => {
                buffer.increment(3);
            }, 300);
            setTimeout(() => {
                const count = buffer.getTotalSince(startMs + 200);
                assert.strictEqual(count, 3);
                done();
            }, 400);
        });
    });
});