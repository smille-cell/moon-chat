const io = require('socket.io-client');
const readline = require('readline');

const socket = io('http://localhost:3000');
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const myName = "User_" + Math.floor(Math.random() * 100);

let onlineList = [];

socket.on('connect', () => {
    console.log(`\x1b[32mВы зашли как: ${myName}\x1b[0m`);
    socket.emit('auth', myName);
});

// Получаем старые сообщения при входе
socket.on('chat_history', (history) => {
    if (history.length > 0) {
        console.log('--- История сообщений ---');
        history.forEach(m => console.log(`[${m.time}] ${m.from}: ${m.text}`));
        console.log('-------------------------');
    }
});

// Слушаем новые сообщения
socket.on('chat_msg', (data) => {
    const pref = data.type === 'private' ? '[ЛС] ' : '';
    console.log(`\n${pref}\x1b[35m${data.from}\x1b[0m: ${data.text}`);
});

socket.on('update_online', (list) => { onlineList = list; });

rl.on('line', (line) => {
    if (line === '/who') {
        console.log('Сейчас в сети:', onlineList.join(', '));
    } else if (line.startsWith('@')) {
        const parts = line.slice(1).split(' ');
        const to = parts[0];
        const msg = parts.slice(1).join(' ');
        socket.emit('private_msg', { to, msg });
    } else {
        // Отправка обычного сообщения
        socket.emit('group_msg', { msg: line });
    }
});