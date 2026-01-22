'use client';

import { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Plus, Edit2, Trash2, Play, Upload, Code, Link as LinkIcon, X, Eye } from 'lucide-react';

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
  is_active: boolean;
  is_premium: boolean;
}

interface SportsVideo {
  id: string;
  title: string;
  description?: string;
  thumbnail_url?: string;
  video_url: string;
  duration?: number;
  tags: string[];
  is_active: boolean;
}

export default function AdminIIWWarmupPage() {
  const [tab, setTab] = useState<'warmup' | 'video'>('warmup');
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [programs, setPrograms] = useState<{[week: number]: WarmupProgram | null}>({
    1: null, 2: null, 3: null, 4: null
  });
  const [videos, setVideos] = useState<SportsVideo[]>([]);
  
  // 모달 상태
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedWeek, setSelectedWeek] = useState<number | null>(null);
  const [editingProgram, setEditingProgram] = useState<WarmupProgram | null>(null);
  const [editingVideo, setEditingVideo] = useState<SportsVideo | null>(null);
  
  // 폼 상태
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    content_type: 'html_code' as 'html_code' | 'html_file' | 'url',
    content: '',
    is_active: true,
    is_premium: false,
  });
  const [videoFormData, setVideoFormData] = useState({
    title: '',
    description: '',
    video_url: '',
    thumbnail_url: '',
    duration: 0,
    tags: '',
    is_active: true,
  });
  
  // 미리보기 상태
  const [previewProgram, setPreviewProgram] = useState<WarmupProgram | null>(null);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const videoTitleInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // #region agent log
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      fetch('http://127.0.0.1:7242/ingest/ba256528-1c58-4008-b191-ccf9ea766e82',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'page.tsx:80',message:'page load auth check',data:{hasUser:!!user,userId:user?.id,userEmail:user?.email,supabaseUrl:process.env.NEXT_PUBLIC_SUPABASE_URL,hasAnonKey:!!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY},timestamp:Date.now(),sessionId:'debug-session',runId:'initial',hypothesisId:'H4,H5'})}).catch(()=>{});
    })();
    // #endregion
    
    if (tab === 'warmup') {
      fetchPrograms();
    } else {
      fetchVideos();
    }
  }, [tab, year, month]);

  // ESC 키로 모달 닫기
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (previewProgram) {
          setPreviewProgram(null);
        } else if (isModalOpen) {
          setIsModalOpen(false);
        }
      }
    };

    if (isModalOpen || previewProgram) {
      document.addEventListener('keydown', handleEscape);
      // 모달 열릴 때 body 스크롤 방지
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      // 모달 닫힐 때 body 스크롤 복원
      document.body.style.overflow = 'unset';
    };
  }, [isModalOpen, previewProgram]);

  // 모달 열릴 때 포커스 관리
  useEffect(() => {
    if (isModalOpen) {
      // 약간의 딜레이 후 포커스 (모달 렌더링 완료 대기)
      const timer = setTimeout(() => {
        if (tab === 'warmup' && titleInputRef.current) {
          titleInputRef.current.focus();
        } else if (tab === 'video' && videoTitleInputRef.current) {
          videoTitleInputRef.current.focus();
        }
      }, 100);

      return () => clearTimeout(timer);
    }
  }, [isModalOpen, tab]);

  const fetchPrograms = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from('iiwarmup_programs')
        .select('*')
        .eq('year', year)
        .eq('month', month);

      if (error) throw error;

      const programsMap: {[week: number]: WarmupProgram | null} = {
        1: null, 2: null, 3: null, 4: null
      };

      data?.forEach(program => {
        programsMap[program.week] = program;
      });

      setPrograms(programsMap);
    } catch (err) {
      console.error('웜업 로드 에러:', err);
      setError('웜업 프로그램을 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const fetchVideos = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from('sports_videos')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setVideos(data || []);
    } catch (err) {
      console.error('영상 로드 에러:', err);
      setError('영상을 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateWarmup = (week: number) => {
    setSelectedWeek(week);
    setEditingProgram(null);
    setFormData({
      title: '',
      description: '',
      content_type: 'html_code',
      content: '',
      is_active: true,
      is_premium: false,
    });
    setIsModalOpen(true);
  };

  const handleEditWarmup = (program: WarmupProgram) => {
    setEditingProgram(program);
    setSelectedWeek(program.week);
    setFormData({
      title: program.title,
      description: program.description || '',
      content_type: program.content_type,
      content: program.content || '',
      is_active: program.is_active,
      is_premium: program.is_premium,
    });
    setIsModalOpen(true);
  };

  const handleSaveWarmup = async () => {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/ba256528-1c58-4008-b191-ccf9ea766e82',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'page.tsx:205',message:'handleSaveWarmup entry',data:{hasTitle:!!formData.title,hasContent:!!formData.content,contentType:formData.content_type,isEditing:!!editingProgram,year,month,week:selectedWeek},timestamp:Date.now(),sessionId:'debug-session',runId:'initial',hypothesisId:'H1,H2,H3,H4,H5'})}).catch(()=>{});
    // #endregion
    
    if (!formData.title.trim()) {
      setError('제목을 입력하세요.');
      return;
    }
    if (!formData.content.trim() && formData.content_type !== 'html_file') {
      setError('컨텐츠를 입력하세요.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const programData: any = {
        year,
        month,
        week: selectedWeek,
        title: formData.title,
        description: formData.description || null,
        content_type: formData.content_type,
        content: formData.content_type !== 'html_file' ? formData.content : null,
        file_url: formData.content_type === 'html_file' ? formData.content : null,
        is_active: formData.is_active,
        is_premium: formData.is_premium,
      };

      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/ba256528-1c58-4008-b191-ccf9ea766e82',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'page.tsx:231',message:'programData prepared',data:{programData:JSON.stringify(programData),dataKeys:Object.keys(programData)},timestamp:Date.now(),sessionId:'debug-session',runId:'initial',hypothesisId:'H3,H5'})}).catch(()=>{});
      // #endregion

      if (editingProgram) {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/ba256528-1c58-4008-b191-ccf9ea766e82',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'page.tsx:232',message:'update branch',data:{editingProgramId:editingProgram.id},timestamp:Date.now(),sessionId:'debug-session',runId:'initial',hypothesisId:'H1'})}).catch(()=>{});
        // #endregion
        
        const { error } = await supabase
          .from('iiwarmup_programs')
          .update(programData)
          .eq('id', editingProgram.id);
        
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/ba256528-1c58-4008-b191-ccf9ea766e82',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'page.tsx:237',message:'update result',data:{hasError:!!error,errorDetails:error?JSON.stringify(error):'none'},timestamp:Date.now(),sessionId:'debug-session',runId:'initial',hypothesisId:'H1,H2,H3,H4,H5'})}).catch(()=>{});
        // #endregion
        
        if (error) throw error;
        showSuccessMessage('웜업 프로그램이 수정되었습니다.');
      } else {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/ba256528-1c58-4008-b191-ccf9ea766e82',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'page.tsx:240',message:'insert branch',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'initial',hypothesisId:'H1'})}).catch(()=>{});
        // #endregion
        
        const { error } = await supabase
          .from('iiwarmup_programs')
          .insert(programData);
        
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/ba256528-1c58-4008-b191-ccf9ea766e82',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'page.tsx:244',message:'insert result',data:{hasError:!!error,errorDetails:error?JSON.stringify(error):'none'},timestamp:Date.now(),sessionId:'debug-session',runId:'initial',hypothesisId:'H1,H2,H3,H4,H5'})}).catch(()=>{});
        // #endregion
        
        if (error) throw error;
        showSuccessMessage('웜업 프로그램이 생성되었습니다.');
      }

      setIsModalOpen(false);
      fetchPrograms();
    } catch (err: any) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/ba256528-1c58-4008-b191-ccf9ea766e82',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'page.tsx:250',message:'catch block',data:{errType:typeof err,errConstructor:err?.constructor?.name,errKeys:err?Object.keys(err):[],errStringified:JSON.stringify(err),errMessage:err?.message,errCode:err?.code,errDetails:err?.details,errHint:err?.hint},timestamp:Date.now(),sessionId:'debug-session',runId:'initial',hypothesisId:'H1,H2,H3,H4,H5'})}).catch(()=>{});
      // #endregion
      
      console.error('저장 에러:', err);
      const errorMessage = err?.message || err?.error_description || err?.toString() || '알 수 없는 에러가 발생했습니다.';
      setError(`저장 실패: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const showSuccessMessage = (message: string) => {
    setError(null);
    // 임시로 에러 상태를 사용 (나중에 별도 success 상태 추가 가능)
    const prevError = error;
    setError(`✓ ${message}`);
    setTimeout(() => setError(prevError), 3000);
  };

  const handleDeleteWarmup = async (id: string) => {
    if (!confirm('정말 삭제하시겠습니까?')) return;

    setLoading(true);
    setError(null);
    try {
      const { error } = await supabase
        .from('iiwarmup_programs')
        .delete()
        .eq('id', id);

      if (error) throw error;
      showSuccessMessage('삭제되었습니다.');
      fetchPrograms();
    } catch (err: any) {
      console.error('삭제 에러:', err);
      const errorMessage = err?.message || err?.error_description || err?.toString() || '알 수 없는 에러가 발생했습니다.';
      setError(`삭제 실패: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const timestamp = Date.now();
      const fileName = `${year}${month.toString().padStart(2, '0')}_week${selectedWeek}_${timestamp}.html`;
      const filePath = `${year}/${month}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('iiwarmup-files')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('iiwarmup-files')
        .getPublicUrl(filePath);

      setFormData(prev => ({ ...prev, content: publicUrl }));
      showSuccessMessage('파일 업로드 완료!');
    } catch (err: any) {
      console.error('업로드 에러:', err);
      const errorMessage = err?.message || err?.error_description || err?.toString() || '알 수 없는 에러가 발생했습니다.';
      setError(`업로드 실패: ${errorMessage}`);
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // 영상 관리 함수들
  const handleCreateVideo = () => {
    setEditingVideo(null);
    setVideoFormData({
      title: '',
      description: '',
      video_url: '',
      thumbnail_url: '',
      duration: 0,
      tags: '',
      is_active: true,
    });
    setIsModalOpen(true);
  };

  const handleEditVideo = (video: SportsVideo) => {
    setEditingVideo(video);
    setVideoFormData({
      title: video.title,
      description: video.description || '',
      video_url: video.video_url,
      thumbnail_url: video.thumbnail_url || '',
      duration: video.duration || 0,
      tags: video.tags.join(', '),
      is_active: video.is_active,
    });
    setIsModalOpen(true);
  };

  const handleSaveVideo = async () => {
    if (!videoFormData.title.trim() || !videoFormData.video_url.trim()) {
      setError('제목과 영상 URL은 필수입니다.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const tagsArray = videoFormData.tags.split(',').map(t => t.trim()).filter(Boolean);
      
      const videoData: any = {
        title: videoFormData.title,
        description: videoFormData.description || null,
        video_url: videoFormData.video_url,
        thumbnail_url: videoFormData.thumbnail_url || null,
        duration: videoFormData.duration || null,
        tags: tagsArray,
        is_active: videoFormData.is_active,
      };

      if (editingVideo) {
        const { error } = await supabase
          .from('sports_videos')
          .update(videoData)
          .eq('id', editingVideo.id);
        
        if (error) throw error;
        showSuccessMessage('영상이 수정되었습니다.');
      } else {
        const { error } = await supabase
          .from('sports_videos')
          .insert(videoData);
        
        if (error) throw error;
        showSuccessMessage('영상이 추가되었습니다.');
      }

      setIsModalOpen(false);
      fetchVideos();
    } catch (err: any) {
      console.error('저장 에러:', err);
      const errorMessage = err?.message || err?.error_description || err?.toString() || '알 수 없는 에러가 발생했습니다.';
      setError(`저장 실패: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteVideo = async (id: string) => {
    if (!confirm('정말 삭제하시겠습니까?')) return;

    setLoading(true);
    setError(null);
    try {
      const { error } = await supabase
        .from('sports_videos')
        .delete()
        .eq('id', id);

      if (error) throw error;
      showSuccessMessage('삭제되었습니다.');
      fetchVideos();
    } catch (err: any) {
      console.error('삭제 에러:', err);
      const errorMessage = err?.message || err?.error_description || err?.toString() || '알 수 없는 에러가 발생했습니다.';
      setError(`삭제 실패: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      {/* 헤더 */}
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 mb-2">I.I.Warm-up 관리</h1>
        <p className="text-sm sm:text-base text-slate-500">웜업 프로그램과 놀이체육 영상을 관리합니다</p>
      </div>

      {/* 토스트 메시지 */}
      {error && (
        <div 
          role="alert"
          aria-live="assertive"
          className={`fixed top-4 right-4 z-[80] max-w-md px-6 py-4 rounded-lg shadow-2xl animate-in slide-in-from-top-5 fade-in duration-300 ${
            error.startsWith('✓') 
              ? 'bg-green-600 text-white' 
              : 'bg-red-600 text-white'
          }`}
        >
          <div className="flex items-center gap-3">
            <span className="font-bold">{error}</span>
            <button 
              onClick={() => setError(null)}
              className="ml-auto text-white hover:text-white/80 transition-colors"
              aria-label="닫기"
            >
              <X size={18} />
            </button>
          </div>
        </div>
      )}

      {/* 탭 */}
      <div className="flex gap-2 mb-6 sm:mb-8 border-b overflow-x-auto" role="tablist">
        <button
          onClick={() => setTab('warmup')}
          role="tab"
          aria-selected={tab === 'warmup'}
          aria-controls="warmup-panel"
          className={`px-4 sm:px-6 py-2 sm:py-3 font-bold text-sm sm:text-base transition-all whitespace-nowrap ${
            tab === 'warmup'
              ? 'text-indigo-600 border-b-2 border-indigo-600'
              : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          웜업 관리
        </button>
        <button
          onClick={() => setTab('video')}
          role="tab"
          aria-selected={tab === 'video'}
          aria-controls="video-panel"
          className={`px-4 sm:px-6 py-2 sm:py-3 font-bold text-sm sm:text-base transition-all whitespace-nowrap ${
            tab === 'video'
              ? 'text-indigo-600 border-b-2 border-indigo-600'
              : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          영상 관리
        </button>
      </div>

      {/* 웜업 관리 탭 */}
      {tab === 'warmup' && (
        <div id="warmup-panel" role="tabpanel" aria-labelledby="warmup-tab">
          {/* 년/월 선택 */}
          <div className="flex gap-4 mb-8">
            <select
              value={year}
              onChange={e => setYear(Number(e.target.value))}
              className="px-4 py-2 border rounded-lg font-bold"
            >
              {[2024, 2025, 2026, 2027].map(y => (
                <option key={y} value={y}>{y}년</option>
              ))}
            </select>
            <select
              value={month}
              onChange={e => setMonth(Number(e.target.value))}
              className="px-4 py-2 border rounded-lg font-bold"
            >
              {[...Array(12)].map((_, i) => (
                <option key={i + 1} value={i + 1}>{i + 1}월</option>
              ))}
            </select>
          </div>

          {/* 주차별 프로그램 목록 */}
          <div className="space-y-6">
            {[1, 2, 3, 4].map(week => {
              const program = programs[week];
              return (
                <div key={week} className="border rounded-2xl p-4 sm:p-6 bg-white shadow-sm">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                    <h3 className="text-base sm:text-lg font-black text-slate-700">
                      📅 {week}주차
                    </h3>
                    {!program && (
                      <button
                        onClick={() => handleCreateWarmup(week)}
                        className="flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700 transition-colors w-full sm:w-auto"
                      >
                        <Plus size={18} />
                        프로그램 추가
                      </button>
                    )}
                  </div>

                  {program ? (
                    <div className="bg-slate-50 rounded-xl p-4 sm:p-6">
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 sm:gap-4 mb-4">
                        <div className="flex-1">
                          <h4 className="text-lg sm:text-xl font-bold text-slate-900 mb-2">{program.title}</h4>
                          {program.description && (
                            <p className="text-slate-600 text-sm">{program.description}</p>
                          )}
                          <div className="flex gap-2 mt-3">
                            <span className={`text-xs px-2 py-1 rounded-full font-bold ${program.is_active ? 'bg-green-100 text-green-700' : 'bg-slate-200 text-slate-600'}`}>
                              {program.is_active ? '공개' : '비공개'}
                            </span>
                            {program.is_premium && (
                              <span className="text-xs px-2 py-1 rounded-full font-bold bg-yellow-100 text-yellow-700">
                                프리미엄
                              </span>
                            )}
                            <span className="text-xs px-2 py-1 rounded-full font-bold bg-blue-100 text-blue-700">
                              {program.content_type === 'html_code' ? 'HTML 코드' : 
                               program.content_type === 'html_file' ? 'HTML 파일' : 'URL'}
                            </span>
                          </div>
                        </div>
                        <div className="flex gap-2 flex-shrink-0">
                          <button
                            onClick={() => setPreviewProgram(program)}
                            className="p-2 sm:p-2.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="미리보기"
                            aria-label="미리보기"
                          >
                            <Eye size={20} className="sm:w-5 sm:h-5" />
                          </button>
                          <button
                            onClick={() => handleEditWarmup(program)}
                            className="p-2 sm:p-2.5 text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
                            title="수정"
                            aria-label="수정"
                          >
                            <Edit2 size={20} className="sm:w-5 sm:h-5" />
                          </button>
                          <button
                            onClick={() => handleDeleteWarmup(program.id)}
                            className="p-2 sm:p-2.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="삭제"
                            aria-label="삭제"
                          >
                            <Trash2 size={20} className="sm:w-5 sm:h-5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-12 text-slate-400">
                      <p>프로그램이 없습니다</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 영상 관리 탭 */}
      {tab === 'video' && (
        <div id="video-panel" role="tabpanel" aria-labelledby="video-tab">
          <div className="flex justify-between items-center mb-6">
            <p className="text-slate-600">총 {videos.length}개 영상</p>
            <button
              onClick={handleCreateVideo}
              className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 transition-colors"
            >
              <Plus size={20} />
              영상 추가
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {videos.map(video => (
              <div key={video.id} className="border rounded-2xl overflow-hidden bg-white shadow-sm hover:shadow-lg transition-shadow">
                <div className="aspect-video bg-slate-200 relative">
                  {video.thumbnail_url ? (
                    <img src={video.thumbnail_url} alt={video.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Play size={48} className="text-slate-400" />
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <h4 className="font-bold text-slate-900 mb-2">{video.title}</h4>
                  {video.description && (
                    <p className="text-sm text-slate-600 mb-3 line-clamp-2">{video.description}</p>
                  )}
                  <div className="flex flex-wrap gap-1 mb-3">
                    {video.tags.map(tag => (
                      <span key={tag} className="text-xs px-2 py-1 bg-indigo-50 text-indigo-600 rounded-full font-bold">
                        {tag}
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEditVideo(video)}
                      className="flex-1 px-3 py-2 border rounded-lg text-sm font-bold hover:bg-slate-50 transition-colors"
                    >
                      수정
                    </button>
                    <button
                      onClick={() => handleDeleteVideo(video.id)}
                      className="px-3 py-2 border border-red-200 text-red-600 rounded-lg text-sm font-bold hover:bg-red-50 transition-colors"
                    >
                      삭제
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 웜업 추가/수정 모달 */}
      {isModalOpen && tab === 'warmup' && (
        <div 
          className="fixed inset-0 z-[70] bg-black/50 flex items-center justify-center p-4"
          onClick={() => setIsModalOpen(false)}
        >
          <div 
            className="bg-white rounded-2xl p-4 sm:p-6 md:p-8 max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="warmup-modal-title"
          >
            <h2 id="warmup-modal-title" className="text-2xl font-black mb-6">
              {editingProgram ? '웜업 프로그램 수정' : `${year}년 ${month}월 ${selectedWeek}주차 프로그램 추가`}
            </h2>

            <div className="space-y-6">
              <div>
                <label htmlFor="warmup-title" className="block text-sm font-bold mb-2">제목 *</label>
                <input
                  id="warmup-title"
                  ref={titleInputRef}
                  type="text"
                  value={formData.title}
                  onChange={e => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-4 py-3 border rounded-lg"
                  placeholder="예: 1월 1주차 달리기 웜업"
                  aria-required="true"
                />
              </div>

              <div>
                <label htmlFor="warmup-description" className="block text-sm font-bold mb-2">설명</label>
                <textarea
                  id="warmup-description"
                  value={formData.description}
                  onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-4 py-3 border rounded-lg"
                  rows={3}
                  placeholder="프로그램 설명"
                />
              </div>

              <div>
                <label className="block text-sm font-bold mb-2">컨텐츠 타입 *</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      value="html_code"
                      checked={formData.content_type === 'html_code'}
                      onChange={e => setFormData(prev => ({ ...prev, content_type: e.target.value as any }))}
                    />
                    <Code size={18} />
                    <span>HTML 코드</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      value="html_file"
                      checked={formData.content_type === 'html_file'}
                      onChange={e => setFormData(prev => ({ ...prev, content_type: e.target.value as any }))}
                    />
                    <Upload size={18} />
                    <span>HTML 파일</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      value="url"
                      checked={formData.content_type === 'url'}
                      onChange={e => setFormData(prev => ({ ...prev, content_type: e.target.value as any }))}
                    />
                    <LinkIcon size={18} />
                    <span>URL</span>
                  </label>
                </div>
              </div>

              <div>
                {formData.content_type === 'html_code' && (
                  <div>
                    <label className="block text-sm font-bold mb-2">HTML 코드 *</label>
                    <textarea
                      value={formData.content}
                      onChange={e => setFormData(prev => ({ ...prev, content: e.target.value }))}
                      className="w-full px-4 py-3 border rounded-lg font-mono text-sm"
                      rows={10}
                      placeholder="<!DOCTYPE html>..."
                    />
                  </div>
                )}
                {formData.content_type === 'html_file' && (
                  <div>
                    <label className="block text-sm font-bold mb-2">HTML 파일 업로드 *</label>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileUpload}
                      accept=".html,.htm"
                      className="hidden"
                    />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                      className="w-full px-4 py-3 border-2 border-dashed rounded-lg hover:border-indigo-400 transition-colors flex items-center justify-center gap-2"
                    >
                      {uploading ? (
                        <span>업로드 중...</span>
                      ) : formData.content ? (
                        <span className="text-green-600">✓ 업로드 완료</span>
                      ) : (
                        <>
                          <Upload size={20} />
                          <span>파일 선택</span>
                        </>
                      )}
                    </button>
                  </div>
                )}
                {formData.content_type === 'url' && (
                  <div>
                    <label className="block text-sm font-bold mb-2">URL *</label>
                    <input
                      type="url"
                      value={formData.content}
                      onChange={e => setFormData(prev => ({ ...prev, content: e.target.value }))}
                      className="w-full px-4 py-3 border rounded-lg"
                      placeholder="https://example.com/warmup"
                    />
                  </div>
                )}
              </div>

              <div className="flex gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={e => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                  />
                  <span className="font-bold">공개</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.is_premium}
                    onChange={e => setFormData(prev => ({ ...prev, is_premium: e.target.checked }))}
                  />
                  <span className="font-bold">프리미엄</span>
                </label>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setIsModalOpen(false)}
                  disabled={loading}
                  className="flex-1 px-6 py-3 border rounded-lg font-bold hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  취소
                </button>
                <button
                  onClick={handleSaveWarmup}
                  disabled={loading}
                  className="flex-1 px-6 py-3 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      저장 중...
                    </>
                  ) : (
                    '저장'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 영상 추가/수정 모달 */}
      {isModalOpen && tab === 'video' && (
        <div 
          className="fixed inset-0 z-[70] bg-black/50 flex items-center justify-center p-4"
          onClick={() => setIsModalOpen(false)}
        >
          <div 
            className="bg-white rounded-2xl p-4 sm:p-6 md:p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="video-modal-title"
          >
            <h2 id="video-modal-title" className="text-2xl font-black mb-6">
              {editingVideo ? '영상 수정' : '영상 추가'}
            </h2>

            <div className="space-y-6">
              <div>
                <label htmlFor="video-title" className="block text-sm font-bold mb-2">제목 *</label>
                <input
                  id="video-title"
                  ref={videoTitleInputRef}
                  type="text"
                  value={videoFormData.title}
                  onChange={e => setVideoFormData(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-4 py-3 border rounded-lg"
                  aria-required="true"
                />
              </div>

              <div>
                <label htmlFor="video-description" className="block text-sm font-bold mb-2">설명</label>
                <textarea
                  id="video-description"
                  value={videoFormData.description}
                  onChange={e => setVideoFormData(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-4 py-3 border rounded-lg"
                  rows={3}
                />
              </div>

              <div>
                <label htmlFor="video-url" className="block text-sm font-bold mb-2">영상 URL *</label>
                <input
                  id="video-url"
                  type="url"
                  value={videoFormData.video_url}
                  aria-required="true"
                  onChange={e => setVideoFormData(prev => ({ ...prev, video_url: e.target.value }))}
                  className="w-full px-4 py-3 border rounded-lg"
                  placeholder="https://..."
                />
              </div>

              <div>
                <label className="block text-sm font-bold mb-2">썸네일 URL</label>
                <input
                  type="url"
                  value={videoFormData.thumbnail_url}
                  onChange={e => setVideoFormData(prev => ({ ...prev, thumbnail_url: e.target.value }))}
                  className="w-full px-4 py-3 border rounded-lg"
                  placeholder="https://..."
                />
              </div>

              <div>
                <label className="block text-sm font-bold mb-2">영상 길이 (초)</label>
                <input
                  type="number"
                  value={videoFormData.duration}
                  onChange={e => setVideoFormData(prev => ({ ...prev, duration: Number(e.target.value) }))}
                  className="w-full px-4 py-3 border rounded-lg"
                  placeholder="180"
                />
              </div>

              <div>
                <label className="block text-sm font-bold mb-2">태그 (쉼표로 구분)</label>
                <input
                  type="text"
                  value={videoFormData.tags}
                  onChange={e => setVideoFormData(prev => ({ ...prev, tags: e.target.value }))}
                  className="w-full px-4 py-3 border rounded-lg"
                  placeholder="달리기, 유아, 게임"
                />
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={videoFormData.is_active}
                  onChange={e => setVideoFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                />
                <span className="font-bold">공개</span>
              </label>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setIsModalOpen(false)}
                  disabled={loading}
                  className="flex-1 px-6 py-3 border rounded-lg font-bold hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  취소
                </button>
                <button
                  onClick={handleSaveVideo}
                  disabled={loading}
                  className="flex-1 px-6 py-3 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      저장 중...
                    </>
                  ) : (
                    '저장'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 미리보기 모달 */}
      {previewProgram && (
        <div className="fixed inset-0 z-[75] bg-black">
          <div className="w-full h-full flex flex-col">
            <div className="flex justify-between items-center p-6 bg-black/50 backdrop-blur">
              <h3 className="text-white font-bold">{previewProgram.title}</h3>
              <button onClick={() => setPreviewProgram(null)} className="text-white p-2">
                <X size={28} />
              </button>
            </div>
            <div className="flex-1">
              {previewProgram.content_type === 'html_code' ? (
                <iframe srcDoc={previewProgram.content} className="w-full h-full" sandbox="allow-scripts allow-same-origin" />
              ) : (
                <iframe src={previewProgram.content_type === 'url' ? previewProgram.content : previewProgram.file_url || ''} className="w-full h-full" sandbox="allow-scripts allow-same-origin" />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
