const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

// Наша временная база данных (очищается при перезагрузке сервера на Render)
const usersDB = {}; 
const onlineUsers = {}; // socket.id -> username

app.use(express.static(__dirname));

io.on('connection', (socket) => {
    console.log('Подключился новый исследователь Луны:', socket.id);

    // Логика Авторизации (Вход или Регистрация)
    socket.on('auth', (data) => {
        const { username, password, isReg } = data;

        if (isReg) {
            // Регистрация нового аккаунта
            if (usersDB[username]) {
                return socket.emit('auth error', 'Этот позывной уже занят!');
            }
            usersDB[username] = password;
            console.log(`Новый пользователь зарегистрирован: ${username}`);
            socket.emit('auth success', username);
        } else {
            // Попытка входа
            if (usersDB[username] === password) {
                socket.emit('auth success', username);
            } else {
                socket.emit('auth error', 'Ошибка доступа: проверьте логин или пароль');
            }
        }
    });

    // Установка ника после успешного входа
    socket.on('set nickname', (name) => {
        socket.nickname = name;
        onlineUsers[socket.id] = name;
        // Рассылаем всем обновленный список пользователей для поиска
        io.emit('user list', onlineUsers);
    });

    // Приватные сообщения (как в Telegram)
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
            // Показываем самому себе
            socket.emit('private message', {
                fromId: socket.id,
                fromName: socket.nickname,
                text: text,
                isSelf: true
            });
        }
    });

    socket.on('disconnect', () => {
        console.log('Пользователь покинул орбиту:', socket.nickname);
        delete onlineUsers[socket.id];
        io.emit('user list', onlineUsers);
    });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
    console.log(`Moon Server активен на порту: ${PORT}`);
});
