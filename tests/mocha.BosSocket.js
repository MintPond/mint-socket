'use strict';

const
    assert = require('assert'),
    NetSocket = require('net').Socket,
    bos = require('@mintpond/mint-bos'),
    TcpSocket = require('./../libs/abstract.TcpSocket'),
    BosSocket = require('./../libs/class.BosSocket');

let portConfig;
let netSocket;
let bosSocket;

function initBe() {
    portConfig = portConfig || {
        tcpKeepAlive: true,
        tcpNoDelay: true,
        maxMessageBytes: 512,
        maxBytes: 1024,
        maxDepth: 3
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
    bosSocket = new BosSocket({ netSocket: netSocket, portConfig: portConfig });
}

function globalAe() {
    portConfig = null;
}


describe('BosSocket', () => {

    context('properties', () => {
        beforeEach(initBe);
        beforeEach(instanceBe);
        afterEach(globalAe);

        it('should return correct value from bufferCapacity property', () => {
            assert.strictEqual(bosSocket.bufferCapacity, 768);
        });

        it('should return correct value from shouldEnforceObj property', () => {
            assert.strictEqual(bosSocket.shouldEnforceObj, false);
        });
    });

    describe('send function', () => {
        beforeEach(initBe);
        beforeEach(instanceBe);
        afterEach(globalAe);

        it('should write serialized data via write function', done => {
            bosSocket.write = function() {
                done();
            }
            bosSocket.send({ abc: '123' });
        });

        it('should write correct BOS serialized data', done => {
            const msg = { abc: '123' };
            bosSocket.write = function(data, message) {
                assert.strictEqual(Buffer.isBuffer(data), true);
                const expectedBuf = bos.serialize(msg);
                assert.deepEqual(data, expectedBuf);
                assert.deepEqual(message, msg);
                done();
            }
            bosSocket.send(msg);
        });

        it('should return correct data', () => {
            const msg = { abc: '123' };
            bosSocket.write = function() {}
            const result = bosSocket.send(msg);
            assert.deepEqual(result.data, bos.serialize(msg));
        });

        it('should return correct message', () => {
            const msg = { abc: '123' };
            bosSocket.write = function() {}
            const result = bosSocket.send(msg);
            assert.deepEqual(result.message, msg);
        });
    });

    describe('$onSocketData function', () => {
        beforeEach(initBe);
        beforeEach(instanceBe);
        afterEach(globalAe);


        it('should emit EVENT_FLOOD if message data length exceeds maxMessageBytes limitation', done => {
            bosSocket.on(TcpSocket.EVENT_FLOOD, () => {
                done();
            });
            const msgBuf = bos.serialize({
                buf: Buffer.alloc(768)
            });
            netSocket.emit('data', msgBuf);
        });

        it('should emit EVENT_FLOOD if buffer data exceeds maxBytes limitation', done => {
            bosSocket.on(TcpSocket.EVENT_FLOOD, () => {
                done();
            });
            const msgBuf = [
                bos.serialize({ buf: Buffer.alloc(256) }),
                bos.serialize({ buf: Buffer.alloc(256) }),
                bos.serialize({ buf: Buffer.alloc(256) }),
                bos.serialize({ buf: Buffer.alloc(256) }),
                bos.serialize({ buf: Buffer.alloc(256) })
            ];
            netSocket.emit('data', Buffer.concat(msgBuf));
        });

        it('should emit EVENT_FLOOD if buffer data indicates the message will exceed maxMessageBytes', done => {
            bosSocket.on(TcpSocket.EVENT_FLOOD, () => {
                done();
            });
            const msgBuf = bos.serialize({ buf: Buffer.alloc(256) });
            msgBuf.writeUInt32LE(2048, 0);

            netSocket.emit('data', msgBuf);
        });

        it('should emit EVENT_MALFORMED_MESSAGE if buffer data is not valid', done => {
            bosSocket.on(TcpSocket.EVENT_MALFORMED_MESSAGE, () => {
                done();
            });
            const msgBuf = Buffer.from('This is invalid data', 'utf8');

            // Message can also get flagged as a flood if the length indicated in the first 4 bytes happen to exceed
            // limitations or the socket will wait for more data if the length happens to be larger than the actual data.
            // Setting the first 4 bytes to a value within limitation ensures the test is valid.
            msgBuf.writeUInt32LE(10, 0);

            netSocket.emit('data', msgBuf);
        });

        it('should emit EVENT_MESSAGES if a message is deserialized', done => {
            const msg = { abc: '123' };

            bosSocket.on(TcpSocket.EVENT_MESSAGES, ev => {
                delete ev.messagesArr[0]._bufferTimeMs;
                assert.deepEqual(ev.messagesArr[0], msg);
                done();
            });

            netSocket.emit('data', bos.serialize(msg));
        });

        it('should emit EVENT_MESSAGE_IN for each deserialized message', () => {
            const msg1 = { abc: '123' };
            const msg2 = { abc: '456' };
            let count = 0;

            bosSocket.on(TcpSocket.EVENT_MESSAGE_IN, ev => {
                count++;
                delete ev.message._bufferTimeMs;
                if (count === 1) {
                    assert.deepEqual(ev.message, msg1);
                }
                else if (count === 2) {
                    assert.deepEqual(ev.message, msg2);
                }
                else {
                    throw new Error('Too many emits');
                }
            });

            netSocket.emit('data', Buffer.concat([
                bos.serialize(msg1),
                bos.serialize(msg2)
            ]));

            assert.strictEqual(count, 2);
        });
    });
});