mint-socket
===========

This module contains wrappers for NodeJS net.Socket to aid in serialization of outgoing and incoming data used by [MintPond Mining Pool](https://mintpond.com).

## Install ##
```bash
# Install from Github NPM repository

npm config set @mintpond:registry https://npm.pkg.github.com/mintpond
npm config set //npm.pkg.github.com/:_authToken <MY_GITHUB_AUTH_TOKEN>

npm install @mintpond/mint-socket@1.0.0 --save
```

[Creating a personal access token](https://help.github.com/en/github/authenticating-to-github/creating-a-personal-access-token-for-the-command-line)

__Install & Test__
```bash
# Install nodejs v10
curl -sL https://deb.nodesource.com/setup_10.x | sudo -E bash -
sudo apt-get install nodejs -y

# Download mint-socket
git clone https://github.com/MintPond/mint-socket

# build & test
cd mint-socket
npm install
npm test
``` 

## Examples ##

__JSON__
```javascript
const
    net = require('net'),
    TcpSocket = require('@mintpond/mint-socket').TcpSocket,
    JsonSocket = require('@mintpond/mint-socket').JsonSocket;

const server = new net.Server(netSocket => {

    const socket = new JsonSocket({ netSocket: netSocket });
    socket.on(TcpSocket.EVENT_MESSAGE_IN, ev => {
        console.log(ev.message);
    });

    socket.send({
        abc: '123'
    });
});
```

__BOS__
```javascript
const
    net = require('net'),
    TcpSocket = require('@mintpond/mint-socket').TcpSocket,
    BosSocket = require('@mintpond/mint-socket').BosSocket;

const server = new net.Server(netSocket => {

    const socket = new BosSocket({ netSocket: netSocket });
    socket.on(TcpSocket.EVENT_MESSAGE_IN, ev => {
        console.log(ev.message);
    });

    socket.send({
        abc: '123'
    });
});
```