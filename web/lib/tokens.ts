const EMAIL_CHANGE_PREFIX = "email-change:";
const EMAIL_CHANGE_SEP = "|";

export function buildEmailChangeIdentifier(
  userId: string,
  newEmail: string,
): string {
  return `${EMAIL_CHANGE_PREFIX}${userId}${EMAIL_CHANGE_SEP}${newEmail}`;
}

/** deleteMany の startsWith 用プレフィックス（同一ユーザーの旧トークン削除に使用） */
export function buildEmailChangeUserPrefix(userId: string): string {
  return `${EMAIL_CHANGE_PREFIX}${userId}${EMAIL_CHANGE_SEP}`;
}

export function parseEmailChangeIdentifier(
  identifier: string,
): { userId: string; newEmail: string } | null {
  if (!identifier.startsWith(EMAIL_CHANGE_PREFIX)) return null;
  const rest = identifier.slice(EMAIL_CHANGE_PREFIX.length);
  const sepIndex = rest.indexOf(EMAIL_CHANGE_SEP);
  if (sepIndex === -1) return null;
  return {
    userId: rest.slice(0, sepIndex),
    newEmail: rest.slice(sepIndex + 1),
  };
}
