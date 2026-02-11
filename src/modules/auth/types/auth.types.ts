export default interface JwtPayload {
  userId: string;
  email: string;
}

export enum Role {
  SUPERADMIN = 'superadmin',
  USER = 'user',
}
