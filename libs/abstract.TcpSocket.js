'use strict';

const
    net = require('net'),
    NetSocket = require('net').Socket,
    EventEmitter = require('events'),
    precon = require('@mintpond/mint-precon'),
    mu = require('@mintpond/mint-utils'),
    pu = require('@mintpond/mint-utils').prototypes,
    SocketLimitBuffer = require('./class.SocketLimitBuffer'),
    SocketWriter = require('./class.SocketWriter');


/**
 * A wrapper for the socket connection of a client.
 */
class TcpSocket extends EventEmitter {

    /**
     * Constructor.
     *
     * @param args
     * @param args.netSocket {net.Socket} The net socket to wrap.
     * @param [args.portConfig]
     * @param [args.portConfig.tcpKeepAlive] {boolean} True or false to set keep-alive.
     * @param [args.portConfig.tcpNoDelay] {boolean} True or false to set no-delay.
     * @param [args.portConfig.msgRateLimit] {number} The maximum number of messages allowed within the limit window.
     * @param [args.portConfig.msgRateLimitWindow] {number} The number of seconds in the limit window.
     */
    constructor(args) {
        precon.instanceOf(args.netSocket, NetSocket, 'netSocket');
        precon.opt_obj(args.portConfig, 'portConfig');
        if (args.portConfig) {
            precon.opt_boolean(args.portConfig.tcpKeepAlive, 'portConfig.tcpKeepAlive');
            precon.opt_boolean(args.portConfig.tcpNoDelay, 'portConfig.tcpNoDelay');
            precon.opt_positiveInteger(args.portConfig.msgRateLimit, 'portConfig.msgRateLimit');
            precon.opt_positiveInteger(args.portConfig.msgRateLimitWindow, 'portConfig.msgRateLimitWindow');
        }

        super();

        const _ = this;
        _._netSocket = args.netSocket;
        _._portConfig = args.portConfig || {};

        _._rateLimiterBuffer = null;
        _._tcpKeepAlive = _._portConfig.tcpKeepAlive;
        _._tcpNoDelay = _._portConfig.tcpNoDelay;
        _._remoteAddress = _._netSocket.remoteAddress;
        _._localAddress = _._netSocket.localAddress;
        _._localPort = _._netSocket.localPort;

        _.$init();

        _._writer = _.$createSocketWriter(_._netSocket);

        _._netSocket.on('close', _.$onSocketClose.bind(_));
        _._netSocket.on('error', _.$onSocketError.bind(_));
        _._netSocket.on('data', _.$onSocketData.bind(_));
    }


    /**
     * Name of event emitted when too messages are received too fast.
     * @returns {string}
     */
    static get EVENT_RATE_LIMIT_EXCEEDED() { return 'rateLimitExceeded' };

    /**
     * Name of event emitted when a malformed message is received.
     * @returns {string}
     */
    static get EVENT_MALFORMED_MESSAGE() { return 'malformedMessage' };

    /**
     * Name of event emitted when 1 or more unvalidated messages are received.
     * @returns {string}
     */
    static get EVENT_MESSAGES() { return 'messages' };

    /**
     * Name of event emitted when a valid message is received.
     * @returns {string}
     */
    static get EVENT_MESSAGE_IN() { return 'messageIn' };

    /**
     * Name of event emitted when a valid message is received.
     * @returns {string}
     */
    static get EVENT_MESSAGE_OUT() { return 'messageOut' };

    /**
     * Name of event emitted when the socket is disconnected.
     * @returns {string}
     */
    static get EVENT_DISCONNECT() { return 'disconnect' };

    /**
     * Name of event emitted when a socket error occurs.
     * @returns {string}
     */
    static get EVENT_ERROR() { return 'socketError' };

    /**
     * Name of event emitted when the socket is flooded with too much data.
     * @returns {string}
     */
    static get EVENT_FLOOD() { return 'socketFlood' };


    /**
     * Get the net.Socket handle.
     * @returns {net.Socket}
     */
    get netSocket() { return this._netSocket; }

    /**
     * Get the port configuration.
     *
     * @returns {{tcpKeepAlive?:boolean, tcpNoDelay?:boolean}}
     */
    get portConfig() { return this._portConfig; }

