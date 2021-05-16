# videocalls.js

**Video chat via WebSocket + WebRTC**

A simple basic implementation of a video chat in JavaScript, no extra stuff, clean code.

You just need the WebSocket server logic (I use Django 3 + channels + daphne) and styles for all this stuff. 

Use **initializeVideoCall()** to run

### **Argumetns:**

- **webSocketUrl** - link to WebSocket handler
- **onlyAudioHandler** - handler function if only microphone is available
- **userMediaErrorHandler** - getUserMedia error handler function
- **userNoAudioErrorHandler** - getUserMedia error handler function without microphone
- **localVideoElement** - element for displaying local stream
- **remoteVideoElement** - element for displaying remote stream
- **maxVideoWidth** - maximum video width
- **maxVideoHeight** - maximum video height
- **maxFrameRate** - maximum frame rate

### **Communication Steps:**

1. Create a WebSocket connection (webSocketConnection = new WebSocket(webSocketUrl))
2. We take the user's stream (getUserMediaSuccess(stream))
3. Create a WebRTC connection (RTCConnection = new RTCPeerConnection(RTCConnectionConfig))
4. Add user stream to WebRTC (RTCConnection.addStream(localStream))
5. Create a WebRTC offer (RTCConnection.createOffer())
6. Write the offer to the local WebRTC description and send it via WebSocket(sendDescription(description)) (sdp)
7. Waiting for a WebSocket message (webSocketConnection.onmessage = gotDataFromServer)
8. We receive a message in WebSocket, check, parse, receive sdp
9. Write the offer to the remote WebRTC description (RTCConnection.setRemoteDescription(new RTCSessionDescriptio(signal.sdp)))
10. Create WebRTC answer and similarly repeat step 5 (RTCConnection.createAnswer().then(sendDescription)) (sdp)
11. Connection established
12. Next, WebRTC tries to send a local stream via sendLocalStream and receive via gotRemoteStream

### Additional functions:

- **errorHandler(error)** - Error processing
- **toggleTrack(type)** - Track state switching (on/off) ('audio'/'video')
- **endCall()** - End call
