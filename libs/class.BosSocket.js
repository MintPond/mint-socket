'use strict';

const
    net = require('net'),
    NetSocket = require('net').Socket,
    precon = require('@mintpond/mint-precon'),
    bos = require('@mintpond/mint-bos'),
    BosDeserializeBuffer = require('@mintpond/mint-bos').BosDeserializeBuffer,
    pu = require('@mintpond/mint-utils').prototypes,
    TcpSocket = require('./abstract.TcpSocket');


/**
 * A wrapper for a net.Socket which sends and receives binary BOS messages.
 */
class BosSocket extends TcpSocket {

    /**
     * Constructor.
     *
     * @param args
     * @param args.netSocket {net.Socket} The net socket to wrap.
     * @param [args.shouldEnforceObj] {boolean} Enforce message must be an object literal.
     * @param [args.portConfig]
     * @param [args.portConfig.maxMessageBytes] {number} The maximum number of bytes allowed in a single received message.
     * @param [args.portConfig.maxBytes] {number} The maximum number of bytes allowed in the receive buffer.
     * @param [args.portConfig.maxDepth] {number} The maximum number recursions allowed in a message object.
     * @param [args.portConfig.tcpKeepAlive] {boolean} True or false to set keep-alive.
     * @param [args.portConfig.tcpNoDelay] {boolean} True or false to set no-delay.
     * @param [args.portConfig.msgRateLimit] {number} The maximum number of messages allowed within the limit window.
     * @param [args.portConfig.msgRateLimitWindow] {number} The number of seconds in the limit window.
     */
    constructor(args) {
        precon.instanceOf(args.netSocket, NetSocket, 'netSocket');
        precon.opt_boolean(args.shouldEnforceObj, 'shouldEnforceObj');
        precon.opt_obj(args.portConfig, 'portConfig');
        if (args.portConfig) {
            precon.opt_positiveInteger(args.portConfig.maxMessageBytes, 'portConfig.maxMessageBytes');
            precon.opt_positiveInteger(args.portConfig.maxBytes, 'portConfig.maxBytes');
            precon.opt_positiveInteger(args.portConfig.maxDepth, 'portConfig.maxDepth');
        }

        super(args);

        const _ = this;
        _._shouldEnforceObj = !!args.shouldEnforceObj;

        _._bosBuffer = null;
        _._bosErrors = [];
        _._nextMessageSize = -1;
    }


    /**
     * The capacity of the BOS buffer. -1.
     * @returns {number}
     */
    get bufferCapacity() { return this._bosBuffer ? this._bosBuffer.capacity : this._getBufferInitCapacity() }

    /**
     * Determine if messages must be object literals. If false, messages can be other types (i.e string)
     * @returns {boolean}
     */
    get shouldEnforceObj() { return this._shouldEnforceObj; }


    /* Override */
    send(message) {
        precon.obj(message, 'message');

        const _ = this;
        const buffer = bos.serialize(message);

        _.write(buffer, message);

        return { data: buffer, message: message };
    }


    /* Override */
    $onSocketData(dataBuf) {
        const _ = this;

        if (!_._bosBuffer) {
            // initialize
            _._bosBuffer = new BosDeserializeBuffer(_._getBufferInitCapacity());
            _._bosBuffer.maxLength = Math.max(_.portConfig.maxBytes || 10240);
            _._bosBuffer.maxDepth = _.portConfig.maxDepth || 4;
            _._bosBuffer.maxBytesTypeLen = _.portConfig.maxMessageBytes || _.portConfig.maxBytes || 0;
        }

        if (!_._bosBuffer.append(dataBuf)) {
            // Failure to append is due to a configured limitation being exceeded.
            _.emit(TcpSocket.EVENT_FLOOD);
            return;
        }

        // cache expected size of next message to reduce work
        if (_._nextMessageSize === -1) {

            if (_._bosBuffer.length < 4)
                return; // not enough data to read expected length, wait for more data

            _._nextMessageSize = _._bosBuffer.readUInt32LE(0);

            if (_._nextMessageSize > (_.portConfig.maxMessageBytes || _._bosBuffer.maxLength)) {
                _.emit(TcpSocket.EVENT_FLOOD);
                return;
            }
        }

        // check if enough data is buffered to read next message
        if (_._bosBuffer.length < _._nextMessageSize)
            return; // wait for more data

        // reset message size cache
        _._nextMessageSize = -1;

        const messagesArr = [];
        const totalRead = _._bosBuffer.deserialize(messagesArr, _._bosErrors);

        if (totalRead === undefined) {
            // Failed to deserialize due to incompatible data in the buffer
            _._bosBuffer.clear();
            _.emit(TcpSocket.EVENT_MALFORMED_MESSAGE, {
                message: null,
                error: new Error(`BOS Failed to parse: ${_._bosErrors.pop()}`)
            });
            return;
        }

        if (totalRead) {

            if (_.$isRateLimitExceeded(totalRead))
                return;

            _.emit(TcpSocket.EVENT_MESSAGES, {messagesArr: messagesArr});

            // Iterate messages and emit
            for (let i = 0; i < totalRead; i++) {

                const message = messagesArr[i];

                if (_.shouldEnforceObj && (!message || !mu.isObject(message))) {
                    _.emit(TcpSocket.EVENT_MALFORMED_MESSAGE, {
                        message: message,
                        error: new Error('Message is not an object')
                    });
                    return;
                }

                _.emit(TcpSocket.EVENT_MESSAGE_IN, {message: message});
            }
        }
    }


    _getBufferInitCapacity() {
        const _ = this;
        return Math.round(((_.portConfig.maxMessageBytes || 0) * 1.5) || _.portConfig.maxBytes || 10240);
    }


    static get CLASS_ID() { return '696183594f212b87746e3c172d5e4b238769cf40cee5f31a64262cf8327d7c67'; }
    static TEST_INSTANCE(BosSocket) { return new BosSocket({ netSocket: new NetSocket() }); }
    static [Symbol.hasInstance](obj) {
        return pu.isInstanceOfById(obj, BosSocket.CLASS_ID);
    }
}

module.exports = BosSocket;