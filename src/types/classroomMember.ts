export interface ClassroomMember {
  id: number;
  userID: string;
  userId: string; 
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
  isOfficial: number; 
  status: number;
}

export interface ClassroomMemberResponse {
  data: ClassroomMember[];
}
