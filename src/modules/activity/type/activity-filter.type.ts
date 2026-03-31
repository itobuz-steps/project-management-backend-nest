// src/modules/activity/types/activity.types.ts
import { Types } from 'mongoose';
import { ActivityAction } from './activity.types';

export interface AggregatedActivity {
  _id: Types.ObjectId;
  action: ActivityAction;
  projectName?: string;
  updatedFields?: Record<string, { from: string; to: string }>;
  createdAt: Date;
  byUser: {
    _id: Types.ObjectId;
    name: string;
    profileImage: string;
  };
}

export interface CountResult {
  total: number;
}

export interface PaginatedActivitiesResult {
  activities: AggregatedActivity[];
  total: number;
  page: number;
  totalPages: number;
}

export interface ActivityFilter {
  project: Types.ObjectId;
  action?: { $in: string[] };
  createdAt?: { $gte?: Date; $lte?: Date };
}
