$(function () {
    "use strict";

    var content = $('#content');
    var inputChat = $('#inputchat');
    var status = $('#status');
    $('#alert').hide();
    $('.form-chat').hide();

    var myData = {
        id: (new Date()).getTime(),
        color: false,
        action: false,
        actionOpponent: false
    }

    function reset()
    {
        myData.action = false;
        myData.actionOpponent = false;
    }

    window.WebSocket = window.WebSocket || window.MozWebSocket;

    if (!window.WebSocket) {
        content.html($('<p>', { text: 'Desculpe seu navegador não tem suporte.'} ));
        $('#input').hide();
        $('span').hide();
        return;
    }

    var connection = new WebSocket('ws://127.0.0.1:3000');
    connection.onopen = function () {
        $('#input').removeAttr('disabled');
        status.text('Seu Nome:');
    };

    connection.onerror = function (error) {
        content.html($('<p>', { text: 'Erro inesperado.' } ));
    };

    connection.onmessage = function (message) {
        try {
            var json = JSON.parse(message.data);
        } catch (e) {
            console.log('Json Inválido: ', message.data);
            return;
        }

        if (json.type === 'color') {
            myData.color = json.data;
            inputChat.removeAttr('disabled').focus();
        } else if (json.type === 'history') {
            console.log(json.data)
            for (var i=0; i < json.data.length; i++) {
                if (json.data[i].action) {
                    addMessageAction(json.data[i].author, json.data[i].text,
                        json.data[i].color, new Date(json.data[i].time));
                    calcular(json.data);
                } else {
                    addMessage(json.data[i].author, json.data[i].text,
                        json.data[i].color, new Date(json.data[i].time));
                }
            }
        } else if (json.type === 'message') {
            inputChat.removeAttr('disabled');
            addMessage(json.data.author, json.data.text,
                       json.data.color, new Date(json.data.time));
        } else if (json.type === 'action') {
            inputChat.removeAttr('disabled');
            addMessageAction(json.data.author, json.data.text,
                       json.data.color, new Date(json.data.time));
        } else if (json.type === 'finish') {

            let users = json.data;

            let colorAlert = '';
            let messageAlert = '';

            messageAlert = '<b>' + users[0].name + 'foi :</b>' + users[0].sentence + '<br>' +
                '<b>' + users[1].name + '</b> foi: '+ users[1].sentence;

            $('#alert').show().html(messageAlert);
        } else {
            console.log('Hmm..., I\'ve never seen JSON like this: ', json);
        }
    };

    inputChat.keydown(function(e) {
        if (e.keyCode === 13) {
            var msg = $(this).val();
            if (!msg) {
                return;
            }
            sendMessage({msg: msg});
            $(this).val('');
            inputChat.attr('disabled', 'disabled');
        }
    });

    $('#start').click(function () {
        let name = $('#input').val();
        sendMessage({userId: myData.id, name: name});
        $('#input').val('');
        $('.form-name').hide();
        $('.form-chat').show();
    });

    $('.btn-acao').click(function () {
        myData.action = $(this).data('acao');
        sendMessage({action: myData.action});
        $('#input').val('');
        $('.acao').hide();
    });

    function sendMessage(obj)
    {
        //JSON.parse
        connection.send(JSON.stringify(obj));
    }


    setInterval(function() {
        if (connection.readyState !== 1) {
            $('#content').attr('disabled', 'disabled').val('Unable to comminucate with the WebSocket server.');
        }
    }, 3000);

    function addMessage(author, message, color, dt) {
        content.prepend('<p><span style="color:' + color + '">' + author + '</span> @ ' +
             + (dt.getHours() < 10 ? '0' + dt.getHours() : dt.getHours()) + ':'
             + (dt.getMinutes() < 10 ? '0' + dt.getMinutes() : dt.getMinutes())
             + ': ' + message + '</p>');
    }

    function addMessageAction(author, message, color, dt) {
        content.prepend('<p>'+(dt.getHours() < 10 ? '0' + dt.getHours() : dt.getHours()) + ':' + (dt.getMinutes() < 10 ? '0' + dt.getMinutes() : dt.getMinutes())
            + ': <b><span style="color:' + color + '">' + author + '</span> deu o depoimento</b></p>');
    }
});