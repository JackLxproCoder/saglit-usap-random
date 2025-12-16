const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, 'public')));

let waitingUsers = [];
let onlineCount = 0;

io.on('connection', (socket) => {
    onlineCount++;
    io.emit('online-count', onlineCount);

    socket.on('find-partner', (userInfo) => {
        if (waitingUsers.length > 0) {
            const partner = waitingUsers.shift();
            
            const roomId = `${socket.id}-${partner.id}`;
            socket.join(roomId);
            partner.socket.join(roomId);

            socket.emit('partner-found', { role: 'initiator', roomId, location: partner.location });
            partner.socket.emit('partner-found', { role: 'receiver', roomId, location: userInfo.location });
        } else {
            waitingUsers.push({
                id: socket.id,
                socket: socket,
                location: userInfo.location
            });
        }
    });

    socket.on('signal', (data) => {
        socket.to(data.roomId).emit('signal', data.signal);
    });

    socket.on('chat-message', (data) => {
        socket.to(data.roomId).emit('chat-message', data.message);
    });

    socket.on('disconnect', () => {
        onlineCount--;
        io.emit('online-count', onlineCount);
        waitingUsers = waitingUsers.filter(user => user.id !== socket.id);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Saglit-Usap running on port ${PORT}`);
});
