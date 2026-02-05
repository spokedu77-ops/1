'use client';

import { useState, useEffect, useRef } from 'react';
import { Send, Plus, ChevronLeft, MoreVertical, UserPlus, Trash2, Users, Paperclip, X, Search, WifiOff } from 'lucide-react';
import { formatChatTimestamp } from '@/app/lib/utils';
import { fetchUnreadCounts as fetchUnreadCountsApi, markRoomAsRead } from '@/app/lib/chat';
import { registerFCMTokenIfNeeded } from '@/app/lib/fcm';
import { useEdgeSwipeBack } from '@/app/lib/useEdgeSwipeBack';
import { ToastContainer, useToast } from '@/app/components/Toast';
import { getSupabaseBrowserClient } from '@/app/lib/supabase/browser';

interface ChatRoom {
  id: string;
  custom_name?: string;
  last_message_at?: string | null;
  last_message_content?: string | null;
  participant_count?: number;
}
interface ChatParticipant { user_id: string; users?: { name?: string } }
interface ChatTeacher { id: string; name: string }
interface ChatMessage {
  id?: string;
  created_at: string;
  content?: string;
  sender_id?: string;
  file_url?: string;
  file_type?: string;
  read_by?: unknown[];
  [key: string]: unknown;
}

type ChatRoomRow = {
  id: string;
  custom_name?: string;
  created_at?: string;
  last_message_at?: string | null;
  last_message_content?: string | null;
  chat_participants?: { user_id: string }[];
  [key: string]: unknown;
};

