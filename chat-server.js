"use strict";

process.title = 'dilemaprisioneiro';

var webSocketsServerPort = 443;
var webSocketServer = require('websocket').server;
var http = require('http');
var fs = require('fs');

var history = [];
var clients = [];

let testimonyFirst = null;

function htmlEntities(str) {
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;')
                      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

var colors = [ 'red', 'green', 'blue', 'magenta', 'purple', 'plum', 'orange' ];
colors.sort(function(a,b) { return Math.random() > 0.5; } );

var server = http.createServer(function(request, response) {

    var readStream;

    switch (request.url) {
        case '/':
            response.writeHead(200, {'Content-Type': 'text/html'});
            readStream = fs.createReadStream(__dirname + '/index.html','utf8');
            break;
        case '/frontend.js':
            response.writeHead(200, {'Content-Type': 'application/javascript'});
            readStream = fs.createReadStream(__dirname + '/frontend.js','utf8');
            break;
        default:
            response.writeHead(200, {'Content-Type': 'text/html'});
            // readStream = '404';
            readStream = fs.createReadStream(__dirname + '/index.html','utf8');
            break;
    }

    console.log('Page: ' + request.url);

    readStream.pipe(response);

});

server.listen(webSocketsServerPort, function() {
    console.log((new Date()) + " Server is listening on port " + webSocketsServerPort);
});

var wsServer = new webSocketServer({
    httpServer: server
});

wsServer.on('request', function(request) {
    console.log((new Date()) + ' Connection from origin ' + request.origin + '.');
    var connection = request.accept(null, request.origin);
    var index = clients.push(connection) - 1;
    var user = {id: false,name: '', action: false};
    var userColor = false;

    console.log((new Date()) + ' Connection accepted.');

    if (history.length > 0) {
        connection.sendUTF(JSON.stringify( { type: 'history', data: history} ));
    }

    connection.on('message', function(message) {

        console.log(message);

        if (message.type === 'utf8') {

            var dataBody = JSON.parse(message.utf8Data);

            if (dataBody.name) {
                user.id = htmlEntities(dataBody.userId);
                user.name = htmlEntities(dataBody.name);
                userColor = colors.shift();
                connection.sendUTF(JSON.stringify({ type:'color', data: userColor }));
            } else if (dataBody.msg) {
                console.log('Message:' + dataBody.msg);
                sendClient('message',{
                    time: (new Date()).getTime(),
                    text: htmlEntities(dataBody.msg),
                    author: user.name,
                    color: userColor
                });
            } else if (dataBody.action) {

                user.action = dataBody.action;

                sendClientTestimony(
                    'action',
                    user,
                    {
                        time: (new Date()).getTime(),
                        action: dataBody.action,
                        author: user.name,
                        id: user.id,
                        color: userColor
                    }
                );
            }
        }
    });

    function sendClient(type, obj) {
        history.push(obj);
        history = history.slice(-100);

        var json = JSON.stringify({ type: type, data: obj});
        for (let i=0; i < clients.length; i++) {
            clients[i].sendUTF(json);
        }
    }

    function sendClientTestimony(type, user, obj) {
        history.push(obj);
        history = history.slice(-100);

        for (let i=0; i < clients.length; i++) {
            var json = JSON.stringify({ type: type, data: obj });
            clients[i].sendUTF(json);
        }


        if (testimonyFirst) {
            // alguem á votou
            judicialSentence(testimonyFirst, user);

            testimonyFirst = null;
        } else {
            // primeiro a
            testimonyFirst = user;
            console.log(testimonyFirst.action)
        }
    }

    function judicialSentence(firstUser, currentUser) {

        if (!firstUser.action || !currentUser.action) {
            return;
        }

        // cooperar ou trair
        if (firstUser.action === currentUser.action) {
            if (firstUser.action === 'cooperar') {
                firstUser.sentence = 'condenado em 5 anos';
                currentUser.sentence = 'condenado em 5 anos';
            } else {
                firstUser.sentence = 'condenado em 6 meses';
                currentUser.sentence = 'condenado em 6 meses';
            }
        } else if (firstUser.action === 'cooperar') {
            // somente o first cooperou
            firstUser.sentence = 'solto'
            currentUser.sentence = 'condenado em 10 anos'
        } else {
            // somente o current cooperou
            firstUser.sentence = 'condenado em 10 anos'
            currentUser.sentence = 'solto'
        }

        for (let i=0; i < clients.length; i++) {
            var json = JSON.stringify({ type: 'finish', data: [firstUser, currentUser]});
            clients[i].sendUTF(json);
        }

    }

    connection.on('close', function(connection) {
        if (user.name !== false && userColor !== false) {
            console.log((new Date()) + " Peer "
                + connection.remoteAddress + " saiu.");
            clients.splice(index, 1);
            colors.push(userColor);
        }
    });
});