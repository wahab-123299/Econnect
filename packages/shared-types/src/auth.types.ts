export type UserRole = 'attendee' | 'organizer' | 'venue_admin' | 'admin';

export interface UserDTO {
  id: string;
  email: string | null;
  phone: string | null;
  fullName: string;
  role: UserRole;
  phoneVerified: boolean;
  emailVerified: boolean;
}

export interface AuthTokensDTO {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResponseDTO {
  user: UserDTO;
  accessToken: string;
  refreshToken: string;
}
