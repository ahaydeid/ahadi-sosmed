import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { PostCardData } from "@/lib/types/post";
import { formatPostDate } from "./formatDate";
import type { Route } from "next";

export function useProfileData(profileId?: string) {
  const router = useRouter();
  const [posts, setPosts] = useState<PostCardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [displayName, setDisplayName] = useState("Memuat...");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [verified, setVerified] = useState(false);
  const [bio, setBio] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted.current) return;
      setCurrentUserId(data.session?.user.id ?? null);
    });
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    const run = async () => {
      if (!currentUserId || !profileId || currentUserId === profileId) return;
      const { data } = await supabase.from("user_followers").select("follower_id").eq("follower_id", currentUserId).eq("following_id", profileId).maybeSingle();

      if (!mounted.current) return;
      setIsFollowing(!!data);
    };
    run();
  }, [currentUserId, profileId]);

  useEffect(() => {
    const loadUserData = async () => {
      if (!profileId) return;
      setLoading(true);

      const { data: profile } = await supabase.from("user_profile").select("display_name, avatar_url, verified, bio").eq("id", profileId).single();

      if (!mounted.current) return;

      if (!profile) {
        setDisplayName("Profil Tidak Ditemukan");
        setLoading(false);
        return;
      }

      setDisplayName(profile.display_name || "Pengguna");
      setAvatarUrl(profile.avatar_url || null);
      setVerified(profile.verified || false);
      setBio(profile.bio || null);

      const [{ data: postData }, { count: followersCnt }, { count: followingCnt }] = await Promise.all([
        supabase.from("post").select("id, created_at").eq("user_id", profileId).order("created_at", { ascending: false }),
        supabase.from("user_followers").select("*", { count: "exact", head: true }).eq("following_id", profileId),
        supabase.from("user_followers").select("*", { count: "exact", head: true }).eq("follower_id", profileId),
      ]);

      if (!mounted.current) return;

      setFollowersCount(followersCnt ?? 0);
      setFollowingCount(followingCnt ?? 0);

      if (!postData || postData.length === 0) {
        setPosts([]);
        setLoading(false);
        return;
      }

      const ids = postData.map((p) => p.id);
      const { data: contents } = await supabase.from("post_content").select("*").in("post_id", ids);

      if (!mounted.current) return;

      const contentMap = new Map((contents ?? []).map((c) => [c.post_id, c]));
      const formattedPosts: PostCardData[] = postData.map((p) => {
        const c = contentMap.get(p.id);
        return {
          id: p.id,
          author: profile.display_name,
          authorImage: c?.author_image ?? profile.avatar_url ?? null,
          title: c?.title ?? "(Tanpa judul)",
          description: c?.description ?? "",
          date: formatPostDate(p.created_at),
          views: 0,
          likes: 0,
          comments: 0,
        };
      });
      setPosts(formattedPosts);
      setLoading(false);
    };

    loadUserData();
  }, [profileId]);

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

    if (isFollowing) {
      await supabase.from("user_followers").delete().eq("follower_id", currentUserId).eq("following_id", profileId);
      if (!mounted.current) return;
      setIsFollowing(false);
      setFollowersCount((v) => Math.max(0, v - 1));
    } else {
      await supabase.from("user_followers").insert([{ follower_id: currentUserId, following_id: profileId }]);
      if (!mounted.current) return;
      setIsFollowing(true);
      setFollowersCount((v) => v + 1);
    }
  };

  const handleSecondary = async () => {
    if (currentUserId === profileId) {
      const url = `${window.location.origin}/profile/${profileId}`;
      try {
        if (navigator.share) await navigator.share({ title: displayName, url });
        else await navigator.clipboard.writeText(url);
      } catch {}
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
    loading,
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
