'use client';

import { useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';

// 1. 환경 변수 뒤에 느낌표(!) 추가 (에러 방지)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function LoginPage() {
  const [id, setId] = useState('');
  const [pw, setPw] = useState('');
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    // 1. 아이디 처리 (이름 뒤에 자동으로 도메인 추가)
    const loginEmail = id.includes('@') ? id : `${id}@spokedu.com`;

    // 2. 비밀번호 처리 (하이픈 제거 버전)
    const rawPw = pw.replace(/-/g, '');

    // A. 우선 입력한 값(pw) 그대로 시도
    let { data, error } = await supabase.auth.signInWithPassword({ 
      email: loginEmail, 
      password: pw 
    });

    // B. 실패하면 하이픈 없는 버전(rawPw)으로 한 번 더 시도
    if (error) {
      const retry = await supabase.auth.signInWithPassword({ 
        email: loginEmail, 
        password: rawPw 
      });
      data = retry.data;
      error = retry.error;
    }

    if (error) {
      alert('로그인 실패: 아이디나 비밀번호를 다시 확인해 주세요.');
    } else {
      // 로그인 성공 시 역할(Role) 체크 및 분기 처리
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        // profiles 테이블에서 이 사람의 role 확인
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();

        if (profile?.role === 'admin') {
          router.push('/admin'); // 관리자는 관리자 페이지로
        } else {
          router.push('/teacher/my-classes'); // 선생님은 내 수업 일정으로
        }
        
        router.refresh();
      }
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-6">
      <form onSubmit={handleLogin} className="w-full max-w-md space-y-8 bg-white p-12 rounded-[50px] shadow-2xl border border-gray-100">
        <div className="text-center">
          <h1 className="text-4xl font-black italic text-blue-900 tracking-tighter uppercase leading-none">Spokedu</h1>
          <div className="h-1 w-10 bg-blue-600 mx-auto mt-4 rounded-full"></div>
          <p className="text-[10px] font-black text-gray-300 uppercase tracking-[0.3em] mt-4 font-mono">Operations Management</p>
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="text-[11px] font-black text-gray-900 uppercase tracking-widest ml-4 mb-2 block italic">아이디</label>
            <input 
              type="text" 
              placeholder="이름을 입력하세요" 
              value={id} 
              onChange={(e) => setId(e.target.value)} 
              className="w-full p-5 bg-gray-50 rounded-3xl border-2 border-transparent font-bold outline-none focus:border-blue-600 focus:bg-white transition-all text-sm text-black" 
            />
          </div>
          <div>
            <label className="text-[11px] font-black text-gray-900 uppercase tracking-widest ml-4 mb-2 block italic">비밀번호</label>
            <input 
              type="password" 
              placeholder="전화번호를 입력하세요" 
              value={pw} 
              onChange={(e) => setPw(e.target.value)} 
              className="w-full p-5 bg-gray-50 rounded-3xl border-2 border-transparent font-bold outline-none focus:border-blue-600 focus:bg-white transition-all text-sm text-black" 
            />
          </div>
        </div>

        <button type="submit" className="w-full py-6 bg-blue-600 text-white rounded-3xl font-black uppercase tracking-[0.2em] hover:bg-blue-700 transition-all shadow-xl shadow-blue-100 active:scale-[0.98]">
          Login
        </button>

        <p className="text-center text-[9px] font-bold text-gray-400 italic uppercase tracking-tighter">
          Authenticated personnel only
        </p>
      </form>
    </div>
  );
}
