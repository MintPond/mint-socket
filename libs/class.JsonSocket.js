'use strict';

const
    net = require('net'),
    NetSocket = require('net').Socket,
    precon = require('@mintpond/mint-precon'),
    mu = require('@mintpond/mint-utils'),
    pu = require('@mintpond/mint-utils').prototypes,
    TcpSocket = require('./abstract.TcpSocket');


/**
 * A wrapper for a net.Socket which sends and receives json messages.
 */
class JsonSocket extends TcpSocket {

    /**
     * Constructor.
     *
     * @param args
     * @param args.netSocket {net.Socket} The net socket to wrap.
     * @param [args.shouldEnforceObj] {boolean} Enforce message must be an object literal.
     * @param [args.portConfig]
     * @param [args.portConfig.maxMessageBytes] {number} The maximum number of bytes allowed in a single message.
     * @param [args.portConfig.maxBytes] {number} The maximum number of bytes allowed in the receive buffer.
     * @param [args.portConfig.msgRateLimit] {number} The maximum number of messages allowed within the limit window.
     * @param [args.portConfig.msgRateLimitWindow] {number} The number of seconds in the limit window.
     * @param [args.portConfig.tcpKeepAlive] {boolean} True or false to set keep-alive.
     * @param [args.portConfig.tcpNoDelay] {boolean} True or false to set no-delay.
     */
    constructor(args) {
        precon.instanceOf(args.netSocket, NetSocket, 'netSocket');
        precon.opt_boolean(args.shouldEnforceObj, 'shouldEnforceObj');
        precon.opt_obj(args.portConfig, 'portConfig');
        if (args.portConfig) {
            precon.opt_positiveInteger(args.portConfig.maxMessageBytes, 'portConfig.maxMessageBytes');
            precon.opt_positiveInteger(args.portConfig.maxBytes, 'portConfig.maxBytes');
        }

        super(args);

        const _ = this;
        _._shouldEnforceObj = !!args.shouldEnforceObj;

        _._buffer = '';
        _._bufferLen = 0;
        _._errorArr = [];
    }


    /**
     * Determine if messages must be object literals. If false, messages can be other types (i.e string)
     * @returns {boolean}
     */
    get shouldEnforceObj() { return this._shouldEnforceObj; }


    /* Override */
    send(message) {
        precon.obj(message, 'message');

        const _ = this;
        const data = JSON.stringify(message) + '\n';

        _.write(data, message);

        return { data: data, message: message };
    }


    /* Override */
    $onSocketData(dataBuf) {
        const _ = this;

        const maxBytes = _.portConfig.maxBytes || 10240;

        if (dataBuf.length > (_.portConfig.maxMessageBytes || maxBytes)) {
            _._resetBuffer();
            _.emit(TcpSocket.EVENT_FLOOD);
            return;
        }

        const addedStr = _._addBuffer(dataBuf);

        if (_._bufferLen > maxBytes) {
            _._resetBuffer();
            _.emit(TcpSocket.EVENT_FLOOD);
            return;
        }

        if (addedStr.lastIndexOf('\n') !== -1) {

            const messagesArr = _._buffer.split('\n');
            const incomplete = _._buffer.slice(-1) === '\n'
                ? ''
                : messagesArr.pop();

            if (_.$isRateLimitExceeded(messagesArr.length))
                return;

            _.emit(TcpSocket.EVENT_MESSAGES, {messagesArr: messagesArr});

            messagesArr.forEach(strMessage => {

                if (!strMessage)
                    return;

                strMessage = strMessage.trim();

                if (_.shouldEnforceObj && strMessage[0] !== '{') {
                    _.emit(TcpSocket.EVENT_MALFORMED_MESSAGE, {
                        message: strMessage,
                        error: new Error('Message is not an object')
                    });
                    return;
                }

                const message = _._parseJson(strMessage, _._errorArr);
                if (mu.isUndefined(message)) {
                    _.emit(TcpSocket.EVENT_MALFORMED_MESSAGE, {
                        message: strMessage,
                        error: _._errorArr.pop()
                    });
                    return;
                }

                _.emit(TcpSocket.EVENT_MESSAGE_IN, { message: message });
            });

            _._buffer = incomplete;
            _._bufferLen = Buffer.byteLength(_._buffer, 'utf8');
        }
    }


    _resetBuffer() {
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
            errOutArr.push(err);
            return undefined;
        }
    }


    static get CLASS_ID() { return 'b09d371e22346a26201afc17c567dff073ec0d4bd9b490a1c2608599c88b6f71'; }
    static TEST_INSTANCE(JsonSocket) { return new JsonSocket({ netSocket: new NetSocket() }); }
    static [Symbol.hasInstance](obj) {
        return pu.isInstanceOfById(obj, JsonSocket.CLASS_ID);
    }
}

module.exports = JsonSocket;