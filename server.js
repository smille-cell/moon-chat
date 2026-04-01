const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http, { 
    cors: { origin: "*" },
    maxHttpBufferSize: 1e8 // 100MB для фото/видео
});

app.use(express.static(__dirname));

let usersDB = {}; 

io.on('connection', (socket) => {
    // Авторизация
    socket.on('auth', (data) => {
        const { username, password, isReg } = data;
        if (isReg) {
            if (usersDB[username]) return socket.emit('auth error', 'Ник занят');
            usersDB[username] = { password, avatar: "https://cdn-icons-png.flaticon.com/512/149/149071.png" };
            socket.emit('auth success', username);
        } else {
            if (usersDB[username] && usersDB[username].password === password) {
                socket.emit('auth success', username);
            } else {
                socket.emit('auth error', 'Ошибка входа');
            }
        }
    });

    socket.on('set nickname', (name) => {
        socket.nickname = name;
    });

    // Рассылка всем (Общий чат)
    socket.on('message', (data) => {
        const payload = {
            ...data,
            from: socket.nickname || "Аноним",
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            msgId: Date.now()
        };
        io.emit('message', payload); // Отправляем ВСЕМ
    });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => console.log('Moon Server (Global Mode) Active'));
