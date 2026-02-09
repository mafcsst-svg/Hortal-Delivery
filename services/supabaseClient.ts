import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

console.log('--- SUPABASE DIAGNOSTICS ---');
console.log('Mode:', import.meta.env.MODE);
console.log('VITE_SUPABASE_URL:', supabaseUrl ? 'Set' : 'MISSING');
console.log('VITE_SUPABASE_ANON_KEY:', supabaseAnonKey ? 'Set' : 'MISSING');

if (!supabaseUrl || !supabaseAnonKey) {
    const errorMsg = 'ERRO DE CONFIGURAÇÃO: Variáveis do Supabase não encontradas na Vercel! Verifique as Settings > Environment Variables.';
    console.error(errorMsg);
    if (typeof window !== 'undefined') {
        // Apenas alerta uma vez se estiver no navegador
        (window as any)._supabaseConfigErrorShown = true;
        console.log('%c' + errorMsg, 'color: white; background: red; font-size: 20px; padding: 10px;');
    }
}

export const supabase = createClient(
    supabaseUrl || 'https://missing-url.supabase.co',
    supabaseAnonKey || 'missing-key',
    {
        realtime: {
            params: {
                eventsPerSecond: 10,
            },
        },
    }
);
