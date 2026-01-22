import { createClient } from '@supabase/supabase-js';
import { ProgramOrchestrator } from '../components/ProgramOrchestrator';
import { redirect } from 'next/navigation';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default async function ProgramPage({ params }: { params: Promise<{ weekId: string }> }) {
  // Next.js 16: params는 Promise이므로 await 필요
  const { weekId } = await params;
  
  // DB에서 복합 프로그램 조회
  const { data: program, error } = await supabase
    .from('warmup_programs_composite')
    .select('*')
    .eq('week_id', weekId)
    .eq('is_active', true)
    .single();

  if (error || !program) {
    redirect('/iiwarmup');
  }

  const phases = program.phases as any[];

  return (
    <ProgramOrchestrator 
      phases={phases} 
      programTitle={program.title}
    />
  );
}
