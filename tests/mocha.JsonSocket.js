'use strict';

const
    assert = require('assert'),
    NetSocket = require('net').Socket,
    TcpSocket = require('./../libs/abstract.TcpSocket'),
    JsonSocket = require('./../libs/class.JsonSocket');

let portConfig;
let netSocket;
let jsonSocket;

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
    jsonSocket = new JsonSocket({ netSocket: netSocket, portConfig: portConfig });
}

function globalAe() {
    portConfig = null;
}


describe('JsonSocket', () => {

    context('properties', () => {
        beforeEach(initBe);
        beforeEach(instanceBe);
        afterEach(globalAe);

        it('should return correct value from shouldEnforceObj property', () => {
            assert.strictEqual(jsonSocket.shouldEnforceObj, false);
        });
    });

    describe('send function', () => {
        beforeEach(initBe);
        beforeEach(instanceBe);
        afterEach(globalAe);

        it('should write serialized data via write function', done => {
            jsonSocket.write = function() {
                done();
            }
            jsonSocket.send({ abc: '123' });
        });

        it('should write correct JSON serialized data', done => {
            const msg = { abc: '123' };
            jsonSocket.write = function(data, message) {
                assert.strictEqual(typeof data, 'string');
                const expectedJson = JSON.stringify(msg) + '\n';
                assert.deepEqual(data, expectedJson);
                assert.deepEqual(message, msg);
                done();
            }
            jsonSocket.send(msg);
        });

        it('should return correct data', () => {
            const msg = { abc: '123' };
            jsonSocket.write = function() {}
            const result = jsonSocket.send(msg);
            assert.deepEqual(result.data, JSON.stringify(msg) + '\n');
        });

        it('should return correct message', () => {
            const msg = { abc: '123' };
            jsonSocket.write = function() {}
            const result = jsonSocket.send(msg);
            assert.deepEqual(result.message, msg);
        });
    });

    describe('$onSocketData function', () => {
        beforeEach(initBe);
        beforeEach(instanceBe);
        afterEach(globalAe);


        it('should emit EVENT_FLOOD if message data length exceeds maxMessageBytes limitation', done => {
            jsonSocket.on(TcpSocket.EVENT_FLOOD, () => {
                done();
            });
            const msgBuf = JSON.stringify({
                buf: Buffer.alloc(Math.round(768 / 2)).toString('hex')
            });
            netSocket.emit('data', msgBuf);
        });

        it('should emit EVENT_FLOOD if buffer data exceeds maxBytes limitation', done => {
            jsonSocket.on(TcpSocket.EVENT_FLOOD, () => {
                done();
            });
            const msgArr = [
                JSON.stringify({ buf: Buffer.alloc(128).toString('hex') }),
                JSON.stringify({ buf: Buffer.alloc(128).toString('hex') }),
                JSON.stringify({ buf: Buffer.alloc(128).toString('hex') }),
                JSON.stringify({ buf: Buffer.alloc(128).toString('hex') }),
                JSON.stringify({ buf: Buffer.alloc(128).toString('hex') }),
            ];
            netSocket.emit('data', Buffer.from(msgArr.join('\n') + '\n', 'utf8'));
        });

        it('should emit EVENT_MALFORMED_MESSAGE if buffer data is not valid', done => {
            jsonSocket.on(TcpSocket.EVENT_MALFORMED_MESSAGE, () => {
                done();
            });
            const msgBuf = Buffer.from('This is invalid data\n', 'utf8');

            netSocket.emit('data', msgBuf);
        });

        it('should emit EVENT_MESSAGES if a message is deserialized', done => {
            const msg = { abc: '123' };

            jsonSocket.on(TcpSocket.EVENT_MESSAGES, ev => {
                delete ev.messagesArr[0]._bufferTimeMs;
                assert.strictEqual(ev.messagesArr[0], JSON.stringify(msg));
                done();
            });

            netSocket.emit('data', Buffer.from(JSON.stringify(msg) + '\n', 'utf8'));
        });

        it('should emit EVENT_MESSAGE_IN for each deserialized message', () => {
            const msg1 = { abc: '123' };
            const msg2 = { abc: '456' };
            let count = 0;

            jsonSocket.on(TcpSocket.EVENT_MESSAGE_IN, ev => {
                count++;
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

            netSocket.emit('data', Buffer.from([
                JSON.stringify(msg1),
                JSON.stringify(msg2)
            ].join('\n') + '\n', 'utf8'));

            assert.strictEqual(count, 2);
        });
    });
});