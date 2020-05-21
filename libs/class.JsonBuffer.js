'use strict';

const
    precon = require('@mintpond/mint-precon'),
    mu = require('@mintpond/mint-utils');


class JsonBuffer {

    /**
     * Constructor.
     */
    constructor(msgDelimiter) {
        precon.opt_string(msgDelimiter, 'msgDelimiter');

        const _ = this;
        _._msgDelimiter = msgDelimiter;
        _._buffer = '';
        _._bufferLen = 0;
        _._createTimeMs = Date.now();
        _._lastAppendTimeMs = 0;
        _._lastMessageTimeMs = 0;
        _._timeout = 15;
    }


    /**
     * The length in bytes of the data in the buffer.
     * @returns {number}
     */
    get length() { return this._bufferLen; }

    /**
     * Get the time in epoch milliseconds that the buffer was created.
     * @returns {number}
     */
    get createTimeMs() { return this._createTimeMs; }

    /**
     * Get the last time in epoch milliseconds that the buffer was appended to.
     * @returns {number}
     */
    get lastAppendTimeMs() { return this._lastAppendTimeMs; }

    /**
     * Get the last time a message was successfully parsed.
     * @returns {number}
     */
    get lastMessageTimeMs() { return this._lastMessageTimeMs; }


    /**
     * Append data to the buffer.
     *
     * @param dataBuf {string|Buffer}
     * @param msgOutputArr {*[]} Output array to put parsed messages into.
     * @param [errOutputArr] {*[]} Output array to put parsing errors into. This is only used if a delimiter is
     * specified in the constructor.
     * @returns {*[]} msgOutputArr
     */
    append(dataBuf, msgOutputArr, errOutputArr) {
        if (mu.isString(dataBuf)) {
            precon.string(dataBuf, 'dataBuf');
        }
        else {
            precon.buffer(dataBuf, 'dataBuf');
        }
        precon.array(msgOutputArr, 'msgOutputArr');
        precon.opt_array(errOutputArr, 'errOutputArr');

        const _ = this;
        const addedStr = _._addBuffer(dataBuf);

        _._lastAppendTimeMs = Date.now();

        if (!_._msgDelimiter) {
            const message = _._parseJson(_._buffer);
            if (!mu.isUndefined(message)) {
                msgOutputArr.push(message);
                _.reset();
            }
            return;
        }

        if (addedStr.lastIndexOf(_._msgDelimiter) !== -1) {

            const messagesArr = _._buffer.split(_._msgDelimiter);
            const incomplete = _._buffer.slice(-1) === _._msgDelimiter
                ? ''
                : messagesArr.pop();

            if (messagesArr.length)
                _._lastMessageTimeMs = Date.now();

            messagesArr.forEach(strMessage => {

                if (!strMessage)
                    return;

                strMessage = strMessage.trim();

                const message = _._parseJson(strMessage, errOutputArr);
                if (mu.isUndefined(message))
                    return;

                msgOutputArr.push(message);
            });

            _._buffer = incomplete;
            _._bufferLen = Buffer.byteLength(_._buffer, 'utf8');
        }
    }


    reset() {
        const _ = this;
        _._buffer = '';
        _._bufferLen = 0;
    }


    _addBuffer(dataBuf) {
        const _ = this;
        const str = dataBuf.toString();
        _._buffer += str;
        _._bufferLen += dataBuf.length;
        return str;
    }


    _parseJson(json, errOutArr) {
        try {
            return JSON.parse(json);
        }
        catch (err) {
            errOutArr && errOutArr.push({
                error: err,
                json: json
            });
            return undefined;
        }
    }
}

module.exports = JsonBuffer;