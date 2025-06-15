import { supabase } from '../../../lib/supabase';

export default async function handler(req, res) {
  const { code, error } = req.query;

  if (error) {
    console.error('Auth error:', error);
    return res.redirect('/');
  }

  if (code) {
    try {
      const { data, error: sessionError } = await supabase.auth.exchangeCodeForSession(code);
      
      if (sessionError) {
        console.error('Session error:', sessionError);
        return res.redirect('/');
      }

      // Successful authentication - redirect to dashboard
      return res.redirect('/dashboard');
    } catch (err) {
      console.error('Callback error:', err);
      return res.redirect('/');
    }
  }

  // If no code or error, just redirect to homepage (for now) - TODO : handle this better
  return res.redirect('/');
} 