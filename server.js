const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http, { 
    cors: { origin: "*" },
    maxHttpBufferSize: 1e7 // Лимит 10мб для фото/видео
});

app.use(express.static(__dirname));

let usersDB = {}; 
let onlineUsers = {}; 

io.on('connection', (socket) => {
    socket.on('auth', (data) => {
        if (data.isReg) {
            if (usersDB[data.username]) return socket.emit('auth error', 'Ник занят');
            usersDB[data.username] = data.password;
            socket.emit('auth success', data.username);
        } else {
            if (usersDB[data.username] === data.password) socket.emit('auth success', data.username);
            else socket.emit('auth error', 'Ошибка входа');
        }
    });

    socket.on('set nickname', (name) => {
        socket.nickname = name;
        onlineUsers[socket.id] = name;
        io.emit('user list', onlineUsers);
    });

    socket.on('private message', (data) => {
        const msgId = Date.now() + Math.random();
        const payload = { ...data, fromId: socket.id, fromName: socket.nickname, msgId };
        
        if(data.toId === 'group_global') {
            io.emit('private message', { ...payload, isSelf: false, toId: 'group_global' });
        } else {
            io.to(data.toId).emit('private message', { ...payload, isSelf: false });
            socket.emit('private message', { ...payload, isSelf: true });
        }
    });

    socket.on('delete message', (data) => {
        io.emit('delete message', { msgId: data.msgId });
    });

    socket.on('disconnect', () => {
        delete onlineUsers[socket.id];
        io.emit('user list', onlineUsers);
    });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => console.log('Moon Server V4 Online'));
