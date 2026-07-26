/** Admin fetch 응답이 JSON이 아닐 때 SyntaxError 토스트가 나지 않도록 파싱한다. */
export async function readAdminJsonSafe<T>(res: Response, fallback: string): Promise<T> {
  const text = await res.text();
  if (!text) {
    if (!res.ok) throw new Error(`${fallback} (HTTP ${res.status})`);
    return {} as T;
  }
  try {
    return JSON.parse(text) as T;
  } catch {
    const snippet = text.replace(/\s+/g, ' ').trim().slice(0, 160);
    throw new Error(
      `${fallback} (HTTP ${res.status}). 서버가 JSON이 아닌 응답을 반환했습니다: ${snippet || '(빈 응답)'}`,
    );
  }
}
