const socket = io();
const myVideo = document.getElementById('myVideo');
const partnerVideo = document.getElementById('partnerVideo');
const startBtn = document.getElementById('startBtn');

let myStream;
let peer;

navigator.mediaDevices.getUserMedia({ video: true, audio: true })
    .then(stream => {
        myStream = stream;
        myVideo.srcObject = stream;
        myVideo.play();
    })
    .catch(err => alert("Camera blocked! Please allow access."));

startBtn.addEventListener('click', () => {
    if (startBtn.innerText === "Find Stranger" || startBtn.innerText === "Next Stranger") {
        startSearch();
    } else {
        location.reload();
    }
});

function startSearch() {
    console.log("Button clicked. Joining queue...");
    startBtn.innerText = "Searching...";
    startBtn.disabled = true;
    socket.emit('join_queue');
}

socket.on('match_found', (data) => {
    console.log("Match found! Initiator: " + data.initiator);
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
        console.log("Received partner stream");
        partnerVideo.srcObject = stream;
        partnerVideo.play();
    });
    
    window.peer = peer;
});

socket.on('signal', (data) => {
    if (peer) peer.signal(data.signal);
});
