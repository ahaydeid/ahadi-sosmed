// lib/types/post.ts
export interface PostCardData {
  id: string;
  slug: string;
  author: string;
  authorImage: string | null; 
  title: string;
  description: string;
  excerpt: string; // Made required
  imageUrl?: string | null; 
  date: string;
  views: number;
  likes: number;
  comments: number;
  repost_of?: (PostCardData & { excerpt: string }) | null;
  isRepost?: boolean;
}