export enum ProjectType {
  KANBAN = 'kanban',
  SCRUM = 'scrum',
}

export enum ProjectRole {
  MEMBER = 'member',
  ADMIN = 'admin',
}

export interface InvitePayload {
  email: string;
  projectId: string;
}
