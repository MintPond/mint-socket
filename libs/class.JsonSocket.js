'use strict';

const
    net = require('net'),
    NetSocket = require('net').Socket,
    precon = require('@mintpond/mint-precon'),
    mu = require('@mintpond/mint-utils'),
    pu = require('@mintpond/mint-utils').prototypes,
    TcpSocket = require('./abstract.TcpSocket'),
    JsonBuffer = require('./class.JsonBuffer');


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

        _._buffer = new JsonBuffer('\n');
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
            _._buffer.reset();
            _.emit(TcpSocket.EVENT_FLOOD);
            return;
        }

        const errorsArr = [];
        const messagesArr = [];
        _._buffer.append(dataBuf, messagesArr, errorsArr);

        if (_._buffer.length > maxBytes) {
            _._buffer.reset();
            _.emit(TcpSocket.EVENT_FLOOD);
            return;
        }

        if (_.$isRateLimitExceeded(messagesArr.length))
            return;

        _.emit(TcpSocket.EVENT_MESSAGES, { messagesArr: messagesArr });

        if (errorsArr.length) {
            _.emit(TcpSocket.EVENT_MALFORMED_MESSAGE, errorsArr[0]);
        }
        else {
            messagesArr.forEach(message => {

                if (_.shouldEnforceObj && !mu.isObject(message)) {
                    _.emit(TcpSocket.EVENT_MALFORMED_MESSAGE, {
                        message: message,
                        error: new Error('Message is not an object')
                    });
                } else {
                    _.emit(TcpSocket.EVENT_MESSAGE_IN, {message: message});
                }
            });
        }
    }


    static get CLASS_ID() { return 'b09d371e22346a26201afc17c567dff073ec0d4bd9b490a1c2608599c88b6f71'; }
    static TEST_INSTANCE(JsonSocket) { return new JsonSocket({ netSocket: new NetSocket() }); }
    static [Symbol.hasInstance](obj) {
        return pu.isInstanceOfById(obj, JsonSocket.CLASS_ID);
    }
}

module.exports = JsonSocket;