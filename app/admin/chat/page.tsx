'use client';

import { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Send, Plus, ChevronLeft, MoreVertical, UserPlus, Trash2, Users } from 'lucide-react';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function AdminChatPage() {
  const [view, setView] = useState<'list' | 'chat'>('list');
  const [rooms, setRooms] = useState<any[]>([]);
  const [teacherList, setTeacherList] = useState<any[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [participants, setParticipants] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [myId, setMyId] = useState<string | null>(null);
  
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setMyId(user.id);
        fetchRooms();
        fetchTeachers();
      }
    };
    init();
  }, []);

  const fetchRooms = async () => {
    const { data: roomsData, error } = await supabase
      .from('chat_rooms')
      .select(`
        *, 
        chat_participants(user_id),
        chat_messages(content, created_at)
      `);

    if (error) {
      console.error("방 목록 로드 에러:", error.message);
      return fetchRoomsFallback();
    }

    if (roomsData) {
      const processed = roomsData.map(room => {
        const msgs = room.chat_messages || [];
        const lastMsg = [...msgs].sort((a: any, b: any) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )[0];
        
        const participantCount = room.chat_participants?.length || 0;
        
        return {
          ...room,
          last_message_at: lastMsg?.created_at || room.created_at,
          last_message_content: lastMsg?.content || "대화를 시작해보세요",
          participant_count: participantCount
        };
      }).sort((a, b) => new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime());
      
      setRooms(processed);
    }
  };

  const fetchRoomsFallback = async () => {
    const { data: roomsData } = await supabase.from('chat_rooms').select('*');
    if (!roomsData || roomsData.length === 0) {
      setRooms([]);
      return;
    }

    const processed = await Promise.all(roomsData.map(async (room) => {
      const { data: participantsData } = await supabase
        .from('chat_participants')
        .select('user_id')
        .eq('room_id', room.id);

      const { data: messagesData } = await supabase
        .from('chat_messages')
        .select('content, created_at')
        .eq('room_id', room.id)
        .order('created_at', { ascending: false })
        .limit(1);

      return {
        ...room,
        last_message_at: messagesData?.[0]?.created_at || room.created_at,
        last_message_content: messagesData?.[0]?.content || "대화를 시작해보세요",
        participant_count: participantsData?.length || 0
      };
    }));

    setRooms(processed.sort((a, b) => 
      new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime()
    ));
  };

  const fetchTeachers = async () => {
    const { data, error } = await supabase
      .from('users')
      .select('id, name, role, is_active')
      .eq('is_active', true)
      .neq('role', 'ADMIN')
      .not('id', 'is', null);
    
    if (error) {
      console.error("선생님 목록 로드 실패:", error.message);
      return;
    }

    const validTeachers = data?.filter(t => t.id && t.id.trim() !== '') || [];
    setTeacherList(validTeachers);
  };

  const fetchRoomParticipants = async (roomId: string) => {
    const { data, error } = await supabase
      .from('chat_participants')
      .select('user_id, users(id, name)')
      .eq('room_id', roomId);
    
    if (error) {
      return fetchRoomParticipantsFallback(roomId);
    }

    if (data) setParticipants(data);
  };

  const fetchRoomParticipantsFallback = async (roomId: string) => {
    const { data: participantIds } = await supabase
      .from('chat_participants')
      .select('user_id')
      .eq('room_id', roomId);

    if (!participantIds || participantIds.length === 0) {
      setParticipants([]);
      return;
    }

    const userIds = participantIds.map(p => p.user_id);
    const { data: users } = await supabase
      .from('users')
      .select('id, name')
      .in('id', userIds);

    const participantsWithNames = participantIds.map(p => ({
      user_id: p.user_id,
      users: users?.find(u => u.id === p.user_id) || { name: '알 수 없음' }
    }));

    setParticipants(participantsWithNames);
  };

  const enterRoom = async (room: any) => {
    setSelectedRoom(room);
    setView('chat');
    fetchRoomParticipants(room.id);
    const { data } = await supabase.from('chat_messages').select('*').eq('room_id', room.id).order('created_at', { ascending: true });
    if (data) setMessages(data);
  };

  const handleCreateRoom = async (teacher: any) => {
    if (!myId) return;

    const { data: roomError } = await supabase
      .from('chat_rooms')
      .insert({ custom_name: `${teacher.name} 선생님`, teacher_id: myId })
      .select()
      .single();

    if (roomError) return;
    setIsCreateOpen(false);
    fetchRooms();
  };

  const handleInviteTeacher = async (teacherId: string) => {
    if (!selectedRoom) return;
    const isAlreadyIn = participants.some(p => p.user_id === teacherId);
    if (isAlreadyIn) return;

    const { error } = await supabase
      .from('chat_participants')
      .insert({ room_id: selectedRoom.id, user_id: teacherId });

    if (!error) {
      fetchRoomParticipants(selectedRoom.id);
      setIsInviteOpen(false);
    }
  };

  const handleDeleteRoom = async () => {
    if (!selectedRoom || !confirm("삭제하시겠습니까?")) return;
    const { error } = await supabase.from('chat_rooms').delete().eq('id', selectedRoom.id);
    if (!error) {
      setView('list');
      fetchRooms();
      setIsMenuOpen(false);
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || !selectedRoom || !myId) return;
    const content = input;
    setInput('');
    await supabase.from('chat_messages').insert({ room_id: selectedRoom.id, sender_id: myId, content });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  useEffect(() => {
    if (!selectedRoom) return;
    const channel = supabase.channel(`room_${selectedRoom.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `room_id=eq.${selectedRoom.id}` }, 
      (payload) => { setMessages(prev => [...prev, payload.new]); fetchRooms(); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [selectedRoom]);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  return (
    <div className="flex justify-center bg-[#F2F2F7] h-[100dvh] overflow-hidden text-black font-sans selection:bg-blue-100">
      <div className="w-full max-w-md bg-white flex flex-col relative shadow-2xl overflow-hidden">
        
        {view === 'list' && (
          <div className="flex flex-col h-full bg-white">
            <header className="px-5 pt-14 pb-4 flex justify-between items-center bg-white/80 backdrop-blur-md sticky top-0 z-10 border-b border-slate-50">
              <h1 className="text-3xl font-bold tracking-tight">대화</h1>
              <button onClick={() => setIsCreateOpen(true)} className="p-2 bg-slate-100 rounded-full cursor-pointer"><Plus size={22} /></button>
            </header>
            <div className="flex-1 overflow-y-auto">
              {rooms.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-400">대화방이 없습니다</div>
              ) : (
                rooms.map(room => (
                  <div key={room.id} onClick={() => enterRoom(room)} className="px-5 py-4 flex items-center gap-4 active:bg-slate-50 cursor-pointer border-b border-slate-50 transition-colors">
                    <div className="w-14 h-14 bg-gradient-to-br from-blue-400 to-blue-600 rounded-[22px] flex items-center justify-center text-white font-bold text-lg shadow-md">
                      {(room.custom_name && room.custom_name[0]) || '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center mb-0.5">
                        <span className="font-bold text-[16px] truncate pr-2">{room.custom_name || '대화방'}</span>
                        <span className="text-[12px] text-slate-400">
                          {room.last_message_at ? new Date(room.last_message_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', hour12: false}) : ''}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <p className="text-[14px] text-slate-500 truncate flex-1">{room.last_message_content || '대화를 시작해보세요'}</p>
                        <span className="ml-2 bg-blue-50 text-blue-600 text-[10px] px-1.5 py-0.5 rounded-full font-black flex items-center gap-1">
                          <Users size={10} /> {room.participant_count || 0}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {view === 'chat' && selectedRoom && (
          <div className="flex flex-col h-full bg-white animate-in slide-in-from-right duration-300">
            <header className="h-14 flex items-center justify-between px-2 border-b bg-white/90 backdrop-blur-md sticky top-0 z-20">
              <button onClick={() => { setView('list'); fetchRooms(); }} className="p-2 text-blue-500 flex items-center cursor-pointer">
                <ChevronLeft size={28} /><span className="text-[16px]">목록</span>
              </button>
              <div className="flex flex-col items-center flex-1 px-2 overflow-hidden text-center">
                <span className="text-[15px] font-bold truncate max-w-[150px]">{selectedRoom.custom_name || '대화방'}</span>
                <span className="text-[11px] text-slate-400 font-medium">{participants?.length || 0}명 참여중</span>
              </div>
              <div className="relative">
                <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="p-2 text-blue-500 cursor-pointer"><MoreVertical size={22} /></button>
                {isMenuOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white shadow-2xl border rounded-2xl p-1 z-50">
                    <button onClick={() => { setIsInviteOpen(true); setIsMenuOpen(false); }} className="w-full flex items-center gap-2 p-3 text-sm hover:bg-slate-50 border-b cursor-pointer transition-colors font-medium text-slate-700">
                      <UserPlus size={16} className="text-blue-500" /> 선생님 초대
                    </button>
                    <button onClick={handleDeleteRoom} className="w-full flex items-center gap-2 p-3 text-sm text-red-500 hover:bg-red-50 cursor-pointer font-medium">
                      <Trash2 size={16} /> 채팅방 삭제
                    </button>
                  </div>
                )}
              </div>
            </header>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-white">
              {messages.length === 0 ? (
                <div className="flex items-center justify-center h-full text-slate-400 text-sm">대화를 시작해보세요</div>
              ) : (
                messages.map((m, idx) => {
                  const isMine = m.sender_id === myId;
                  const sender = participants.find(p => p.user_id === m.sender_id);
                  const senderName = sender?.users?.name || '알 수 없음';
                  const messageTime = new Date(m.created_at);
                  const timeStr = messageTime.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: true });
                  const showDate = idx === 0 || (messages[idx - 1] && new Date(messages[idx - 1].created_at).toDateString() !== messageTime.toDateString());
                  
                  return (
                    <div key={m.id || idx}>
                      {showDate && (
                        <div className="flex items-center justify-center my-4">
                          <div className="bg-slate-200 text-slate-600 text-[11px] px-3 py-1 rounded-full">
                            {messageTime.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })}
                          </div>
                        </div>
                      )}
                      <div className={`flex ${isMine ? 'flex-row-reverse' : 'flex-row'} gap-2`}>
                        <div className={`flex flex-col ${isMine ? 'items-end' : 'items-start'} max-w-[70%]`}>
                          {!isMine && <span className="text-[12px] text-slate-600 mb-1 px-1 font-medium">{senderName}</span>}
                          <div className={`flex items-end gap-1 ${isMine ? 'flex-row-reverse' : 'flex-row'}`}>
                            <div className={`px-3 py-2 rounded-[18px] text-[15px] leading-[1.4] break-words ${isMine ? 'bg-[#FFE600] text-black rounded-br-[4px]' : 'bg-white border border-slate-200 text-black rounded-bl-[4px]'}`}>
                              {m.content}
                            </div>
                            <span className="text-[10px] text-slate-400 mb-1 whitespace-nowrap">{timeStr}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            <footer className="p-3 pb-8 bg-white border-t">
              <div className="flex gap-2 items-center">
                <div className="flex-1 bg-slate-100 rounded-3xl px-4 py-1.5 border border-slate-200">
                  <input value={input} onChange={e => setInput(e.target.value)} onKeyPress={handleKeyPress} placeholder="메시지 입력" className="w-full bg-transparent outline-none py-1 text-[15px]" />
                </div>
                <button onClick={sendMessage} disabled={!input.trim()} className="bg-blue-600 text-white rounded-full p-1.5 cursor-pointer disabled:opacity-30">
                  <Send size={18} fill="currentColor" />
                </button>
              </div>
            </footer>
          </div>
        )}

        {(isCreateOpen || isInviteOpen) && (
          <div className="absolute inset-0 bg-white z-[100] flex flex-col animate-in slide-in-from-bottom duration-300">
            <header className="px-4 py-6 flex justify-between items-center border-b sticky top-0 bg-white">
              <h2 className="text-xl font-bold">{isCreateOpen ? "새로운 대화" : "선생님 초대"}</h2>
              <button onClick={() => { setIsCreateOpen(false); setIsInviteOpen(false); }} className="text-blue-500 font-bold cursor-pointer p-2">닫기</button>
            </header>
            <div className="flex-1 overflow-y-auto bg-slate-50 p-3">
              <p className="text-xs text-slate-400 mb-3 px-1">활동 중인 선생님 목록 ({teacherList.length})</p>
              {teacherList.map(t => (
                <div key={t.id} onClick={() => isCreateOpen && handleCreateRoom(t)} className="flex items-center justify-between p-4 bg-white rounded-2xl mb-2 border border-slate-100 shadow-sm cursor-pointer">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center font-bold text-blue-600 text-lg">{t.name[0]}</div>
                    <span className="font-bold text-slate-800">{t.name} 선생님</span>
                  </div>
                  {isInviteOpen && (
                    <button onClick={(e) => { e.stopPropagation(); handleInviteTeacher(t.id); }} className="px-4 py-1.5 bg-blue-600 text-white rounded-full text-sm font-bold shadow-md active:bg-blue-700">초대</button>
                  )}
                  {isCreateOpen && <Plus size={20} className="text-slate-300" />}
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}