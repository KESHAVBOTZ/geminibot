
export interface ImageResult {
  imageUrl: string;
  description?: string;
}

export interface HistoryItem {
  id: string;
  originalImage: string;
  editedImage: string;
  prompt: string;
  timestamp: number;
}
