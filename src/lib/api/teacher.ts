import api from "./axios";
import { companyService } from "./company";

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
  // Additional fields from API response
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

export const teacherService = {
  transformTeacherResponse(data: any): Teacher {
    return {
      _id: data._id,
      staffId: data.staffId || data["Mã Quản Lý"],
      name: data.name || data["Họ Và Tên"],
      imageUrl: data.imageUrl || data["Hình Ảnh"],
      birthday: data.birthday || data["Ngày Sinh"],
      phoneNumber: data.phoneNumber || data["Số Điện Thoại"],
      email: data.email,
      branch:
        data.branch || (data["Cơ Sở"] ? data["Cơ Sở"].split(",") : undefined),
      address: data.address || data["Địa Chỉ"],
      personalId: data.personalId || data["CMND"],
      leaveDate: data.leaveDate || data["Ngày Nghỉ"],
      positionName: data.positionName || data["Chức Vụ"],
      baseSalary: data.baseSalary,
      type: data.type,
      schedule: data.schedule,
      permission: data.permission,
      shortPermissionName: data.shortPermissionName,
      educationBackground: data.educationBackground,
      userId: data.userId || data.userID,
      directManager: data.directManager,
      department: data.department,
      moodleAccountId: data.moodleAccountId,
      "8x8link": data["8x8link"],
      position: data.position,
    };
  },
  async getTeachers(params: GetTeachersParams = {}): Promise<Teacher[]> {
    const branchCode = params.branch || companyService.getSelectedBranch();
    const companyId = companyService.getSelectedCompany();

    console.log("Selected branch code:", branchCode);
    console.log("Selected company ID:", companyId);

    if (!companyId) {
      throw new Error("Please select a company first");
    }

    if (!branchCode) {
      throw new Error("Please select a branch first");
    }

    let branchId: string;

    // First try to get branch from cached branches
    const cachedBranches: any = await companyService.getBranches(companyId);
    console.log("Cached branches:", cachedBranches);

    // Access the branches array correctly from the cached data structure
    // const branches = cachedBranches?.data?.[companyId];
    // if (!Array.isArray(branches)) {
    //   throw new Error("No branches found for the selected company");
    // }

    const branch = cachedBranches.find((b: any) => b.code === branchCode);
    branchId = branch?._id;

    if (!branchId) {
      throw new Error("Invalid branch selected");
    }

    try {
      const response = await api.get("/user/staff", {
        params: {
          getAll: 1,
          position: params.position ?? [
            "giaovien",
            "foreignTeacher",
            "starTeacher",
          ],
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
        headers: {
          "x-company": companyId,
          "x-branch": branchId,
        },
      });
      console.log("API response:", response.data);
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
    const branchCode = companyService.getSelectedBranch();
    const companyId = companyService.getSelectedCompany();

    if (!companyId) {
      throw new Error("Please select a company first");
    }

    if (!branchCode) {
      throw new Error("Please select a branch first");
    }

    const cachedBranches: any = companyService.getCachedBranches();
    const branches = cachedBranches?.data?.[companyId];

    if (!Array.isArray(branches)) {
      throw new Error("No branches found for the selected company");
    }

    const branch = branches.find((b: any) => b.code === branchCode);
    const branchId = branch?._id;

    if (!branchId) {
      throw new Error("Invalid branch selected");
    }

    try {
      const response = await api.get(`/user/staff/${teacherId}`, {
        headers: {
          "x-company": companyId,
          "x-branch": branchId, // Sử dụng branchId
        },
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
