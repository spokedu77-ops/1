export type MasterClientErrorKind =
  | 'network'
  | 'unauthorized'
  | 'forbidden'
  | 'validation'
  | 'server'
  | 'unexpected';

export type MasterClientError = {
  kind: MasterClientErrorKind;
  message: string;
  status?: number;
};

const NETWORK_ERROR_MESSAGE = '인터넷 연결을 확인한 뒤 다시 시도해 주세요.';
const SERVER_ERROR_MESSAGE = '데이터를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.';
const UNAUTHORIZED_ERROR_MESSAGE = '로그인이 필요합니다.';
const FORBIDDEN_ERROR_MESSAGE = 'SPOKEDU MASTER 이용 권한을 확인해 주세요.';
const VALIDATION_FALLBACK_MESSAGE = '입력 내용을 확인해 주세요.';
const CONFLICT_ERROR_MESSAGE = '이미 처리되었거나 다시 사용할 수 없는 요청입니다.';

const UNSAFE_ERROR_PATTERN =
  /(postgres|postgrest|supabase|sql|select|insert|update|delete|constraint|violates|uuid|stack|trace|exception|database|db error|relation|column|schema|table|spokedu_master_|auth\.|token|password|student|memo|explanation|email|payment|order)/i;

export function isSafeValidationMessage(message: string | null | undefined): message is string {
  const text = message?.trim() ?? '';
  if (!text) return false;
  if (text.length > 120) return false;
  return !UNSAFE_ERROR_PATTERN.test(text);
}

export function getSafeMasterErrorMessage(kind: MasterClientErrorKind, rawMessage?: string | null): string {
  if (kind === 'network') return NETWORK_ERROR_MESSAGE;
  if (kind === 'unauthorized') return UNAUTHORIZED_ERROR_MESSAGE;
  if (kind === 'forbidden') return FORBIDDEN_ERROR_MESSAGE;
  if (kind === 'validation') {
    return isSafeValidationMessage(rawMessage) ? rawMessage.trim() : VALIDATION_FALLBACK_MESSAGE;
  }
  return SERVER_ERROR_MESSAGE;
}

export function toMasterClientError(status: number, rawMessage?: string | null): MasterClientError {
  if (status === 401) {
    return { kind: 'unauthorized', message: getSafeMasterErrorMessage('unauthorized'), status };
  }
  if (status === 403) {
    return { kind: 'forbidden', message: getSafeMasterErrorMessage('forbidden'), status };
  }
  if (status === 409) {
    return { kind: 'validation', message: CONFLICT_ERROR_MESSAGE, status };
  }
  if (status >= 400 && status < 500) {
    return { kind: 'validation', message: getSafeMasterErrorMessage('validation', rawMessage), status };
  }
  return { kind: 'server', message: getSafeMasterErrorMessage('server'), status };
}

export function toNetworkMasterClientError(): MasterClientError {
  return { kind: 'network', message: getSafeMasterErrorMessage('network') };
}
