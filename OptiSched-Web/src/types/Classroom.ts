export type RoomType = "COMMON" | "LABORATORY";

export type Classroom = {
  id: number;
  number: string;
  capacity: number;
  type: RoomType;
};

export type ClassroomInput = {
  number: string;
  capacity: number;
  type: RoomType;
};
