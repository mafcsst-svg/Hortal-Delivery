import React, { useState, useRef, useEffect } from 'react';
import { ChevronLeft, Send } from 'lucide-react';
import { useUser } from '../contexts/UserContext';
import { useOrder } from '../contexts/OrderContext';
import { Message, ViewState } from '../types';

export const ChatView = ({ setCurrentView }: { setCurrentView: (v: ViewState) => void }) => {
  const { user } = useUser();
  const { messages, setMessages } = useOrder();
  const [inputText, setInputText] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !user) return;

    const newMessage: Message = {
      id: Date.now().toString(),
      senderId: user.id,
      senderName: user.name,
      text: inputText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isAdmin: false
    };

    setMessages((prev) => [...prev, newMessage]);
    setInputText('');
  };

  const userMessages = messages.filter((m) => m.senderId === user?.id || (m.isAdmin && m.id.includes(user?.id || '')));

  return (
    <div className="flex flex-col h-screen bg-stone-50">
      <div className="bg-white p-4 shadow-sm flex items-center gap-3">
        <button onClick={() => setCurrentView('shop')} className="p-2 hover:bg-stone-100 rounded-full">
          <ChevronLeft size={24} className="text-stone-600" />
        </button>
        <div>
          <h1 className="text-lg font-bold text-stone-800">Suporte Padaria Hortal</h1>
          <p className="text-[10px] text-green-600 font-bold uppercase tracking-widest">Online</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
        {userMessages.map((m) => (
          <div key={m.id} className={`flex ${m.isAdmin ? 'justify-start' : 'justify-end'}`}>
            <div className={`max-w-[80%] p-3 rounded-2xl text-sm shadow-sm ${m.isAdmin ? 'bg-white text-stone-800 rounded-tl-none border border-stone-100' : 'bg-brand-500 text-white rounded-tr-none'}`}>
              <p>{m.text}</p>
              <p className={`text-[10px] mt-1 text-right ${m.isAdmin ? 'text-stone-400' : 'text-brand-100'}`}>{m.timestamp}</p>
            </div>
          </div>
        ))}
        <div ref={scrollRef} />
      </div>

      <form onSubmit={handleSendMessage} className="p-4 bg-white border-t border-stone-100 flex gap-2">
        <input 
          type="text" 
          className="flex-1 bg-stone-50 border border-stone-200 rounded-xl px-4 py-2 text-sm outline-none focus:border-brand-500"
          placeholder="Digite sua mensagem..."
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
        />
        <button type="submit" className="bg-brand-500 text-white p-3 rounded-xl active:scale-90 transition-transform shadow-lg shadow-brand-100">
          <Send size={18} />
        </button>
      </form>
    </div>
  );
};
