const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const path = require('path');

const users = {}; 
const allMessages = []; // Храним сообщения здесь (без записи в JSON)

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

io.on('connection', (socket) => {
    let currentUser = "";

    // Регистрация (в твоем клиенте это событие 'auth')
    socket.on('auth', (username) => {
        currentUser = username;
        users[username] = socket.id;
        
        // Отправляем зашедшему историю, чтобы чат не был пустым
        socket.emit('chat_history', allMessages);
        
        io.emit('update_online', Object.keys(users));
        console.log(`[+] ${username} в сети`);
    });

    // Групповые сообщения
    socket.on('group_msg', (data) => {
        const msgPayload = { 
            from: currentUser, 
            text: data.msg, 
            time: new Date().toLocaleTimeString() 
        };
        
        allMessages.push(msgPayload); // Сохраняем в массив
        if (allMessages.length > 50) allMessages.shift(); // Лимит 50 штук

        io.emit('chat_msg', msgPayload);
    });

    // Приватные сообщения (ЛС)
    socket.on('private_msg', (data) => {
        const targetId = users[data.to];
        if (targetId) {
            io.to(targetId).emit('chat_msg', { 
                from: currentUser, 
                text: data.msg, 
                type: 'private',
                time: new Date().toLocaleTimeString()
            });
        }
    });

    socket.on('disconnect', () => {
        if (currentUser) {
            delete users[currentUser];
            io.emit('update_online', Object.keys(users));
            console.log(`[-] ${currentUser} вышел`);
        }
    });
});

http.listen(3000, () => {
    console.log('Сервер запущен: http://localhost:3000');
});