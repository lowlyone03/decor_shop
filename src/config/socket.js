const { Server } = require('socket.io');
const { verifyToken } = require('../utils/crypto');
const User = require('../models/User');

// Map lưu socket theo userId để kick
const userSockets = new Map();

function initSocket(server, app) {
    const io = new Server(server, {
        cors: {
            origin: '*'
        }
    });

    app.set('io', io);

    io.on('connection', (socket) => {
        // Phòng user cá nhân
        socket.on('join_user_room', (userId) => {
            if (userId) socket.join(String(userId));
        });

        // Xác thực và join phòng theo role
        socket.on('join_role_room', async (token) => {
            try {
                const userId = verifyToken(token);
                if (!userId) {
                    socket.emit('auth_error', { message: 'Token không hợp lệ.' });
                    return;
                }
                const user = await User.findById(userId).select('role status name').lean();
                if (!user || user.status !== 'active') {
                    socket.emit('auth_error', { message: 'Tài khoản không hợp lệ.' });
                    socket.disconnect(true);
                    return;
                }

                // Lưu thông tin user vào socket (dùng khi reconnect)
                socket.userId = String(userId);
                socket.userRole = user.role;
                socket.userName = user.name;
                socket._authToken = token;  // Lưu token để tự rejoin khi reconnect

                // Join phòng theo role
                if (user.role === 'staff') {
                    socket.join('staff_room');
                }
                if (user.role === 'admin') {
                    socket.join('admin_room');
                    socket.join('staff_room'); // Admin cũng nhận thông báo staff
                }

                // Lưu vào map để kick sau này
                if (!userSockets.has(socket.userId)) {
                    userSockets.set(socket.userId, new Set());
                }
                userSockets.get(socket.userId).add(socket);

                socket.emit('role_room_joined', { role: user.role });
            } catch (error) {
                socket.emit('auth_error', { message: 'Lỗi xác thực.' });
            }
        });

        // Client gửi sự kiện này khi reconnect sau rớt mạng
        // Client chỉ cần emit('rejoin', token) — server sẽ xác thực lại và join lại phòng
        socket.on('rejoin', async (token) => {
            // Tái sử dụng logic join_role_room
            socket.emit('join_role_room_trigger');  // hint cho client
            // Thực thi lại xác thực
            try {
                const userId = verifyToken(token);
                if (!userId) return socket.emit('auth_error', { message: 'Token hết hạn. Vui lòng đăng nhập lại.' });
                const user = await User.findById(userId).select('role status name').lean();
                if (!user || user.status !== 'active') {
                    socket.emit('force_disconnect', { message: 'Tài khoản bị vô hiệu hóa.' });
                    return socket.disconnect(true);
                }

                socket.userId = String(userId);
                socket.userRole = user.role;
                socket._authToken = token;

                if (user.role === 'staff') socket.join('staff_room');
                if (user.role === 'admin') {
                    socket.join('admin_room');
                    socket.join('staff_room');
                }

                if (!userSockets.has(socket.userId)) userSockets.set(socket.userId, new Set());
                userSockets.get(socket.userId).add(socket);

                socket.emit('role_room_joined', { role: user.role, reconnected: true });
            } catch (error) {
                socket.emit('auth_error', { message: 'Lỗi khi tái xác thực.' });
            }
        });

        socket.on('disconnect', () => {
            if (socket.userId && userSockets.has(socket.userId)) {
                userSockets.get(socket.userId).delete(socket);
                if (userSockets.get(socket.userId).size === 0) {
                    userSockets.delete(socket.userId);
                }
            }
        });
    });

    // Hàm kick user theo userId (gọi khi force-checkout, ban, token hết hạn)
    io.kickUser = function(userId, reason = 'Phiên làm việc đã kết thúc.') {
        const sockets = userSockets.get(String(userId));
        if (sockets) {
            for (const socket of sockets) {
                socket.emit('force_disconnect', { message: reason });
                socket.disconnect(true);
            }
            userSockets.delete(String(userId));
        }
    };

    return io;
}

module.exports = initSocket;
