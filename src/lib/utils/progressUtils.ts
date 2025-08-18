import { MonthlyScoreDataset, ProgressOverview, ProgressStudentMonthly, ProgressStudentSummary, ProgressTrend } from '@/types/progress';
import { flattenScoreSheet } from '@/types/scoreSheet';

// Build a map of user -> per month aggregates
export function buildProgressOverview(params: { classID: string; datasets: MonthlyScoreDataset[]; }): ProgressOverview {
  const { classID, datasets } = params;
  // Ensure datasets sorted oldest -> newest
  const sorted = [...datasets].sort((a,b)=> (a.year*100+a.month) - (b.year*100+b.month));

  interface Accum { [userID: string]: { userName: string; grade: string; months: ProgressStudentMonthly[] } }
  const acc: Accum = {};

  sorted.forEach(ds => {
    if (!ds.data) return; // skip missing month
    const rows = flattenScoreSheet(ds.data, classID, ds.month, ds.year);
    rows.forEach(r => {
      if (!acc[r.userID]) {
        acc[r.userID] = { userName: r.userName, grade: r.grade, months: [] };
      }
      acc[r.userID].months.push({
        month: ds.month,
        year: ds.year,
        average: r.average,
        skills: {
          listening: r.listening,
          speaking: r.speaking,
          reading: r.reading,
          writing: r.writing,
        }
      });
    });
  });

  const students: ProgressStudentSummary[] = Object.entries(acc).map(([userID, info]) => {
    // Ensure months sorted
    const months = info.months.sort((a,b)=> (a.year*100+a.month) - (b.year*100+b.month));
    let latestDelta: number | undefined;
    let trend: ProgressTrend = 'insufficient';
    if (months.length >= 2) {
      const newest = months[months.length - 1];
      // find most recent previous month that has a numeric average
      for (let i = months.length - 2; i >= 0; i--) {
        const prev = months[i];
        if (typeof newest.average === 'number' && typeof prev.average === 'number') {
          latestDelta = Number((newest.average - prev.average).toFixed(2));
          if (latestDelta > 0.01) trend = 'improved';
          else if (latestDelta < -0.01) trend = 'declined';
          else trend = 'unchanged';
          break;
        }
      }
      if (trend === 'insufficient') {
        // couldn't compute delta due to missing numeric values
        trend = 'insufficient';
      }
    }
    return {
      userID,
      userName: info.userName,
      grade: info.grade,
      months,
      latestDelta,
      trend,
    };
  });

  // KPIs
  let improved = 0, declined = 0, unchanged = 0, insufficient = 0; let deltaSum = 0; let deltaCount = 0;
  students.forEach(s => {
    switch (s.trend) {
      case 'improved': improved++; break;
      case 'declined': declined++; break;
      case 'unchanged': unchanged++; break;
      case 'insufficient': insufficient++; break;
    }
    if (typeof s.latestDelta === 'number') { deltaSum += s.latestDelta; deltaCount++; }
  });
  const avgDelta = deltaCount ? Number((deltaSum / deltaCount).toFixed(2)) : 0;

  const range = {
    fromMonth: sorted[0]?.month || 0,
    fromYear: sorted[0]?.year || 0,
    toMonth: sorted[sorted.length-1]?.month || 0,
    toYear: sorted[sorted.length-1]?.year || 0,
  };

  return {
    classID,
    range,
    students: students.sort((a,b)=> (b.latestDelta ?? -Infinity) - (a.latestDelta ?? -Infinity)),
    kpis: { improved, declined, unchanged, insufficient, avgDelta, total: students.length }
  };
}
