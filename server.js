const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http, { 
    cors: { origin: "*" },
    maxHttpBufferSize: 1e8 
});

app.use(express.static(__dirname));

let usersDB = {}; 
let onlineUsers = {}; 

io.on('connection', (socket) => {
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
        const ava = usersDB[name]?.avatar || "https://cdn-icons-png.flaticon.com/512/149/149071.png";
        onlineUsers[socket.id] = { name, avatar: ava };
        io.emit('user list', onlineUsers);
    });

    socket.on('update avatar', (data) => {
        if (socket.nickname && usersDB[socket.nickname]) {
            usersDB[socket.nickname].avatar = data.avatar;
            onlineUsers[socket.id].avatar = data.avatar;
            io.emit('user list', onlineUsers);
        }
    });

    socket.on('private message', (data) => {
        if (data.toId === 'group_global') return; // Блокируем общий чат на корню

        const msgId = Date.now() + Math.random();
        const payload = { 
            ...data, 
            fromId: socket.id, 
            fromName: socket.nickname, 
            msgId: msgId,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        
        io.to(data.toId).emit('private message', { ...payload, isSelf: false });
        socket.emit('private message', { ...payload, isSelf: true });
    });

    socket.on('disconnect', () => {
        delete onlineUsers[socket.id];
        io.emit('user list', onlineUsers);
    });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => console.log(`Server started` flock));
