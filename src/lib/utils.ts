import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

// Utility for combining Tailwind CSS classes
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Generate a random referral code
export function generateReferralCode(length: number = 8): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  return Array.from(
    { length }, 
    () => chars.charAt(Math.floor(Math.random() * chars.length))
  ).join('');
}

// Format currency 
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

// Format date
export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(date));
}

// Format percentage
export function formatPercentage(value: number): string {
  return `${value.toFixed(2)}%`;
}

// Check if string is valid JSON
export function isValidJson(str: string): boolean {
  try {
    JSON.parse(str);
    return true;
  } catch (e) {
    return false;
  }
}

// Truncate text with ellipsis
export function truncateText(text: string, length: number): string {
  return text.length > length ? `${text.substring(0, length)}...` : text;
}

export const getReferralLink = (referralCode: string) => {
  const baseUrl = window.location.origin;
  return `${baseUrl}/auth/login?ref=${referralCode}`;
};

// Check if forex trading is available
export function isForexTradingTime(): boolean {
  const now = new Date();
  const utcDay = now.getUTCDay();

  // Only check for weekends
  if (utcDay === 6) return false; // Saturday
  if (utcDay === 0) return false; // Sunday

  return true;
}
