const express = require('express');
const app = express();
const server = require('http').createServer(app);
const io = require('socket.io')(server);

app.use(express.static('public'));

let waitingQueue = [];

io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    socket.on('join_queue', () => {
        waitingQueue.push(socket.id);
        
        if (waitingQueue.length >= 2) {
            const user1 = waitingQueue.shift();
            const user2 = waitingQueue.shift();

            io.to(user1).emit('match_found', { partnerId: user2, initiator: true });
            io.to(user2).emit('match_found', { partnerId: user1, initiator: false });
        }
    });

    socket.on('signal', (data) => {
        io.to(data.target).emit('signal', { 
            signal: data.signal, 
            sender: socket.id 
        });
    });

    socket.on('disconnect', () => {
        waitingQueue = waitingQueue.filter(id => id !== socket.id);
    });
});

const port = process.env.PORT || 3000;
server.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
