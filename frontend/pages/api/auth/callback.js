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

      return res.redirect('/dashboard');
    } catch (err) {
      console.error('Callback error:', err);
      return res.redirect('/');
    }
  }

  return res.redirect('/');
} 