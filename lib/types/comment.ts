export interface CommentData {
  id: string;
  user_id: string;
  author: string;
  text: string;
  time: string;
  likes: number;
  likedByMe: boolean;
  respondersUniqueCount: number;
  respondedByMe: boolean;
  followedResponderName?: string | null;
  avatarColor: string;
  avatarUrl?: string | null;
  verified?: boolean;
  parent_comment_id?: string | null;
}
