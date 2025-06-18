import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { getSession, signOutUser } from '../lib/auth';

export default function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState('dashboard');

  // Calendar state
  const [currentDate, setCurrentDate] = useState(new Date());
  
  // Mock data for demonstration
  const [bookedMeetings] = useState([
   
  ]);

  const [meetingInvitations] = useState([
    
  ]);

  useEffect(() => {
    checkUser();
  }, []);

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

  // Get user display name
  const getUserDisplayName = () => {
    if (!user) return '';
    
    const fullName = user.user_metadata?.full_name || 
                     user.user_metadata?.name || 
                     user.identities?.[0]?.identity_data?.full_name ||
                     user.identities?.[0]?.identity_data?.name;
    
    return fullName || '';
  };

  // Calendar helper functions
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

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }

    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(day);
    }

    return days;
  };

  const handleInvitationResponse = (invitationId, response) => {
    console.log(`${response} invitation ${invitationId}`);
    // This will be connected to backend later
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
      {/* Sidebar */}
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

      {/* Main Content */}
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
              {/* Calendar Section */}
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
                        className={`text-center py-2 text-sm ${
                          day === new Date().getDate() && 
                          currentDate.getMonth() === new Date().getMonth() &&
                          currentDate.getFullYear() === new Date().getFullYear()
                            ? 'bg-blue-600 text-white rounded-full'
                            : day 
                            ? 'text-gray-900 hover:bg-gray-100 cursor-pointer rounded'
                            : 'text-gray-300'
                        }`}
                      >
                        {day || ''}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right Side Content */}
              <div className="lg:col-span-2 space-y-8">
                {/* Booked Meetings */}
                <div className="bg-white rounded-lg shadow-md p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Upcoming Meetings</h3>
                  <div className="space-y-3">
                    {bookedMeetings.map(meeting => (
                      <div key={meeting.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                        <div>
                          <h4 className="font-medium text-gray-900">{meeting.title}</h4>
                          <p className="text-sm text-gray-600">{meeting.date} at {meeting.time}</p>
                          <p className="text-xs text-gray-500">{meeting.participants} participants</p>
                        </div>
                        <div className="flex space-x-2">
                          <button className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200">
                            Join
                          </button>
                          <button className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200">
                            Details
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Meeting Invitations */}
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
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Meeting History</h2>
            <p className="text-gray-600">Previous meeting history will be displayed here.</p>
          </div>
        )}
      </div>
    </div>
  );
} 