export function stripSessionNetworkFields<TSession extends Record<string, unknown>>(
  session: TSession,
): { data: TSession & { ipAddress: null; userAgent: null } } {
  return {
    data: {
      ...session,
      ipAddress: null,
      userAgent: null,
    },
  };
}
