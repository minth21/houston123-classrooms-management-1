export interface ScheduledClass {
  id: string;
  classId: string;
  subjectName: string;
  roomId: string;
  teacherName: string;
  startTime: string;
  endTime: string;
  day: number;
  color: string;
  studentCount?: number;
  status?: "upcoming" | "past" | "current";
}

export interface ValidSchedule {
  classRoomCode: string | null;
  dayOfWeek: number;
  beginTime: string;
  finishTime: string;
  validFrom: Date | null;
  validTo: Date | null;
  type: "schedule" | "schoolShift";
}

export interface CombinedSchedule extends ScheduledClass {
  validFrom?: Date | null;
  validTo?: Date | null;
  type: "schedule" | "schoolShift";
}

export type CalendarView = "day" | "week" | "month" | "list"; 