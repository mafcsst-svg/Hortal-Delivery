import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

console.log('Supabase Config Check:', {
    hasUrl: !!supabaseUrl,
    hasKey: !!supabaseAnonKey,
    urlValue: supabaseUrl ? `${supabaseUrl.substring(0, 15)}...` : 'MISSING'
});

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('ERRO CRÍTICO: Credenciais do Supabase não encontradas!');
    console.error('No Vite/Vercel, as variáveis DEVEM começar com VITE_ (ex: VITE_SUPABASE_URL).');
}

export const supabase = createClient(supabaseUrl || 'https://placeholder.supabase.co', supabaseAnonKey || 'placeholder');
