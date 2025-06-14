import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { getSession, signOutUser } from '../lib/auth';

export default function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // get user display name - could be from user_metadata or user profile
  const getUserDisplayName = () => {
    if (!user) return '';
    
    // check various places supabase might store the name
    const fullName = user.user_metadata?.full_name || 
                     user.user_metadata?.name || 
                     user.identities?.[0]?.identity_data?.full_name ||
                     user.identities?.[0]?.identity_data?.name;
    
    return fullName || '';
  };

  const displayName = getUserDisplayName();

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-blue-600">Kernoco</h1>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-gray-700">
                {displayName && <span className="font-medium">{displayName}</span>}
                <span className={displayName ? 'text-sm text-gray-500 block' : ''}>
                  {user?.email}
                </span>
              </div>
              <button
                onClick={handleSignOut}
                className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            {displayName ? `Welcome back, ${displayName}!` : 'Welcome to your dashboard!'}
          </h2>
          <p className="text-gray-600">
            You're now logged in and ready to use Kernoco.
          </p>
        </div>
      </main>
    </div>
  );
} 