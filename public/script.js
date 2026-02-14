const socket = io(); 
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
    alert("Please allow camera access!");
});

startBtn.addEventListener('click', () => {
    const status = startBtn.innerText;

    if (status === "Find Stranger" || status === "Next Stranger") {
        startSearch();
    } else if (status === "Leave") {
        skipPartner();
    }
});

function startSearch() {
    startBtn.innerText = "Searching...";
    startBtn.disabled = true;
    socket.emit('join_queue');
}

function skipPartner() {
    if (peer) {
        peer.destroy();
        peer = null;
    }
    partnerVideo.srcObject = null;
    
    startSearch();
}

socket.on('match_found', (data) => {
    startBtn.disabled = false;
    startBtn.innerText = "Leave";
    
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

    peer.on('close', () => {
        handlePartnerDisconnect();
    });
    
    peer.on('error', (err) => {
        console.log("Peer error:", err);
        handlePartnerDisconnect();
    });

    window.peer = peer;
});

socket.on('signal', (data) => {
    if (peer) {
        peer.signal(data.signal);
    }
});

function handlePartnerDisconnect() {
    if (peer) {
        peer.destroy();
        peer = null;
    }
    partnerVideo.srcObject = null;
    startBtn.innerText = "Next Stranger";
    startBtn.disabled = false;
    alert("Stranger disconnected.");
}

function addVideoStream(video, stream) {
    video.srcObject = stream;
    video.addEventListener('loadedmetadata', () => {
        video.play();
    });
}
