import type { RoomType } from "@/types/Classroom";

export type Subject = {
  id: number;
  code: string;
  name: string;
  workload: number;
  requiredRoomType: RoomType | null;
  supportsCoTeaching: boolean;
};

export type SubjectInput = {
  code: string;
  name: string;
  workload: number;
  requiredRoomType: RoomType | null;
  supportsCoTeaching: boolean;
};
