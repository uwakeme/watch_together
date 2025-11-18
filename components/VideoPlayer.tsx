'use client';

import { useEffect, useRef, useState } from 'react';

interface VideoPlayerProps {
  roomId: string;
  videoUrl: string;
  socket: any;
}

// 检测视频链接类型
function detectVideoType(url: string): 'bilibili' | 'youtube' | 'direct' | 'unknown' {
  if (url.includes('bilibili.com') || url.includes('b23.tv')) {
    return 'bilibili';
  }
  if (url.includes('youtube.com') || url.includes('youtu.be')) {
    return 'youtube';
  }
  if (url.match(/\.(mp4|webm|ogg|mov)$/i)) {
    return 'direct';
  }
  return 'unknown';
}

// 转换B站链接为嵌入链接
function getBilibiliEmbedUrl(url: string): string {
  const bvMatch = url.match(/BV[a-zA-Z0-9]+/);
  const avMatch = url.match(/av(\d+)/);
  const pMatch = url.match(/[?&]p=(\d+)/);
  
  let embedUrl = 'https://player.bilibili.com/player.html?';
  
  if (bvMatch) {
    embedUrl += `bvid=${bvMatch[0]}`;
  } else if (avMatch) {
    embedUrl += `aid=${avMatch[1]}`;
  }
  
  if (pMatch) {
    embedUrl += `&page=${pMatch[1]}`;
  }
  
  embedUrl += '&high_quality=1&autoplay=0';
  return embedUrl;
}

// 转换YouTube链接为嵌入链接
function getYoutubeEmbedUrl(url: string): string {
  const videoIdMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/);
  if (videoIdMatch) {
    return `https://www.youtube.com/embed/${videoIdMatch[1]}`;
  }
  return url;
}

export default function VideoPlayer({ roomId, videoUrl, socket }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const videoType = detectVideoType(videoUrl);

  useEffect(() => {
    if (!socket || !videoRef.current || videoType !== 'direct') return;

    const video = videoRef.current;

    // 监听其他用户的播放控制（仅直链视频支持同步）
    socket.on('video-play', (currentTime: number) => {
      setIsSyncing(true);
      if (video) {
        video.currentTime = currentTime;
        video.play().catch((e: any) => console.error('播放失败:', e));
        setIsPlaying(true);
      }
      setTimeout(() => setIsSyncing(false), 500);
    });

    socket.on('video-pause', (currentTime: number) => {
      setIsSyncing(true);
      if (video) {
        video.currentTime = currentTime;
        video.pause();
        setIsPlaying(false);
      }
      setTimeout(() => setIsSyncing(false), 500);
    });

    socket.on('video-seek', (currentTime: number) => {
      setIsSyncing(true);
      if (video) {
        video.currentTime = currentTime;
      }
      setTimeout(() => setIsSyncing(false), 500);
    });

    return () => {
      socket.off('video-play');
      socket.off('video-pause');
      socket.off('video-seek');
    };
  }, [socket, videoType]);

  const handlePlay = () => {
    if (isSyncing || !videoRef.current) return;
    const currentTime = videoRef.current.currentTime;
    socket?.emit('video-play', roomId, currentTime);
    setIsPlaying(true);
  };

  const handlePause = () => {
    if (isSyncing || !videoRef.current) return;
    const currentTime = videoRef.current.currentTime;
    socket?.emit('video-pause', roomId, currentTime);
    setIsPlaying(false);
  };

  const handleSeeked = () => {
    if (isSyncing || !videoRef.current) return;
    const currentTime = videoRef.current.currentTime;
    socket?.emit('video-seek', roomId, currentTime);
  };

  // 渲染不同类型的播放器
  if (videoType === 'bilibili') {
    return (
      <div className="relative w-full h-full">
        <iframe
          src={getBilibiliEmbedUrl(videoUrl)}
          className="w-full h-full"
          allowFullScreen
          scrolling="no"
          frameBorder="0"
        />
        <div className="absolute top-4 left-4 bg-blue-600 px-4 py-2 rounded-lg shadow-lg">
          <span className="text-sm font-medium">B站视频（不支持同步控制）</span>
        </div>
      </div>
    );
  }

  if (videoType === 'youtube') {
    return (
      <div className="relative w-full h-full">
        <iframe
          src={getYoutubeEmbedUrl(videoUrl)}
          className="w-full h-full"
          allowFullScreen
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        />
        <div className="absolute top-4 left-4 bg-red-600 px-4 py-2 rounded-lg shadow-lg">
          <span className="text-sm font-medium">YouTube视频（不支持同步控制）</span>
        </div>
      </div>
    );
  }

  if (videoType === 'direct') {
    return (
      <div className="relative w-full h-full">
        <video
          ref={videoRef}
          src={videoUrl}
          controls
          className="w-full h-full"
          onPlay={handlePlay}
          onPause={handlePause}
          onSeeked={handleSeeked}
        />
        {isSyncing && (
          <div className="absolute top-4 left-4 bg-purple-600 px-4 py-2 rounded-lg shadow-lg">
            <span className="text-sm font-medium">正在同步...</span>
          </div>
        )}
      </div>
    );
  }

  // 不支持的格式
  return (
    <div className="w-full h-full flex items-center justify-center text-gray-500">
      <div className="text-center">
        <svg className="w-24 h-24 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="text-lg mb-2">不支持的视频格式</p>
        <p className="text-sm text-gray-400">请使用支持的视频链接</p>
      </div>
    </div>
  );
}
