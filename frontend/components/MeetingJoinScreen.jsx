import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/router';

export default function MeetingJoinScreen({ meetingId, onJoin, onCancel }) {
  const router = useRouter();
  const videoRef = useRef(null);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [displayName, setDisplayName] = useState('');
  const [stream, setStream] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [meetingDetails, setMeetingDetails] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    // Get user media on component mount
    initializeCamera();
    // Fetch meeting details
    fetchMeetingDetails();

    return () => {
      // Cleanup stream when component unmounts
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const initializeCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (error) {
      console.error('Error accessing camera/microphone:', error);
      setError('Unable to access camera or microphone. Please check permissions.');
    }
  };

  const fetchMeetingDetails = async () => {
    try {
      const response = await fetch(`http://localhost:3001/api/meetings/${meetingId}`);
      const data = await response.json();
      
      if (data.success) {
        setMeetingDetails(data.meeting);
      } else {
        setError('Meeting not found');
      }
    } catch (error) {
      console.error('Error fetching meeting details:', error);
      setError('Failed to load meeting details');
    }
  };

  const toggleVideo = () => {
    if (stream) {
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !isVideoEnabled;
        setIsVideoEnabled(!isVideoEnabled);
      }
    }
  };

  const toggleAudio = () => {
    if (stream) {
      const audioTrack = stream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !isAudioEnabled;
        setIsAudioEnabled(!isAudioEnabled);
      }
    }
  };

  const handleJoinMeeting = async () => {
    if (!displayName.trim()) {
      setError('Please enter your name');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`http://localhost:3001/api/meetings/${meetingId}/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: `user_${Date.now()}`, // Simple user ID generation
          userName: displayName.trim()
        })
      });

      const data = await response.json();
      
      if (data.success) {
        // Pass the stream and user data to parent component
        onJoin({
          roomId: data.roomId,
          userName: displayName.trim(),
          userId: `user_${Date.now()}`,
          stream,
          isVideoEnabled,
          isAudioEnabled,
          meetingDetails: data.meeting
        });
      } else {
        setError(data.error || 'Failed to join meeting');
      }
    } catch (error) {
      console.error('Error joining meeting:', error);
      setError('Failed to join meeting. Please try again.');
    }
    setIsLoading(false);
  };

  const formatTime = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full">
        <div className="grid md:grid-cols-2 gap-8 items-center">
          {/* Video Preview Section */}
          <div className="relative">
            <div className="bg-black rounded-lg overflow-hidden aspect-video relative">
              {stream && (
                <video
                  ref={videoRef}
                  autoPlay
                  muted
                  playsInline
                  className={`w-full h-full object-cover ${!isVideoEnabled ? 'hidden' : ''}`}
                />
              )}
              
              {!isVideoEnabled && (
                <div className="w-full h-full flex items-center justify-center bg-gray-800">
                  <div className="text-center">
                    <div className="w-20 h-20 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                      <span className="text-2xl font-bold text-white">
                        {displayName.charAt(0).toUpperCase() || 'U'}
                      </span>
                    </div>
                    <p className="text-gray-300">Camera is off</p>
                  </div>
                </div>
              )}

              {/* Video Controls Overlay */}
              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-4">
                <button
                  onClick={toggleVideo}
                  className={`p-3 rounded-full transition-colors ${
                    isVideoEnabled 
                      ? 'bg-gray-700 hover:bg-gray-600 text-white' 
                      : 'bg-red-600 hover:bg-red-500 text-white'
                  }`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    {isVideoEnabled ? (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    ) : (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L18 12M5.636 5.636L12 12" />
                    )}
                  </svg>
                </button>
                
                <button
                  onClick={toggleAudio}
                  className={`p-3 rounded-full transition-colors ${
                    isAudioEnabled 
                      ? 'bg-gray-700 hover:bg-gray-600 text-white' 
                      : 'bg-red-600 hover:bg-red-500 text-white'
                  }`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    {isAudioEnabled ? (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                    ) : (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                    )}
                  </svg>
                </button>
              </div>
            </div>
          </div>

          {/* Meeting Join Form */}
          <div className="bg-white rounded-lg p-8">
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                {meetingDetails?.title || 'Join Meeting'}
              </h1>
              {meetingDetails && (
                <div className="text-sm text-gray-600 space-y-1">
                  {meetingDetails.scheduledTime && (
                    <p>Scheduled for {formatTime(meetingDetails.scheduledTime)}</p>
                  )}
                  {meetingDetails.participantCount > 0 && (
                    <p>{meetingDetails.participantCount} participant{meetingDetails.participantCount !== 1 ? 's' : ''} in meeting</p>
                  )}
                  {meetingDetails.description && (
                    <p className="mt-2">{meetingDetails.description}</p>
                  )}
                </div>
              )}
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-100 border border-red-400 rounded-md">
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label htmlFor="displayName" className="block text-sm font-medium text-gray-700 mb-2">
                  Enter your name
                </label>
                <input
                  type="text"
                  id="displayName"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Your name"
                  maxLength={50}
                />
              </div>

              <div className="pt-4 space-y-3">
                <button
                  onClick={handleJoinMeeting}
                  disabled={isLoading || !displayName.trim()}
                  className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium flex items-center justify-center"
                >
                  {isLoading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Joining...
                    </>
                  ) : (
                    'Join Meeting'
                  )}
                </button>
                
                <button
                  onClick={onCancel}
                  className="w-full bg-gray-200 text-gray-800 py-3 px-6 rounded-lg hover:bg-gray-300 transition-colors font-medium"
                >
                  Cancel
                </button>
              </div>
            </div>

            {/* Device Status */}
            <div className="mt-6 pt-6 border-t border-gray-200">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <div className={`w-2 h-2 rounded-full ${isVideoEnabled ? 'bg-green-500' : 'bg-red-500'}`}></div>
                    <span className="text-gray-600">Camera {isVideoEnabled ? 'on' : 'off'}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className={`w-2 h-2 rounded-full ${isAudioEnabled ? 'bg-green-500' : 'bg-red-500'}`}></div>
                    <span className="text-gray-600">Microphone {isAudioEnabled ? 'on' : 'off'}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 