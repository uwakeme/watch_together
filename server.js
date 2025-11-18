const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { Server } = require('socket.io');

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = 3000;

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

// 房间数据存储
const rooms = new Map();

app.prepare().then(() => {
  const httpServer = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('internal server error');
    }
  });

  const io = new Server(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST']
    }
  });

  io.on('connection', (socket) => {
    console.log('用户连接:', socket.id);

    // 创建房间
    socket.on('create-room', (roomId, username) => {
      if (!rooms.has(roomId)) {
        rooms.set(roomId, {
          users: new Map(),
          videoState: { isPlaying: false, currentTime: 0, videoUrl: '' }
        });
      }
      
      socket.join(roomId);
      rooms.get(roomId).users.set(socket.id, { username, roomId });
      
      socket.emit('room-created', roomId);
      io.to(roomId).emit('user-list', Array.from(rooms.get(roomId).users.values()));
      console.log(`房间 ${roomId} 创建，用户 ${username} 加入`);
    });

    // 加入房间
    socket.on('join-room', (roomId, username) => {
      if (!rooms.has(roomId)) {
        socket.emit('error', '房间不存在');
        return;
      }

      socket.join(roomId);
      const room = rooms.get(roomId);
      room.users.set(socket.id, { username, roomId });

      // 发送当前视频状态给新用户
      socket.emit('video-state', room.videoState);
      
      // 通知房间内所有人
      io.to(roomId).emit('user-joined', username);
      io.to(roomId).emit('user-list', Array.from(room.users.values()));
      console.log(`用户 ${username} 加入房间 ${roomId}`);
    });

    // 视频控制同步
    socket.on('video-play', (roomId, currentTime) => {
      const room = rooms.get(roomId);
      if (room) {
        room.videoState.isPlaying = true;
        room.videoState.currentTime = currentTime;
        socket.to(roomId).emit('video-play', currentTime);
      }
    });

    socket.on('video-pause', (roomId, currentTime) => {
      const room = rooms.get(roomId);
      if (room) {
        room.videoState.isPlaying = false;
        room.videoState.currentTime = currentTime;
        socket.to(roomId).emit('video-pause', currentTime);
      }
    });

    socket.on('video-seek', (roomId, currentTime) => {
      const room = rooms.get(roomId);
      if (room) {
        room.videoState.currentTime = currentTime;
        socket.to(roomId).emit('video-seek', currentTime);
      }
    });

    socket.on('video-url-change', (roomId, videoUrl) => {
      const room = rooms.get(roomId);
      if (room) {
        room.videoState.videoUrl = videoUrl;
        socket.to(roomId).emit('video-url-change', videoUrl);
      }
    });

    // 聊天消息
    socket.on('chat-message', (roomId, message) => {
      const room = rooms.get(roomId);
      if (room) {
        const user = room.users.get(socket.id);
        io.to(roomId).emit('chat-message', {
          username: user?.username || '匿名',
          message,
          timestamp: new Date().toISOString()
        });
      }
    });

    // WebRTC 信令
    socket.on('webrtc-offer', (roomId, offer) => {
      socket.to(roomId).emit('webrtc-offer', socket.id, offer);
    });

    socket.on('webrtc-answer', (roomId, answer, targetId) => {
      io.to(targetId).emit('webrtc-answer', socket.id, answer);
    });

    socket.on('webrtc-ice-candidate', (roomId, candidate, targetId) => {
      if (targetId) {
        io.to(targetId).emit('webrtc-ice-candidate', socket.id, candidate);
      } else {
        socket.to(roomId).emit('webrtc-ice-candidate', socket.id, candidate);
      }
    });

    // 投屏信令
    socket.on('screen-share-start', (roomId) => {
      socket.to(roomId).emit('screen-share-start', socket.id);
    });

    socket.on('screen-share-stop', (roomId) => {
      socket.to(roomId).emit('screen-share-stop', socket.id);
    });

    // 断开连接
    socket.on('disconnect', () => {
      console.log('用户断开:', socket.id);
      
      // 从所有房间中移除用户
      rooms.forEach((room, roomId) => {
        if (room.users.has(socket.id)) {
          const user = room.users.get(socket.id);
          room.users.delete(socket.id);
          
          io.to(roomId).emit('user-left', user.username);
          io.to(roomId).emit('user-list', Array.from(room.users.values()));
          
          // 如果房间为空，删除房间
          if (room.users.size === 0) {
            rooms.delete(roomId);
            console.log(`房间 ${roomId} 已删除`);
          }
        }
      });
    });
  });

  httpServer
    .once('error', (err) => {
      console.error(err);
      process.exit(1);
    })
    .listen(port, () => {
      console.log(`> Ready on http://${hostname}:${port}`);
    });
});
