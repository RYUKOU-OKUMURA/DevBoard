export const isValidHexSecret = (
  value: unknown,
  { minBytes, exactBytes }: { minBytes?: number; exactBytes?: number } = {}
): boolean => {
  if (
    typeof value !== 'string' ||
    value.length === 0 ||
    value.length % 2 !== 0 ||
    /[^0-9a-f]/i.test(value)
  ) {
    return false;
  }

  const bytes = value.length / 2;
  return (minBytes === undefined || bytes >= minBytes) &&
    (exactBytes === undefined || bytes === exactBytes);
};

export const getAuthSecretStatus = (env: {
  SESSION_SECRET?: unknown;
  ENCRYPTION_KEY?: unknown;
}) => ({
  sessionSecretValid: isValidHexSecret(env.SESSION_SECRET, { minBytes: 32 }),
  encryptionKeyValid: isValidHexSecret(env.ENCRYPTION_KEY, { exactBytes: 32 }),
});
