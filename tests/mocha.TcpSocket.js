'use strict';

const
    assert = require('assert'),
    NetSocket = require('net').Socket,
    TcpSocket = require('./../libs/abstract.TcpSocket'),
    SocketWriter = require('./../libs/class.SocketWriter');

let netSocket;
let tcpSocket;
let portConfig;

function initBe() {
    portConfig = portConfig || {
        tcpKeepAlive: true,
        tcpNoDelay: true
    };
    netSocket = new NetSocket();

    Object.defineProperties(netSocket, {
        remoteAddress: { value: '127.0.0.1' },
        localAddress: { value: '127.0.0.1' },
        localPort: { value: 1000 },
        bufferSize: { value: 100 }
    });
}

function instanceBe() {
    tcpSocket = new TcpSocket({
        netSocket: netSocket,
        portConfig: portConfig
    });
}

function globalAe() {
    portConfig = null;
}


describe('TcpSocket', () => {

    context('properties', () => {
        beforeEach(initBe);
        beforeEach(instanceBe);
        afterEach(globalAe);

        it('should return correct value from netSocket property', () => {
            assert.strictEqual(tcpSocket.netSocket, netSocket);
        });

        it('should return correct value from portConfig property', () => {
            assert.strictEqual(tcpSocket.portConfig, portConfig);
        });

        it('should return correct value from tcpKeepAlive property', () => {
            assert.strictEqual(tcpSocket.tcpKeepAlive, true);
        });

        it('should return correct value from tcpNoDelay property', () => {
            assert.strictEqual(tcpSocket.tcpNoDelay, true);
        });

        it('should return correct value from remoteAddress property', () => {
            assert.strictEqual(tcpSocket.remoteAddress, '127.0.0.1');
        });

        it('should return correct value from localAddress property', () => {
            assert.strictEqual(tcpSocket.localAddress, '127.0.0.1');
        });

        it('should return correct value from localPort property', () => {
            assert.strictEqual(tcpSocket.localPort, 1000);
        });

        it('should return correct value from bufferSize property', () => {
            assert.strictEqual(tcpSocket.bufferSize, 100);
        });

        it('should return correct value from writer property', () => {
            assert.strictEqual(tcpSocket.writer instanceof SocketWriter, true);
        });
    });

    describe('write function', () => {
        beforeEach(initBe);
        beforeEach(instanceBe);
        afterEach(globalAe);

        it('should emit EVENT_MESSAGE_OUT', done => {
            tcpSocket.writer.write = function() {}
            tcpSocket.on(TcpSocket.EVENT_MESSAGE_OUT, ev => {
                assert.strictEqual(ev.message, 'abc');
                assert.strictEqual(ev.data, 'abcSerialized');
                done();
            });
            tcpSocket.write('abcSerialized', 'abc');
        });

        it('should write to socket writer', done => {
            tcpSocket.writer.write = function(serialized) {
                assert.strictEqual(serialized, 'abcSerialized');
                done();
            }
            tcpSocket.write('abcSerialized', 'abc');
        });
    });

    describe('destroy function', () => {
        beforeEach(initBe);
        beforeEach(instanceBe);
        afterEach(globalAe);

        it('should destroy socket writer', done => {
            tcpSocket.writer.destroy = function() {
                done();
            }
            tcpSocket.destroy();
        });

        it('should destroy net socket', done => {
            netSocket.destroy = function() {
                done();
            }
            tcpSocket.destroy();
        });
    });

    describe('$init function', () => {
        beforeEach(initBe);
        afterEach(globalAe);

        it('should be called when TcpSocket is instantiated', done => {
            class MockTcpSocket extends TcpSocket {
                $init() {
                    setImmediate(done);
                }
            }
            tcpSocket = new MockTcpSocket({
                netSocket: netSocket,
                portConfig: portConfig
            });
        });

        it('should set netSocket keep-alive flag if set (true)', done => {
            portConfig.tcpKeepAlive = true;
            netSocket.setKeepAlive = function (value) {
                assert.strictEqual(value, true);
                done();
            }
            tcpSocket = new TcpSocket({
                netSocket: netSocket,
                portConfig: portConfig
            });
        });

        it('should set netSocket keep-alive flag if set (false)', done => {
            portConfig.tcpKeepAlive = false;
            netSocket.setKeepAlive = function (value) {
                assert.strictEqual(value, false);
                done();
            }
            tcpSocket = new TcpSocket({
                netSocket: netSocket,
                portConfig: portConfig
            });
        });

        it('should NOT set netSocket keep-alive flag if NOT set', () => {
            portConfig.tcpKeepAlive = undefined;
            netSocket.setKeepAlive = function () {
                throw new Error('Should not set keep-alive');
            }
            tcpSocket = new TcpSocket({
                netSocket: netSocket,
                portConfig: portConfig
            });
        });

        it('should set netSocket no-delay flag if set (true)', done => {
            portConfig.tcpNoDelay = true;
            netSocket.setNoDelay = function (value) {
                assert.strictEqual(value, true);
                done();
            }
            tcpSocket = new TcpSocket({
                netSocket: netSocket,
                portConfig: portConfig
            });
        });

        it('should set netSocket no-delay flag if set (false)', done => {
            portConfig.tcpNoDelay = false;
            netSocket.setNoDelay = function (value) {
                assert.strictEqual(value, false);
                done();
            }
            tcpSocket = new TcpSocket({
                netSocket: netSocket,
                portConfig: portConfig
            });
        });

        it('should NOT set netSocket no-delay flag if NOT set', () => {
            portConfig.tcpNoDelay = undefined;
            netSocket.setNoDelay = function () {
                throw new Error('Should not set no-delay');
            }
            tcpSocket = new TcpSocket({
                netSocket: netSocket,
                portConfig: portConfig
            });
        });
    });

    describe('$onSocketClose function', () => {
        beforeEach(initBe);
        beforeEach(instanceBe);
        afterEach(globalAe);

        it('should emit EVENT_DISCONNECT', done => {
            tcpSocket.on(TcpSocket.EVENT_DISCONNECT, () => {
                done();
            });
            tcpSocket.$onSocketClose();
        });

        it('should be called when netSocket emits "closed" event', done => {
            class MockTcpSocket extends TcpSocket {
                $onSocketClose() {
                    done();
                }
            }
            tcpSocket = new MockTcpSocket({
                netSocket: netSocket
            });
            netSocket.emit('close', {});
        });
    });

    describe('$onSocketError function', () => {
        beforeEach(initBe);
        beforeEach(instanceBe);
        afterEach(globalAe);

        it('should emit EVENT_ERROR', done => {
            const error = new Error('test');
            tcpSocket.on(TcpSocket.EVENT_ERROR, ev => {
                assert.strictEqual(ev.error, error);
                done();
            });
            tcpSocket.$onSocketError(error);
        });

        it('should be called when netSocket emits "error" event', done => {
            class MockTcpSocket extends TcpSocket {
                $onSocketError() {
                    done();
                }
            }
            tcpSocket = new MockTcpSocket({
                netSocket: netSocket
            });
            netSocket.emit('error', {});
        });
    });

    describe('$onSocketData function', () => {
        beforeEach(initBe);
        afterEach(globalAe);

        it('should be called when netSocket emits "data" event', done => {
            const expectedDataBuf = Buffer.alloc(0);
            class MockTcpSocket extends TcpSocket {
                $onSocketData(dataBuf) {
                    assert.strictEqual(dataBuf, expectedDataBuf);
                    done();
                }
            }
            tcpSocket = new MockTcpSocket({
                netSocket: netSocket
            });
            netSocket.emit('data', expectedDataBuf);
        });
    });

    describe('$isRateLimitExceeded function', () => {
        beforeEach(initBe);
        beforeEach(instanceBe);
        afterEach(globalAe);

        it('should always return false when there is no rate limit', () => {
            const isExceeded = tcpSocket.$isRateLimitExceeded(100000000000000);
            assert.strictEqual(isExceeded, false);
        });

        it('should return false when rate limit is not exceeded', () => {
            portConfig.msgRateLimit = 100;
            const isExceeded = tcpSocket.$isRateLimitExceeded(10);
            assert.strictEqual(isExceeded, false);
        });

        it('should return true when rate limit is exceeded', () => {
            portConfig.msgRateLimit = 100;
            const isExceeded = tcpSocket.$isRateLimitExceeded(101);
            assert.strictEqual(isExceeded, true);
        });

        it('should return correct value', () => {
            portConfig.msgRateLimit = 45;
            let isExceeded = tcpSocket.$isRateLimitExceeded(10);
            assert.strictEqual(isExceeded, false);
            isExceeded = tcpSocket.$isRateLimitExceeded(10);
            assert.strictEqual(isExceeded, false);
            isExceeded = tcpSocket.$isRateLimitExceeded(10);
            assert.strictEqual(isExceeded, false);
            isExceeded = tcpSocket.$isRateLimitExceeded(10);
            assert.strictEqual(isExceeded, false);
            isExceeded = tcpSocket.$isRateLimitExceeded(10);
            assert.strictEqual(isExceeded, true);
        });
    });
});