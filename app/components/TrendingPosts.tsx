"use client";

import useSWR from "swr";
import { supabase } from "@/lib/supabase/client";
import Link from "next/link";
import { Heart, MessageSquare } from "lucide-react";
import VerifiedBadge from "./ui/VerifiedBadge";
import NextImage from "next/image";
import { extractPreviewText } from "@/lib/utils/html";

// Fetcher
const fetchTrending = async () => {
    const { data: trending, error } = await supabase.rpc("get_trending_posts", { limit_count: 5 });
    if (error) throw error;
    if (!trending || trending.length === 0) return [];

    const postIds = trending.map((p: any) => p.post_id);
    
    // Fetch content AND repost info
    const [{ data: contentData }, { data: postData }] = await Promise.all([
        supabase.from("post_content").select("post_id, description").in("post_id", postIds),
        supabase.from("post").select("id, repost_of").in("id", postIds)
    ]);

    const descriptionMap = new Map(contentData?.map(c => [c.post_id, c.description]));
    const repostMap = new Map(postData?.map(p => [p.id, p.repost_of]));
    
    // Fetch original titles for reposts
    const repostIds = (postData?.map(p => p.repost_of).filter(Boolean) as string[]) || [];
    let originalTitlesMap = new Map();
    if (repostIds.length > 0) {
        const { data: originalContents } = await supabase
            .from("post_content")
            .select("post_id, title")
            .in("post_id", repostIds);
        originalTitlesMap = new Map(originalContents?.map(c => [c.post_id, c.title]));
    }

    return trending.map((p: any) => ({
        ...p,
        description: descriptionMap.get(p.post_id),
        repost_title: repostMap.get(p.post_id) ? originalTitlesMap.get(repostMap.get(p.post_id)) : null
    }));
};

export default function TrendingPosts() {
    const { data: posts, isLoading } = useSWR("trending-posts", fetchTrending, {
        revalidateOnFocus: false,
        refreshInterval: 300000, // 5 mins
    });

    if (isLoading) return (
        <div className="bg-white rounded border border-gray-100 p-4 mb-6">
            <div className="h-6 w-32 bg-gray-200 rounded mb-4 animate-pulse" />
            <div className="space-y-4">
                {[1, 2, 3].map(i => (
                    <div key={i} className="flex gap-3">
                        <div className="w-10 h-10 bg-gray-200 rounded-full shrink-0 animate-pulse" />
                        <div className="flex-1 space-y-2">
                            <div className="h-4 bg-gray-200 rounded w-3/4 animate-pulse" />
                            <div className="h-3 bg-gray-200 rounded w-1/2 animate-pulse" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
    
    if (!posts || posts.length === 0) return null;

    return (
        <div className="bg-white rounded border border-gray-100 p-4 mb-6">
            <h2 className="font-bold text-lg mb-4 text-gray-800">Trending 🔥</h2>
            <div className="space-y-5">
                {posts.map((post: any) => (
                    <div key={post.post_id} className="group">
                        <Link href={`/post/${post.slug}`} className="block">
                            <div className="flex gap-2 items-center mb-1.5">
                                <div className="w-5 h-5 rounded-full relative overflow-hidden bg-gray-200 shrink-0">
                                    {post.author_avatar ? (
                                        <NextImage src={post.author_avatar} alt={post.author_name} fill className="object-cover" />
                                    ) : (
                                        <div className="w-full h-full bg-gray-300" />
                                    )}
                                </div>
                                <span className="text-xs font-medium text-gray-600 truncate max-w-[150px]">{post.author_name}</span>
                                {post.author_verified && <VerifiedBadge className="w-3 h-3" />}
                            </div>
                            <h3 className="font-bold text-gray-900 leading-snug mb-0.5 group-hover:text-blue-600 transition-colors line-clamp-2">
                                {(post.title && post.title !== post.author_name) ? post.title : (post.description ? extractPreviewText(post.description) : "Postingan")}
                            </h3>
                            {post.repost_title && (
                                <div className="text-xs text-gray-500 mb-1.5 italic">
                                    pada &quot;{post.repost_title}&quot;
                                </div>
                            )}
                            <div className="flex items-center gap-4 text-xs text-gray-500">
                                <span className="flex items-center gap-1">
                                    <Heart size={12} className="text-gray-400" /> {post.like_count}
                                </span>
                                <span className="flex items-center gap-1">
                                    <MessageSquare size={12} className="text-gray-400" /> {post.comment_count}
                                </span>
                                <span className="text-gray-400">•</span>
                                <span className="text-gray-400">
                                   {new Date(post.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                                </span>
                            </div>
                        </Link>
                    </div>
                ))}
            </div>
        </div>
    );
}
