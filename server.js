const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http, { 
    cors: { origin: "*" },
    maxHttpBufferSize: 1e8 // Увеличили лимит до 100мб для видео и фото
});

app.use(express.static(__dirname));

// База данных в памяти (после перезагрузки сервера очистится)
// Для вечного хранения нужно подключать MongoDB, но для теста — идеально.
let usersDB = {}; 
let onlineUsers = {}; // socket.id -> {name, avatar}

io.on('connection', (socket) => {
    console.log('Новое подключение:', socket.id);

    // 1. Авторизация и Регистрация
    socket.on('auth', (data) => {
        const { username, password, isReg } = data;
        
        if (isReg) {
            if (usersDB[username]) {
                return socket.emit('auth error', 'Этот ник уже занят');
            }
            usersDB[username] = { password: password, avatar: null };
            socket.emit('auth success', username);
        } else {
            if (usersDB[username] && usersDB[username].password === password) {
                socket.emit('auth success', username);
            } else {
                socket.emit('auth error', 'Неверный логин или пароль');
            }
        }
    });

    // 2. Вход в сеть
    socket.on('set nickname', (name) => {
        socket.nickname = name;
        // Если у юзера уже была ава в базе, берем её
        const savedAvatar = usersDB[name] ? usersDB[name].avatar : null;
        onlineUsers[socket.id] = { name: name, avatar: savedAvatar };
        
        // Рассылаем всем обновленный список онлайн-пользователей
        io.emit('user list', onlineUsers);
    });

    // 3. Обновление аватарки
    socket.on('update avatar', (data) => {
        if (socket.nickname && usersDB[socket.nickname]) {
            usersDB[socket.nickname].avatar = data.avatar;
            if (onlineUsers[socket.id]) {
                onlineUsers[socket.id].avatar = data.avatar;
            }
            // Оповещаем всех, что кто-то сменил имидж
            io.emit('user list', onlineUsers);
            io.emit('user avatar changed', { username: socket.nickname, avatar: data.avatar });
        }
    });

    // 4. Обработка сообщений (Личка, Группа, Избранное)
    socket.on('private message', (data) => {
        const msgId = Date.now() + Math.random(); // Уникальный ID для удаления
        const payload = { 
            ...data, 
            fromId: socket.id, 
            fromName: socket.nickname, 
            msgId: msgId,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        
        if (data.toId === 'group_global') {
            // Отправляем всем в общий чат
            io.emit('private message', { ...payload, isSelf: false, toId: 'group_global' });
        } else {
            // Отправляем конкретному человеку по его ID
            io.to(data.toId).emit('private message', { ...payload, isSelf: false });
            // Отправляем самому себе (подтверждение)
            socket.emit('private message', { ...payload, isSelf: true });
        }
    });

    // 5. Удаление сообщения у всех
    socket.on('delete message', (data) => {
        // Просто транслируем команду удаления всем клиентам
        io.emit('delete message', { msgId: data.msgId });
    });

    // 6. Отключение
    socket.on('disconnect', () => {
        if (socket.id in onlineUsers) {
            console.log(onlineUsers[socket.id].name, 'отключился');
            delete onlineUsers[socket.id];
            io.emit('user list', onlineUsers);
        }
    });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
    console.log(`
    🌕 MOON SERVER ACTIVE
    ---------------------
    Порт: ${PORT}
    Лимит данных: 100 MB
    Статус: OK
    `);
});
