import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://mwgvserdyflsqyhcqecp.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'

// 복잡한 global 변수 설정 없이 단순하게 선언합니다.
// 파일이 한 번 로드되면 캐싱되므로 기본적으로 싱글톤처럼 동작합니다.
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
})