import api from "./axios";
import { companyService } from "./company";
import { Branch } from "./company";

export interface TeacherSchedule {
  _id: string;
  classId: string;
  classID: string;
  startTime: string;
  endTime: string;
  day: number;
  roomId: string;
}

export interface TeacherSalary {
  hour: number;
  shift: number;
  day: number;
  month: number;
  type: number;
}

export interface Teacher {
  _id: string;
  STT?: number;
  staffId: string;
  name: string;
  imageUrl?: string;
  birthday?: string;
  phoneNumber?: string;
  email?: string;
  branch?: string[];
  address?: string;
  personalId?: string;
  leaveDate?: string | null;
  positionName?: string;
  baseSalary?: TeacherSalary;
  type?: number;
  schedule?: TeacherSchedule[];
  permission?: string;
  shortPermissionName?: string;
  educationBackground?: string;
  userId?: string;
  userID?: string;
  directManager?: string | null;
  department?: string | null;
  moodleAccountId?: number;
  "8x8link"?: string;
  imageProfile?: string | null;
  "Mã Quản Lý"?: string;
  "Họ Và Tên"?: string;
  "Hình Ảnh"?: string;
  "Số Điện Thoại"?: string;
  "Ngày Sinh"?: string;
  "Địa Chỉ"?: string;
  CMND?: string;
  "Chức Vụ"?: string;
  "Ngày Nghỉ"?: string | null;
  "Lý Do Nghỉ"?: string | null;
  "Cơ Sở"?: string;
  position?: string;
}

export interface GetTeachersParams {
  getAll?: number;
  position?: string[];
  branch?: string;
  currentBranch?: string;
  page?: number;
  maxPage?: number;
  field?: {
    baseSalary?: boolean;
    schedule?: boolean;
  };
}

interface ApiHeadersAndParams {
  headers: {
    "x-company": string;
    "x-branch": string;
  };
  params?: Record<string, any>;
}

const getApiHeadersAndParams = async (
  params: GetTeachersParams = {}
): Promise<ApiHeadersAndParams> => {
  const branchCode = params.branch || companyService.getSelectedBranch();
  const companyId = companyService.getSelectedCompany();

  if (!companyId) {
    throw new Error("Please select a company first");
  }

  if (!branchCode) {
    throw new Error("Please select a branch first");
  }

  // Fetch fresh branch data instead of using cached data
  const branches = await companyService.getBranches(companyId);
  const branch = branches.find((b: Branch) => b.code === branchCode);

  if (!branch) {
    throw new Error("Invalid branch selected");
  }

  return {
    headers: {
      "x-company": companyId,
      "x-branch": branch._id,
    },
    params: {
      getAll: 1,
      position: params.position ?? ["giaovien", "foreignTeacher", "starTeacher"],
      branch: branchCode,
      currentBranch: branchCode,
      page: 0,
      maxPage: 1000,
      field: {
        baseSalary: true,
        schedule: true,
        ...params.field,
      },
    },
  };
};

export const teacherService = {
  transformTeacherResponse(data: any): Teacher | null {
    if (!data) return null;

    // Helper function to safely get value from multiple possible sources
    const getValue = (sources: { [key: string]: any }) => {
      for (const [key, value] of Object.entries(sources)) {
        if (value !== undefined && value !== null) return value;
      }
      return undefined;
    };

    // Helper function to handle array fields that might come as comma-separated strings
    const getArrayValue = (value: string | string[] | undefined) => {
      if (!value) return undefined;
      if (Array.isArray(value)) return value;
      return value.split(",").map((item) => item.trim());
    };

    return {
      _id: data._id,
      staffId: getValue({ staffId: data.staffId, "Mã Quản Lý": data["Mã Quản Lý"] }),
      name: getValue({ name: data.name, "Họ Và Tên": data["Họ Và Tên"] }),
      imageUrl: getValue({ imageUrl: data.imageUrl, "Hình Ảnh": data["Hình Ảnh"] }),
      birthday: getValue({ birthday: data.birthday, "Ngày Sinh": data["Ngày Sinh"] }),
      phoneNumber: getValue({ phoneNumber: data.phoneNumber, "Số Điện Thoại": data["Số Điện Thoại"] }),
      email: data.email,
      branch: getArrayValue(getValue({ branch: data.branch, "Cơ Sở": data["Cơ Sở"] })),
      address: getValue({ address: data.address, "Địa Chỉ": data["Địa Chỉ"] }),
      personalId: getValue({ personalId: data.personalId, CMND: data.CMND }),
      leaveDate: getValue({ leaveDate: data.leaveDate, "Ngày Nghỉ": data["Ngày Nghỉ"] }),
      positionName: getValue({ positionName: data.positionName, "Chức Vụ": data["Chức Vụ"] }),
      baseSalary: data.baseSalary,
      type: data.type,
      schedule: data.schedule,
      permission: data.permission,
      shortPermissionName: data.shortPermissionName,
      educationBackground: data.educationBackground,
      userId: getValue({ userId: data.userId, userID: data.userID }),
      directManager: data.directManager,
      department: data.department,
      moodleAccountId: data.moodleAccountId,
      "8x8link": data["8x8link"],
      position: data.position,
    };
  },

  async getTeachers(params: GetTeachersParams = {}): Promise<Teacher[]> {
    try {
      const { headers, params: apiParams } = await getApiHeadersAndParams(params);
      
      const response = await api.get("/api/user/staff", {
        params: apiParams,
        headers,
      });

      if (response.data && Array.isArray(response.data.data)) {
        return response.data.data.map(this.transformTeacherResponse);
      }

      return [];
    } catch (error: any) {
      console.error("Error fetching teachers:", error);
      throw new Error(
        error.response?.data?.message || "Failed to fetch teachers"
      );
    }
  },

  async getTeacherById(teacherId: string): Promise<Teacher | null> {
    if (!teacherId) {
      throw new Error("Teacher ID is required");
    }

    try {
      const { headers } = await getApiHeadersAndParams();
      
      const response = await api.get(`/api/user/staff/${teacherId}`, {
        headers,
      });

      if (response.data) {
        return this.transformTeacherResponse(response.data.data) || null;
      }

      return null;
    } catch (error: any) {
      console.error("Error fetching teacher:", error);
      throw new Error(
        error.response?.data?.message || "Failed to fetch teacher"
      );
    }
  },
};
