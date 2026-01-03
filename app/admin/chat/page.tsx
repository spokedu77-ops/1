'use client';

import { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Send, Plus, ChevronLeft, MoreVertical, UserPlus, Trash2, Users, Check } from 'lucide-react';

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
        fetchTeachers(); // 시작할 때 모든 선생님 목록을 미리 가져옵니다.
      }
    };
    init();
  }, []);

  // 1. 모든 방 목록 및 데이터 가공
  const fetchRooms = async () => {
    const { data: roomsData } = await supabase
      .from('chat_rooms')
      .select(`*, chat_participants(user_id), chat_messages(content, created_at)`);

    if (roomsData) {
      const processed = roomsData.map(room => {
        const lastMsg = room.chat_messages?.sort((a: any, b: any) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )[0];
        return {
          ...room,
          last_message_at: lastMsg?.created_at || room.created_at,
          last_message_content: lastMsg?.content || "대화 내용이 없습니다.",
          participant_count: room.chat_participants?.length || 0
        };
      }).sort((a, b) => new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime());
      setRooms(processed);
    }
  };

  // 2. 활성화된 선생님 목록 불러오기 (is_active 필터링 적용)
  const fetchTeachers = async () => {
    const { data, error } = await supabase
      .from('users')
      .select('id, name')
      .eq('is_active', true)
      .neq('role', 'ADMIN');
    
    if (data) setTeacherList(data);
    if (error) console.error("선생님 목록 로드 실패:", error);
  };

  // 3. 참여자 명단 및 인원수 확인
  const fetchRoomParticipants = async (roomId: string) => {
    const { data } = await supabase
      .from('chat_participants')
      .select('user_id, users(name)')
      .eq('room_id', roomId);
    if (data) setParticipants(data);
  };

  const enterRoom = async (room: any) => {
    setSelectedRoom(room);
    setView('chat');
    fetchRoomParticipants(room.id);
    const { data } = await supabase.from('chat_messages').select('*').eq('room_id', room.id).order('created_at', { ascending: true });
    if (data) setMessages(data);
  };

  // 4. 새로운 대화방 생성 (선생님 선택 시)
  const handleCreateRoom = async (teacher: any) => {
    const { data: newRoom, error: roomError } = await supabase
      .from('chat_rooms')
      .insert({ custom_name: `${teacher.name} 선생님 대화`, teacher_id: myId })
      .select().single();

    if (newRoom) {
      await supabase.from('chat_participants').insert([
        { room_id: newRoom.id, user_id: myId },
        { room_id: newRoom.id, user_id: teacher.id }
      ]);
      setIsCreateOpen(false);
      fetchRooms();
      enterRoom(newRoom);
    }
  };

  // 5. 선생님 추가 초대 (기존 방에 추가)
  const handleInviteTeacher = async (teacherId: string) => {
    if (!selectedRoom) return;
    
    // 이미 있는 인원인지 체크
    const isAlreadyIn = participants.some(p => p.user_id === teacherId);
    if (isAlreadyIn) return alert("이미 대화에 참여 중인 선생님입니다.");

    const { error } = await supabase
      .from('chat_participants')
      .insert({ room_id: selectedRoom.id, user_id: teacherId });

    if (!error) {
      await fetchRoomParticipants(selectedRoom.id);
      await fetchRooms();
      setIsInviteOpen(false);
    }
  };

  // 6. 채팅방 삭제
  const handleDeleteRoom = async () => {
    if (!selectedRoom) return;
    if (!confirm("이 대화방을 정말 삭제하시겠습니까?")) return;

    const { error } = await supabase.from('chat_rooms').delete().eq('id', selectedRoom.id);
    if (!error) {
      setView('list');
      fetchRooms();
      setIsMenuOpen(false);
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !selectedRoom || !myId) return;
    const content = input;
    setInput('');
    await supabase.from('chat_messages').insert({ room_id: selectedRoom.id, sender_id: myId, content });
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
        
        {/* 리스트 화면 */}
        {view === 'list' && (
          <div className="flex flex-col h-full bg-white">
            <header className="px-5 pt-14 pb-4 flex justify-between items-center bg-white/80 backdrop-blur-md sticky top-0 z-10 border-b border-slate-50">
              <h1 className="text-3xl font-bold tracking-tight">대화</h1>
              <button onClick={() => setIsCreateOpen(true)} className="p-2 bg-slate-100 rounded-full cursor-pointer active:scale-90 transition-transform"><Plus size={22} /></button>
            </header>
            <div className="flex-1 overflow-y-auto">
              {rooms.map(room => (
                <div key={room.id} onClick={() => enterRoom(room)} className="px-5 py-4 flex items-center gap-4 active:bg-slate-50 cursor-pointer border-b border-slate-50 transition-colors">
                  <div className="w-14 h-14 bg-gradient-to-br from-blue-400 to-blue-600 rounded-[22px] flex items-center justify-center text-white font-bold text-lg shadow-md">{room.custom_name[0]}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center mb-0.5">
                      <span className="font-bold text-[16px] truncate pr-2">{room.custom_name}</span>
                      <span className="text-[12px] text-slate-400 whitespace-nowrap">
                        {new Date(room.last_message_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', hour12: false})}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <p className="text-[14px] text-slate-500 truncate flex-1">{room.last_message_content}</p>
                      <span className="ml-2 bg-blue-50 text-blue-600 text-[10px] px-1.5 py-0.5 rounded-full font-bold flex items-center gap-1">
                        <Users size={10} /> {room.participant_count}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 채팅 화면 */}
        {view === 'chat' && selectedRoom && (
          <div className="flex flex-col h-full bg-white animate-in slide-in-from-right duration-300">
            <header className="h-14 flex items-center justify-between px-2 border-b bg-white/90 backdrop-blur-md sticky top-0 z-20">
              <button onClick={() => { setView('list'); fetchRooms(); }} className="p-2 text-blue-500 flex items-center cursor-pointer active:opacity-50 transition-opacity">
                <ChevronLeft size={28} /><span className="text-[16px]">목록</span>
              </button>
              <div className="flex flex-col items-center flex-1 px-2 overflow-hidden">
                <span className="text-[15px] font-bold truncate max-w-[150px]">{selectedRoom.custom_name}</span>
                <span className="text-[11px] text-slate-400 font-medium">{participants.length}명 대화 중</span>
              </div>
              <div className="relative">
                <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="p-2 text-blue-500 cursor-pointer"><MoreVertical size={22} /></button>
                {isMenuOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white shadow-2xl border rounded-2xl p-1 z-50 overflow-hidden ring-1 ring-black/5 animate-in fade-in zoom-in-95">
                    <button onClick={() => { setIsInviteOpen(true); setIsMenuOpen(false); }} className="w-full flex items-center gap-2 p-3 text-sm hover:bg-slate-50 border-b cursor-pointer transition-colors font-medium text-slate-700">
                      <UserPlus size={16} className="text-blue-500" /> 선생님 초대
                    </button>
                    <button onClick={handleDeleteRoom} className="w-full flex items-center gap-2 p-3 text-sm text-red-500 hover:bg-red-50 cursor-pointer transition-colors font-medium">
                      <Trash2 size={16} /> 채팅방 삭제
                    </button>
                  </div>
                )}
              </div>
            </header>

            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-white">
              {messages.map((m, idx) => {
                const isMine = m.sender_id === myId;
                return (
                  <div key={idx} className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}>
                    <div className={`max-w-[75%] px-4 py-2 rounded-[20px] text-[15px] shadow-sm ${isMine ? 'bg-blue-600 text-white rounded-tr-[5px]' : 'bg-slate-100 text-black rounded-tl-[5px]'}`}>
                      {m.content}
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            <footer className="p-3 pb-8 bg-white border-t">
              <form onSubmit={sendMessage} className="flex gap-2 items-center">
                <div className="flex-1 bg-slate-100 rounded-3xl px-4 py-1.5 border border-slate-200">
                  <input value={input} onChange={e => setInput(e.target.value)} placeholder="메시지 입력" className="w-full bg-transparent outline-none py-1 text-[15px]" />
                </div>
                <button type="submit" disabled={!input.trim()} className="bg-blue-600 text-white rounded-full p-1.5 cursor-pointer disabled:opacity-30 transition-all active:scale-90"><Send size={18} fill="currentColor" /></button>
              </form>
            </footer>
          </div>
        )}

        {/* [모달] 선생님 초대 & 새로운 대화 */}
        {(isCreateOpen || isInviteOpen) && (
          <div className="absolute inset-0 bg-white z-[100] flex flex-col animate-in slide-in-from-bottom duration-300">
            <header className="px-4 py-6 flex justify-between items-center border-b sticky top-0 bg-white">
              <h2 className="text-xl font-bold">{isCreateOpen ? "새로운 대화" : "선생님 초대"}</h2>
              <button onClick={() => { setIsCreateOpen(false); setIsInviteOpen(false); }} className="text-blue-500 font-bold cursor-pointer p-2">닫기</button>
            </header>
            <div className="flex-1 overflow-y-auto bg-slate-50 p-3">
              <p className="text-xs text-slate-400 mb-3 px-1">활동 중인 선생님 목록 ({teacherList.length})</p>
              {teacherList.map(t => (
                <div 
                  key={t.id} 
                  onClick={() => isCreateOpen && handleCreateRoom(t)}
                  className="flex items-center justify-between p-4 bg-white rounded-2xl mb-2 border border-slate-100 shadow-sm cursor-pointer active:scale-[0.98] transition-all"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center font-bold text-blue-600 text-lg">{t.name[0]}</div>
                    <span className="font-bold text-slate-800">{t.name} 선생님</span>
                  </div>
                  {isInviteOpen && (
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleInviteTeacher(t.id); }}
                      className="px-4 py-1.5 bg-blue-600 text-white rounded-full text-sm font-bold shadow-md cursor-pointer active:bg-blue-700"
                    >
                      초대
                    </button>
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