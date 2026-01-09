export interface UserProfile {
  id: number;
  user_id: number;
  first_name: string | null;
  last_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  phone: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface UpdateProfileDto {
  first_name?: string;
  last_name?: string;
  bio?: string;
  avatar_url?: string;
  phone?: string;
}

export interface ProfileResponse {
  id: number;
  userId: number;
  firstName: string | null;
  lastName: string | null;
  bio: string | null;
  avatarUrl: string | null;
  phone: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface JwtPayload {
  userId: number;
  email: string;
  type: string;
}
