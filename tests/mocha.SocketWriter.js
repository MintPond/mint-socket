'use strict';

const
    assert = require('assert'),
    NetSocket = require('net').Socket,
    SocketWriter = require('./../libs/class.SocketWriter');

let netSocket;
let writerArgs;
let socketWriter;

function initBe() {

    netSocket = new NetSocket();

    writerArgs = writerArgs || {
        netSocket: netSocket
    };
}

function instanceBe() {
    socketWriter = new SocketWriter(writerArgs);
}

function globalAe() {
    writerArgs = null;
}

describe('SocketWriter', () => {

    context('properties', () => {
        beforeEach(initBe);
        beforeEach(() => {
            writerArgs = {
                netSocket: netSocket,
                shouldDelayWrites: true,
                delayMs: 100
            };
        })
        beforeEach(instanceBe);
        afterEach(globalAe);

        it('should return correct value from shouldDelayWrites property', () => {
            assert.strictEqual(socketWriter.shouldDelayWrites, true);
        });

        it('should return correct value from delayMs property', () => {
            assert.strictEqual(socketWriter.delayMs, 100);
        });

        it('should correctly set value of shouldDelayWrites property', () => {
            socketWriter.shouldDelayWrites = false;
            assert.strictEqual(socketWriter.shouldDelayWrites, false);
        });

        it('should correctly set value of delayMs property', () => {
            socketWriter.delayMs = 1234;
            assert.strictEqual(socketWriter.delayMs, 1234);
        });
    });


    describe('write function', function () {

        context('shouldDelayWrites = false', () => {
            beforeEach(initBe);
            beforeEach(() => {
                writerArgs = {
                    netSocket: netSocket,
                    shouldDelayWrites: false,
                    delayMs: 100
                };
            })
            beforeEach(instanceBe);
            afterEach(globalAe);

            it('should first message to socket without delay', () => {
                let isWritten = false;
                netSocket.write = function() {
                    isWritten = true;
                }
                socketWriter.write('data');
                assert.strictEqual(isWritten, true);
            });

            it('should multiple messages to socket without delay', () => {
                let writeCount = 0;
                netSocket.write = function() {
                    writeCount++;
                }
                socketWriter.write('data1');
                socketWriter.write('data2');
                socketWriter.write('data3');
                assert.strictEqual(writeCount, 3);
            });
        });

        context('shouldDelayWrites = true', () => {
            beforeEach(initBe);
            beforeEach(() => {
                writerArgs = {
                    netSocket: netSocket,
                    shouldDelayWrites: true,
                    delayMs: 100
                };
            })
            beforeEach(instanceBe);
            afterEach(globalAe);

            it('should write first message to socket without delay', () => {
                let isWritten = false;
                netSocket.write = function() {
                    isWritten = true;
                }
                socketWriter.write('data');
                assert.strictEqual(isWritten, true);
            });

            it('should add delay between 2 messages', done => {
                let writeCount = 0;
                netSocket.write = function() {
                    writeCount++;
                }
                socketWriter.write('data');
                socketWriter.write('data');
                assert.strictEqual(writeCount, 1);
                setTimeout(() => {
                    assert.strictEqual(writeCount, 2);
                    done();
                },110);
            });

            it('should add correct amount of delay', done => {
                let writeCount = 0;
                netSocket.write = function() {
                    writeCount++;
                }
                socketWriter.write('data');
                socketWriter.write('data');
                assert.strictEqual(writeCount, 1);
                setTimeout(() => {
                    assert.strictEqual(writeCount, 1);
                },55);

                setTimeout(() => {
                    assert.strictEqual(writeCount, 2);
                    done();
                },110);
            });
        });
    });

});