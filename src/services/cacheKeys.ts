export const keys = {
  ipBlock: (ip: string) => `rl:ipblock:${ip}`,
  minuteZset: (apiKeyId: string, endpoint: string) => `rl:win:${apiKeyId}:${endpoint}`,
  dayCount: (apiKeyId: string) => `rl:day:${apiKeyId}`,
  lastViolation: (apiKeyId: string, endpoint: string) => `rl:viol:${apiKeyId}:${endpoint}`,
};
