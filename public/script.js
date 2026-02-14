const socket = io();
const videoGrid = document.getElementById('video-grid');
const myVideo = document.getElementById('myVideo');
const partnerVideo = document.getElementById('partnerVideo');
const startBtn = document.getElementById('startBtn');

let myStream;
let peer;

navigator.mediaDevices.getUserMedia({
    video: true,
    audio: true
}).then(stream => {
    myStream = stream;
    addVideoStream(myVideo, stream);
}).catch(err => {
    console.error("Error accessing media devices.", err);
    alert("Please allow camera and microphone access!");
});

startBtn.addEventListener('click', () => {
    startBtn.disabled = true;
    startBtn.innerText = "Searching for a stranger...";
    socket.emit('join_queue');
});

socket.on('match_found', (data) => {
    startBtn.innerText = "Stranger found!";
    const partnerId = data.partnerId;
    const initiator = data.initiator;

    peer = new SimplePeer({
        initiator: initiator,
        stream: myStream,
        trickle: false
    });

    peer.on('signal', (signal) => {
        socket.emit('signal', {
            target: partnerId,
            signal: signal
        });
    });

    peer.on('stream', (stream) => {
        partnerVideo.srcObject = stream;
        partnerVideo.play();
    });

    peer.on('error', (err) => {
        console.error('Peer error:', err);
        alert("Connection failed. Try again.");
        reset();
    });
    
    window.peer = peer;
});

socket.on('signal', (data) => {
    if (peer) {
        peer.signal(data.signal);
    }
});

function addVideoStream(video, stream) {
    video.srcObject = stream;
    video.addEventListener('loadedmetadata', () => {
        video.play();
    });
}

function reset() {
    startBtn.disabled = false;
    startBtn.innerText = "Search";
    if (peer) {
        peer.destroy();
        peer = null;
    }
    partnerVideo.srcObject = null;
}