export default function AdminChatPage() {
  const [supabase] = useState(() => (typeof window !== 'undefined' ? getSupabaseBrowserClient() : null));
  const [view, setView] = useState<'list' | 'chat'>('list');
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [teacherList, setTeacherList] = useState<ChatTeacher[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<ChatRoom | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [participants, setParticipants] = useState<ChatParticipant[]>([]);
  const [input, setInput] = useState('');
  const [myId, setMyId] = useState<string | null>(null);
  const [unreadCounts, setUnreadCounts] = useState<{[roomId: string]: number}>({});
  
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [filePreview, setFilePreview] = useState<{type: string; url: string; name: string} | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [hasMoreMessages, setHasMoreMessages] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'reconnecting' | 'offline'>('connected');
  const [notificationPermission, setNotificationPermission] = useState<'default' | 'granted' | 'denied'>(() =>
    typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'default'
  );
  const [notificationRequesting, setNotificationRequesting] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesStartRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toasts, showToast, removeToast } = useToast();

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setNotificationPermission(Notification.permission);
    }
  }, []);

  useEffect(() => {
    if (!supabase) return;
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setMyId(user.id);
        fetchRooms();
        fetchTeachers();
        fetchUnreadCounts(user.id);
        if (Notification.permission === 'granted') registerFCMTokenIfNeeded(supabase, user.id);
      }
    };
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- init once when supabase ready
  }, [supabase]);

  const handleEnableNotifications = async () => {
    if (!supabase || !myId || notificationRequesting || notificationPermission !== 'default') return;
    if (!('Notification' in window)) return;
    setNotificationRequesting(true);
    try {
      const result = await Notification.requestPermission();
      setNotificationPermission(result);
      if (result === 'granted') await registerFCMTokenIfNeeded(supabase, myId);
    } finally {
      setNotificationRequesting(false);
    }
  };

  const fetchUnreadCounts = async (userId: string) => {
    if (!supabase) return;
    const counts = await fetchUnreadCountsApi(supabase, userId);
    setUnreadCounts(counts);
  };

  // PWA 앱 아이콘 배지: 미읽음 총 개수 표시 (Badging API)
  useEffect(() => {
    const total = Object.values(unreadCounts).reduce((a, b) => a + b, 0);
    if (typeof navigator !== 'undefined' && 'setAppBadge' in navigator) {
      const nav = navigator as Navigator & { setAppBadge?(count: number): Promise<void>; clearAppBadge?(): Promise<void> };
      if (total > 0) nav.setAppBadge?.(total);
      else nav.clearAppBadge?.();
    }
  }, [unreadCounts]);

  const fetchRooms = async () => {
    if (!supabase) return;
    const { data: roomsData, error } = await supabase
      .from('chat_rooms')
      .select(`
        *,
        chat_participants(user_id)
      `)
      .order('last_message_at', { ascending: false, nullsFirst: false });

    if (error) {
      console.error("방 목록 로드 에러:", error.message);
      return fetchRoomsFallback();
    }

    if (roomsData) {
      const processed = (roomsData as ChatRoomRow[]).map((room: ChatRoomRow) => {
        const participantCount = room.chat_participants?.length || 0;
        
        return {
          ...room,
          // denormalize된 컬럼 사용 (이미 DB에 있음)
          last_message_at: room.last_message_at || room.created_at,
          last_message_content: room.last_message_content || "대화를 시작해보세요",
          participant_count: participantCount
        };
      });
      
      setRooms(processed);
    }
  };

  const fetchRoomsFallback = async () => {
    // Fallback도 denormalize된 컬럼 사용
    const { data: roomsData } = await supabase
      .from('chat_rooms')
      .select('*')
      .order('last_message_at', { ascending: false, nullsFirst: false });
      
    if (!roomsData || roomsData.length === 0) {
      setRooms([]);
      return;
    }

    const processed = await Promise.all((roomsData as ChatRoomRow[]).map(async (room: ChatRoomRow) => {
      const { data: participantsData } = await supabase
        .from('chat_participants')
        .select('user_id')
        .eq('room_id', room.id);

      return {
        ...room,
        // denormalize된 컬럼 사용
        last_message_at: room.last_message_at || room.created_at,
        last_message_content: room.last_message_content || "대화를 시작해보세요",
        participant_count: participantsData?.length || 0
      };
    }));

    setRooms(processed);
  };

  const handleBackToList = () => {
    setView('list');
    fetchRooms();
  };

  useEdgeSwipeBack({ enabled: view === 'chat', onBack: handleBackToList });

  const fetchTeachers = async () => {
    if (!supabase) return;
    const { data, error } = await supabase
      .from('users')
      .select('id, name, role, is_active')
      .eq('is_active', true)
      .neq('role', 'ADMIN')
      .not('id', 'is', null)
      .order('name', { ascending: true });  // 가나다순 정렬
    
    if (error) {
      console.error("선생님 목록 로드 실패:", error.message);
      return;
    }

    const validTeachers = data?.filter((t: ChatTeacher) => t.id && t.id.trim() !== '') || [];
    setTeacherList(validTeachers);
  };

  const fetchRoomParticipants = async (roomId: string) => {
    if (!supabase) return;
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
    if (!supabase) return;
    const { data: participantIds } = await supabase
      .from('chat_participants')
      .select('user_id')
      .eq('room_id', roomId);

    if (!participantIds || participantIds.length === 0) {
      setParticipants([]);
      return;
    }

    const userIds = participantIds.map((p: { user_id: string }) => p.user_id);
    const { data: users } = await supabase
      .from('users')
      .select('id, name')
      .in('id', userIds);

    const participantsWithNames = participantIds.map((p: { user_id: string }) => ({
      user_id: p.user_id,
      users: users?.find((u: { id: string; name?: string }) => u.id === p.user_id) || { name: '알 수 없음' }
    }));

    setParticipants(participantsWithNames);
  };

  const enterRoom = async (room: ChatRoom) => {
    setSelectedRoom(room);
    setView('chat');
    setMessages([]);
    setHasMoreMessages(false);
    fetchRoomParticipants(room.id);
    
    // 초기 로드: 최근 50개
    await loadMessages(room.id, null);
    
    // 읽음 처리
    if (myId) {
      await markAsRead(room.id, myId);
    }
  };

  const loadMessages = async (roomId: string, beforeDate: string | null, limit: number = 50) => {
    if (!supabase || loadingMessages) return;
    setLoadingMessages(true);
    try {
      let query = supabase
        .from('chat_messages')
        .select('*')
        .eq('room_id', roomId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (beforeDate) {
        query = query.lt('created_at', beforeDate);
      }

      const { data, error } = await query;

      if (error) throw error;

      if (data && data.length > 0) {
        // 역순으로 정렬하여 prepend (오래된 것부터)
        const sortedData = [...data].reverse();
        
        if (beforeDate) {
          // 추가 로드: 기존 메시지 앞에 추가
          setMessages(prev => [...sortedData, ...prev]);
        } else {
          // 초기 로드
          setMessages(sortedData);
        }
        
        // 더 불러올 메시지가 있는지 확인
        setHasMoreMessages(data.length === limit);
      } else {
        setHasMoreMessages(false);
      }
    } catch (error) {
      console.error('메시지 로드 실패:', error);
    } finally {
      setLoadingMessages(false);
    }
  };

  const loadMoreMessages = async () => {
    if (!selectedRoom || !hasMoreMessages || loadingMessages || messages.length === 0) return;
    
    // 가장 오래된 메시지의 날짜를 기준으로 이전 메시지 로드
    const oldestMessage = messages[0];
    await loadMessages(selectedRoom.id, oldestMessage.created_at);
  };

  const markAsRead = async (roomId: string, userId: string) => {
    if (!supabase) return;
    await markRoomAsRead(supabase, roomId, userId);
    await fetchUnreadCounts(userId);
  };

  const handleCreateRoom = async (teacher: ChatTeacher) => {
    if (!supabase || !myId) return;

    let createdRoomId: string | null = null;

    try {
      // 1. 방 생성
      const { data: room, error: roomError } = await supabase
        .from('chat_rooms')
        .insert({ custom_name: `${teacher.name} 선생님` })
        .select()
        .single();

      if (roomError) throw roomError;
      createdRoomId = room.id;

      // 2. 관리자 추가 (한 명씩 순차 추가하여 어느 ID가 문제인지 파악)
      const { error: adminError } = await supabase
        .from('chat_participants')
        .insert({ room_id: room.id, user_id: myId });

      if (adminError) {
        throw new Error(`관리자 추가 실패: ${adminError.message}`);
      }

      // 3. 선생님 추가
      const { error: teacherError } = await supabase
        .from('chat_participants')
        .insert({ room_id: room.id, user_id: teacher.id });

      if (teacherError) {
        throw new Error(`선생님 추가 실패: ${teacherError.message} (${teacher.name}, ID: ${teacher.id})`);
      }

      setIsCreateOpen(false);
      fetchRooms();
      showToast('채팅방이 생성되었습니다.', 'success');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      // Rollback: 생성된 방 삭제
      if (createdRoomId) {
        try {
          await supabase.from('chat_rooms').delete().eq('id', createdRoomId);
        } catch {
          // ignore rollback failure
        }
      }
      showToast(`방 생성에 실패했습니다: ${message}`, 'error', 5000);
    }
  };

  const handleInviteTeacher = async (teacherId: string) => {
    if (!supabase) return;
    if (!selectedRoom) return;
    
    const isAlreadyIn = participants.some(p => p.user_id === teacherId);
    if (isAlreadyIn) {
      showToast('이미 참여중인 선생님입니다.', 'warning');
      return;
    }

    try {
      const { error } = await supabase
        .from('chat_participants')
        .insert({ room_id: selectedRoom.id, user_id: teacherId });

      if (error) throw error;

      await fetchRoomParticipants(selectedRoom.id);
      await fetchRooms(); // 참여자 수 업데이트
      setIsInviteOpen(false);
      showToast('선생님을 초대했습니다.', 'success');
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      showToast(`초대에 실패했습니다: ${msg}`, 'error');
    }
  };

  const handleDeleteRoom = async () => {
    if (!supabase) return;
    if (!selectedRoom || !confirm("삭제하시겠습니까?")) return;
    const { error } = await supabase.from('chat_rooms').delete().eq('id', selectedRoom.id);
    if (!error) {
      setView('list');
      fetchRooms();
      setIsMenuOpen(false);
    }
  };

  const sendMessage = async () => {
    if (!supabase) return;
    if ((!input.trim() && !filePreview) || !selectedRoom || !myId) return;
    
    try {
      const messageData: Record<string, unknown> = {
        room_id: selectedRoom.id,
        sender_id: myId,
        content: input || (filePreview ? filePreview.name : '')
      };
      if (filePreview) {
        messageData.file_url = filePreview.url;
        messageData.file_type = filePreview.type;
      }
      await supabase.from('chat_messages').insert([messageData]);
      setInput('');
      setFilePreview(null);
    } catch {
      showToast('메시지 전송에 실패했습니다.', 'error');
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!supabase || !file || !selectedRoom) return;

    setUploading(true);
    try {
      // 파일명 안전화
      const timestamp = Date.now();
      const fileExt = file.name.substring(file.name.lastIndexOf('.'));
      const baseName = file.name.substring(0, file.name.lastIndexOf('.'));
      const sanitizedBaseName = baseName
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9_-]/g, '_');
      
      const filePath = `chat/${selectedRoom.id}/${timestamp}_${sanitizedBaseName}${fileExt}`;

      // Supabase Storage에 업로드
      const { error: uploadError } = await supabase.storage
        .from('chat-files')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Public URL 가져오기
      const { data: { publicUrl } } = supabase.storage
        .from('chat-files')
        .getPublicUrl(filePath);

      // 파일 미리보기 설정
      setFilePreview({
        type: file.type,
        url: publicUrl,
        name: file.name
      });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      showToast(`파일 업로드에 실패했습니다: ${msg}`, 'error');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
    // Shift+Enter는 기본 동작(줄바꿈) 허용
  };

  useEffect(() => {
    if (!supabase || !selectedRoom) return;
    const channel = supabase.channel(`room_${selectedRoom.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `room_id=eq.${selectedRoom.id}` }, 
      (payload: { new: ChatMessage }) => { 
        // 새 메시지는 항상 마지막에 추가 (최신 메시지)
        setMessages(prev => {
          // 중복 방지
          if (prev.some(m => m.id === payload.new.id)) {
            return prev;
          }
          return [...prev, payload.new];
        }); 
        fetchRooms();
        
        // 내가 보낸 메시지가 아니면 브라우저 알림
        if (payload.new.sender_id !== myId && Notification.permission === 'granted') {
          new Notification('새 메시지', {
            body: String(payload.new.content ?? ''),
            icon: '/favicon.ico',
            tag: selectedRoom.id
          });
        }
      })
      .subscribe((status: string) => {
        if (status === 'SUBSCRIBED') {
          setConnectionStatus('connected');
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          setConnectionStatus('offline');
          showToast('연결이 끊어졌습니다. 재연결 중...', 'warning');
        } else if (status === 'CLOSED') {
          setConnectionStatus('reconnecting');
        }
      });
      
    return () => { supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fetchRooms/showToast in callback only; avoid re-subscribe on every room list change
  }, [supabase, selectedRoom, myId]);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  // 방 목록 화면에서도 새 메시지 알림
  useEffect(() => {
    if (!supabase || !myId || view !== 'list') return;
    const globalChannel = supabase.channel('all_messages')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_messages'
      }, (payload: { new: ChatMessage }) => {
        // 내가 보낸 메시지가 아닐 때 알림
        if (payload.new.sender_id !== myId && Notification.permission === 'granted') {
          const room = rooms.find(r => r.id === payload.new.room_id);
          new Notification(room?.custom_name || '새 메시지', {
            body: String(payload.new.content ?? ''),
            icon: '/favicon.ico',
            tag: String(payload.new.room_id ?? '')
          });
        }
        // 읽지 않은 메시지 카운트 갱신 (RPC 함수 사용)
        if (myId) {
          fetchUnreadCounts(myId);
        }
      })
      .subscribe((status: string) => {
        if (status === 'SUBSCRIBED') {
          setConnectionStatus('connected');
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          setConnectionStatus('offline');
        } else if (status === 'CLOSED') {
          setConnectionStatus('reconnecting');
        }
      });
      
    return () => { supabase.removeChannel(globalChannel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- rooms in callback for notification; fetchUnreadCounts stable
  }, [supabase, myId, view, rooms]);

  return (
    <div className="flex justify-center bg-[#F2F2F7] min-h-[100dvh] h-[100dvh] overflow-hidden text-black font-sans selection:bg-blue-100">
      <ToastContainer toasts={toasts} onRemove={removeToast} />
      <div className="w-full max-w-md bg-white flex flex-col relative shadow-2xl overflow-hidden min-h-0">
        
        {view === 'list' && (
          <div className="flex flex-col h-full bg-white min-h-0">
            <header className="px-4 sm:px-5 pt-[max(2.5rem,env(safe-area-inset-top))] pb-4 flex justify-between items-center bg-white/80 backdrop-blur-md sticky top-0 z-10 border-b border-slate-50">
              <div className="flex items-center gap-3 min-w-0">
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight truncate">대화</h1>
                {connectionStatus !== 'connected' && (
                  <div className="flex items-center gap-1 text-xs shrink-0">
                    {connectionStatus === 'reconnecting' ? (
                      <>
                        <WifiOff size={14} className="text-yellow-500 animate-pulse" />
                        <span className="text-yellow-600">재연결 중</span>
                      </>
                    ) : (
                      <>
                        <WifiOff size={14} className="text-red-500" />
                        <span className="text-red-600">오프라인</span>
                      </>
                    )}
                  </div>
                )}
              </div>
              <button onClick={() => setIsCreateOpen(true)} className="min-h-[44px] min-w-[44px] p-2 bg-slate-100 rounded-full cursor-pointer flex items-center justify-center touch-manipulation active:bg-slate-200"><Plus size={22} /></button>
            </header>
            {notificationPermission === 'default' && (
              <div className="px-4 py-3 bg-indigo-50 border-b border-indigo-100">
                <p className="text-[13px] text-indigo-800 font-medium mb-2">채팅 알림을 받으시려면 버튼을 눌러주세요.</p>
                <button
                  type="button"
                  onClick={handleEnableNotifications}
                  disabled={notificationRequesting}
                  className="w-full py-2.5 px-4 bg-indigo-600 text-white text-sm font-bold rounded-xl touch-manipulation active:bg-indigo-700 disabled:opacity-60"
                >
                  {notificationRequesting ? '요청 중…' : '알림 켜기'}
                </button>
              </div>
            )}
            <div className="flex-1 overflow-y-auto min-h-0">
              {rooms.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-400 px-4">대화방이 없습니다</div>
              ) : (
                rooms.map(room => (
                  <div key={room.id} onClick={() => enterRoom(room)} className="px-4 sm:px-5 py-4 flex items-center gap-4 active:bg-slate-50 cursor-pointer border-b border-slate-50 transition-colors min-h-[72px] touch-manipulation">
                    <div className="w-14 h-14 bg-gradient-to-br from-blue-400 to-blue-600 rounded-[22px] flex items-center justify-center text-white font-bold text-lg shadow-md">
                      {(room.custom_name && room.custom_name[0]) || '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center mb-0.5">
                        <span className="font-bold text-[16px] truncate pr-2">{room.custom_name || '대화방'}</span>
                        <span className="text-[12px] text-slate-400">
                          {room.last_message_at ? formatChatTimestamp(room.last_message_at) : ''}
                        </span>
                      </div>
                      <div className="flex justify-between items-center gap-2">
                        <p className="text-[14px] text-slate-500 truncate flex-1">{room.last_message_content || '대화를 시작해보세요'}</p>
                        <div className="flex items-center gap-2">
                          {unreadCounts[room.id] > 0 && (
                            <span className="bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full font-black min-w-[20px] text-center">
                              {unreadCounts[room.id]}
                            </span>
                          )}
                          <span className="bg-blue-50 text-blue-600 text-[10px] px-1.5 py-0.5 rounded-full font-black flex items-center gap-1">
                            <Users size={10} /> {room.participant_count || 0}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {view === 'chat' && selectedRoom && (
          <div className="flex flex-col h-full bg-white animate-in slide-in-from-right duration-300 min-h-0">
            <header className="min-h-[56px] flex items-center justify-between px-2 border-b bg-white/90 backdrop-blur-md sticky top-0 z-20 pt-[env(safe-area-inset-top,0px)]">
              <button type="button" onClick={handleBackToList} className="min-h-[44px] min-w-[44px] p-2 text-blue-500 flex items-center cursor-pointer touch-manipulation active:opacity-70">
                <ChevronLeft size={28} /><span className="text-[16px] hidden sm:inline">목록</span>
              </button>
              <button type="button" onClick={handleBackToList} className="flex flex-col items-center flex-1 px-2 overflow-hidden text-center min-w-0 min-h-[44px] justify-center cursor-pointer touch-manipulation active:opacity-70">
                <div className="flex items-center gap-2 justify-center">
                  <span className="text-[15px] font-bold truncate max-w-[140px] sm:max-w-[150px]">{selectedRoom.custom_name || '대화방'}</span>
                  {connectionStatus !== 'connected' && (
                    connectionStatus === 'reconnecting' ? (
                      <WifiOff size={12} className="text-yellow-500 animate-pulse shrink-0" />
                    ) : (
                      <WifiOff size={12} className="text-red-500 shrink-0" />
                    )
                  )}
                </div>
                <span className="text-[11px] text-slate-400 font-medium">{participants?.length || 0}명 참여중</span>
              </button>
              <div className="flex items-center gap-1 shrink-0">
                <button onClick={() => setIsSearchOpen(!isSearchOpen)} className="min-h-[44px] min-w-[44px] p-2 text-blue-500 cursor-pointer flex items-center justify-center touch-manipulation">
                  <Search size={22} />
                </button>
                <div className="relative">
                  <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="min-h-[44px] min-w-[44px] p-2 text-blue-500 cursor-pointer flex items-center justify-center touch-manipulation"><MoreVertical size={22} /></button>
                  {isMenuOpen && (
                    <div className="absolute right-0 mt-2 w-48 bg-white shadow-2xl border rounded-2xl p-1 z-50">
                      <button onClick={() => { setIsInviteOpen(true); setIsMenuOpen(false); }} className="w-full flex items-center gap-2 min-h-[48px] px-3 py-3 text-sm hover:bg-slate-50 border-b cursor-pointer transition-colors font-medium text-slate-700 touch-manipulation">
                        <UserPlus size={16} className="text-blue-500" /> 선생님 초대
                      </button>
                      <button onClick={handleDeleteRoom} className="w-full flex items-center gap-2 min-h-[48px] px-3 py-3 text-sm text-red-500 hover:bg-red-50 cursor-pointer font-medium touch-manipulation">
                        <Trash2 size={16} /> 채팅방 삭제
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </header>

            {isSearchOpen && (
              <div className="px-4 py-3 border-b bg-white">
                <div className="relative">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input 
                    type="text"
                    placeholder="메시지 검색..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full min-h-[44px] pl-9 pr-4 py-2 bg-slate-50 rounded-lg border border-slate-200 text-base sm:text-sm outline-none focus:border-blue-500 touch-manipulation"
                  />
                </div>
              </div>
            )}

            <div 
              ref={messagesContainerRef}
              className="flex-1 overflow-y-auto p-4 space-y-4 bg-white"
              onScroll={(e) => {
                const container = e.currentTarget;
                // 위로 스크롤 시 (스크롤 위치가 상단 100px 이내)
                if (container.scrollTop < 100 && hasMoreMessages && !loadingMessages) {
                  loadMoreMessages();
                }
              }}
            >
              {loadingMessages && messages.length > 0 && (
                <div className="flex items-center justify-center py-2">
                  <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                </div>
              )}
              <div ref={messagesStartRef} />
              {messages.length === 0 ? (
                <div className="flex items-center justify-center h-full text-slate-400 text-sm">대화를 시작해보세요</div>
              ) : (
                messages
                  .filter(m => !searchQuery || m.content?.toLowerCase().includes(searchQuery.toLowerCase()))
                  .map((m, idx) => {
                  const isMine = m.sender_id === myId;
                  const sender = participants.find(p => p.user_id === m.sender_id);
                  const senderName = sender?.users?.name || '알 수 없음';
                  const messageTime = new Date(m.created_at);
                  const timeStr = formatChatTimestamp(m.created_at);
                  const showDate = idx === 0 || (messages[idx - 1] && new Date(messages[idx - 1].created_at).toDateString() !== messageTime.toDateString());
                  
                  // 읽음 상태 체크
                  const readCount = m.read_by ? m.read_by.length : 0;
                  const totalParticipants = participants.length;
                  const unreadCount = totalParticipants - readCount - 1; // 본인 제외
                  const isRead = unreadCount <= 0;
                  
                  return (
                    <div key={m.id || idx}>
                      {showDate && (
                        <div className="flex items-center justify-center my-4">
                          <div className="bg-slate-200 text-slate-600 text-[11px] px-3 py-1 rounded-full">
                            {formatChatTimestamp(m.created_at)}
                          </div>
                        </div>
                      )}
                      <div className={`flex ${isMine ? 'flex-row-reverse' : 'flex-row'} gap-2`}>
                        <div className={`flex flex-col ${isMine ? 'items-end' : 'items-start'} max-w-[70%]`}>
                          {!isMine && <span className="text-[12px] text-slate-600 mb-1 px-1 font-medium">{senderName}</span>}
                          <div className={`flex items-end gap-1 ${isMine ? 'flex-row-reverse' : 'flex-row'}`}>
                            <div className={`rounded-[18px] overflow-hidden ${isMine ? 'bg-[#FFE600] text-black rounded-br-[4px]' : 'bg-white border border-slate-200 text-black rounded-bl-[4px]'}`}>
                              {m.file_url ? (
                                <>
                                  {m.file_type?.startsWith('image/') ? (
                                    <div className="max-w-[200px]">
                                      <>
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img src={m.file_url} alt={m.content} className="w-full h-auto rounded-lg" />
                                      </>
                                      {m.content && <div className="px-3 py-2 text-[15px]">{m.content}</div>}
                                    </div>
                                  ) : (
                                    <a href={m.file_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-3 py-2 text-[15px] hover:opacity-80">
                                      <Paperclip size={16} />
                                      <span className="underline">{m.content || '파일'}</span>
                                    </a>
                                  )}
                                </>
                              ) : (
                                <div className="px-3 py-2 text-[15px] leading-[1.4] break-words">
                                  {m.content}
                                </div>
                              )}
                            </div>
                            <div className="flex flex-col items-end gap-0.5 mb-1">
                              <span className="text-[10px] text-slate-400 whitespace-nowrap">{timeStr}</span>
                              {isMine && !isRead && (
                                <span className="text-[9px] text-blue-500 font-bold">{unreadCount}</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            <footer className="p-3 pb-[max(1rem,env(safe-area-inset-bottom))] bg-white border-t">
              {filePreview && (
                <div className="mb-2 p-2 bg-slate-50 rounded-lg flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    {filePreview.type.startsWith('image/') ? (
                      <>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={filePreview.url} alt={filePreview.name} className="w-12 h-12 object-cover rounded shrink-0" />
                      </>
                    ) : (
                      <div className="w-12 h-12 bg-slate-200 rounded flex items-center justify-center shrink-0">
                        <Paperclip size={20} />
                      </div>
                    )}
                    <span className="text-xs truncate max-w-[150px]">{filePreview.name}</span>
                  </div>
                  <button onClick={() => setFilePreview(null)} className="min-h-[44px] min-w-[44px] flex items-center justify-center text-slate-400 hover:text-slate-600 touch-manipulation">
                    <X size={16} />
                  </button>
                </div>
              )}
              <div className="flex gap-2 items-end">
                <input 
                  type="file" 
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  className="hidden"
                  accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx"
                />
                <button 
                  onClick={() => fileInputRef.current?.click()} 
                  disabled={uploading}
                  className="min-h-[44px] min-w-[44px] bg-slate-100 text-slate-600 rounded-full p-2 cursor-pointer hover:bg-slate-200 disabled:opacity-30 flex items-center justify-center touch-manipulation shrink-0"
                >
                  {uploading ? <div className="w-[18px] h-[18px] border-2 border-slate-400 border-t-transparent rounded-full animate-spin" /> : <Paperclip size={18} />}
                </button>
                <div className="flex-1 min-h-[44px] bg-slate-100 rounded-3xl px-4 py-2 border border-slate-200 flex items-center min-w-0">
                  <textarea 
                    value={input} 
                    onChange={e => setInput(e.target.value)} 
                    onKeyDown={handleKeyPress}
                    placeholder="메시지 입력" 
                    className="w-full bg-transparent outline-none py-1 text-[15px] resize-none max-h-32 overflow-y-auto touch-manipulation"
                    rows={1}
                    style={{ minHeight: '24px' }}
                  />
                </div>
                <button onClick={sendMessage} disabled={(!input.trim() && !filePreview) || uploading} className="min-h-[44px] min-w-[44px] bg-blue-600 text-white rounded-full p-2 cursor-pointer disabled:opacity-30 flex items-center justify-center touch-manipulation shrink-0 active:scale-95">
                  <Send size={18} fill="currentColor" />
                </button>
              </div>
            </footer>
          </div>
        )}

        {(isCreateOpen || isInviteOpen) && (
          <div className="absolute inset-0 bg-white z-[100] flex flex-col animate-in slide-in-from-bottom duration-300 pt-[env(safe-area-inset-top,0px)]">
            <header className="px-4 py-4 flex justify-between items-center border-b sticky top-0 bg-white">
              <h2 className="text-lg sm:text-xl font-bold">{isCreateOpen ? "새로운 대화" : "선생님 초대"}</h2>
              <button onClick={() => { setIsCreateOpen(false); setIsInviteOpen(false); }} className="min-h-[44px] min-w-[44px] text-blue-500 font-bold cursor-pointer p-2 flex items-center justify-center touch-manipulation">닫기</button>
            </header>
            <div className="flex-1 overflow-y-auto bg-slate-50 p-3 min-h-0">
              <p className="text-xs text-slate-400 mb-3 px-1">활동 중인 선생님 목록 ({teacherList.length})</p>
              {teacherList.map(t => (
                <div key={t.id} onClick={() => isCreateOpen && handleCreateRoom(t)} className="flex items-center justify-between min-h-[64px] p-4 bg-white rounded-2xl mb-2 border border-slate-100 shadow-sm cursor-pointer touch-manipulation active:bg-slate-50">
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center font-bold text-blue-600 text-lg shrink-0">{t.name[0]}</div>
                    <span className="font-bold text-slate-800 truncate">{t.name} 선생님</span>
                  </div>
                  {isInviteOpen && (
                    <button onClick={(e) => { e.stopPropagation(); handleInviteTeacher(t.id); }} className="min-h-[40px] px-4 py-2 bg-blue-600 text-white rounded-full text-sm font-bold shadow-md active:bg-blue-700 touch-manipulation shrink-0">초대</button>
                  )}
                  {isCreateOpen && <Plus size={20} className="text-slate-300 shrink-0" />}
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}