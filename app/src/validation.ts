// Same rules as the server, so people see mistakes before sending.

export function checkPhone(phone: string) {
  const clean = phone.replace(/[\s-]/g, '');
  return /^\+?\d{8,15}$/.test(clean) ? null : 'Enter 8 to 15 digits, for example +919876543210';
}

export function checkOtp(otp: string) {
  return /^\d{6}$/.test(otp.trim()) ? null : 'The OTP has 6 digits';
}

export function checkLoan(friendName: string, amount: string, dueDate: string) {
  const errors: { friendName?: string; amount?: string; dueDate?: string } = {};
  if (!friendName.trim()) errors.friendName = 'Enter a name';
  else if (friendName.trim().length > 100) errors.friendName = 'Keep it under 100 letters';

  const n = Number(amount);
  if (!amount.trim() || Number.isNaN(n)) errors.amount = 'Enter an amount';
  else if (n <= 0) errors.amount = 'Amount must be more than 0';
  else if (!/^\d+(\.\d{1,2})?$/.test(amount.trim())) errors.amount = 'Use at most 2 decimals';
  else if (n > 10_000_000) errors.amount = 'Amount is too large';

  const d = new Date(`${dueDate}T00:00:00Z`);
  const real = /^\d{4}-\d{2}-\d{2}$/.test(dueDate) && !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === dueDate;
  if (!real) errors.dueDate = 'Use the format YYYY-MM-DD, for example 2026-11-30';
  return errors;
}
