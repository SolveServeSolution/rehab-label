// Shared types for the Rehab Data Labelling Platform

export interface Label {
  id: string;
  videoId: string;
  repetitionNum: number;
  startTime: number;
  endTime: number;
  score: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface Video {
  id: string;
  title: string;
  driveUrl: string;
  duration: number | null;
  folderName: string | null;
  createdAt: string;
  updatedAt: string;
  labels: Label[];
}

export interface LabelFormData {
  repetitionNum: number;
  startTime: number;
  endTime: number;
  score: number | null;
}
