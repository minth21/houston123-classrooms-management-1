import api from "./axios";
import { companyService } from "./company";

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

      if (response.data) {
        const classrooms =
          response.data.data || response.data.classrooms || response.data;
        if (Array.isArray(classrooms)) {
          return classrooms;
        }
        console.warn("Unexpected response format:", response.data);
      }
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
};
