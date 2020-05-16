'use strict';

module.exports = {
    /* Abstract */
    TcpSocket: require('./libs/abstract.TcpSocket'),

    /* Implementations */
    BosSocket: require('./libs/class.BosSocket'),
    JsonSocket: require('./libs/class.JsonSocket'),

    /* Utils */
    SocketLimitBuffer: require('./libs/class.SocketLimitBuffer'),
    SocketWriter: require('./libs/class.SocketWriter')
};