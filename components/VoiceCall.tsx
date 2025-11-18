'use client';

import { useEffect, useState, useRef } from 'react';

interface VoiceCallProps {
  roomId: string;
  socket: any;
  users: any[];
}

export default function VoiceCall({ roomId, socket, users }: VoiceCallProps) {
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const localStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const remoteStreamsRef = useRef<Map<string, HTMLAudioElement>>(new Map());

  useEffect(() => {
    if (!socket) return;

    // 接收 offer
    socket.on('webrtc-offer', async (senderId: string, offer: RTCSessionDescriptionInit) => {
      try {
        const peerConnection = await createPeerConnection(senderId);
        await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);
        socket.emit('webrtc-answer', roomId, answer, senderId);
      } catch (error) {
        console.error('处理 offer 失败:', error);
      }
    });

    // 接收 answer
    socket.on('webrtc-answer', async (senderId: string, answer: RTCSessionDescriptionInit) => {
      try {
        const peerConnection = peerConnectionsRef.current.get(senderId);
        if (peerConnection) {
          await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
        }
      } catch (error) {
        console.error('处理 answer 失败:', error);
      }
    });

    // 接收 ICE candidate
    socket.on('webrtc-ice-candidate', async (senderId: string, candidate: RTCIceCandidateInit) => {
      try {
        const peerConnection = peerConnectionsRef.current.get(senderId);
        if (peerConnection) {
          await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
        }
      } catch (error) {
        console.error('添加 ICE candidate 失败:', error);
      }
    });

    return () => {
      socket.off('webrtc-offer');
      socket.off('webrtc-answer');
      socket.off('webrtc-ice-candidate');
    };
  }, [socket, roomId]);

  const createPeerConnection = async (peerId: string): Promise<RTCPeerConnection> => {
    const peerConnection = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
      ],
    });

    // 添加本地音频流
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        peerConnection.addTrack(track, localStreamRef.current!);
      });
    }

    // 接收远程音频流
    peerConnection.ontrack = (event) => {
      const [remoteStream] = event.streams;
      let audioElement = remoteStreamsRef.current.get(peerId);
      
      if (!audioElement) {
        audioElement = new Audio();
        audioElement.autoplay = true;
        remoteStreamsRef.current.set(peerId, audioElement);
      }
      
      audioElement.srcObject = remoteStream;
    };

    // ICE candidate
    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        socket?.emit('webrtc-ice-candidate', roomId, event.candidate, peerId);
      }
    };

    peerConnectionsRef.current.set(peerId, peerConnection);
    return peerConnection;
  };

  const startVoiceCall = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      localStreamRef.current = stream;
      setIsVoiceActive(true);

      // 向房间内其他用户发送 offer
      for (const user of users) {
        if (user.socketId && user.socketId !== socket?.id) {
          const peerConnection = await createPeerConnection(user.socketId);
          const offer = await peerConnection.createOffer();
          await peerConnection.setLocalDescription(offer);
          socket?.emit('webrtc-offer', roomId, offer);
        }
      }
    } catch (error) {
      console.error('启动语音通话失败:', error);
      alert('无法访问麦克风，请检查权限设置');
    }
  };

  const stopVoiceCall = () => {
    // 停止本地流
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }

    // 关闭所有连接
    peerConnectionsRef.current.forEach(pc => pc.close());
    peerConnectionsRef.current.clear();

    // 停止远程音频
    remoteStreamsRef.current.forEach(audio => {
      audio.pause();
      audio.srcObject = null;
    });
    remoteStreamsRef.current.clear();

    setIsVoiceActive(false);
    setIsMuted(false);
  };

  const toggleMute = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsMuted(!isMuted);
    }
  };

  return (
    <div className="flex gap-2">
      {!isVoiceActive ? (
        <button
          onClick={startVoiceCall}
          className="flex items-center gap-2 bg-green-600 hover:bg-green-700 px-4 py-2 rounded-lg transition"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
          </svg>
          <span>开启语音</span>
        </button>
      ) : (
        <>
          <button
            onClick={toggleMute}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${
              isMuted ? 'bg-yellow-600 hover:bg-yellow-700' : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {isMuted ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" clipRule="evenodd" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              )}
            </svg>
            <span>{isMuted ? '取消静音' : '静音'}</span>
          </button>
          <button
            onClick={stopVoiceCall}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg transition"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            <span>关闭语音</span>
          </button>
        </>
      )}
    </div>
  );
}
