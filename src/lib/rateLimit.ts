const rateLimits: { [key: string]: { count: number; timestamp: number } } = {};

export const RATE_LIMITS = {
  DEPOSITS: {
    PER_HOUR: 5,
    PER_DAY: 10
  },
  WITHDRAWALS: {
    PER_HOUR: 3,
    PER_DAY: 5
  },
  PLANS: {
    PER_HOUR: 2,
    PER_DAY: 5
  }
} as const;

export const checkRateLimit = (
  key: string,
  maxRequests: number,
  timeWindowSeconds: number
): boolean => {
  const now = Date.now();
  const windowStart = now - timeWindowSeconds * 1000;

  // Clean up old entries
  Object.keys(rateLimits).forEach(k => {
    if (rateLimits[k].timestamp < windowStart) {
      delete rateLimits[k];
    }
  });

  // Check and update rate limit
  if (!rateLimits[key]) {
    rateLimits[key] = { count: 1, timestamp: now };
    return true;
  }

  if (rateLimits[key].count >= maxRequests) {
    return false;
  }

  rateLimits[key].count++;
  return true;
};

// Add helper functions
export const checkDepositLimit = (userId: string): boolean => {
  return (
    checkRateLimit(`deposit_hourly_${userId}`, RATE_LIMITS.DEPOSITS.PER_HOUR, 3600) &&
    checkRateLimit(`deposit_daily_${userId}`, RATE_LIMITS.DEPOSITS.PER_DAY, 86400)
  );
};

export const checkWithdrawalLimit = (userId: string): boolean => {
  return (
    checkRateLimit(`withdrawal_hourly_${userId}`, RATE_LIMITS.WITHDRAWALS.PER_HOUR, 3600) &&
    checkRateLimit(`withdrawal_daily_${userId}`, RATE_LIMITS.WITHDRAWALS.PER_DAY, 86400)
  );
};

export const checkPlanLimit = (userId: string): boolean => {
  return (
    checkRateLimit(`plan_hourly_${userId}`, RATE_LIMITS.PLANS.PER_HOUR, 3600) &&
    checkRateLimit(`plan_daily_${userId}`, RATE_LIMITS.PLANS.PER_DAY, 86400)
  );
};
