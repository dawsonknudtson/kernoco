import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import MeetingJoinScreen from '../../components/MeetingJoinScreen';
import MeetingRoom from '../../components/MeetingRoom';

export default function MeetingPage() {
  const router = useRouter();
  const { meetingId } = router.query;
  const [currentView, setCurrentView] = useState('join'); 
  const [roomData, setRoomData] = useState(null);

  const handleJoinMeeting = (data) => {
    setRoomData(data);
    setCurrentView('meeting');
  };

  const handleCancelJoin = () => {
    router.push('/dashboard');
  };

  const handleLeaveMeeting = () => {
    router.push('/dashboard');
  };

  if (!meetingId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>{currentView === 'join' ? 'Join Meeting' : 'Meeting Room'} - Kernoco</title>
        <meta name="description" content="Join a Kernoco meeting" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/kernoco-logo.png" />
      </Head>

      {currentView === 'join' && (
        <MeetingJoinScreen
          meetingId={meetingId}
          onJoin={handleJoinMeeting}
          onCancel={handleCancelJoin}
        />
      )}

      {currentView === 'meeting' && roomData && (
        <MeetingRoom
          roomData={roomData}
          onLeaveMeeting={handleLeaveMeeting}
        />
      )}
    </>
  );
} 