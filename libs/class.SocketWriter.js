'use strict';

const
    net = require('net'),
    NetSocket = require('net').Socket,
    precon = require('@mintpond/mint-precon'),
    pu = require('@mintpond/mint-utils').prototypes;


/**
 * Dedicated socket writer.
 */
class SocketWriter {

    /**
     * Constructor.
     *
     * @param args
     * @param args.netSocket {net.Socket} The socket to write to.
     * @param [args.shouldDelayWrites] {boolean} Should writes be delayed.
     * @param [args.delayMs] {number} The initial number of milliseconds delay to add between message writes.
     */
    constructor(args) {
        precon.instanceOf(args.netSocket, NetSocket, 'netSocket');
        precon.opt_boolean(args.shouldDelayWrites, 'shouldDelayWrites');
        precon.opt_positiveInteger(args.delayMs, 'delayMs');

        const _ = this;

        _._netSocket = args.netSocket;
        _._shouldDelayWrites = !!args.shouldDelayWrites;
        _._delayMs = args.delayMs || 0;

        _._writeTimeoutHandle = null;
        _._isWriteScheduled = false;
        _._queueArr = [];
    }


    /**
     * Determine if the writer should add a delay between message writes.
     * @returns {boolean}
     */
    get shouldDelayWrites() { return this._shouldDelayWrites; }
    set shouldDelayWrites(should) {
        precon.boolean(should, 'shouldDelayWrites');
        this._shouldDelayWrites = should;
    }

    /**
     * The milliseconds of delay to add between message writes.
     * @returns {number}
     */
    get delayMs() { return this._delayMs; }
    set delayMs(ms) {
        precon.positiveInteger(ms, 'delayMs');
        this._delayMs = ms;
    }


    /**
     * Write data into socket.
     *
     * @param data {string|Buffer} The data to write.
     */
    write(data) {

        const _ = this;
        if (_._shouldDelayWrites && _._delayMs) {
            _._queueArr.push(data);
            if (!_._isWriteScheduled) {
                _._isWriteScheduled = true;
                _._writeNext();
            }
        }
        else {
            _._netSocket.write(data);
        }
    }


    /**
     * Destroy the writer. Does not destroy the wrapped net.Socket.
     */
    destroy() {
        const _ = this;
        clearTimeout(_._writeTimeoutHandle);
    }


    _writeNext() {
        const _ = this;

        if (_._queueArr.length === 0) {
            _._isWriteScheduled = false;
            return;
        }

        const data = _._queueArr.shift();
        _._netSocket.write(data);

        _._writeTimeoutHandle = setTimeout(_._writeNext.bind(_), _._delayMs);
    }


    static get CLASS_ID() { return '6b51331caa5d9355cb616f91ff758d5a8e49f71cec744b022d595d2665c00e12'; }
    static TEST_INSTANCE(SocketWriter) { return new SocketWriter({ netSocket: new NetSocket() }); }
    static [Symbol.hasInstance](obj) {
        return pu.isInstanceOfById(obj, SocketWriter.CLASS_ID);
    }
}

module.exports = SocketWriter;