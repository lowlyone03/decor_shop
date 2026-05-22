const { Server } = require('socket.io');

function initSocket(server, app) {
    const io = new Server(server, {
        cors: {
            origin: '*'
        }
    });

    app.set('io', io);

    io.on('connection', (socket) => {
        socket.on('join_user_room', (userId) => {
            if (userId) socket.join(String(userId));
        });
    });

    return io;
}

module.exports = initSocket;
