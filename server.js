const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const path = require('path');

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

let users = {}; 

io.on('connection', (socket) => {
  // Когда пользователь вводит имя
  socket.on('set nickname', (name) => {
    users[socket.id] = name;
    io.emit('user list', users); 
    console.log(`${name} вошел в чат`);
  });

  // Общий чат
  socket.on('chat message', (msg) => {
    io.emit('chat message', { 
        user: users[socket.id] || "Аноним", 
        text: msg.text, 
        fromId: socket.id 
    });
  });

  // Личные сообщения
  socket.on('private message', ({ toId, text }) => {
    if (users[toId]) {
      io.to(toId).emit('private message', {
        fromId: socket.id,
        fromName: users[socket.id],
        text: text
      });
      socket.emit('private message', {
        fromId: toId,
        fromName: "Вы -> " + users[toId],
        text: text
      });
    }
  });

  socket.on('disconnect', () => {
    delete users[socket.id];
    io.emit('user list', users);
  });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
  console.log('Moon Chat Pro запущен на порту: ' + PORT);
});