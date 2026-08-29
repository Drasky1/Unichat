const HIGH_RISK_PATTERNS = [
  /\b(?:kill|hurt|harm)\s+(?:yourself|someone|him|her|them)\b/i,
  /\b(?:bomb|weapon|explosive|doxx(?:ing)?|swat(?:ting)?)\b/i,
];

const SPAM_PATTERNS = [
  /https?:\/\/\S+/i,
  /(?:free|win|claim|urgent).{0,24}(?:money|prize|gift|crypto|click)/i,
  /(.)\1{9,}/i,
];

export function classifyMessage(text) {
  if (HIGH_RISK_PATTERNS.some(pattern => pattern.test(text))) {
    return { action: 'hide', severity: 'high', reason: 'Potentially dangerous content' };
  }

  if (SPAM_PATTERNS.some(pattern => pattern.test(text))) {
    return { action: 'hide', severity: 'high', reason: 'Likely spam or suspicious link' };
  }

  return { action: 'review', severity: 'medium', reason: 'Reported by a student' };
}
