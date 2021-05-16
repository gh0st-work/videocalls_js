var localVideoElement;
var remoteVideoElement;
var localStream;
var RTCConnection;
var webSocketConnection;


var RTCConnectionConfig = {
    // Stun and turn servers
    'iceServers': [
        {'urls': 'stun:stun.stunprotocol.org:3478'},
        {'urls': 'stun:stun.l.google.com:19302'},
    ]
};

function uuid4() {
    // Creating uuid4 to differentiate users
    return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
        (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
    );
}

var id = uuid4();

function initializeVideoCall(
    webSocketUrl,
    onlyAudioHandler = () => {},
    userMediaErrorHandler = () => {alert('Your browser does not support the getUserMedia API, please disconnect from other video and audio streaming or upgrade to a newer version.')},
    userNoAudioErrorHandler = () => {alert('You cannot start a dialogue without access to the microphone! Please correct the problem with your microphone and reload the page.')},
    localVideoElement = document.getElementById('localVideoElement'),
    remoteVideoElement = document.getElementById('remoteVideoElement'),
    maxVideoWidth = 1280,
    maxVideoHeight = 720,
    maxFrameRate = 30,
    ) {

    window.localVideoElement = localVideoElement;
    window.remoteVideoElement = remoteVideoElement;

    // Сreate a WebSocket connection
    webSocketConnection = new WebSocket(webSocketUrl);
    webSocketConnection.onmessage = gotDataFromServer;
    if ('mediaDevices' in navigator && ('getUserMedia' in navigator.mediaDevices || 'mozGetUserMedia' in navigator.mediaDevices || 'msGetUserMedia' in navigator.mediaDevices || 'webkitGetUserMedia' in navigator.mediaDevices)) {
        // Еake the video stream of the browser
        navigator.mediaDevices.getUserMedia = (navigator.mediaDevices.getUserMedia || navigator.mediaDevices.mozGetUserMedia || navigator.mediaDevices.msGetUserMedia || navigator.mediaDevices.webkitGetUserMedia);
        navigator.mediaDevices.getUserMedia({audio: true, video: {mandatory: {maxWidth: maxVideoWidth, maxHeight: maxVideoHeight, maxFrameRate: maxFrameRate}, optional: [{facingMode: "user"}]}})
        .then(getUserMediaSuccess)
        .catch(() => {
            navigator.mediaDevices.getUserMedia({audio: true})
            .then((onlyAudioStream) => {getUserMediaSuccess(onlyAudioStream); onlyAudioHandler()})
            .catch(userNoAudioErrorHandler);
        });
    } else {
        userMediaErrorHandler();
    }
}

function getUserMediaSuccess(stream) {
    localStream = stream;
    localVideoElement.srcObject = stream;
    createRTC();
}

function createRTC() {
    // Create a WebRTC connection
    RTCConnection = new RTCPeerConnection(RTCConnectionConfig);
    RTCConnection.onicecandidate = sendLocalStream;
    RTCConnection.ontrack = gotRemoteStream;
    RTCConnection.addStream(localStream);
    // Write the offer to the remote WebRTC description and send it via WebSocket
    RTCConnection.createOffer().then(sendDescription).catch(errorHandler);
}

function gotDataFromServer(jsonData) {
    // Process messages from the server (not a pure video stream)

    if (!RTCConnection) createRTC();

    var signal = JSON.parse(jsonData.data);

    // Ignore messages from ourselves
    if (signal.id === id) return;

    if (signal.sdp) {
        // Write the answer to the remote WebRTC description and send it via WebSocket
        RTCConnection.setRemoteDescription(new RTCSessionDescription(signal.sdp)).then(() => {
            if (signal.sdp.type === 'offer') {
                RTCConnection.createAnswer().then(sendDescription).catch(errorHandler);
            }
        }).catch(errorHandler);
    } else if (signal.ice) {
        // Write the participant of the conversation to the remote WebRTC description
        RTCConnection.addIceCandidate(new RTCIceCandidate(signal.ice)).catch(errorHandler);
    }
}

function webSocketSend(data) {
    if (webSocketConnection.readyState === webSocketConnection.OPEN) {
        webSocketConnection.send(data);
    } else {
        setTimeout(function(){
            console.log('Waiting for ws...');
            webSocketSend(data);
        }, 500);
    }
}

function sendLocalStream(event) {
    // Send the data of the participant of the conversation
    if (event.candidate != null) {
        webSocketSend(JSON.stringify({'ice': event.candidate, 'id': id}));
    }
}

function sendDescription(description) {
    // Write offer/answer to the local description of WebRTC and send via WebSocket (sdp)
    RTCConnection.setLocalDescription(description).then(() => {
        webSocketSend(JSON.stringify({'sdp': RTCConnection.localDescription, 'id': id}));
    }).catch(errorHandler);
}

function gotRemoteStream(event) {
    // Outputting the received stream
    remoteVideoElement.srcObject = event.streams[0];
}

function errorHandler(error) {
    // Error processing
    console.log(error);
}

function toggleTrack(type) {
    // Track state switching (on/off) ('audio'/'video')
    var enabled;
    localStream.getTracks().forEach((track) => {
        if (track.kind === type) {
            track.enabled = !track.enabled;
            enabled = track.enabled;
        }
    });
    return enabled;
}

function endCall() {
    // End call
    RTCConnection.close();
    webSocketConnection.close();
}
