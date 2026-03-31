const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

// "База данных" в памяти (после перезагрузки сервера очистится)
// Для вечного хранения нужен MongoDB, но для теста хватит и этого
const usersDB = {}; 
const onlineUsers = {}; 

app.use(express.static(__dirname));

io.on('connection', (socket) => {
    // РЕГИСТРАЦИЯ И ВХОД
    socket.on('auth', (data) => {
        const { username, password, isReg } = data;

        if (isReg) {
            if (usersDB[username]) {
                return socket.emit('auth error', 'Этот ник уже занят!');
            }
            usersDB[username] = password;
            socket.emit('auth success', username);
        } else {
            if (usersDB[username] === password) {
                socket.emit('auth success', username);
            } else {
                return socket.emit('auth error', 'Неверный логин или пароль');
            }
        }
    });

    socket.on('set nickname', (name) => {
        socket.nickname = name;
        onlineUsers[socket.id] = name;
        io.emit('user list', onlineUsers);
    });

    socket.on('chat message', (msg) => {
        io.emit('chat message', { user: socket.nickname, text: msg.text });
    });

    socket.on('disconnect', () => {
        delete onlineUsers[socket.id];
        io.emit('user list', onlineUsers);
    });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => console.log('Server is orbit! Port: ' + PORT));
