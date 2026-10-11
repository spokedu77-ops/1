export function shouldInvalidateMasterAccessIdentity(
  currentUserId: string | null,
  nextUserId: string | null,
) {
  return Boolean(currentUserId && currentUserId !== nextUserId);
}
