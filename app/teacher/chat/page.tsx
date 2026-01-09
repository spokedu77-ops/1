'use client';

import { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Send, ChevronLeft } from 'lucide-react';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function TeacherChatPage() {
  const [view, setView] = useState<'list' | 'chat'>('list');
  const [rooms, setRooms] = useState<any[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [participants, setParticipants] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [myId, setMyId] = useState<string | null>(null);
  const [myName, setMyName] = useState<string>('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setMyId(user.id);
        
        // 내 이름 가져오기
        const { data: userData } = await supabase
          .from('users')
          .select('name')
          .eq('id', user.id)
          .single();
        
        if (userData) setMyName(userData.name);
        
        fetchMyRooms(user.id);
      }
    };
    init();
  }, []);

  // 내가 참여한 방만 가져오기
  const fetchMyRooms = async (userId: string) => {
    // Step 1: 내가 참여한 방 ID 찾기
    const { data: myParticipations } = await supabase
      .from('chat_participants')
      .select('room_id')
      .eq('user_id', userId);

    if (!myParticipations || myParticipations.length === 0) {
      setRooms([]);
      return;
    }

    const roomIds = myParticipations.map(p => p.room_id);

    // Step 2: 방 정보 가져오기
    const { data: roomsData } = await supabase
      .from('chat_rooms')
      .select('*')
      .in('id', roomIds);

    if (!roomsData) {
      setRooms([]);
      return;
    }

    // Step 3: 각 방의 상세 정보 가져오기
    const processed = await Promise.all(roomsData.map(async (room) => {
      // 참여자 수
      const { data: participants } = await supabase
        .from('chat_participants')
        .select('user_id')
        .eq('room_id', room.id);

      // 마지막 메시지
      const { data: messages } = await supabase
        .from('chat_messages')
        .select('content, created_at')
        .eq('room_id', room.id)
        .order('created_at', { ascending: false })
        .limit(1);

      return {
        ...room,
        last_message_at: messages?.[0]?.created_at || room.created_at,
        last_message_content: messages?.[0]?.content || "대화를 시작해보세요",
        participant_count: participants?.length || 0
      };
    }));

    // 최신순 정렬
    const sorted = processed.sort((a, b) => 
      new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime()
    );

    setRooms(sorted);
  };

  // 참여자 정보 가져오기
  const fetchRoomParticipants = async (roomId: string) => {
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

  // 방 입장
  const enterRoom = async (room: any) => {
    setSelectedRoom(room);
    setView('chat');
    await fetchRoomParticipants(room.id);
    
    const { data } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('room_id', room.id)
      .order('created_at', { ascending: true });
    
    if (data) setMessages(data);
  };

  // 메시지 전송
  const sendMessage = async () => {
    if (!input.trim() || !selectedRoom || !myId) return;
    
    const content = input;
    setInput('');
    
    const { error } = await supabase
      .from('chat_messages')
      .insert({ 
        room_id: selectedRoom.id, 
        sender_id: myId, 
        content 
      });

    if (error) {
      console.error("메시지 전송 실패:", error.message);
      setInput(content);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // 실시간 메시지 구독
  useEffect(() => {
    if (!selectedRoom) return;
    
    const channel = supabase
      .channel(`room_${selectedRoom.id}`)
      .on(
        'postgres_changes',
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'chat_messages', 
          filter: `room_id=eq.${selectedRoom.id}` 
        },
        (payload) => {
          setMessages(prev => [...prev, payload.new]);
          if (myId) fetchMyRooms(myId);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedRoom, myId]);

  // 자동 스크롤
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="flex justify-center bg-[#F2F2F7] h-[100dvh] overflow-hidden text-black font-sans selection:bg-blue-100">
      <div className="w-full max-w-md bg-white flex flex-col relative shadow-2xl overflow-hidden">
        
        {/* 리스트 화면 */}
        {view === 'list' && (
          <div className="flex flex-col h-full bg-white">
            <header className="px-5 pt-14 pb-4 flex justify-between items-center bg-white/80 backdrop-blur-md sticky top-0 z-10 border-b border-slate-50">
              <h1 className="text-3xl font-bold tracking-tight">대화</h1>
            </header>
            
            <div className="flex-1 overflow-y-auto">
              {rooms.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-400 px-8 text-center">
                  <p className="text-lg font-medium">참여한 대화방이 없습니다</p>
                  <p className="text-sm mt-2">관리자가 대화방에 초대하면 여기에 표시됩니다</p>
                </div>
              ) : (
                rooms.map(room => (
                  <div 
                    key={room.id} 
                    onClick={() => enterRoom(room)} 
                    className="px-5 py-4 flex items-center gap-4 active:bg-slate-50 cursor-pointer border-b border-slate-50 transition-colors"
                  >
                    <div className="w-14 h-14 bg-gradient-to-br from-blue-400 to-blue-600 rounded-[22px] flex items-center justify-center text-white font-bold text-lg shadow-md">
                      {room.custom_name[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center mb-0.5">
                        <span className="font-bold text-[16px] truncate pr-2">{room.custom_name}</span>
                        <span className="text-[12px] text-slate-400 whitespace-nowrap">
                          {new Date(room.last_message_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', hour12: false})}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <p className="text-[14px] text-slate-500 truncate flex-1">{room.last_message_content}</p>
                        {room.participant_count > 0 && (
                          <span className="ml-2 bg-blue-50 text-blue-600 text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                            {room.participant_count}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* 채팅 화면 */}
        {view === 'chat' && selectedRoom && (
          <div className="flex flex-col h-full bg-white animate-in slide-in-from-right duration-300">
            <header className="h-14 flex items-center justify-between px-2 border-b bg-white/90 backdrop-blur-md sticky top-0 z-20">
              <button 
                onClick={() => { 
                  setView('list'); 
                  if (myId) fetchMyRooms(myId);
                }} 
                className="p-2 text-blue-500 flex items-center cursor-pointer active:opacity-50 transition-opacity"
              >
                <ChevronLeft size={28} />
                <span className="text-[16px]">목록</span>
              </button>
              
              <div className="flex flex-col items-center flex-1 px-2 overflow-hidden">
                <span className="text-[15px] font-bold truncate max-w-[150px]">{selectedRoom.custom_name}</span>
                <span className="text-[11px] text-slate-400 font-medium">{participants.length}명 참여중</span>
              </div>
              
              <div className="w-[60px]"></div>
            </header>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-white">
              {messages.length === 0 ? (
                <div className="flex items-center justify-center h-full text-slate-400 text-sm">
                  대화를 시작해보세요
                </div>
              ) : (
                messages.map((m, idx) => {
                  const isMine = m.sender_id === myId;
                  
                  // 발신자 정보 찾기
                  const sender = participants.find(p => p.user_id === m.sender_id);
                  const senderName = sender?.users?.name || '알 수 없음';
                  
                  // 시간 포맷팅
                  const messageTime = new Date(m.created_at);
                  const timeStr = messageTime.toLocaleTimeString('ko-KR', { 
                    hour: '2-digit', 
                    minute: '2-digit',
                    hour12: true 
                  });
                  
                  // 날짜 표시 여부 확인
                  const showDate = idx === 0 || 
                    new Date(messages[idx - 1].created_at).toDateString() !== messageTime.toDateString();
                  
                  const dateStr = messageTime.toLocaleDateString('ko-KR', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    weekday: 'long'
                  });
                  
                  return (
                    <div key={idx}>
                      {/* 날짜 구분선 */}
                      {showDate && (
                        <div className="flex items-center justify-center my-4">
                          <div className="bg-slate-200 text-slate-600 text-[11px] px-3 py-1 rounded-full">
                            {dateStr}
                          </div>
                        </div>
                      )}
                      
                      {/* 메시지 */}
                      <div className={`flex ${isMine ? 'flex-row-reverse' : 'flex-row'} gap-2`}>
                        <div className={`flex flex-col ${isMine ? 'items-end' : 'items-start'} max-w-[70%]`}>
                          {/* 이름 (상대방 메시지만) */}
                          {!isMine && (
                            <span className="text-[12px] text-slate-600 mb-1 px-1 font-medium">
                              {senderName}
                            </span>
                          )}
                          
                          {/* 말풍선 + 시간 */}
                          <div className={`flex items-end gap-1 ${isMine ? 'flex-row-reverse' : 'flex-row'}`}>
                            <div className={`px-3 py-2 rounded-[18px] text-[15px] leading-[1.4] break-words ${
                              isMine 
                                ? 'bg-[#FFE600] text-black rounded-br-[4px]' 
                                : 'bg-white border border-slate-200 text-black rounded-bl-[4px]'
                            }`}>
                              {m.content}
                            </div>
                            <span className="text-[10px] text-slate-400 mb-1 whitespace-nowrap">
                              {timeStr}
                            </span>
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
                  <input 
                    value={input} 
                    onChange={e => setInput(e.target.value)} 
                    onKeyPress={handleKeyPress}
                    placeholder="메시지 입력" 
                    className="w-full bg-transparent outline-none py-1 text-[15px]" 
                  />
                </div>
                <button 
                  onClick={sendMessage}
                  disabled={!input.trim()} 
                  className="bg-blue-600 text-white rounded-full p-1.5 cursor-pointer disabled:opacity-30 transition-all active:scale-90"
                >
                  <Send size={18} fill="currentColor" />
                </button>
              </div>
            </footer>
          </div>
        )}

      </div>
    </div>
  );
}