# versoair2023
export interface AuthUser {
  userId: string;        // changed from `id` — matches server JWT payload
  email: string;
  role: string;
  username?: string;
}