    /**
     * Socket Keep Alive setting.
     * @returns {null|undefined|boolean}
     */
    get tcpKeepAlive() { return this._tcpKeepAlive; }
    set tcpKeepAlive(keepAlive) {
        precon.boolean(keepAlive, 'tcpKeepAlive');
        this._tcpKeepAlive = keepAlive;
        this._netSocket.setKeepAlive(keepAlive);
    }

    /**
     * The Socket NO_DELAY setting.
     * @returns {null|undefined|boolean}
     */
    get tcpNoDelay() { return this._tcpNoDelay; }
    set tcpNoDelay(noDelay) {
        precon.boolean(noDelay, 'tcpNoDelay');
        this._tcpNoDelay = noDelay;
        this._netSocket.setNoDelay(noDelay);
    }

    /**
     * Get the remote address of the connected client.
     * @returns {string}
     */
    get remoteAddress() { return this._remoteAddress; }

    /**
     * Get the local address the client is connected to.
     * @returns {string}
     */
    get localAddress() { return this._localAddress; }

    /**
     * Get the local port the client is connected to.
     * @returns {number}
     */
    get localPort() { return this._localPort; }

    /**
     * Get the current buffer size of the socket.
     * @returns {number}
     */
    get bufferSize() { return this._netSocket.bufferSize; }

    /**
     * Get the socket writer.
     * @returns {SocketWriter}
     */
    get writer() { return this._writer; }


    /**
     * Write raw data to the socket.
     *
     * @param serializedData {string|Buffer} The data to write.
     * @param originalMessage {object} The unserialized message so it can be included in event arguments.
     */
    write(serializedData, originalMessage) {
        const _ = this;

        _.emit(TcpSocket.EVENT_MESSAGE_OUT, { message: originalMessage, data: serializedData });

        _._writer.write(serializedData);
    }


    /**
     * Serialize and write a stratum message to the socket.
     *
     * @param message {object} The object to write.
     * @returns {{data:string|Buffer,message:object}} An object containing the data data written to the socket and the original message.
     */
    send(message) {
        precon.obj(message, 'message');

        const _ = this;
        _.write(message.toString(), message);

        return {
            data: message.toString(),
            message: message
        };
    }


    /**
     * Destroy the socket.
     */
    destroy() {
        const _ = this;
        _._writer.destroy();
        _._netSocket.destroy();
    }


    $init() {
        const _ = this;
        if (mu.isBoolean(_._tcpKeepAlive))
            _._netSocket.setKeepAlive(_._tcpKeepAlive);

        if (mu.isBoolean(_._tcpNoDelay))
            _._netSocket.setNoDelay(_._tcpNoDelay);
    }


    $createSocketWriter(netSocket) {
        return new SocketWriter({ netSocket: netSocket });
    }


    $onSocketClose() {
        const _ = this;
        _.emit(TcpSocket.EVENT_DISCONNECT);
    }


    $onSocketError(err) {
        const _ = this;
        if (err.code !== 'ECONNRESET')
            _.emit(TcpSocket.EVENT_ERROR, { error: err });
    }


    $onSocketData(dataBuf) {
        throw new Error('Not implemented');
    }


    $isRateLimitExceeded(readCount) {

        const _ = this;
        const rateLimit = _.portConfig.msgRateLimit || 0;
        const rateLimitWindow = _.portConfig.msgRateLimitWindow || 1;

        if (rateLimit) {

            if (!_._rateLimiterBuffer || _._rateLimiterBuffer.capacity < rateLimit * 2)
                _._rateLimiterBuffer = new SocketLimitBuffer(rateLimit * 2);

            _._rateLimiterBuffer.increment(readCount);
            const rate = _._rateLimiterBuffer.getTotalSince(Date.now() - (rateLimitWindow * 1000));

            if (readCount > 0 && rate > rateLimit) {
                _.emit(TcpSocket.EVENT_RATE_LIMIT_EXCEEDED);
                return true;
            }
        }

        return false;
    }


    static get CLASS_ID() { return '209312c05b71522629b6954736a6a70396d0f45c06fdeb09d9079e1f38170f0e'; }
    static TEST_INSTANCE(TcpSocket) { return new TcpSocket({ netSocket: new NetSocket() }); }
    static [Symbol.hasInstance](obj) {
        return pu.isInstanceOfById(obj, TcpSocket.CLASS_ID);
    }
}

module.exports = TcpSocket;