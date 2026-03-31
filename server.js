const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http, { cors: { origin: "*" }, limits: { fieldSize: 10 * 1024 * 1024 } }); // Лимит 10мб

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

    // Пересылка сообщения (текст или файл)
    socket.on('private message', (data) => {
        const msgId = Date.now() + Math.random(); // Уникальный ID сообщения
        const payload = { ...data, fromId: socket.id, fromName: socket.nickname, msgId };
        
        io.to(data.toId).emit('private message', { ...payload, isSelf: false });
        socket.emit('private message', { ...payload, isSelf: true });
    });

    // Команда удаления у всех
    socket.on('delete message', (data) => {
        io.to(data.toId).emit('delete message', { msgId: data.msgId });
        socket.emit('delete message', { msgId: data.msgId });
    });

    socket.on('disconnect', () => {
        delete onlineUsers[socket.id];
        io.emit('user list', onlineUsers);
    });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => console.log('Moon Server V3 Active'));
