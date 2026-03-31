const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http, { cors: { origin: "*" } });

app.use(express.static(__dirname));

let users = {}; 

io.on('connection', (socket) => {
    console.log('Подключено:', socket.id);

    socket.on('auth', (data) => {
        socket.nickname = data.username;
        users[socket.id] = data.username;
        socket.emit('auth success', data.username);
        io.emit('user list', users); // Обновляем список у всех
    });

    socket.on('private message', (data) => {
        // Отправка получателю
        io.to(data.toId).emit('private message', { 
            fromId: socket.id, 
            fromName: socket.nickname, 
            text: data.text 
        });
        // Подтверждение отправителю
        socket.emit('private message', { 
            fromId: socket.id, 
            fromName: socket.nickname, 
            text: data.text, 
            isSelf: true 
        });
    });

    socket.on('disconnect', () => {
        delete users[socket.id];
        io.emit('user list', users);
    });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => console.log('Server is running on port ' + PORT));
