export interface RawScoreItem {
  d: string | null; // band descriptor? e.g. 'B'
  l?: string; // label like Nghe/Nói/Đọc/Viết
  _d?: string; // actual score as string
}

export interface TrueScore {
  trueScore: RawScoreItem[];
  predicScore: RawScoreItem[];
  comment: string | null;
  solution: string | null;
  trueComment: string | null;
  trueSolution: string | null;
}

export interface ScoreEntry {
  id: number;
  userID: string;
  classID: string;
  score: TrueScore;
  content: string | null;
  comment: string | null;
  solution: string | null;
  month: number;
  year: number;
  images: any[] | null;
  comment_autoGen: string;
  approve?: {
    userID: string;
    time: string;
  };
  type: number;
  subjectCode: string;
  subjectName: string;
  teacherName: string;
  class: string;
  userName: string;
  grade: string;
  isApprove: boolean;
}

export enum ScoreType {
  Process = 0,
  Final = 1,
}

export interface ScoreSheetStudentClassData {
  [classId: string]: ScoreEntry;
}

export interface ScoreSheetMonthClassData {
  [yyyymm: string]: ScoreSheetStudentClassData;
}

export interface ScoreSheetStudentData {
  userID: string;
  userName: string;
  grade: string;
  classInfor: {
    [classId: string]: {
      subjectName: string;
      teacherName: string;
    };
  };
  score: ScoreSheetMonthClassData;
  group: Record<string, { month: number; year: number }>;
}

export interface ScoreSheetResponseData {
  [userId: string]: ScoreSheetStudentData;
}

export interface ScoreSheetGroupItem {
  value: number;
  label: number | string;
  type: number[];
}

export interface ScoreSheetResponse {
  data: ScoreSheetResponseData;
  group: Record<string, ScoreSheetGroupItem[]>;
}

export interface FlattenedScoreRow {
  userID: string;
  userName: string;
  grade: string;
  listening?: number;
  speaking?: number;
  reading?: number;
  writing?: number;
  average?: number;
  approved?: boolean;
  missing: boolean; // true if any of core skill missing
  raw: ScoreEntry | null;
}

export function flattenScoreSheet(
  resp: ScoreSheetResponse,
  classID: string,
  month: number,
  year: number
): FlattenedScoreRow[] {
  const rows: FlattenedScoreRow[] = [];
  const key = `${year}${String(month).padStart(2, '0')}`;
  Object.values(resp.data || {}).forEach(student => {
    const entry = student.score?.[key]?.[classID];
    if (!entry) {
      rows.push({
        userID: student.userID,
        userName: student.userName,
        grade: student.grade,
        missing: true,
        raw: null,
      });
      return;
    }
    const skillMap: Record<string, number> = {};
    const trueScoreItems = entry.score?.trueScore || [];
    trueScoreItems.forEach(s => {
      if (s.l && s._d) {
        const num = parseFloat(s._d);
        if (!isNaN(num)) {
          const label = s.l.toLowerCase();
          if (label.includes('nghe')) skillMap.listening = num;
          else if (label.includes('nói')) skillMap.speaking = num;
          else if (label.includes('đọc')) skillMap.reading = num;
          else if (label.includes('viết')) skillMap.writing = num;
        }
      }
    });
    let values = [skillMap.listening, skillMap.speaking, skillMap.reading, skillMap.writing].filter(v => typeof v === 'number') as number[];
    if (!values.length) {
      const numericValues = trueScoreItems
        .map(s => (s._d ? parseFloat(s._d) : NaN))
        .filter(n => !isNaN(n));
      if (numericValues.length) {
        // If only one number, treat as overall average only.
        if (numericValues.length === 1) {
          values = numericValues.slice();
        } else {
          const skillOrder: (keyof typeof skillMap)[] = ['listening','speaking','reading','writing'];
            numericValues.slice(0, skillOrder.length).forEach((val, idx) => {
            const k = skillOrder[idx];
            skillMap[k] = val;
          });
          values = [skillMap.listening, skillMap.speaking, skillMap.reading, skillMap.writing].filter(v => typeof v === 'number') as number[];
        }
      }
    }
    const average = values.length ? Number((values.reduce((a,b)=>a+b,0)/values.length).toFixed(2)) : undefined;
    const missing = values.length === 0;
    rows.push({
      userID: student.userID,
      userName: student.userName,
      grade: student.grade,
      listening: skillMap.listening,
      speaking: skillMap.speaking,
      reading: skillMap.reading,
      writing: skillMap.writing,
      average,
      approved: entry.isApprove,
      missing,
      raw: entry,
    });
  });
  return rows;
}
