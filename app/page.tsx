'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [roomId, setRoomId] = useState('');
  const [action, setAction] = useState<'create' | 'join'>('create');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) {
      alert('请输入用户名');
      return;
    }

    if (action === 'create') {
      const newRoomId = Math.random().toString(36).substring(7);
      router.push(`/room/${newRoomId}?username=${encodeURIComponent(username)}`);
    } else {
      if (!roomId.trim()) {
        alert('请输入房间号');
        return;
      }
      router.push(`/room/${roomId}?username=${encodeURIComponent(username)}`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
        <h1 className="text-4xl font-bold text-center mb-2 bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
          一起看
        </h1>
        <p className="text-center text-gray-600 mb-8">与朋友一起观看视频</p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              用户名
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="输入你的昵称"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition text-gray-900"
            />
          </div>

          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => setAction('create')}
              className={`flex-1 py-2 px-4 rounded-lg font-medium transition ${
                action === 'create'
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              创建房间
            </button>
            <button
              type="button"
              onClick={() => setAction('join')}
              className={`flex-1 py-2 px-4 rounded-lg font-medium transition ${
                action === 'join'
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              加入房间
            </button>
          </div>

          {action === 'join' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                房间号
              </label>
              <input
                type="text"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                placeholder="输入房间号"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition text-gray-900"
              />
            </div>
          )}

          <button
            type="submit"
            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-3 rounded-lg font-medium hover:from-purple-700 hover:to-pink-700 transition shadow-lg"
          >
            {action === 'create' ? '创建并进入' : '加入房间'}
          </button>
        </form>

        <div className="mt-8 p-4 bg-purple-50 rounded-lg">
          <h3 className="font-medium text-purple-900 mb-2">功能特性：</h3>
          <ul className="text-sm text-purple-700 space-y-1">
            <li>✨ 同步观看视频</li>
            <li>💬 实时聊天</li>
            <li>🎤 语音通话</li>
            <li>📺 屏幕投屏</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
