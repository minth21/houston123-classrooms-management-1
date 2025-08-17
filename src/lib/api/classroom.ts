import api from "./axios";
import { companyService } from "./company";
import type { ClassroomMember } from "@/types/classroomMember";
import type { ScoreSheetResponse } from "@/types/scoreSheet";

export interface RecordingSettings {
  resolution: string; // e.g. "1920x1080", "1280x720"
  bitrate: number; // in kbps
  fps: number;
  codec: string; // e.g. "h264", "vp8"
  audioQuality: {
    bitrate: number; // in kbps
    sampleRate: number; // e.g. 44100, 48000
    channels: number; // 1 for mono, 2 for stereo
  };
}

export interface PostRecording {
  classCode: string;
  file: File;
  timestamp: string;
}

export interface Classroom {
  _id: string;
  classID: string;
  teacherCode: string;
  subjectCode: string;
  grade: string;
  branch: string;
  startDate: string;
  finishDate: string;
  supporter: string[];
  publicMember: string[];
  partnerSchoolId: string | null;
  schoolShift: Array<{
    _id: string;
    roomId: string;
    day: number;
    startTime: string;
    endTime: string;
    date: string;
    expiryDate: string;
  }>;
  member: any[];
  __v: number;
  moodleCourseId: number | null;
  detail?: {
    lastSync?: string;
    className?: string;
    teacherName?: string;
  };
  program?: {
    [key: string]: string;
  };
  status?: number;
  conversationMonthlyUpdated: any[];
  diaryMonthlyUpdated: any[];
  ID: number;
  subjectName: string;  teacherName: string;
  role: string;
  beginDate: string;
  reason: string | null;
  endClassStaffCode: string | null;
  studentNumber: number | null;
  schedule: Array<{
    classRoomCode?: string;
    dayOfWeek?: number;
    beginTime?: string;
    finishTime?: string;
  }>;
  isActive: boolean;
  salary?: {
    _id: string;
    classId: string;
    type: number;
    supportType: number;
    reward: any[];
    supportMonth: number;
    supportDay: number;
    supportHour: number;
    supportShift: number;
    hour: number;
    shift: number;
    day: number;
    month: number;
    startDate: string;
    __v: number;
  };
  recordingSettings?: RecordingSettings; // Add recording settings
}

export interface Attendance {
  _id: string;
  classId: string;
  date: string;
  roomId: string;
  startTime: string;
  endTime: string;
  numberOfStudent: number;
  staffId: string;
  staffName: string;
  subjectCode: string;
  subjectName: string;
  grade: string;
  branch: string;
  startDate: string;
  finishDate: string;
  schoolShift: Array<{
    _id: string;
    roomId: string;
    day: number;
    startTime: string;
    endTime: string;
    date: string;
    expiryDate: string;
  }>;
  partnerSchoolId: string | null;
  isAttended: boolean;
  attendanceDetail: {
    confirmed: boolean;
  };
}

export interface PostComment {
  attendanceId: string;
  content: string;
  files?: File[];
}

export interface PostDiary {
  classCode: string;
  content: string;
  files?: File[];
}

