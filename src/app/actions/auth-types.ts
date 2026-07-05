export type AuthFormState = {
  error?: string;
  success?: string;
  requiresTotp?: boolean;
  pendingToken?: string;
  username?: string;
} | null;
