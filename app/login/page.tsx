'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Lock, User, ChevronLeft } from 'lucide-react';
import Link from 'next/link';
import { getSupabaseBrowserClient } from '@/app/lib/supabase/browser';

function LoginContent() {
  const [id, setId] = useState('');
  const [pw, setPw] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // URL에서 접속 유형(teacher/admin) 파악
  const type = searchParams.get('type') || 'teacher';

  // 페이지 로드 시 무효한 세션이 있으면 클리어 (클라이언트에서만 실행)
  useEffect(() => {
    const checkInitialSession = async () => {
      try {
        const supabase = getSupabaseBrowserClient();
        const { error: sessionError } = await supabase.auth.getSession();
        if (sessionError) {
          await supabase.auth.signOut();
        }
      } catch (err) {
        // 에러 무시 (로그인 페이지이므로 세션이 없어도 정상)
      }
    };
    checkInitialSession();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const supabase = getSupabaseBrowserClient();
    const loginEmail = id.includes('@') ? id : `${id}@spokedu.com`;
    const rawPw = pw.replace(/-/g, '');

    // A. 1차 로그인 시도
    let { data, error } = await supabase.auth.signInWithPassword({ 
      email: loginEmail, 
      password: pw 
    });

    // B. 실패 시 하이픈 제거 버전으로 2차 시도
    if (error) {
      const retry = await supabase.auth.signInWithPassword({ 
        email: loginEmail, 
        password: rawPw 
      });
      data = retry.data;
      error = retry.error;
    }

    if (error) {
      alert('로그인 정보를 다시 확인해 주세요.');
      setIsLoading(false);
    } else {
      const { data: userData } = await supabase.auth.getUser();

      if (userData?.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', userData.user.id)
          .single();

        if (profile?.role === 'admin') {
          router.push('/admin'); 
        } else {
          router.push('/teacher/my-classes'); 
        }
        router.refresh();
      }
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-6 relative">
      {/* 뒤로가기 버튼 */}
      <Link href="/" className="absolute top-8 left-8 flex items-center text-gray-400 hover:text-gray-900 transition-colors font-bold text-sm">
        <ChevronLeft size={20} />
        <span>메인으로</span>
      </Link>

      <form onSubmit={handleLogin} className="w-full max-w-md space-y-8 bg-white p-10 md:p-12 rounded-[40px] shadow-2xl border border-gray-100">
        <div className="text-center">
          <h1 className="text-4xl font-black italic text-blue-900 tracking-tighter uppercase leading-none">SPOKEDU</h1>
          <div className="h-1 w-12 bg-blue-600 mx-auto mt-4 rounded-full"></div>
          <p className="text-[11px] font-bold text-blue-600 uppercase tracking-[0.3em] mt-4">
            {type === 'admin' ? 'System Administrator' : 'Physical Education Expert'}
          </p>
        </div>
        
        <div className="space-y-5">
          {/* 아이디 입력란 */}
          <div className="relative">
            <label className="text-[11px] font-black text-gray-900 uppercase tracking-widest ml-5 mb-2 block italic">ID / NAME</label>
            <div className="relative">
              <User className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input 
                type="text" 
                placeholder="아이디를 입력하세요" 
                value={id} 
                onChange={(e) => setId(e.target.value)} 
                required
                className="w-full p-5 pl-14 bg-gray-50 rounded-3xl border-2 border-transparent font-bold outline-none focus:border-blue-600 focus:bg-white transition-all text-sm text-black" 
              />
            </div>
          </div>

          {/* 비밀번호 입력란 */}
          <div className="relative">
            <label className="text-[11px] font-black text-gray-900 uppercase tracking-widest ml-5 mb-2 block italic">PASSWORD</label>
            <div className="relative">
              <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input 
                type="password" 
                placeholder="비밀번호를 입력하세요" 
                value={pw} 
                onChange={(e) => setPw(e.target.value)} 
                required
                className="w-full p-5 pl-14 bg-gray-50 rounded-3xl border-2 border-transparent font-bold outline-none focus:border-blue-600 focus:bg-white transition-all text-sm text-black" 
              />
            </div>
          </div>
        </div>

        <button 
          type="submit" 
          disabled={isLoading}
          className={`w-full py-6 bg-blue-600 text-white rounded-3xl font-black uppercase tracking-[0.2em] hover:bg-blue-700 transition-all shadow-xl shadow-blue-100 active:scale-[0.98] ${isLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
        >
          {isLoading ? 'Processing...' : 'Login'}
        </button>

        <div className="space-y-2 text-center">
          <p className="text-[9px] font-bold text-gray-400 italic uppercase tracking-tighter">
            Play · Think · Grow with Spokedu
          </p>
          <p className="text-[9px] font-medium text-gray-300 uppercase">
            Yonsei University Physical Education Specialists
          </p>
        </div>
      </form>
    </div>
  );
}

// Next.js에서 useSearchParams를 사용하려면 Suspense로 감싸야 배포 에러가 없습니다.
export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50" />}>
      <LoginContent />
    </Suspense>
  );
}