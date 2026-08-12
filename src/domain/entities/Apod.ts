export interface Apod {
  date: string;
  title: string;
  explanation: string;
  url: string;
  hdUrl?: string;
  mediaType: string;
  copyright?: string;
  thumbnailUrl?: string;
}
