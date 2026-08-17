-- ========================================
-- IIW Warmup 샘플 데이터 (선택사항)
-- 실행 순서: 3번 (테스트용)
-- ========================================

-- 1. 웜업 프로그램 샘플 (2026년 1월)
INSERT INTO iiwarmup_programs (year, month, week, title, description, content_type, content, is_active)
VALUES 
  (2026, 1, 1, '1월 1주차 - 신년 달리기 웜업', '새해를 맞이하는 활기찬 달리기 웜업', 'url', 'https://example.com/warmup-jan-w1', true),
  (2026, 1, 2, '1월 2주차 - 점프 웜업', '점프 동작으로 심박수 올리기', 'url', 'https://example.com/warmup-jan-w2', true),
  (2026, 1, 3, '1월 3주차 - 스트레칭 웜업', '유연성 향상 스트레칭', 'url', 'https://example.com/warmup-jan-w3', true),
  (2026, 1, 4, '1월 4주차 - 종합 웜업', '다양한 동작 조합', 'url', 'https://example.com/warmup-jan-w4', true)
ON CONFLICT DO NOTHING;

-- 2. 놀이체육 영상 샘플
INSERT INTO sports_videos (title, description, video_url, thumbnail_url, duration, tags, is_active)
VALUES 
  ('달리기 게임 - 꼬리잡기', '재미있는 달리기 놀이', 'https://example.com/video1.mp4', 'https://example.com/thumb1.jpg', 180, ARRAY['달리기', '유아', '게임'], true),
  ('공놀이 - 패스 연습', '기본 패스 동작 익히기', 'https://example.com/video2.mp4', 'https://example.com/thumb2.jpg', 240, ARRAY['공놀이', '초등', '기초'], true),
  ('줄넘기 - 개인줄', '줄넘기 기초 연습', 'https://example.com/video3.mp4', 'https://example.com/thumb3.jpg', 300, ARRAY['줄넘기', '유아', '초등'], true),
  ('협동 게임 - 공 옮기기', '팀워크 향상 게임', 'https://example.com/video4.mp4', 'https://example.com/thumb4.jpg', 360, ARRAY['협동', '게임', '초등'], true)
ON CONFLICT DO NOTHING;

-- 3. 확인 쿼리
SELECT 
  year, month, week, title, is_active 
FROM iiwarmup_programs 
ORDER BY year, month, week;

SELECT 
  title, tags, is_active 
FROM sports_videos 
ORDER BY created_at DESC;
