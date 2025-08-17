export interface ClassroomMember {
  id: number;
  userID: string; // duplicate field from API
  userId: string; // keep both just in case backend returns either
  classID: string;
  originalClassID: string | null;
  newTimeSlot: string | null;
  oldTimeSlot: string | null;
  specificNewTimeSlot: string | null;
  specificOldTimeSlot: string | null;
  schoolName: string;
  name: string;
  grade: string;
  phoneNumber: string;
  isOfficial: number; // 1 official, 0 not
  status: number; // 0 active? could be enum
}

export interface ClassroomMemberResponse {
  data: ClassroomMember[];
}