export const classroomService = {
  async getClassrooms(): Promise<Classroom[]> {
    const branchCode = companyService.getSelectedBranch();
    const companyId = companyService.getSelectedCompany();

    if (!branchCode || !companyId) {
      throw new Error("Please select a company and branch first");
    }

    try {
      const response = await api.get("/api/classroom", {
        params: {
          field: JSON.stringify({ partnerSchoolName: true, salary: true }),
          branch: branchCode,
          // isActive: true,
        },
        headers: {
          "x-company": companyId,
        },
      });
      const raw = response.data;
      // Try multiple shapes
      const possibleArrays: any[] | undefined = Array.isArray(raw)
        ? raw
        : raw?.data && Array.isArray(raw.data)
        ? raw.data
        : raw?.classrooms && Array.isArray(raw.classrooms)
        ? raw.classrooms
        : raw?.items && Array.isArray(raw.items)
        ? raw.items
        : raw?.result && Array.isArray(raw.result)
        ? raw.result
        : undefined;

      if (possibleArrays) {
        return possibleArrays as Classroom[];
      }
      console.warn("getClassrooms: Unexpected response shape", {
        keys: raw && typeof raw === 'object' ? Object.keys(raw) : null,
        sample: raw,
      });
      return [];
    } catch (error: any) {
      console.error("Error fetching classrooms:", {
        error: error.message,
        response: error.response?.data,
        status: error.response?.status,
      });
      throw error; // Re-throw to let the component handle the error
    }
  },

  async getClassroomAttendance(classCode: string): Promise<Attendance[]> {
    if (!classCode) {
      return [];
    }

    try {
      const response = await api.get(`/api/classroom/${classCode}/attendance`);
      return response.data.data || [];
    } catch (error: any) {
      console.error("Error fetching classroom attendance:", {
        error: error.message,
        response: error.response?.data,
        status: error.response?.status,
      });
      return [];
    }
  },

  async postComment({
    attendanceId,
    content,
    files,
  }: PostComment): Promise<any> {
    const formData = new FormData();
    formData.append("content", content);

    if (files && files.length > 0) {
      files.forEach((file, index) => {
        formData.append(`file${index + 1}`, file);
      });
    }

    const response = await api.post(
      `/api/classroom/attendance/${attendanceId}/comment`,
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    );

    return response.data;
  },

  async postDiary({ classCode, content, files }: PostDiary): Promise<any> {
    const formData = new FormData();
    formData.append("content", content);

    if (files && files.length > 0) {
      files.forEach((file, index) => {
        formData.append(`file${index + 1}`, file);
      });
    }

    const response = await api.post(
      `/api/classroom/${classCode}/diary/post`,
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    );

    return response.data;
  },

  async postRecording({
    classCode,
    file,
    timestamp,
  }: PostRecording): Promise<any> {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("timestamp", timestamp);

    const response = await api.post(
      `/api/classroom/${classCode}/recording`,
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    );

    return response.data;
  },

  async getClassroomMembers(classCode: string, options?: { isOriginal?: boolean }): Promise<ClassroomMember[]> {
    if (!classCode) return [];
    try {
      const response = await api.get(`/api/classroom/${classCode}/member`, {
        params: { isOriginal: options?.isOriginal ?? true },
      });
      const data = response.data?.data || response.data;
      if (Array.isArray(data)) return data;
      if (Array.isArray(data?.data)) return data.data;
      return [];
    } catch (error: any) {
      console.error("Error fetching classroom members", {
        error: error.message,
        response: error.response?.data,
      });
      return [];
    }
  },

  async getClassroomScoreSheet(params: { classID: string; month: number; year: number; type?: number; group?: boolean; notCheckScore?: boolean; }): Promise<ScoreSheetResponse | null> {
    const { classID, month, year, type = 0, group = true, notCheckScore = true } = params;
    if (!classID) return null;
    try {
      const response = await api.get("/api/classroom/scoreSheet", {
        params: {
          classID,
          month,
            year,
          type,
          group,
          notCheckScore,
        },
      });
      return response.data as ScoreSheetResponse;
    } catch (error: any) {
      console.error("Error fetching classroom score sheet", {
        error: error.message,
        response: error.response?.data,
      });
      return null;
    }
  },
  _scoreCache: new Map<string, ScoreSheetResponse | null>(),
  async getClassroomScoresHistory(params: { classID: string; baseMonth: number; baseYear: number; span?: number; type?: number; }): Promise<{ month: number; year: number; data: ScoreSheetResponse | null; }[]> {
    const { classID, baseMonth, baseYear, span = 3, type = 0 } = params;
    const results: { month: number; year: number; data: ScoreSheetResponse | null; }[] = [];
    for (let i = 0; i < span; i++) {
      // month offset backwards
      const date = new Date(baseYear, baseMonth - 1 - i, 1);
      const m = date.getMonth() + 1;
      const y = date.getFullYear();
      const key = `${classID}-${y}-${m}-${type}`;
      if (!this._scoreCache.has(key)) {
        const data = await this.getClassroomScoreSheet({ classID, month: m, year: y, type });
        this._scoreCache.set(key, data);
      }
      results.push({ month: m, year: y, data: this._scoreCache.get(key) || null });
    }
    return results.sort((a,b)=> (a.year*100+a.month) - (b.year*100+b.month));
  },
  async getClassroomById(classID: string): Promise<Classroom | null> {
    if (!classID) return null;
    try {
      const response = await api.get('/api/classroom', {
        params: { classID },
      });
      const raw = response.data;
      const single = Array.isArray(raw?.data) ? raw.data.find((c: any)=>c.classID===classID)
        : Array.isArray(raw) ? raw.find((c:any)=>c.classID===classID)
        : Array.isArray(raw?.result) ? raw.result.find((c:any)=>c.classID===classID)
        : Array.isArray(raw?.items) ? raw.items.find((c:any)=>c.classID===classID)
        : raw?.data?.classID === classID ? raw.data : null;
      if (!single) {
        console.warn('getClassroomById: not found in response', { classID, keys: raw && Object.keys(raw || {}) });
      }
      return single || null;
    } catch (e:any) {
      console.error('getClassroomById error', { message: e.message, response: e.response?.data });
      return null;
    }
  }
};
