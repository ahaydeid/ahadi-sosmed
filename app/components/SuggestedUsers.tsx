"use client";

import { useState } from "react";
import useSWR from "swr";
import { supabase } from "@/lib/supabase/client";
import Link from "next/link";
import NextImage from "next/image";
import { UserPlus, UserCheck, User, BadgeCheck } from "lucide-react";

const fetchSuggestions = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase.rpc("get_suggested_users", { 
        current_user_id_param: user.id, 
        limit_count: 5 
    });
    // If error, it might be due to RPC not created yet or permission, fail gracefully
    if (error) {
        console.error("Failed to fetch suggestions:", JSON.stringify(error, null, 2));
        return [];
    }
    return data;
};

export default function SuggestedUsers() {
    const { data: users, isLoading } = useSWR("suggested-users", fetchSuggestions, {
        revalidateOnFocus: false
    });
    const [following, setFollowing] = useState<Set<string>>(new Set());

    const handleFollow = async (userId: string) => {
        // Optimistic UI
        setFollowing(prev => new Set(prev).add(userId));
        
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { error } = await supabase
            .from("user_followers")
            .insert({ follower_id: user.id, following_id: userId });

        if (error) {
            // Revert on error
            setFollowing(prev => {
                const next = new Set(prev);
                next.delete(userId);
                return next;
            });
            console.error("Follow error:", error);
            alert("Gagal follow user");
        }
    };

    if (isLoading) return (
        <div className="bg-white rounded border border-gray-100 p-4">
            <div className="h-6 w-32 bg-gray-200 rounded mb-4 animate-pulse" />
            <div className="space-y-4">
                 {[1, 2, 3].map(i => (
                    <div key={i} className="flex justify-between items-center">
                        <div className="flex gap-3 items-center">
                            <div className="w-10 h-10 bg-gray-200 rounded-full animate-pulse" />
                            <div className="space-y-2">
                                <div className="h-3 w-20 bg-gray-200 rounded animate-pulse" />
                                <div className="h-2 w-12 bg-gray-200 rounded animate-pulse" />
                            </div>
                        </div>
                        <div className="w-8 h-8 bg-gray-200 rounded-full animate-pulse" />
                    </div>
                ))}
            </div>
        </div>
    );
    
    if (!users || users.length === 0) return null;

    return (
        <div className="bg-white rounded border border-gray-100 p-4 sticky top-4">
            <h2 className="font-bold text-lg mb-4 text-gray-800">Saran Mengikuti</h2>
            <div className="space-y-4">
                {users.map((user: any) => {
                    const isFollowing = following.has(user.user_id);
                    return (
                        <div key={user.user_id} className="flex items-center justify-between">
                            <Link href={`/profile/${user.user_id}`} className="flex items-center gap-3 overflow-hidden group">
                                <div className="w-10 h-10 rounded-full relative overflow-hidden bg-gray-200 shrink-0 border border-gray-100 group-hover:border-gray-300 transition-colors">
                                    {user.avatar_url ? (
                                        <NextImage src={user.avatar_url} alt={user.display_name} fill className="object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                                            <User size={20} />
                                        </div>
                                    )}
                                </div>
                                <div className="min-w-0">
                                    <div className="flex items-center gap-1">
                                        <p className="font-bold text-sm text-gray-900 truncate group-hover:underline">{user.display_name}</p>
                                        {user.verified && <BadgeCheck className="w-3 h-3 text-sky-500 shrink-0" />}
                                    </div>
                                    <p className="text-xs text-gray-500 truncate">{user.total_posts || 0} posts</p>
                                </div>
                            </Link>
                            <button
                                onClick={() => handleFollow(user.user_id)}
                                disabled={isFollowing}
                                className={`p-1.5 rounded-full transition-all duration-200 ${
                                    isFollowing 
                                        ? "bg-gray-100 text-green-600 scale-90" 
                                        : "bg-black text-white hover:bg-gray-800 hover:scale-105"
                                }`}
                                title={isFollowing ? "Following" : "Follow"}
                            >
                                {isFollowing ? <UserCheck size={18} /> : <UserPlus size={18} />}
                            </button>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
