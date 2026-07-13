export type AuthFormState = {
  error?: string;
  success?: string;
  requiresTotp?: boolean;
  pendingToken?: string;
  username?: string;
  requiresVerification?: boolean;
  email?: string;
} | null;
