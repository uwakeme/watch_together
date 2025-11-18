'use client';

import { useState, useRef, useEffect } from 'react';

interface ScreenShareProps {
  roomId: string;
  socket: any;
  onStreamChange: (stream: MediaStream | null) => void;
}

export default function ScreenShare({ roomId, socket, onStreamChange }: ScreenShareProps) {
  const [isSharing, setIsSharing] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const localStreamRef = useRef<MediaStream | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);

  const startScreenShare = async () => {
    try {
      // 检查浏览器是否支持屏幕共享
      if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
        alert('您的浏览器不支持屏幕共享功能，请使用最新版本的 Chrome、Edge 或 Firefox');
        return;
      }

      const stream = await navigator.mediaDevices.getDisplayMedia({ 
        video: true,
        audio: false 
      } as any);

      localStreamRef.current = stream;
      setIsSharing(true);
      setShowPreview(true);

      // 将流传递给父组件显示在主视频区域
      onStreamChange(stream);

      // 显示本地预览
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      // 监听屏幕共享停止
      stream.getVideoTracks()[0].onended = () => {
        stopScreenShare();
      };

      // 通知其他用户开始投屏
      socket?.emit('screen-share-start', roomId);

    } catch (error: any) {
      console.error('启动屏幕共享失败:', error);
      
      if (error.name === 'NotAllowedError') {
        alert('屏幕共享被拒绝。请注意：\n1. 需要用户授权\n2. 某些浏览器在非 HTTPS 环境下可能不支持\n3. 请使用最新版本的 Chrome、Edge 或 Firefox');
      } else if (error.name === 'NotSupportedError') {
        alert('您的浏览器不支持屏幕共享功能');
      } else {
        alert('无法启动屏幕共享：' + error.message);
      }
    }
  };

  const stopScreenShare = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }

    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }

    // 清除父组件的流
    onStreamChange(null);

    socket?.emit('screen-share-stop', roomId);
    setIsSharing(false);
    setShowPreview(false);
  };

  return (
    <div className="flex-1">
      {!isSharing ? (
        <button
          onClick={startScreenShare}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded-lg transition w-full justify-center"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          <span>开始投屏</span>
        </button>
      ) : (
        <button
          onClick={stopScreenShare}
          className="flex items-center gap-2 bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg transition w-full justify-center"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
          <span>停止投屏</span>
        </button>
      )}

      {/* 本地屏幕共享预览 */}
      {showPreview && (
        <div className="fixed bottom-20 right-4 w-80 bg-gray-900 border-2 border-purple-500 rounded-lg overflow-hidden shadow-2xl z-50">
          <div className="bg-gray-800 px-3 py-2 flex items-center justify-between">
            <span className="text-sm font-medium">我的投屏</span>
            <button
              onClick={() => setShowPreview(false)}
              className="text-gray-400 hover:text-white"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <video
            ref={localVideoRef}
            autoPlay
            muted
            className="w-full h-auto"
          />
        </div>
      )}
    </div>
  );
}
