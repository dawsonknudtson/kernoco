import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { getSession, signOutUser } from '../lib/auth';

export default function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState('dashboard');

  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [showMeetingForm, setShowMeetingForm] = useState(false);
  
  const [meetingForm, setMeetingForm] = useState({
    title: '',
    time: '',
    description: '',
    invitees: ['']
  });
  
  const [bookedMeetings, setBookedMeetings] = useState([]);

  const [meetingInvitations] = useState([
    
  ]);

  const [recordings, setRecordings] = useState([]);
  const [loadingRecordings, setLoadingRecordings] = useState(false);

  useEffect(() => {
    checkUser();
  }, []);

  useEffect(() => {
    if (activeSection === 'history') {
      fetchRecordings();
    }
  }, [activeSection]);

  const fetchRecordings = async () => {
    setLoadingRecordings(true);
    try {
      console.log('Fetching recordings...');
      const response = await fetch('http://localhost:3001/api/meetings/recordings');
      const data = await response.json();
      
      console.log('Recordings fetch response:', data);
      
      if (data.success) {
        console.log('Recordings fetched successfully:', data.recordings);
        setRecordings(data.recordings);
      } else {
        console.error('Failed to fetch recordings:', data.error);
      }
    } catch (error) {
      console.error('Error fetching recordings:', error);
    } finally {
      setLoadingRecordings(false);
    }
  };

  const handleDownloadRecording = async (recordingId, filename) => {
    try {
      const response = await fetch(`http://localhost:3001/api/meetings/recording/${recordingId}/download`);
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        console.error('Failed to download recording');
      }
    } catch (error) {
      console.error('Error downloading recording:', error);
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDuration = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    } else {
      return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
  };

  const checkUser = async () => {
    try {
      const { data } = await getSession();
      
      if (!data.session) {
        router.push('/');
        return;
      }
      
      setUser(data.session.user);
    } catch (error) {
      console.error('Error checking session:', error);
      router.push('/');
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    const result = await signOutUser();
    if (result.success) {
      router.push('/');
    }
  };

  const getUserDisplayName = () => {
    if (!user) return '';
    
    const fullName = user.user_metadata?.full_name || 
                     user.user_metadata?.name || 
                     user.identities?.[0]?.identity_data?.full_name ||
                     user.identities?.[0]?.identity_data?.name;
    
    return fullName || '';
  };

  const getDaysInMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const getMonthName = (date) => {
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  const generateCalendarDays = () => {
    const daysInMonth = getDaysInMonth(currentDate);
    const firstDay = getFirstDayOfMonth(currentDate);
    const days = [];

    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      days.push(day);
    }

    return days;
  };

  const handleInvitationResponse = (invitationId, response) => {
    console.log(`${response} invitation ${invitationId}`);
  };

  const handleDateClick = (day) => {
    if (!day) return;
    
    const clickedDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    setSelectedDate(clickedDate);
    setShowMeetingForm(true);
  };

  const handleMeetingFormChange = (field, value) => {
    setMeetingForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const addInviteeField = () => {
    setMeetingForm(prev => ({
      ...prev,
      invitees: [...prev.invitees, '']
    }));
  };

  const removeInviteeField = (index) => {
    setMeetingForm(prev => ({
      ...prev,
      invitees: prev.invitees.filter((_, i) => i !== index)
    }));
  };

  const updateInvitee = (index, value) => {
    setMeetingForm(prev => ({
      ...prev,
      invitees: prev.invitees.map((invitee, i) => i === index ? value : invitee)
    }));
  };

  const handleCreateMeeting = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/meetings/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: meetingForm.title,
          description: meetingForm.description,
          scheduledTime: `${selectedDate.toISOString().split('T')[0]}T${meetingForm.time}:00`,
          createdBy: user?.id || user?.email
        })
      });

      const data = await response.json();

      if (data.success) {
        const newMeeting = {
          id: data.meeting.id,
          title: data.meeting.title,
          time: meetingForm.time,
          date: selectedDate,
          description: data.meeting.description,
          invitees: meetingForm.invitees.filter(email => email.trim() !== ''),
          isOwner: true,
          roomId: data.meeting.roomId
        };
        
        setBookedMeetings(prev => [...prev, newMeeting]);
        
        console.log('Meeting created:', newMeeting);
      } else {
        console.error('Failed to create meeting:', data.error);
      }
    } catch (error) {
      console.error('Error creating meeting:', error);
    }
    
    setMeetingForm({
      title: '',
      time: '',
      description: '',
      invitees: ['']
    });
    setShowMeetingForm(false);
    setSelectedDate(null);
  };

  const handleCancelMeeting = () => {
    setMeetingForm({
      title: '',
      time: '',
      description: '',
      invitees: ['']
    });
    setShowMeetingForm(false);
    setSelectedDate(null);
  };

  const formatSelectedDate = (date) => {
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const formatMeetingDate = (date) => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return 'Tomorrow';
    } else {
      return date.toLocaleDateString('en-US', { 
        weekday: 'short', 
        month: 'short', 
        day: 'numeric' 
      });
    }
  };

  const handleJoinMeeting = (meetingId) => {
    console.log('Joining meeting:', meetingId);
    router.push(`/meeting/${meetingId}`);
  };

  const handleCancelBookedMeeting = (meetingId) => {
    setBookedMeetings(prev => prev.filter(meeting => meeting.id !== meetingId));
    console.log('Meeting canceled:', meetingId);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const displayName = getUserDisplayName();

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <div className="w-64 bg-white shadow-lg">
        <div className="p-6 border-b">
          <h1 className="text-2xl font-bold text-blue-600">Kernoco</h1>
          <div className="mt-4">
            <p className="font-medium text-gray-900">{displayName || 'User'}</p>
            <p className="text-sm text-gray-600">{user?.email}</p>
          </div>
        </div>
        
        <nav className="mt-6">
          <div className="px-4 space-y-2">
            <button
              onClick={() => setActiveSection('dashboard')}
              className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
                activeSection === 'dashboard' 
                  ? 'bg-blue-100 text-blue-700 font-medium' 
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <svg className="w-5 h-5 inline-block mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5a2 2 0 012-2h4a2 2 0 012 2v4H8V5z" />
              </svg>
              Dashboard
            </button>
            
            <button
              onClick={() => setActiveSection('taskboard')}
              className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
                activeSection === 'taskboard' 
                  ? 'bg-blue-100 text-blue-700 font-medium' 
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <svg className="w-5 h-5 inline-block mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              Task Board
            </button>
            
            <button
              onClick={() => setActiveSection('history')}
              className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
                activeSection === 'history' 
                  ? 'bg-blue-100 text-blue-700 font-medium' 
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <svg className="w-5 h-5 inline-block mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Meeting History
            </button>
          </div>
        </nav>

        <div className="absolute bottom-0 w-64 p-4 border-t">
          <button
            onClick={handleSignOut}
            className="w-full bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
          >
            Sign Out
          </button>
        </div>
      </div>

      <div className="flex-1 p-8">
        {activeSection === 'dashboard' && (
          <div>
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-gray-900">
                Welcome back, {displayName || 'User'}!
              </h2>
              <p className="text-gray-600 mt-2">Here's what's happening with your meetings today.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-1">
                <div className="bg-white rounded-lg shadow-md p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {getMonthName(currentDate)}
                    </h3>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1))}
                        className="p-1 hover:bg-gray-100 rounded"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                      </button>
                      <button
                        onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1))}
                        className="p-1 hover:bg-gray-100 rounded"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-7 gap-1 mb-2">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                      <div key={day} className="text-center text-xs font-medium text-gray-500 py-2">
                        {day}
                      </div>
                    ))}
                  </div>
                  
                  <div className="grid grid-cols-7 gap-1">
                    {generateCalendarDays().map((day, index) => (
                      <div
                        key={index}
                        onClick={() => handleDateClick(day)}
                        className={`text-center py-2 text-sm cursor-pointer transition-colors ${
                          day === new Date().getDate() && 
                          currentDate.getMonth() === new Date().getMonth() &&
                          currentDate.getFullYear() === new Date().getFullYear()
                            ? 'bg-blue-600 text-white rounded-full'
                            : selectedDate && day === selectedDate.getDate() &&
                              currentDate.getMonth() === selectedDate.getMonth() &&
                              currentDate.getFullYear() === selectedDate.getFullYear()
                            ? 'bg-blue-100 text-blue-700 rounded-full'
                            : day 
                            ? 'text-gray-900 hover:bg-gray-100 rounded'
                            : 'text-gray-300 cursor-default'
                        }`}
                      >
                        {day || ''}
                      </div>
                    ))}
                  </div>
                </div>

                {showMeetingForm && selectedDate && (
                  <div className="mt-6 bg-white rounded-lg shadow-md p-6 border-l-4 border-blue-500">
                    <div className="flex justify-between items-center mb-4">
                      <h4 className="text-lg font-semibold text-gray-900">
                        Create Meeting for {formatSelectedDate(selectedDate)}
                      </h4>
                      <button
                        onClick={handleCancelMeeting}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Meeting Title *
                        </label>
                        <input
                          type="text"
                          value={meetingForm.title}
                          onChange={(e) => handleMeetingFormChange('title', e.target.value)}
                          placeholder="Enter meeting title"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Time *
                        </label>
                        <input
                          type="time"
                          value={meetingForm.time}
                          onChange={(e) => handleMeetingFormChange('time', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Description
                        </label>
                        <textarea
                          value={meetingForm.description}
                          onChange={(e) => handleMeetingFormChange('description', e.target.value)}
                          placeholder="Meeting description (optional)"
                          rows={3}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Invite People
                        </label>
                        <div className="space-y-2">
                          {meetingForm.invitees.map((invitee, index) => (
                            <div key={index} className="flex items-center space-x-2">
                              <input
                                type="email"
                                value={invitee}
                                onChange={(e) => updateInvitee(index, e.target.value)}
                                placeholder="Enter email address"
                                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              />
                              {meetingForm.invitees.length > 1 && (
                                <button
                                  onClick={() => removeInviteeField(index)}
                                  className="p-2 text-red-500 hover:text-red-700"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </button>
                              )}
                            </div>
                          ))}
                          <button
                            onClick={addInviteeField}
                            className="flex items-center text-blue-600 hover:text-blue-800 text-sm"
                          >
                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                            </svg>
                            Add another person
                          </button>
                        </div>
                      </div>

                      <div className="flex justify-end space-x-3 pt-4 border-t">
                        <button
                          onClick={handleCancelMeeting}
                          className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleCreateMeeting}
                          disabled={!meetingForm.title || !meetingForm.time}
                          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                        >
                          Create Meeting
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="lg:col-span-2 space-y-8">
                <div className="bg-white rounded-lg shadow-md p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Upcoming Meetings</h3>
                  <div className="space-y-3">
                    {bookedMeetings.length === 0 ? (
                      <p className="text-gray-500 text-center py-8">No upcoming meetings. Create one by clicking on a date!</p>
                    ) : (
                      bookedMeetings.map(meeting => (
                        <div key={meeting.id} className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h4 className="font-medium text-gray-900">{meeting.title}</h4>
                              <p className="text-sm text-gray-600 mt-1">
                                {formatMeetingDate(meeting.date)} at {meeting.time}
                              </p>
                              {meeting.description && (
                                <p className="text-sm text-gray-500 mt-2">{meeting.description}</p>
                              )}
                              {meeting.invitees && meeting.invitees.length > 0 && (
                                <p className="text-xs text-gray-400 mt-2">
                                  Invitees: {meeting.invitees.join(', ')}
                                </p>
                              )}
                            </div>
                            <div className="flex space-x-2 ml-4">
                              <button 
                                onClick={() => handleJoinMeeting(meeting.id)}
                                className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                              >
                                Join
                              </button>
                              {meeting.isOwner && (
                                <button 
                                  onClick={() => handleCancelBookedMeeting(meeting.id)}
                                  className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
                                >
                                  Cancel
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow-md p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Meeting Invitations</h3>
                  <div className="space-y-3">
                    {meetingInvitations.map(invitation => (
                      <div key={invitation.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                        <div>
                          <h4 className="font-medium text-gray-900">{invitation.title}</h4>
                          <p className="text-sm text-gray-600">Organized by {invitation.organizer}</p>
                          <p className="text-sm text-gray-600">{invitation.date} at {invitation.time}</p>
                          <p className="text-xs text-gray-500">{invitation.participants} participants</p>
                        </div>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleInvitationResponse(invitation.id, 'accept')}
                            className="px-3 py-1 text-sm bg-green-100 text-green-700 rounded hover:bg-green-200"
                          >
                            Accept
                          </button>
                          <button
                            onClick={() => handleInvitationResponse(invitation.id, 'deny')}
                            className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200"
                          >
                            Decline
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeSection === 'taskboard' && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Task Board</h2>
            <p className="text-gray-600">Task board functionality will be implemented here.</p>
          </div>
        )}

        {activeSection === 'history' && (
          <div>
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-gray-900">Meeting History</h2>
              <p className="text-gray-600 mt-2">Download and review your recorded meetings.</p>
            </div>
            
            <div className="bg-white rounded-lg shadow-md">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">Recorded Meetings</h3>
                  <button
                    onClick={fetchRecordings}
                    disabled={loadingRecordings}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                  >
                    {loadingRecordings ? 'Loading...' : 'Refresh'}
                  </button>
                </div>
              </div>
              
              <div className="p-6">
                {loadingRecordings ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </div>
                ) : recordings.length === 0 ? (
                  <div className="text-center py-8">
                    <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No recordings yet</h3>
                    <p className="text-gray-600">Meeting recordings will appear here when you have meetings with participants.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {recordings.map((recording) => (
                      <div key={recording.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <h4 className="font-medium text-gray-900">{recording.title}</h4>
                            <div className="flex items-center space-x-4 mt-1 text-sm text-gray-500">
                              <span className="flex items-center">
                                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                {formatDuration(recording.duration)}
                              </span>
                              <span className="flex items-center">
                                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                {formatFileSize(recording.size)}
                              </span>
                              <span className="flex items-center">
                                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3a2 2 0 012-2h4a2 2 0 012 2v4m-6 8V9a2 2 0 012-2h4a2 2 0 012 2v6m-6 2V9a2 2 0 012-2h4a2 2 0 012 2v6" />
                                </svg>
                                {new Date(recording.createdAt).toLocaleDateString('en-US', {
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => handleDownloadRecording(recording.id, `${recording.title}.webm`)}
                              className="flex items-center px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                            >
                              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                              </svg>
                              Download
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 