var Beam = require('beam-client-node');
var BeamSocket = require('beam-client-node/lib/ws');

var winsay = require('./node-winsay/winsay');
var ent = require('ent');

var channel = "Beam-Username";
var beam = new Beam();
var socket;

var userID = 0;
var channelID = 0;


function extractTextFromMessagePart(part) {
	if (part == undefined) {
		return '';
	}
	if (typeof part === "object") {
		if (part.type != null && part.type === 'text') {
			return part.data;
		}

		if(part.text != null) {
			return ' ' + part.text;
		}

		return '';
	}
	return part;
}

//Flatten a beam message down into a string
function flattenBeamMessage(message) {
	var result = '';
	if (message.length !== undefined) {
		if(message.length > 1 ) {
			result = message.reduce(function (previous, current) {
				if (!previous) {
					previous = '';
				}
				if (typeof previous === 'object') {
					previous = extractTextFromMessagePart(previous);
				}
				return previous + extractTextFromMessagePart(current);
			});
		} else if(message.length === 1) {
			result = extractTextFromMessagePart(message[0]);
		} else {
			return '';
		}
	} else {
		result = message;
	}
	return ent.decode(result);
}

beam.use('password', {
    username: 'Beam-Username',
    password: 'Beam-Password'
}).attempt().then(function (res) {
    userID = res.body.id;
    return beam.request('get', '/channels/' + channel);
}).then(function(res){
    channelID = res.body.id;
    return beam.chat.join(res.body.id);
}).then(function (res) {
    var data = res.body;
    socket = new BeamSocket(data.endpoints).boot();
    return socket.call('auth', [channelID, userID, data.authkey]);
}).then(function(){
    console.log('You are now authenticated!');
    socket.on('ChatMessage', function (data) {
        console.log('We got a ChatMessage packet!');
        console.log(data.message.message);
        winsay.speak(null,data.user_name +' '+ flattenBeamMessage(data.message.message));
    });
}).catch(function (err) {
    //If this is a failed request, don't log the entire request. Just log the body
    if(err.message !== undefined && err.message.body !== undefined) {
        err = err.message.body;
    }
    console.log('error joining chat:', err);
});
