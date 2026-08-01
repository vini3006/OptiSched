export type RoomType = "COMMON" | "LABORATORY" | "AUDITORIUM" | "COMPUTER_LAB";

export type Classroom = {
  id: number;
  number: string;
  capacity: number;
  type: RoomType;
  building: string | null;
};

export type ClassroomInput = {
  number: string;
  capacity: number;
  type: RoomType;
  building: string | null;
};
