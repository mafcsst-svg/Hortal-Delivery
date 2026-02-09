import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://axdltvjmqmiguupcqvox.supabase.co';
const supabaseAnonKey = 'sb_publishable_FxRugqE4fpO6UfMo-JdGRw_r5E07OVf';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
