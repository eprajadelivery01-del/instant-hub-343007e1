import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://mqhzlhuaxdntkupnkmdk.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1xaHpsaHVheGRudGt1cG5rbWRrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc3Mzg2NDQsImV4cCI6MjA5MzMxNDY0NH0.i6v5Fep6_o51nFTtQwHUDzil0OGh5vaLYvAJNQbuSHk';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

// Handle token refresh errors gracefully by NOT logging the user out immediately.
// The user should remain logged in until an explicit API call fails with 401 Unauthorized,
// or until they manually click 'sair'.
supabase.auth.onAuthStateChange((event, session) => {
  if (import.meta.env.DEV) {
    console.log(`[Supabase Auth Event] ${event}`);
  }
});
