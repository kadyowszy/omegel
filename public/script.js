const socket = io();
const myVideo = document.getElementById('myVideo');
const partnerVideo = document.getElementById('partnerVideo');
const startBtn = document.getElementById('startBtn');

let myStream;
let peer;

let isSearching = false;
let isConnected = false;

navigator.mediaDevices.getUserMedia({ video: true, audio: true })
    .then(stream => {
        myStream = stream;
        myVideo.srcObject = stream;
        myVideo.play();
    })
    .catch(err => {
        console.error("Camera Error:", err);
        alert("Camera blocked! Please allow access.");
    });

startBtn.addEventListener('click', (e) => {
    e.preventDefault(); 

    if (isConnected) {
        skipPartner();
    } else if (isSearching) {
        stopSearch();
    } else {
        startSearch();
    }
});

function startSearch() {
    isSearching = true;
    startBtn.innerText = "Searching...";
    startBtn.disabled = true;
    socket.emit('join_queue');
}

function stopSearch() {
    isSearching = false;
    startBtn.innerText = "Search";
    startBtn.disabled = false;
    location.reload();
}

function skipPartner() {
    isConnected = false;
    isSearching = true;

    if (peer) {
        peer.destroy();
        peer = null;
    }
    partnerVideo.srcObject = null;
    
    startSearch();
}

socket.on('match_found', (data) => {
    isConnected = true;
    isSearching = false;
    
    startBtn.innerText = "Leave";
    startBtn.disabled = false;

    peer = new SimplePeer({
        initiator: data.initiator,
        stream: myStream,
        trickle: false
    });

    peer.on('signal', (signal) => {
        socket.emit('signal', { target: data.partnerId, signal: signal });
    });

    peer.on('stream', (stream) => {
        partnerVideo.srcObject = stream;
        partnerVideo.play();
    });

    peer.on('close', () => {
        handlePartnerDisconnect();
    });
    
    peer.on('error', (err) => {
        console.error("Peer error:", err);
        handlePartnerDisconnect();
    });
});

socket.on('signal', (data) => {
    if (peer) {
        peer.signal(data.signal);
    }
});

function handlePartnerDisconnect() {
    isConnected = false;
    isSearching = false;
    if (peer) {
        peer.destroy();
        peer = null;
    }
    partnerVideo.srcObject = null;
    startBtn.innerText = "Search";
    startBtn.disabled = false;
    alert("Stranger disconnected.");
}
