/**
 * 낙관적 업데이트 패턴
 * onMutate에서 이전 데이터 백업, onError에서 롤백
 */

import { useMutation, useQueryClient, UseMutationOptions } from '@tanstack/react-query';
import { getSupabaseClient } from '@/app/lib/supabase/client';

const supabase = getSupabaseClient();

interface OptimisticUpdateContext {
  previousData: any;
  queryKey: any[];
}

/**
 * 템플릿 낙관적 업데이트 Mutation
 */
export function useOptimisticTemplateUpdate<TData, TVariables>(
  options: UseMutationOptions<TData, Error, TVariables, OptimisticUpdateContext>
) {
  const queryClient = useQueryClient();

  return useMutation({
    ...options,
    onMutate: async (variables, context) => {
      // 진행 중인 쿼리 취소
      await queryClient.cancelQueries({ queryKey: ['templates'] });

      // 이전 데이터 백업
      const previousData = queryClient.getQueryData(['templates']);

      // 낙관적 업데이트
      if (options.onMutate) {
        await options.onMutate(variables, context);
      }

      return { previousData, queryKey: ['templates'] };
    },
    onError: (error, variables, onMutateResult, context) => {
      // 롤백 (onMutateResult는 onMutate에서 반환한 { previousData, queryKey })
      if (onMutateResult?.previousData) {
        queryClient.setQueryData(onMutateResult.queryKey, onMutateResult.previousData);
      }

      // 에러 핸들러 호출
      if (options.onError) {
        options.onError(error, variables, onMutateResult, context);
      }
    },
    onSettled: (data, error, variables, onMutateResult, context) => {
      // 최종적으로 쿼리 무효화 (서버 데이터와 동기화)
      queryClient.invalidateQueries({ queryKey: ['templates'] });

      if (options.onSettled) {
        options.onSettled(data, error, variables, onMutateResult, context);
      }
    },
  });
}

/**
 * 동시 편집 충돌 감지
 */
export function detectConcurrentEdit(
  currentVersion: number,
  serverVersion: number
): boolean {
  return currentVersion !== serverVersion;
}
