"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { PostCardData } from "@/lib/types/post";
import { formatPostDate } from "./formatDate";
import { extractFirstImage, extractPreviewText } from "@/lib/utils/html";
import useSWR from "swr";
import type { Route } from "next";

export function useProfileData(profileId?: string) {
  const router = useRouter();
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Auth Session
  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setCurrentUserId(data.session?.user.id ?? null);
    });
    return () => {
      mounted = false;
    };
  }, []);

  // Main Profile Fetcher
  const fetcher = async () => {
    if (!profileId) return null;

    const { data: profile } = await supabase
      .from("user_profile")
      .select("display_name, avatar_url, verified, bio, can_post")
      .eq("id", profileId)
      .single();

    if (!profile) return null;

    const [{ data: postData }, { count: followersCnt }, { count: followingCnt }, { count: savedCnt }] = await Promise.all([
      supabase.from("post").select("id, created_at, repost_of, likes_count, comments_count, views_count").eq("user_id", profileId).order("created_at", { ascending: false }),
      supabase.from("user_followers").select("*", { count: "exact", head: true }).eq("following_id", profileId),
      supabase.from("user_followers").select("*", { count: "exact", head: true }).eq("follower_id", profileId),
      profileId === currentUserId 
        ? supabase.from("user_saved_posts").select("*", { count: "exact", head: true }).eq("user_id", profileId)
        : Promise.resolve({ count: 0 })
    ]);

    const ids = postData?.map((p) => p.id) || [];
    let formattedPosts: PostCardData[] = [];

    if (ids.length > 0) {
      // 1. Identify reposts
      const repostIds = postData?.map(p => p.repost_of).filter(Boolean) as string[] || [];
      
      // 2. Fetch data for reposts (Original Post & Author)
      let originalPostsMap = new Map(); // id -> { user_id, created_at }
      let originalProfilesMap = new Map(); // user_id -> { display_name, avatar_url }

      if (repostIds.length > 0) {
          const { data: originals } = await supabase.from("post").select("id, user_id, created_at, likes_count, comments_count, views_count").in("id", repostIds);
          if (originals) {
              originals.forEach(o => originalPostsMap.set(o.id, o));
              const originalUserIds = originals.map(o => o.user_id);
              
              const { data: origProfiles } = await supabase.from("user_profile").select("id, display_name, avatar_url, verified").in("id", originalUserIds);
              origProfiles?.forEach(op => originalProfilesMap.set(op.id, op));
          }
      }

      // 3. Fetch content for ALL posts (Main + Original)
      const allContentIds = [...ids, ...repostIds];
      const { data: contents } = await supabase.from("post_content").select("*").in("post_id", allContentIds);
      const contentMap = new Map((contents ?? []).map((c) => [c.post_id, c]));

      formattedPosts = (postData || []).map((p) => {
        const c = contentMap.get(p.id);
        
        // Construct Repost Data if exists
        let repostNode = null;
        if (p.repost_of) {
            const origin = originalPostsMap.get(p.repost_of);
            if (origin) {
                const originContent = contentMap.get(p.repost_of);
                const originProfile = originalProfilesMap.get(origin.user_id);
                if (originContent && originProfile) {
                    repostNode = {
                        id: p.repost_of,
                        slug: (originContent.slug || p.repost_of) as string,
                        author: originProfile.display_name,
                        authorImage: originProfile.avatar_url,
                        title: originContent.title,
                        description: originContent.description,
                        excerpt: extractPreviewText(originContent.description),
                        date: formatPostDate(origin.created_at),
                        views: origin.views_count || 0,
                        likes: origin.likes_count || 0,
                        comments: origin.comments_count || 0,
                        imageUrl: extractFirstImage(originContent.description)
                    };
                }
            }
        }

        return {
          id: p.id,
          slug: (c?.slug || p.id) as string,
          author: profile.display_name ?? "Pengguna",
          authorImage: c?.author_image ?? profile.avatar_url ?? null,
          title: c?.title ?? "(Tanpa judul)",
          description: c?.description ?? "",
          excerpt: extractPreviewText(c?.description ?? ""),
          date: formatPostDate(p.created_at),
          views: p.views_count || 0,
          likes: p.likes_count || 0,
          comments: p.comments_count || 0,
          repost_of: repostNode
        };
      });
    }

    return {
      displayName: profile.display_name || "Pengguna",
      avatarUrl: profile.avatar_url || null,
      verified: profile.verified || false,
      bio: profile.bio || null,
      followersCount: followersCnt ?? 0,
      followingCount: followingCnt ?? 0,
      savedCount: savedCnt ?? 0,
      posts: formattedPosts,
      canPost: profile.can_post || false,
    };
  };

  const { data, isLoading, mutate } = useSWR(profileId ? `profile-${profileId}-${currentUserId}` : null, fetcher, {
    revalidateOnFocus: false,
    revalidateOnMount: true,
  });

  // Listen for global saved posts changes
  useEffect(() => {
    const handleRefresh = () => mutate();
    window.addEventListener("saved-posts:refresh", handleRefresh);
    return () => window.removeEventListener("saved-posts:refresh", handleRefresh);
  }, [mutate]);


  // Following Status Fetcher
  const { data: followData, mutate: mutateFollow } = useSWR(
    currentUserId && profileId && currentUserId !== profileId ? `follow-status-${currentUserId}-${profileId}` : null,
    async () => {
      const { data } = await supabase
        .from("user_followers")
        .select("follower_id")
        .eq("follower_id", currentUserId!)
        .eq("following_id", profileId!)
        .maybeSingle();
      return !!data;
    }
  );

  const posts = data?.posts || [];
  const displayName = data?.displayName || "Memuat...";
  const avatarUrl = data?.avatarUrl || null;
  const verified = data?.verified || false;
  const bio = data?.bio || null;
  const followersCount = data?.followersCount || 0;
  const followingCount = data?.followingCount || 0;
  const savedCount = data?.savedCount || 0;
  const canPost = data?.canPost || false;
  const isFollowing = !!followData;

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  const handleToggleFollow = async () => {
    if (!currentUserId) {
      router.push("/login");
      return;
    }
    if (!profileId || currentUserId === profileId) return;

    const newFollowing = !isFollowing;
    
    // Optimistic Update
    mutateFollow(newFollowing, false);
    mutate({ 
      ...data!, 
      followersCount: followersCount + (newFollowing ? 1 : -1) 
    }, false);

    try {
      if (isFollowing) {
        await supabase.from("user_followers").delete().eq("follower_id", currentUserId).eq("following_id", profileId);
      } else {
        await supabase.from("user_followers").insert([{ follower_id: currentUserId, following_id: profileId }]);
      }
    } catch {
       mutateFollow();
       mutate();
    }
  };

  const handleSecondary = async () => {
    if (currentUserId === profileId) {
      const url = `${window.location.origin}/profile/${profileId}`;
      if (navigator.share) await navigator.share({ title: displayName, url });
      else await navigator.clipboard.writeText(url);
    } else {
      if (!currentUserId) {
        router.push("/login");
        return;
      }
      router.push(`/chat/${profileId}/` as Route);
    }
  };

  return {
    posts,
    loading: isLoading && !data,
    displayName,
    avatarUrl,
    verified,
    bio,
    isFollowing,
    followersCount,
    followingCount,
    savedCount,
    handleLogout,
    handleToggleFollow,
    handleSecondary,
    mainFollowLabel: isFollowing ? "Mengikuti" : "Ikuti",
    showUserPlusIcon: !isFollowing,
    isOwnProfile: currentUserId === profileId,
    canPost,
  };
}
