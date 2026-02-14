const express = require('express');
const app = express();
const server = require('http').createServer(app);
const io = require('socket.io')(server);

app.use(express.static('public'));

let waitingQueue = [];
let userHistory = new Map();

io.on('connection', (socket) => {
    
    userHistory.set(socket.id, new Set());

    socket.on('join_queue', () => {
        const myHistory = userHistory.get(socket.id);
        
        let partnerIndex = waitingQueue.findIndex(id => !myHistory.has(id) && id !== socket.id);

        if (partnerIndex === -1 && waitingQueue.length > 0) {
            partnerIndex = 0; 
        }

        if (partnerIndex !== -1) {
            const partnerId = waitingQueue[partnerIndex];
            
            waitingQueue.splice(partnerIndex, 1);

            userHistory.get(socket.id).add(partnerId);
            if (userHistory.has(partnerId)) {
                userHistory.get(partnerId).add(socket.id);
            }

            io.to(socket.id).emit('match_found', { partnerId: partnerId, initiator: true });
            io.to(partnerId).emit('match_found', { partnerId: socket.id, initiator: false });

        } else {
            waitingQueue.push(socket.id);
        }
    });

    socket.on('signal', (data) => {
        io.to(data.target).emit('signal', { signal: data.signal, sender: socket.id });
    });

    socket.on('disconnect', () => {
        waitingQueue = waitingQueue.filter(id => id !== socket.id);
        userHistory.delete(socket.id);
    });
});

const port = process.env.PORT || 3000;
server.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
