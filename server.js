const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http, { cors: { origin: "*" } });

app.use(express.static(__dirname));

const usersDB = {}; 
const onlineUsers = {}; 

io.on('connection', (socket) => {
    socket.on('auth', (data) => {
        const { username, password, isReg } = data;
        if (isReg) {
            if (usersDB[username]) return socket.emit('auth error', 'Ник занят');
            usersDB[username] = password;
            socket.emit('auth success', username);
        } else {
            if (usersDB[username] === password) socket.emit('auth success', username);
            else socket.emit('auth error', 'Ошибка входа');
        }
    });

    socket.on('set nickname', (name) => {
        socket.nickname = name;
        onlineUsers[socket.id] = name;
        io.emit('user list', onlineUsers);
    });

    socket.on('private message', (data) => {
        // Отправка собеседнику
        io.to(data.toId).emit('private message', {
            fromId: socket.id,
            text: data.text,
            isSelf: false
        });
        // Отображение у себя
        socket.emit('private message', {
            fromId: socket.id,
            text: data.text,
            isSelf: true
        });
    });

    socket.on('disconnect', () => {
        delete onlineUsers[socket.id];
        io.emit('user list', onlineUsers);
    });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => console.log('Moon Server Active'));
