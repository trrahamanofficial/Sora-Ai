import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Request, Response, NextFunction } from 'express';

const SUPABASE_URL = process.env.SUPABASE_URL || 'http://127.0.0.1:54321';
const SUPABASE_ANON_KEY =
  process.env.SUPABASE_ANON_KEY || 'missing-supabase-anon-key';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// Server-side client
export const supabaseAdmin: SupabaseClient = createClient(
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  }
);

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email?: string;
    role?: 'user' | 'admin';
  };
}

// Middleware: Verify user authentication via Supabase Bearer token
export async function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    // Check if anonymous session is allowed for chat or required
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Missing or invalid Authorization header with Bearer token.',
    });
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    const { data, error } = await supabaseAdmin.auth.getUser(token);

    if (error || !data.user) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid or expired session token.',
      });
      return;
    }

    // Fetch user profile from database to get the real, non-tamperable role
    let role: 'user' | 'admin' = 'user';
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', data.user.id)
      .single();

    if (profile && profile.role) {
      role = profile.role;
    }

    req.user = {
      id: data.user.id,
      email: data.user.email,
      role,
    };

    next();
  } catch (err) {
    console.error('Authentication verification failed:', err);
    res.status(401).json({ error: 'Authentication verification failed.' });
  }
}


// Optional authentication: public chat works without an account, while signed-in
// users may still save their own conversation history.
export async function optionalAuth(
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) { next(); return; }
  try {
    const token = authHeader.split(' ')[1];
    const { data, error } = await supabaseAdmin.auth.getUser(token);
    if (!error && data.user) {
      const { data: profile } = await supabaseAdmin.from('profiles').select('role').eq('id', data.user.id).single();
      req.user = { id: data.user.id, email: data.user.email, role: profile?.role === 'admin' ? 'admin' : 'user' };
    }
  } catch (err) { console.warn('[SORA] Optional session could not be verified:', err); }
  next();
}

// Middleware: Require Admin role (strictly checks database role, never frontend headers)
export async function requireAdmin(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Admin authentication required.',
    });
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    const { data, error } = await supabaseAdmin.auth.getUser(token);

    if (error || !data.user) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid or expired admin session token.',
      });
      return;
    }

    // Check profiles table for role = 'admin'
    const { data: profile, error: profileErr } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', data.user.id)
      .single();

    // Check if user is admin
    const isAdmin = profile && profile.role === 'admin';

    if (!isAdmin) {
      res.status(403).json({
        error: 'Forbidden',
        message:
          'Access denied. Only authorized administrators can configure AI providers. Run the admin assignment SQL command in Supabase to grant access.',
      });
      return;
    }

    req.user = {
      id: data.user.id,
      email: data.user.email,
      role: 'admin',
    };

    next();
  } catch (err) {
    console.error('Admin authorization check failed:', err);
    res.status(403).json({ error: 'Admin authorization check failed.' });
  }
}
