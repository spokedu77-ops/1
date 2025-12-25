import { createClient } from '@supabase/supabase-js'

// 확인된 주소와 키를 직접 입력했습니다.
const supabaseUrl = 'https://mwgvserdyflsqyhcqecp.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im13Z3ZzZXJkeWZsc3F5aGNxZWNwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYxODkwNzAsImV4cCI6MjA4MTc2NTA3MH0.F6fqG4g8lk_weiSMR_gu9uXIWmsU_ZyOp3zW_7ovKZY'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)