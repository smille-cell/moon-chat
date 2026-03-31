const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const path = require('path');

// Хранилище данных (в памяти сервера)
const usersDB = {};    // База: { "логин": "пароль" }
const onlineUsers = {}; // Мапа: { "socket.id": "имя_пользователя" }

app.use(express.static(__dirname));

io.on('connection', (socket) => {
    console.log('Новое подключение:', socket.id);

    // 1. Обработка Входа и Регистрации
    socket.on('auth', (data) => {
        const { username, password, isReg } = data;
        
        if (isReg) {
            // Регистрация
            if (usersDB[username]) {
                return socket.emit('auth error', 'Этот позывной уже занят в системе Moon.');
            }
            usersDB[username] = password;
            console.log(`Зарегистрирован новый юзер: ${username}`);
            socket.emit('auth success', username);
        } else {
            // Вход
            if (usersDB[username] === password) {
                socket.emit('auth success', username);
            } else {
                socket.emit('auth error', 'Доступ запрещен. Неверный пароль.');
            }
        }
    });

    // 2. Установка ника и рассылка списка онлайн-юзеров
    socket.on('set nickname', (name) => {
        socket.nickname = name;
        onlineUsers[socket.id] = name;
        // Отправляем всем обновленный список контактов
        io.emit('user list', onlineUsers);
    });

    // 3. ПРИВАТНЫЕ СООБЩЕНИЯ (Логика ТГ)
    socket.on('private message', (data) => {
        const { toId, text } = data;
        
        if (onlineUsers[toId]) {
            // Отправляем получателю
            io.to(toId).emit('private message', {
                fromId: socket.id,
                fromName: socket.nickname,
                text: text,
                isSelf: false
            });
            
            // Отправляем самому себе (чтобы отобразилось в окне чата)
            socket.emit('private message', {
                fromId: socket.id,
                fromName: socket.nickname,
                text: text,
                isSelf: true
            });
        }
    });

    // 4. Отключение
    socket.on('disconnect', () => {
        console.log('Юзер отключился:', socket.nickname);
        delete onlineUsers[socket.id];
        io.emit('user list', onlineUsers);
    });
});

// Запуск сервера
const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
    console.log(`Moon Server запущен на порту ${PORT}`);
})
