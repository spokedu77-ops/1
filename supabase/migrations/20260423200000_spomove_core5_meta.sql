-- SPOMOVE Core 5: spokedu_pro_screenplays에 Core5 분류 메타 컬럼 추가
-- 기존 mode_id, title, preset_ref 등은 그대로 유지.
-- core_series, core_program: 표현층 식별자. 엔진(mode/level)과 별도.

ALTER TABLE public.spokedu_pro_screenplays
  ADD COLUMN IF NOT EXISTS core_series  TEXT,   -- 'SR' | 'IC' | 'RS' | 'SM' | 'RC'
  ADD COLUMN IF NOT EXISTS core_program TEXT;    -- e.g. 'SR-01'

-- 기존 행에 Core 5 시리즈 코드를 역방향으로 채운다 (mode_id 기준)
UPDATE public.spokedu_pro_screenplays SET core_series = 'SR' WHERE mode_id IN ('반응인지', '시지각반응');
UPDATE public.spokedu_pro_screenplays SET core_series = 'IC' WHERE mode_id IN ('스트룹', '사이먼효과', '플랭커', 'GoNoGo');
UPDATE public.spokedu_pro_screenplays SET core_series = 'RS' WHERE mode_id IN ('TaskSwitching', '이중과제');
UPDATE public.spokedu_pro_screenplays SET core_series = 'SM' WHERE mode_id IN ('순차기억');
UPDATE public.spokedu_pro_screenplays SET core_series = 'RC' WHERE mode_id IN ('FLOW', '챌린지');

-- 인덱스 (카탈로그 필터용)
CREATE INDEX IF NOT EXISTS idx_spokedu_pro_screenplays_core_series
  ON public.spokedu_pro_screenplays (core_series);
