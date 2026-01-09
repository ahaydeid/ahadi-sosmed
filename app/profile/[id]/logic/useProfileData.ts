"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { PostCardData } from "@/lib/types/post";
import { formatPostDate } from "./formatDate";
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
      .select("display_name, avatar_url, verified, bio")
      .eq("id", profileId)
      .single();

    if (!profile) return null;

    const [{ data: postData }, { count: followersCnt }, { count: followingCnt }] = await Promise.all([
      supabase.from("post").select("id, created_at").eq("user_id", profileId).order("created_at", { ascending: false }),
      supabase.from("user_followers").select("*", { count: "exact", head: true }).eq("following_id", profileId),
      supabase.from("user_followers").select("*", { count: "exact", head: true }).eq("follower_id", profileId),
    ]);

    const ids = postData?.map((p) => p.id) || [];
    let formattedPosts: PostCardData[] = [];

    if (ids.length > 0) {
      const { data: contents } = await supabase.from("post_content").select("*").in("post_id", ids);
      const contentMap = new Map((contents ?? []).map((c) => [c.post_id, c]));
      formattedPosts = (postData || []).map((p) => {
        const c = contentMap.get(p.id);
        return {
          id: p.id,
          author: profile.display_name ?? "Pengguna",
          authorImage: c?.author_image ?? profile.avatar_url ?? null,
          title: c?.title ?? "(Tanpa judul)",
          description: c?.description ?? "",
          date: formatPostDate(p.created_at),
          views: 0,
          likes: 0,
          comments: 0,
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
      posts: formattedPosts,
    };
  };

  const { data, isLoading, mutate } = useSWR(profileId ? `profile-${profileId}` : null, fetcher, {
    revalidateOnFocus: false,
    revalidateOnMount: true,
  });

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
    handleLogout,
    handleToggleFollow,
    handleSecondary,
    mainFollowLabel: isFollowing ? "Mengikuti" : "Ikuti",
    showUserPlusIcon: !isFollowing,
    isOwnProfile: currentUserId === profileId,
  };
}
