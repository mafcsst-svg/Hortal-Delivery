import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';

export const AuthTest = () => {
    const [session, setSession] = useState<any>(null);
    const [profile, setProfile] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            if (session) fetchProfile(session.user.id);
            setLoading(false);
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            if (session) fetchProfile(session.user.id);
            else setProfile(null);
        });

        return () => subscription.unsubscribe();
    }, []);

    const fetchProfile = async (uid: string) => {
        const { data } = await supabase.from('profiles').select('*').eq('id', uid).single();
        setProfile(data);
    };

    if (loading) return <div className="p-4">Carregando teste...</div>;

    return (
        <div className="fixed top-4 left-4 z-[9999] bg-white p-4 rounded-2xl shadow-2xl border border-stone-200 max-w-xs text-xs font-mono overflow-hidden">
            <h3 className="font-bold mb-2 flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${session ? 'bg-green-500' : 'bg-red-500'}`} />
                Supabase Auth Test
            </h3>

            {session ? (
                <div className="space-y-2">
                    <p className="truncate text-green-600">Conectado: {session.user.email}</p>
                    {profile ? (
                        <div className="bg-stone-50 p-2 rounded border border-stone-100">
                            <p>ID: {profile.id.slice(0, 8)}...</p>
                            <p>Nome: {profile.name}</p>
                            <p>Role: {profile.role}</p>
                            <p>Cashback: R$ {profile.cashback_balance}</p>
                        </div>
                    ) : (
                        <p className="text-amber-600 italic">Buscando perfil...</p>
                    )}
                    <button
                        onClick={() => supabase.auth.signOut()}
                        className="w-full py-1 bg-red-100 text-red-600 rounded hover:bg-red-200 transition-colors"
                    >
                        Sair
                    </button>
                </div>
            ) : (
                <p className="text-stone-400 italic">Nenhum usuário logado.</p>
            )}
        </div>
    );
};
