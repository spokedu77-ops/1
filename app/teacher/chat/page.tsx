'use client';

import { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Send } from 'lucide-react';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function TeacherChatPage() {
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [myId, setMyId] = useState<string>('');
  const [roomId, setRoomId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setMyId(user.id);

      let { data: room } = await supabase.from('chat_rooms').select('id').eq('teacher_id', user.id).single();
      
      if (!room) {
        const { data: newRoom } = await supabase.from('chat_rooms').insert({ teacher_id: user.id }).select().single();
        room = newRoom;
      }

      if (room) {
        setRoomId(room.id);
        fetchMessages(room.id);
        
        const channel = supabase.channel(`room:${room.id}`)
          .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `room_id=eq.${room.id}` }, 
          (payload) => {
            setMessages((prev) => [...prev, payload.new]);
          })
          .subscribe();
          
        return () => { supabase.removeChannel(channel); };
      }
    };
    init();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchMessages = async (rId: string) => {
    const { data } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('room_id', rId)
      .order('created_at', { ascending: true });
    setMessages(data || []);
  };

  const scrollToBottom = () => {
    if (messages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const sendMessage = async (e: any) => {
    e.preventDefault();
    if (!input.trim() || !roomId || !myId) return;

    const msgContent = input;
    setInput('');

    await supabase.from('chat_messages').insert({
      room_id: roomId,
      sender_id: myId,
      content: msgContent
    });
  };

  return (
    // 상위 Layout이 제공하는 공간 안에서 꽉 차게 설정
    // h-[calc(100vh-200px)]: 헤더와 하단 탭바 높이를 제외한 순수 채팅 영역 확보
    <div className="flex flex-col w-full bg-transparent relative h-[calc(100vh-220px)] md:h-[calc(100vh-250px)]">
      
      {/* 1. 메시지 리스트 영역 */}
      <div className="flex-1 overflow-y-auto px-1 py-4 space-y-4 custom-scrollbar">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full opacity-30 grayscale pt-20">
             <div className="w-16 h-16 bg-slate-200 rounded-full mb-4 flex items-center justify-center">
               <Send size={24} className="text-slate-400" />
             </div>
             <p className="text-sm font-black italic uppercase tracking-tighter">No Messages Yet</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.sender_id === myId;
            return (
              <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-1 duration-300`}>
                <div className={`max-w-[85%] px-4 py-3 rounded-[20px] text-[13px] font-medium shadow-sm break-words leading-relaxed ${
                  isMe 
                    ? 'bg-indigo-600 text-white rounded-tr-none shadow-indigo-100' 
                    : 'bg-white border border-slate-100 text-slate-800 rounded-tl-none'
                }`}>
                  {msg.content}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* 2. 입력 폼 (하단 탭바 바로 위에 고정되도록 위치 조정) */}
      <div className="fixed bottom-24 left-0 right-0 z-40 flex justify-center px-6">
        <form 
          onSubmit={sendMessage} 
          className="max-w-2xl w-full bg-white/80 backdrop-blur-xl border border-slate-200/50 p-2 rounded-[24px] shadow-xl flex gap-2 items-center"
        >
          <input 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="운영진에게 메시지 보내기..."
            className="flex-1 bg-transparent px-4 py-3 outline-none text-[14px] font-bold text-slate-700 placeholder:text-slate-300"
          />
          <button 
            type="submit" 
            disabled={!input.trim()} 
            className="w-11 h-11 bg-indigo-600 text-white rounded-2xl flex items-center justify-center hover:bg-slate-900 transition-all active:scale-95 disabled:opacity-20 shadow-lg shadow-indigo-100"
          >
            <Send size={18} />
          </button>
        </form>
      </div>
    </div>
  );
}