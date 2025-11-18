'use client';

import { useEffect, useState, useRef, Suspense } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { getSocket } from '@/lib/socket';
import VideoPlayer from '@/components/VideoPlayer';
import ChatPanel from '@/components/ChatPanel';
import VoiceCall from '@/components/VoiceCall';
import ScreenShare from '@/components/ScreenShare';

function RoomContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const roomId = params.id as string;
  const username = searchParams.get('username') || '匿名用户';

  const [isConnected, setIsConnected] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  const [videoUrl, setVideoUrl] = useState('');
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [inputUrl, setInputUrl] = useState('');
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);

  const socketRef = useRef<any>(null);

  useEffect(() => {
    const socket = getSocket();
    socketRef.current = socket;

    socket.on('connect', () => {
      setIsConnected(true);
      socket.emit('create-room', roomId, username);
    });

    socket.on('room-created', () => {
      console.log('房间已创建');
    });

    socket.on('user-list', (userList: any[]) => {
      setUsers(userList);
    });

    socket.on('user-joined', (joinedUsername: string) => {
      console.log(`${joinedUsername} 加入了房间`);
    });

    socket.on('user-left', (leftUsername: string) => {
      console.log(`${leftUsername} 离开了房间`);
    });

    socket.on('video-url-change', (url: string) => {
      setVideoUrl(url);
    });

    socket.on('error', (message: string) => {
      alert(message);
    });

    return () => {
      socket.off('connect');
      socket.off('room-created');
      socket.off('user-list');
      socket.off('user-joined');
      socket.off('user-left');
      socket.off('video-url-change');
      socket.off('error');
    };
  }, [roomId, username]);

  const handleChangeVideo = () => {
    if (inputUrl.trim()) {
      setVideoUrl(inputUrl);
      socketRef.current?.emit('video-url-change', roomId, inputUrl);
      setShowUrlInput(false);
      setInputUrl('');
    }
  };

  const copyRoomId = () => {
    try {
      // 使用传统方法复制
      const textArea = document.createElement('textarea');
      textArea.value = roomId;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      
      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);
      
      if (successful) {
        alert('房间号已复制到剪贴板！');
      } else {
        alert('复制失败，房间号是：' + roomId);
      }
    } catch (err) {
      console.error('复制失败:', err);
      alert('复制失败，房间号是：' + roomId);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* 顶部导航栏 */}
      <div className="bg-gray-800 border-b border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              一起看
            </h1>
            <p className="text-sm text-gray-400 mt-1">欢迎，{username}</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-400">房间号:</span>
              <code className="bg-gray-700 px-3 py-1 rounded text-purple-400">{roomId}</code>
              <button
                onClick={copyRoomId}
                className="bg-purple-600 hover:bg-purple-700 px-3 py-1 rounded text-sm transition"
              >
                复制
              </button>
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span className="text-sm text-gray-400">{isConnected ? '已连接' : '未连接'}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex h-[calc(100vh-73px)]">
        {/* 左侧：视频播放器 */}
        <div className="flex-1 flex flex-col p-6">
          <div className="bg-gray-800 rounded-lg p-4 mb-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">视频播放</h2>
              <button
                onClick={() => setShowUrlInput(!showUrlInput)}
                className="bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded transition"
              >
                更换视频
              </button>
            </div>
            {showUrlInput && (
              <div className="mt-4">
                <div className="mb-2">
                  <p className="text-xs text-gray-400 mb-1">支持的视频源：</p>
                  <div className="flex flex-wrap gap-2 text-xs">
                    <span className="bg-blue-600 px-2 py-1 rounded">📺 B站</span>
                    <span className="bg-red-600 px-2 py-1 rounded">▶️ YouTube</span>
                    <span className="bg-purple-600 px-2 py-1 rounded">💾 直链视频 (.mp4/.webm)</span>
                  </div>
                  <p className="text-xs text-yellow-400 mt-1">❗ 仅直链视频支持同步控制</p>
                  <p className="text-xs text-green-400 mt-1">💡 提示：爱奇艺/腾讯等请使用“开始投屏”功能</p>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={inputUrl}
                    onChange={(e) => setInputUrl(e.target.value)}
                    placeholder="输入视频URL"
                    className="flex-1 bg-gray-700 border border-gray-600 rounded px-4 py-2 text-white outline-none focus:border-purple-500"
                  />
                  <button
                    onClick={handleChangeVideo}
                    className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded transition"
                  >
                    确定
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="flex-1 bg-black rounded-lg overflow-hidden">
            {screenStream ? (
              <div className="relative w-full h-full">
                <video
                  autoPlay
                  muted
                  className="w-full h-full object-contain"
                  ref={(video) => {
                    if (video && screenStream) {
                      video.srcObject = screenStream;
                    }
                  }}
                />
                <div className="absolute top-4 left-4 bg-purple-600 px-4 py-2 rounded-lg shadow-lg">
                  <span className="text-sm font-medium">正在投屏</span>
                </div>
              </div>
            ) : videoUrl ? (
              <VideoPlayer roomId={roomId} videoUrl={videoUrl} socket={socketRef.current} />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-500">
                <div className="text-center">
                  <svg className="w-24 h-24 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  <p className="text-lg">点击“更换视频”或“开始投屏”</p>
                </div>
              </div>
            )}
          </div>

          {/* 投屏和语音功能 */}
          <div className="mt-4 flex gap-4">
            <ScreenShare 
              roomId={roomId} 
              socket={socketRef.current} 
              onStreamChange={setScreenStream}
            />
            <VoiceCall roomId={roomId} socket={socketRef.current} users={users} />
          </div>
        </div>

        {/* 右侧：聊天和用户列表 */}
        <div className="w-96 bg-gray-800 border-l border-gray-700 flex flex-col">
          {/* 在线用户 */}
          <div className="p-4 border-b border-gray-700">
            <h3 className="text-sm font-semibold text-gray-400 mb-2">
              在线用户 ({users.length})
            </h3>
            <div className="space-y-2">
              {users.map((user, index) => (
                <div key={index} className="flex items-center gap-2 text-sm">
                  <div className="w-2 h-2 rounded-full bg-green-500"></div>
                  <span>{user.username}</span>
                </div>
              ))}
            </div>
          </div>

          {/* 聊天面板 */}
          <div className="flex-1 overflow-hidden">
            <ChatPanel roomId={roomId} username={username} socket={socketRef.current} />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function RoomPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-900 flex items-center justify-center text-white">加载中...</div>}>
      <RoomContent />
    </Suspense>
  );
}
