import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/router';
import io from 'socket.io-client';

export default function MeetingRoom({ roomData, onLeaveMeeting }) {
  const router = useRouter();
  const localVideoRef = useRef(null);
  const socketRef = useRef(null);
  const peerConnectionsRef = useRef({});
  const [remoteStreams, setRemoteStreams] = useState({});
  const [participants, setParticipants] = useState([]);
  const [isVideoEnabled, setIsVideoEnabled] = useState(roomData.isVideoEnabled);
  const [isAudioEnabled, setIsAudioEnabled] = useState(roomData.isAudioEnabled);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [localStream, setLocalStream] = useState(roomData.stream);

  useEffect(() => {
    initializeSocket();
    setupLocalVideo();

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
      Object.values(peerConnectionsRef.current).forEach(pc => pc.close());
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  useEffect(() => {
    setupLocalVideo();
  }, [localStream]);

  const setupLocalVideo = async () => {
    if (localVideoRef.current && localStream) {
      console.log('Setting up local video stream:', localStream);
      localVideoRef.current.srcObject = localStream;
      
      const videoTrack = localStream.getVideoTracks()[0];
      const audioTrack = localStream.getAudioTracks()[0];
      
      if (videoTrack) {
        videoTrack.enabled = isVideoEnabled;
        console.log('Video track enabled:', videoTrack.enabled);
      }
      if (audioTrack) {
        audioTrack.enabled = isAudioEnabled;
        console.log('Audio track enabled:', audioTrack.enabled);
      }
    } else {
      console.log('Local video setup failed - missing ref or stream:', {
        hasRef: !!localVideoRef.current,
        hasStream: !!localStream,
        streamTracks: localStream ? localStream.getTracks().length : 0
      });
      
      if (!localStream && localVideoRef.current) {
        try {
          console.log('Attempting to get new media stream...');
          const newStream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: true
          });
          setLocalStream(newStream);
          console.log('Successfully obtained new stream:', newStream);
        } catch (error) {
          console.error('Failed to get media stream:', error);
        }
      }
    }
  };

  const initializeSocket = () => {
    socketRef.current = io('http://localhost:3001');

    socketRef.current.on('connect', () => {
      console.log('Connected to server');

      socketRef.current.emit('join-meeting', {
        roomId: roomData.roomId,
        userId: roomData.userId,
        userName: roomData.userName
      });
    });

    socketRef.current.on('room-participants', (participants) => {
      setParticipants(participants);
    });

    socketRef.current.on('user-joined', async (userData) => {
      console.log('User joined:', userData);
      setParticipants(prev => [...prev, userData]);
      
      await createPeerConnection(userData.socketId, true);
    });

    socketRef.current.on('user-left', (userData) => {
      console.log('User left:', userData);
      setParticipants(prev => prev.filter(p => p.userId !== userData.userId));
      setRemoteStreams(prev => {
        const newStreams = { ...prev };
        delete newStreams[userData.socketId];
        return newStreams;
      });
      
      if (peerConnectionsRef.current[userData.socketId]) {
        peerConnectionsRef.current[userData.socketId].close();
        delete peerConnectionsRef.current[userData.socketId];
      }
    });

    socketRef.current.on('webrtc-offer', async (data) => {
      await handleReceiveOffer(data);
    });

    socketRef.current.on('webrtc-answer', async (data) => {
      await handleReceiveAnswer(data);
    });

    socketRef.current.on('webrtc-ice-candidate', async (data) => {
      await handleReceiveIceCandidate(data);
    });

    socketRef.current.on('chat-message', (messageData) => {
      setChatMessages(prev => [...prev, messageData]);
    });

    socketRef.current.on('user-media-state-change', (data) => {
      console.log('User media state changed:', data);
    });
  };

  const createPeerConnection = async (socketId, isInitiator) => {
    const peerConnection = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    });

    peerConnectionsRef.current[socketId] = peerConnection;

    if (localStream) {
      localStream.getTracks().forEach(track => {
        peerConnection.addTrack(track, localStream);
      });
    }

    peerConnection.ontrack = (event) => {
      setRemoteStreams(prev => ({
        ...prev,
        [socketId]: event.streams[0]
      }));
    };

    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        socketRef.current.emit('webrtc-ice-candidate', {
          target: socketId,
          candidate: event.candidate
        });
      }
    };

    if (isInitiator) {
      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);
      
      socketRef.current.emit('webrtc-offer', {
        target: socketId,
        offer: offer
      });
    }
  };

  const handleReceiveOffer = async (data) => {
    const { offer, sender } = data;
    
    if (!peerConnectionsRef.current[sender]) {
      await createPeerConnection(sender, false);
    }
    
    const peerConnection = peerConnectionsRef.current[sender];
    await peerConnection.setRemoteDescription(offer);
    
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);
    
    socketRef.current.emit('webrtc-answer', {
      target: sender,
      answer: answer
    });
  };

  const handleReceiveAnswer = async (data) => {
    const { answer, sender } = data;
    const peerConnection = peerConnectionsRef.current[sender];
    
    if (peerConnection) {
      await peerConnection.setRemoteDescription(answer);
    }
  };

  const handleReceiveIceCandidate = async (data) => {
    const { candidate, sender } = data;
    const peerConnection = peerConnectionsRef.current[sender];
    
    if (peerConnection) {
      await peerConnection.addIceCandidate(candidate);
    }
  };

  const toggleVideo = () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !isVideoEnabled;
        setIsVideoEnabled(!isVideoEnabled);
        
        socketRef.current.emit('media-state-change', {
          isVideoEnabled: !isVideoEnabled,
          isAudioEnabled
        });
      }
    }
  };

  const toggleAudio = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !isAudioEnabled;
        setIsAudioEnabled(!isAudioEnabled);
        
        socketRef.current.emit('media-state-change', {
          isVideoEnabled,
          isAudioEnabled: !isAudioEnabled
        });
      }
    }
  };

  const toggleScreenShare = async () => {
    try {
      if (!isScreenSharing) {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: true
        });
        
        const videoTrack = screenStream.getVideoTracks()[0];
        Object.values(peerConnectionsRef.current).forEach(pc => {
          const sender = pc.getSenders().find(s => 
            s.track && s.track.kind === 'video'
          );
          if (sender) {
            sender.replaceTrack(videoTrack);
          }
        });
        
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = screenStream;
        }
        
        setIsScreenSharing(true);
        
        videoTrack.onended = () => {
          stopScreenShare();
        };
      } else {
        stopScreenShare();
      }
    } catch (error) {
      console.error('Error toggling screen share:', error);
    }
  };

  const stopScreenShare = async () => {
    try {
      const cameraStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });
      
      const videoTrack = cameraStream.getVideoTracks()[0];
      Object.values(peerConnectionsRef.current).forEach(pc => {
        const sender = pc.getSenders().find(s => 
          s.track && s.track.kind === 'video'
        );
        if (sender) {
          sender.replaceTrack(videoTrack);
        }
      });
      
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = cameraStream;
      }
      
      setLocalStream(cameraStream);
      setIsScreenSharing(false);
    } catch (error) {
      console.error('Error stopping screen share:', error);
    }
  };

  const sendChatMessage = () => {
    if (newMessage.trim()) {
      socketRef.current.emit('chat-message', {
        message: newMessage.trim()
      });
      setNewMessage('');
    }
  };

  const handleLeaveMeeting = async () => {
    try {
      await fetch(`http://localhost:3001/api/meetings/${roomData.meetingDetails.id}/leave`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: roomData.userId
        })
      });
    } catch (error) {
      console.error('Error leaving meeting:', error);
    }
    
    if (socketRef.current) {
      socketRef.current.disconnect();
    }
    Object.values(peerConnectionsRef.current).forEach(pc => pc.close());
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
    }
    
    onLeaveMeeting();
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col">
      <div className="bg-gray-800 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-white font-semibold text-lg">
            {roomData.meetingDetails?.title || 'Meeting'}
          </h1>
          <p className="text-gray-300 text-sm">
            {participants.length + 1} participant{participants.length !== 0 ? 's' : ''}
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <button
            onClick={() => setIsChatOpen(!isChatOpen)}
            className="relative p-2 text-gray-300 hover:text-white transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-3.582 8-8 8a9.863 9.863 0 01-4.906-1.289L3 21l1.289-5.094A9.863 9.863 0 013 12c0-4.418 3.582-8 8-8s8 3.582 8 8z" />
            </svg>
            {chatMessages.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {chatMessages.length > 9 ? '9+' : chatMessages.length}
              </span>
            )}
          </button>
          <button
            onClick={handleLeaveMeeting}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            Leave Meeting
          </button>
        </div>
      </div>

      <div className="flex-1 flex">
        <div className="flex-1 p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 h-full">
            <div className="relative bg-black rounded-lg overflow-hidden">
              {isVideoEnabled ? (
                <video
                  ref={localVideoRef}
                  autoPlay
                  muted
                  playsInline
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gray-800">
                  <div className="text-center">
                    <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-2">
                      <span className="text-xl font-bold text-white">
                        {roomData.userName.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <p className="text-gray-300 text-sm">{roomData.userName} (You)</p>
                  </div>
                </div>
              )}
              <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-sm">
                {roomData.userName} (You)
              </div>
            </div>

            {Object.entries(remoteStreams).map(([socketId, stream]) => {
              const participant = participants.find(p => p.socketId === socketId);
              return (
                <div key={socketId} className="relative bg-black rounded-lg overflow-hidden">
                  <video
                    autoPlay
                    playsInline
                    className="w-full h-full object-cover"
                    ref={(videoElement) => {
                      if (videoElement && stream) {
                        videoElement.srcObject = stream;
                      }
                    }}
                  />
                  <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-sm">
                    {participant?.userName || 'Unknown'}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {isChatOpen && (
          <div className="w-80 bg-white border-l border-gray-200 flex flex-col">
            <div className="p-4 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900">Chat</h3>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {chatMessages.map((message, index) => (
                <div key={index} className="bg-gray-50 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-sm text-gray-900">
                      {message.userName}
                    </span>
                    <span className="text-xs text-gray-500">
                      {formatTime(message.timestamp)}
                    </span>
                  </div>
                  <p className="text-gray-700 text-sm">{message.message}</p>
                </div>
              ))}
            </div>
            
            <div className="p-4 border-t border-gray-200">
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && sendChatMessage()}
                  placeholder="Type a message..."
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <button
                  onClick={sendChatMessage}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Send
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="bg-gray-800 px-6 py-4">
        <div className="flex items-center justify-center space-x-4">
          <button
            onClick={toggleAudio}
            className={`p-3 rounded-full transition-colors ${
              isAudioEnabled 
                ? 'bg-gray-700 hover:bg-gray-600 text-white' 
                : 'bg-red-600 hover:bg-red-500 text-white'
            }`}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {isAudioEnabled ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
              )}
            </svg>
          </button>

          <button
            onClick={toggleVideo}
            className={`p-3 rounded-full transition-colors ${
              isVideoEnabled 
                ? 'bg-gray-700 hover:bg-gray-600 text-white' 
                : 'bg-red-600 hover:bg-red-500 text-white'
            }`}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {isVideoEnabled ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L18 12M5.636 5.636L12 12" />
              )}
            </svg>
          </button>

          <button
            onClick={toggleScreenShare}
            className={`p-3 rounded-full transition-colors ${
              isScreenSharing 
                ? 'bg-blue-600 hover:bg-blue-500 text-white' 
                : 'bg-gray-700 hover:bg-gray-600 text-white'
            }`}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </button>

          <button
            onClick={handleLeaveMeeting}
            className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-full transition-colors font-medium"
          >
            Leave Meeting
          </button>
        </div>
      </div>
    </div>
  );
} 