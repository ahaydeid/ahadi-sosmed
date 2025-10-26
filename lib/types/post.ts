// lib/types/post.ts
export interface PostCardData {
  id: string;
  author: string;
  authorImage: string | null; 
  title: string;
  description: string;
  imageUrl: string | null; 
  date: string;
  views: number;
  likes: number;
  comments: number;
}