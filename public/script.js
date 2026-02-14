const socket = io();

const myVideo = document.getElementById('myVideo');
const partnerVideo = document.getElementById('partnerVideo');
const statusText = document.getElementById('statusText');
const startBtn = document.getElementById('startBtn');
const cameraSelect = document.getElementById('cameraSelect');

let myStream;
let peer;
let isConnected = false;
let isSearching = false;

getCameras();
startMyStream();

async function getCameras() {
    try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(device => device.kind === 'videoinput');
        
        cameraSelect.innerHTML = ""; 
        
        videoDevices.forEach(device => {
            const option = document.createElement('option');
            option.value = device.deviceId;
            option.text = device.label || `Camera ${cameraSelect.length + 1}`;
            cameraSelect.appendChild(option);
        });
    } catch (err) {
        console.error("Error fetching cameras:", err);
    }
}

async function startMyStream(deviceId = null) {
    if (myStream) {
        myStream.getTracks().forEach(track => track.stop());
    }

    const constraints = {
        audio: true,
        video: deviceId ? { deviceId: { exact: deviceId } } : true
    };

    try {
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        myStream = stream;
        myVideo.srcObject = stream;
        
        if (peer) {
            const videoTrack = myStream.getVideoTracks()[0];
            const sender = peer._pc.getSenders().find(s => s.track.kind === videoTrack.kind);
            if (sender) {
                sender.replaceTrack(videoTrack);
            }
        }
    } catch (err) {
        console.error("Camera access denied:", err);
        statusText.innerText = "Camera Blocked / Not Found";
    }
}

cameraSelect.addEventListener('change', () => {
    startMyStream(cameraSelect.value);
});

startBtn.addEventListener('click', (e) => {
    e.preventDefault();
    if (isConnected) disconnectManual();
    else if (isSearching) stopSearch();
    else startSearch();
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

function disconnectManual() {
    isConnected = false;
    isSearching = false;

    if (peer) {
        peer.destroy();
        peer = null;
    }
    partnerVideo.srcObject = null;
    
    partnerVideo.style.display = 'none';
    statusText.style.display = 'block';
    statusText.innerText = "You disconnected.";
    
    startBtn.innerText = "New Chat";
    startBtn.disabled = false;
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

    peer.on('close', () => handlePartnerDisconnect());
    peer.on('error', () => handlePartnerDisconnect());
});

socket.on('signal', (data) => {
    if (peer) peer.signal(data.signal);
});

function handlePartnerDisconnect() {
    if (!isConnected) return;
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
    
    startBtn.innerText = "New Chat"; 
    startBtn.disabled = false;
}
