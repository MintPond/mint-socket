'use strict';

const
    precon = require('@mintpond/mint-precon'),
    pu = require('@mintpond/mint-utils').prototypes;


/**
 * A ring-buffer for detecting messages received too quickly.
 */
class SocketLimitBuffer {

    /**
     * Constructor.
     *
     * @param capacity {number} The maximum number of message entries the buffer can hold. To be effective, this value
     * must be larger than the max number of messages that can be received in a given time period.
     */
    constructor(capacity) {
        precon.positiveInteger(capacity, 'capacity');

        const _ = this;
        _._capacity = capacity;
        _._buffer = Array(capacity);
        _._nextIndex = 0;
        _._size = 0;
    }


    /**
     * Get the maximum number of records the buffer can hold.
     * @returns {number}
     */
    get capacity() { return this._capacity; }

    /**
     * Get the current number of records in the buffer.
     * @returns {number}
     */
    get size() { return this._size; }


    /**
     * Increment the number of messages received by the specified amount.
     *
     * @param count {number} The number of messages received now.
     */
    increment(count) {
        precon.positiveInteger(count, 'count');

        const _ = this;

        if (_._size < _._capacity)
            _._size++;

        const array = _._buffer[_._nextIndex] || (_._buffer[_._nextIndex] = [0, 0]);

        array[0] = /* timeMs  */ Date.now();
        array[1] = /* elapsed */ count;

        _._nextIndex = (_._nextIndex + 1) % _._capacity;
    }


    /**
     * Get the total number of messages submitted since the specified epoch time in milliseconds.
     *
     * @param timeMs {number} The time in milliseconds
     *
     * @returns {number}
     */
    getTotalSince(timeMs) {
        precon.positiveInteger(timeMs, 'minTimeMs');

        const _ = this;

        if (_._size === 0)
            return 0;

        let total = 0;

        for (let i = _._size - 1, index = _._nextIndex - 1; i >= 0; i--, index--) {

            if (index < 0)
                index = _._buffer.length - 1;

            const c = _._buffer[index];
            if (c[0] >= timeMs) {
                total += c[1] || 0;
            }
            else {
                break;
            }
        }

        return total;
    }


    static get CLASS_ID() { return 'af52aad1826fffcb692c0ce0a544e0d848bb8922d600f4b85e8f1e0f8bf6880b'; }
    static TEST_INSTANCE(SocketLimitBuffer) { return new SocketLimitBuffer(1); }
    static [Symbol.hasInstance](obj) {
        return pu.isInstanceOfById(obj, SocketLimitBuffer.CLASS_ID);
    }
}

module.exports = SocketLimitBuffer;