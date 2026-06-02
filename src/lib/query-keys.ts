export const ACCOUNT_QUERY_KEY = ['account'] as const;

export type AccountDto = {
  id: string;
  email: string;
  displayName: string;
  notification?: boolean;
  sound?: boolean;
  provider: string;
};
