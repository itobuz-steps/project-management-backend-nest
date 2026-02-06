export default JwtPayload;

interface JwtPayload {
  userId: string;
  email: string;
}

export enum Role {
  SUPERADMIN = 'superadmin',
  MEMBER = 'member',
  ADMIN = 'admin',
}
