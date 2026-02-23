# Auth RLS — lesson_plans 성능 수정 (SELECT·INSERT·UPDATE·DELETE)

## 요구사항

- **SELECT, INSERT, UPDATE, DELETE 네 가지 액션 모두** 수정.
- **기능과 동작에는 문제 없이** (정책 의미·동작 동일).

---

## 1. Multiple Permissive Policies 해결 (액션당 정책 1개)

**이슈**: 동일 역할(authenticated)·동일 액션에 permissive 정책이 여러 개 있으면, 쿼리 시 **모든 정책이 행마다 실행**되어 성능이 나빠짐.  
예: DELETE에 `lesson_plans_delete`, `lesson_plans_teacher_delete` 두 개 존재.

**해결**:  
- lesson_plans에 붙어 있을 수 있는 **기존 정책 이름 전부 DROP**한 뒤, **액션당 정책 1개만** 재생성.

**DROP 대상 (실행 시점에 있으면 제거)**  
- `lesson_plans_admin`, `lesson_plans_teacher`  
- `lesson_plans_select_one`, `lesson_plans_teacher_insert`, `lesson_plans_teacher_update`, `lesson_plans_teacher_delete`  
- `lesson_plans_delete`, `lesson_plans_insert`, `lesson_plans_update` (레거시/다른 스크립트로 생성된 이름)

이후 **CREATE** 하는 정책은 아래 4개뿐이므로, SELECT/INSERT/UPDATE/DELETE 각각 정확히 1개만 유지됨.

---

## 2. Auth RLS 초기화 (auth.uid()·rls_is_admin 1회 평가)

**이슈**: 정책 안의 `auth.uid()`·`rls_is_admin()`가 행마다 재평가됨.

**해결**: `auth.uid()` → `(SELECT auth.uid())`, `rls_is_admin()` → `(SELECT public.rls_is_admin())` 로 치환.

---

## 수정 대상 정책 (4개 전부, 액션당 1개)

| 정책명 | 작업 | 수정 내용 |
|--------|------|-----------|
| `lesson_plans_select_one` | SELECT | `auth.uid()` → `(SELECT auth.uid())`, `rls_is_admin()` → `(SELECT public.rls_is_admin())` |
| `lesson_plans_teacher_insert` | **INSERT** | `auth.uid()` → `(SELECT auth.uid())` (WITH CHECK) |
| `lesson_plans_teacher_update` | **UPDATE** | `auth.uid()` → `(SELECT auth.uid())` (USING + WITH CHECK) |
| `lesson_plans_teacher_delete` | **DELETE** | `auth.uid()` → `(SELECT auth.uid())` (USING) |

---

## 수정 파일

- [sql/FIX_RLS_FINAL_57_AND_LESSON_PLANS.sql](sql/FIX_RLS_FINAL_57_AND_LESSON_PLANS.sql)
  - **Multiple Permissive 제거**: lesson_plans 섹션 상단에 아래 정책들 `DROP POLICY IF EXISTS ... ON lesson_plans` 추가.  
    `lesson_plans_delete`, `lesson_plans_insert`, `lesson_plans_update` (이름만 있고 스크립트 내 CREATE는 없을 수 있음 — DB에만 존재하는 레거시 대비).
  - **Auth 1회 평가**: 위 4개 정책 CREATE 문에서 `auth.uid()` → `(SELECT auth.uid())`, `rls_is_admin()` → `(SELECT public.rls_is_admin())` 치환.

---

## 동작 보장

- `(SELECT auth.uid())`·`(SELECT public.rls_is_admin())`는 **행 값에 의존하지 않으므로** 정책 조건의 논리는 기존과 동일합니다.
- 허용/거부 결과가 바뀌지 않으며, **기능·동작에는 문제 없음**.

적용 결과: **SELECT, INSERT, UPDATE, DELETE 네 가지 모두** 액션당 정책 1개만 유지(Multiple Permissive 해소) + auth/rls_is_admin 쿼리당 1회 평가로 동작합니다.
