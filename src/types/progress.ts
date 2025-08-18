import { FlattenedScoreRow, ScoreSheetResponse } from './scoreSheet';

export interface ProgressStudentMonthly {
  month: number;
  year: number;
  average?: number; // computed from flatten result or single value
  skills: {
    listening?: number;
    speaking?: number;
    reading?: number;
    writing?: number;
  };
}

export type ProgressTrend = 'improved' | 'declined' | 'unchanged' | 'insufficient';

export interface ProgressStudentSummary {
  userID: string;
  userName: string;
  grade: string;
  months: ProgressStudentMonthly[]; // sorted oldest -> newest
  latestDelta?: number; // newest - previous
  trend: ProgressTrend;
}

export interface ProgressOverviewKPIs {
  improved: number;
  declined: number;
  unchanged: number;
  insufficient: number;
  avgDelta: number; // mean of students with latestDelta defined
  total: number;
}

export interface ProgressOverview {
  classID: string;
  range: { fromMonth: number; fromYear: number; toMonth: number; toYear: number };
  students: ProgressStudentSummary[];
  kpis: ProgressOverviewKPIs;
}

// Helper structure to pass into builder
export interface MonthlyScoreDataset {
  month: number;
  year: number;
  data: ScoreSheetResponse | null;
}
