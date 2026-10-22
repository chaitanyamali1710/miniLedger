import { Platform } from 'react-native';

// Where the backend runs. On a real phone, use your computer's LAN address,
// for example EXPO_PUBLIC_API_URL=http://192.168.1.20:4000 npx expo start
export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://192.168.56.1:4000';

export type Loan = {
  id: number;
  friendName: string;
  amount: number;
  dueDate: string;
  repaid: boolean;
  repaidAt: string | null;
  isOverdue: boolean;
  hasReceipt: boolean;
  createdAt: string;
};

export type Summary = {
  totalLent: number;
  totalRepaid: number;
  outstanding: number;
  overdueAmount: number;
  overdueCount: number;
};

export type NewLoan = {
  friendName: string;
  amount: string;
  dueDate: string;
  receipt?: { uri: string; mimeType?: string | null; fileName?: string | null };
};

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

async function call<T>(path: string, init: RequestInit = {}, token?: string): Promise<T> {
  const headers: Record<string, string> = { ...(init.headers as Record<string, string>) };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (typeof init.body === 'string') headers['Content-Type'] = 'application/json';

  let res: Response;
  try {
    res = await fetch(API_URL + path, { ...init, headers });
  } catch {
    throw new ApiError(0, `Cannot reach the server at ${API_URL}`);
  }
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    // Show the first field message from the server if there is one.
    const message = body.details?.[0]?.message ?? body.error ?? 'Something went wrong';
    throw new ApiError(res.status, message);
  }
  return body as T;
}

export const api = {
  requestOtp: (phone: string) =>
    call<{ message: string; demoOtp?: string }>('/auth/request-otp', { method: 'POST', body: JSON.stringify({ phone }) }),

  verifyOtp: (phone: string, otp: string) =>
    call<{ token: string }>('/auth/verify-otp', { method: 'POST', body: JSON.stringify({ phone, otp }) }),

  listLoans: (token: string) => call<Loan[]>('/loans', {}, token),

  summary: (token: string) => call<Summary>('/summary', {}, token),

  markRepaid: (token: string, id: number) => call<Loan>(`/loans/${id}/repaid`, { method: 'PATCH' }, token),

  // Sent as form data so a receipt photo can go along with the entry.
  addLoan: async (token: string, loan: NewLoan) => {
    const form = new FormData();
    form.append('friendName', loan.friendName);
    form.append('amount', loan.amount);
    form.append('dueDate', loan.dueDate);
    if (loan.receipt) {
      const type = loan.receipt.mimeType ?? 'image/jpeg';
      const name = loan.receipt.fileName ?? `receipt.${type.split('/')[1]}`;
      if (Platform.OS === 'web') {
        // In a browser the picked photo is a blob: URL, so turn it into a real file.
        const blob = await (await fetch(loan.receipt.uri)).blob();
        form.append('receipt', blob, name);
      } else {
        // React Native's FormData takes this { uri, name, type } object for files.
        form.append('receipt', { uri: loan.receipt.uri, name, type } as unknown as Blob);
      }
    }
    return call<Loan>('/loans', { method: 'POST', body: form }, token);
  },

  receiptSource: (token: string, id: number) => ({
    uri: `${API_URL}/loans/${id}/receipt`,
    headers: { Authorization: `Bearer ${token}` },
  }),
};
