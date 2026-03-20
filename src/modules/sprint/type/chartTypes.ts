export interface DayPoint {
  date: string;
  ideal: number;
  actual: number;
  completed: number;
  scopeAdded: number;
}

export interface ScopeChange {
  date: string;
  pointsAdded: number;
  actual: number;
}

export interface AggResult {
  _id: string;
  points: number;
}
