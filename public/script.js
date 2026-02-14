const socket = io();
const myVideo = document.getElementById('myVideo');
const partnerVideo = document.getElementById('partnerVideo');
const statusText = document.getElementById('statusText');
const startBtn = document.getElementById('startBtn');

let myStream;
let peer;
let isConnected = false;
let isSearching = false;

navigator.mediaDevices.getUserMedia({ video: true, audio: true })
    .then(stream => {
        myStream = stream;
        myVideo.srcObject = stream;
        myVideo.play();
    })
    .catch(err => {
        console.error("Camera Error:", err);
        statusText.innerText = "Camera Blocked";
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
    
    partnerVideo.style.display = 'none';
    statusText.style.display = 'block';
    statusText.innerText = "Looking for someone...";
    
    socket.emit('join_queue');
}

function stopSearch() {
    isSearching = false;
    startBtn.innerText = "Search";
    startBtn.disabled = false;
    statusText.innerText = "Click Search";
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
    partnerVideo.style.display = 'none';
    
    statusText.style.display = 'block';
    statusText.innerText = "Skipping...";
    
    startSearch();
}

socket.on('match_found', (data) => {
    isConnected = true;
    isSearching = false;
    
    startBtn.innerText = "Leave"; 
    startBtn.disabled = false;

    statusText.innerText = "Connecting...";
    partnerVideo.style.display = 'none'; 

    peer = new SimplePeer({
        initiator: data.initiator,
        stream: myStream,
        trickle: false
    });

    peer.on('signal', (signal) => {
        socket.emit('signal', { target: data.partnerId, signal: signal });
    });

    peer.on('stream', (stream) => {
        statusText.style.display = 'none'; 
        partnerVideo.style.display = 'block'; 
        
        partnerVideo.srcObject = stream;
        partnerVideo.play();
    });

    peer.on('close', () => {
        handlePartnerDisconnect();
    });
    
    peer.on('error', (err) => {
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
    
    partnerVideo.style.display = 'none';
    statusText.style.display = 'block';
    statusText.innerText = "Stranger disconnected.";
    
    startBtn.innerText = "Search"; 
    startBtn.disabled = false;
}
