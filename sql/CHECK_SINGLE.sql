-- 하나의 쿼리로 모든 정보 확인
SELECT 
  auth.uid() as my_uid,
  auth.email() as my_email,
  u.id as user_table_id,
  u.email as user_table_email,
  u.role as role_value,
  u.is_admin as is_admin_column,
  u.id = auth.uid() as uid_matches,
  u.role IN ('admin', 'master') as role_in_check,
  is_admin() as is_admin_function_result,
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'master')
  ) as direct_exists_check
FROM users u
WHERE u.email = 'choijihoon@spokedu.com';
