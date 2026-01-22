'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Play, X, ChevronDown, ChevronUp } from 'lucide-react';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface WarmupProgram {
  id: string;
  year: number;
  month: number;
  week: number;
  title: string;
  description?: string;
  content_type: 'html_code' | 'html_file' | 'url';
  content?: string;
  file_url?: string;
}

interface SportsVideo {
  id: string;
  title: string;
  description?: string;
  thumbnail_url?: string;
  video_url: string;
  duration?: number;
  tags: string[];
}

// 현재 주차 계산 함수
function getWeekOfMonth(date: Date): number {
  const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
  const dayOfMonth = date.getDate();
  const dayOfWeek = firstDay.getDay();
  const weekNumber = Math.ceil((dayOfMonth + dayOfWeek) / 7);
  return Math.min(weekNumber, 4);
}

// 영상 길이 포맷팅 함수
function formatDuration(seconds?: number): string {
  if (!seconds) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export default function IIWWarmupPage() {
  const [currentWarmup, setCurrentWarmup] = useState<WarmupProgram | null>(null);
  const [pastWarmups, setPastWarmups] = useState<WarmupProgram[]>([]);
  const [videos, setVideos] = useState<SportsVideo[]>([]);
  const [showPast, setShowPast] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentContent, setCurrentContent] = useState<any>(null);
  const [contentType, setContentType] = useState<'warmup' | 'video'>('warmup');
  const [loading, setLoading] = useState(true);

  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth() + 1;
  const currentWeek = getWeekOfMonth(today);

  useEffect(() => {
    fetchCurrentWarmup();
    fetchPastWarmups();
    fetchVideos();
  }, []);

  const fetchCurrentWarmup = async () => {
    try {
      const { data, error } = await supabase
        .from('iiwarmup_programs')
        .select('*')
        .eq('year', currentYear)
        .eq('month', currentMonth)
        .eq('week', currentWeek)
        .eq('is_active', true)
        .single();

      if (error && error.code !== 'PGRST116') {  // PGRST116 = no rows
        console.error('웜업 조회 실패:', error);
      }
      
      setCurrentWarmup(data);
    } catch (err) {
      console.error('웜업 로드 에러:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchPastWarmups = async () => {
    try {
      const { data, error } = await supabase
        .from('iiwarmup_programs')
        .select('*')
        .eq('is_active', true)
        .order('year', { ascending: false })
        .order('month', { ascending: false })
        .order('week', { ascending: false })
        .limit(12);

      if (!error && data) {
        // 현재 주차 제외
        const past = data.filter(w => 
          !(w.year === currentYear && w.month === currentMonth && w.week === currentWeek)
        );
        setPastWarmups(past);
      }
    } catch (err) {
      console.error('과거 웜업 로드 에러:', err);
    }
  };

  const fetchVideos = async () => {
    try {
      const { data, error } = await supabase
        .from('sports_videos')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (!error && data) {
        setVideos(data);
      }
    } catch (err) {
      console.error('영상 로드 에러:', err);
    }
  };

  const handleExecuteWarmup = async (warmup: WarmupProgram) => {
    // 복합 프로그램이 있는지 먼저 확인
    const weekId = `${warmup.year}-${warmup.month.toString().padStart(2, '0')}-W${warmup.week}`;
    
    console.log('🔍 Checking for composite program:', weekId);
    
    const { data: compositeProgram, error } = await supabase
      .from('warmup_programs_composite')
      .select('*')
      .eq('week_id', weekId)
      .eq('is_active', true)
      .single();
    
    console.log('📦 Composite program:', compositeProgram);
    console.log('❌ Error:', error);
    
    if (compositeProgram) {
      // 복합 프로그램이 있으면 새 라우트로 이동
      console.log('✅ Redirecting to:', `/iiwarmup/program/${weekId}`);
      window.location.href = `/iiwarmup/program/${weekId}`;
    } else {
      // 기존 단일 프로그램 실행
      console.log('📺 Opening modal for single program');
      setCurrentContent(warmup);
      setContentType('warmup');
      setIsPlaying(true);
    }
  };

  const handlePlayVideo = (video: SportsVideo) => {
    setCurrentContent(video);
    setContentType('video');
    setIsPlaying(true);
  };

  const handleClose = () => {
    setIsPlaying(false);
    setCurrentContent(null);
  };

  // 태그별 영상 그룹핑
  const videosByTag = videos.reduce((acc, video) => {
    video.tags.forEach(tag => {
      if (!acc[tag]) acc[tag] = [];
      acc[tag].push(video);
    });
    return acc;
  }, {} as Record<string, SportsVideo[]>);

  const getContentUrl = (warmup: WarmupProgram): string => {
    if (warmup.content_type === 'url') return warmup.content || '';
    if (warmup.content_type === 'html_file') return warmup.file_url || '';
    return ''; // html_code는 srcDoc으로 처리
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* 상단: 이번 주 웜업 (히어로) */}
      <section className="min-h-[50vh] flex items-center justify-center bg-gradient-to-br from-indigo-50 via-blue-50 to-purple-50 p-8 relative overflow-hidden">
        {/* 배경 장식 */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 left-10 w-72 h-72 bg-indigo-500 rounded-full blur-3xl"></div>
          <div className="absolute bottom-10 right-10 w-96 h-96 bg-purple-500 rounded-full blur-3xl"></div>
        </div>

        <div className="max-w-2xl w-full text-center relative z-10">
          {loading ? (
            <div className="flex flex-col items-center gap-4">
              <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
              <p className="text-slate-500 font-medium">로딩 중...</p>
            </div>
          ) : currentWarmup ? (
            <>
              <div className="mb-6">
                <span className="inline-block bg-white/80 backdrop-blur-sm px-6 py-2 rounded-full text-sm font-black text-indigo-600 uppercase tracking-wider shadow-lg">
                  {currentYear}년 {currentMonth}월 · {currentWeek}주차 웜업
                </span>
              </div>
              <h1 className="text-4xl md:text-5xl font-black mb-4 text-slate-900 leading-tight">
                {currentWarmup.title}
              </h1>
              {currentWarmup.description && (
                <p className="text-lg text-slate-600 mb-10 max-w-xl mx-auto">
                  {currentWarmup.description}
                </p>
              )}
              <button 
                onClick={() => handleExecuteWarmup(currentWarmup)}
                className="group bg-gradient-to-r from-indigo-600 to-blue-600 text-white px-16 py-6 rounded-full text-xl font-black shadow-2xl hover:shadow-indigo-500/50 transition-all duration-300 hover:scale-105 active:scale-95 flex items-center gap-3 mx-auto"
              >
                <Play size={28} className="group-hover:scale-110 transition-transform" fill="currentColor" />
                바로 실행
              </button>
            </>
          ) : (
            <div className="text-center">
              <div className="text-6xl mb-4">🏃</div>
              <h2 className="text-2xl font-bold text-slate-700 mb-2">이번 주 웜업 준비중</h2>
              <p className="text-slate-500">곧 새로운 웜업 프로그램이 업데이트됩니다.</p>
            </div>
          )}
        </div>
      </section>

      {/* 중단: 지난 웜업 (접기 가능) */}
      {pastWarmups.length > 0 && (
        <section className="px-6 py-12 bg-white border-t max-w-7xl mx-auto">
          <button 
            onClick={() => setShowPast(!showPast)}
            className="flex items-center gap-3 text-slate-700 hover:text-indigo-600 transition-colors group mb-6"
          >
            {showPast ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
            <span className="text-lg font-bold">지난 웜업 다시보기</span>
            <span className="text-sm text-slate-400">({pastWarmups.length}개)</span>
          </button>
          
          {showPast && (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 animate-in fade-in slide-in-from-top-4 duration-300">
              {pastWarmups.map(warmup => (
                <div 
                  key={warmup.id}
                  onClick={() => handleExecuteWarmup(warmup)}
                  className="p-5 bg-slate-50 border border-slate-200 rounded-2xl hover:shadow-xl hover:border-indigo-200 hover:-translate-y-1 cursor-pointer transition-all duration-300 group"
                >
                  <div className="text-xs text-indigo-600 font-bold mb-2">
                    {warmup.year}년 {warmup.month}월 {warmup.week}주
                  </div>
                  <div className="text-sm font-bold text-slate-800 line-clamp-2 group-hover:text-indigo-600 transition-colors">
                    {warmup.title}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* 하단: 놀이체육 영상 아카이브 (넷플릭스 스타일) */}
      {Object.keys(videosByTag).length > 0 && (
        <section className="px-6 py-16 bg-gradient-to-b from-white to-slate-50">
          <div className="max-w-7xl mx-auto">
            <h2 className="text-3xl font-black mb-12 text-slate-900">놀이체육 영상</h2>
            
            {Object.entries(videosByTag).map(([tag, tagVideos]) => (
              <div key={tag} className="mb-12">
                <h3 className="text-xl font-bold mb-6 text-slate-700 flex items-center gap-2">
                  <span className="w-1 h-6 bg-indigo-600 rounded-full"></span>
                  {tag}
                </h3>
                
                {/* 가로 스크롤 컨테이너 */}
                <div className="flex gap-6 overflow-x-auto pb-6 scrollbar-hide snap-x snap-mandatory scroll-smooth">
                  {tagVideos.map(video => (
                    <div 
                      key={video.id}
                      onClick={() => handlePlayVideo(video)}
                      className="flex-none w-80 snap-start cursor-pointer group"
                    >
                      {/* 썸네일 */}
                      <div className="relative aspect-video rounded-2xl overflow-hidden bg-gradient-to-br from-slate-200 to-slate-300 mb-4 shadow-lg">
                        {video.thumbnail_url ? (
                          <img 
                            src={video.thumbnail_url} 
                            alt={video.title}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Play size={64} className="text-slate-400" />
                          </div>
                        )}
                        
                        {/* 재생 아이콘 오버레이 */}
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center backdrop-blur-sm">
                          <div className="bg-white/20 backdrop-blur-md rounded-full p-5">
                            <Play size={48} className="text-white" fill="currentColor" />
                          </div>
                        </div>
                        
                        {/* 영상 길이 */}
                        {video.duration && (
                          <div className="absolute bottom-3 right-3 bg-black/80 backdrop-blur-sm px-3 py-1.5 rounded-lg text-xs text-white font-bold">
                            {formatDuration(video.duration)}
                          </div>
                        )}
                      </div>
                      
                      {/* 제목 */}
                      <h4 className="text-base font-bold text-slate-800 line-clamp-2 group-hover:text-indigo-600 transition-colors px-1">
                        {video.title}
                      </h4>
                      {video.description && (
                        <p className="text-sm text-slate-500 line-clamp-1 mt-1 px-1">
                          {video.description}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 전체화면 모달 (웜업 또는 영상) */}
      {isPlaying && currentContent && (
        <div className="fixed inset-0 z-50 bg-black animate-in fade-in duration-300">
          <div className="w-full h-full flex flex-col">
            {/* 헤더 */}
            <div className="flex justify-between items-center p-6 bg-gradient-to-b from-black/80 to-transparent backdrop-blur-sm relative z-10">
              <h3 className="text-white font-bold text-lg">
                {contentType === 'warmup' ? currentContent.title : currentContent.title}
              </h3>
              <button 
                onClick={handleClose} 
                className="text-white p-2 hover:bg-white/10 rounded-full transition-colors"
              >
                <X size={28} />
              </button>
            </div>
            
            {/* 컨텐츠 */}
            <div className="flex-1 relative">
              {contentType === 'warmup' ? (
                currentContent.content_type === 'html_code' ? (
                  <iframe 
                    srcDoc={currentContent.content}
                    className="w-full h-full border-0"
                    sandbox="allow-scripts allow-same-origin allow-forms"
                  />
                ) : (
                  <iframe 
                    src={getContentUrl(currentContent)}
                    className="w-full h-full border-0"
                    sandbox="allow-scripts allow-same-origin allow-forms"
                  />
                )
              ) : (
                <video 
                  src={currentContent.video_url}
                  controls
                  autoPlay
                  className="w-full h-full"
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Custom Scrollbar 스타일 */}
      <style jsx global>{`
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
}
