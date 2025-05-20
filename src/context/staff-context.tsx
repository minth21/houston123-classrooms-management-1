"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { api } from "@/lib/api";

interface StaffInfo {
  _id: string;
  userId: string;
  userID: string;
  staffId: string;
  name: string;
  displayName: string;
  phoneNumber: string;
  birthday: string;
  email: string;
  personalId: string;
  positionName: string;
  address: string;
  branch: string[];
  imageUrl: string | null;
  imageProfile: string | null;
  position: string;
  shortPermissionName: string;
  permission: string;
  directManager: string | null;
  department: string[];
  moodleAccountId: number;
  educationBackground: string | null;
  specialize: string[];
  license: string[];
  level: string[];
  leaveDate: string | null;
  "8x8link": string | null;
}

interface StaffContextType {
  staff: StaffInfo | null;
  loading: boolean;
  refetchStaff: () => Promise<void>;
}

const StaffContext = createContext<StaffContextType | undefined>(undefined);

export function StaffProvider({ children }: { children: ReactNode }) {
  const [staff, setStaff] = useState<StaffInfo | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStaffInfo = async () => {
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      setLoading(true);
      const response = await api.get("/user/staff/me");
      const [data] = response.data;
      setStaff(data);
    } catch (error) {
      console.error("Failed to fetch staff info:", error);
      setStaff(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStaffInfo();
  }, []);

  return (
    <StaffContext.Provider
      value={{
        staff,
        loading,
        refetchStaff: fetchStaffInfo,
      }}
    >
      {children}
    </StaffContext.Provider>
  );
}

export function useStaff() {
  const context = useContext(StaffContext);
  if (context === undefined) {
    throw new Error("useStaff must be used within a StaffProvider");
  }
  return context;
}
