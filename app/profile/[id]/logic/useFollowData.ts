import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabase/client";

export interface SimpleProfile {
  id: string;
  display_name: string;
  avatar_url: string | null;
  verified: boolean;
}

interface FollowerLink {
  follower_id: string;
  following_id: string;
}

export function useFollowData(profileId: string | undefined, setShowFollowModal: (v: boolean) => void, setFollowTab: (v: "followers" | "following") => void) {
  const [followers, setFollowers] = useState<SimpleProfile[]>([]);
  const [following, setFollowing] = useState<SimpleProfile[]>([]);
  const [loadingFollowList, setLoadingFollowList] = useState(false);
  const [followingSet, setFollowingSet] = useState<Set<string>>(new Set());
  const [followsMeSet, setFollowsMeSet] = useState<Set<string>>(new Set());
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
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

  const loadFollowList = useMemo(
    () => async (target: "followers" | "following") => {
      if (!profileId) return;
      setLoadingFollowList(true);

      const isFollowers = target === "followers";
      const { data } = await supabase
        .from("user_followers")
        .select(isFollowers ? "follower_id" : "following_id")
        .eq(isFollowers ? "following_id" : "follower_id", profileId)
        .returns<FollowerLink[]>();

      if (!mounted.current) return;

      const ids = (data ?? []).map((x) => (isFollowers ? x.follower_id : x.following_id));
      if (ids.length === 0) {
        if (isFollowers) setFollowers([]);
        else setFollowing([]);
        setLoadingFollowList(false);
        return;
      }

      const [{ data: profiles }, currentFollowsRes, theyFollowMeRes] = await Promise.all([
        supabase.from("user_profile").select("id, display_name, avatar_url, verified").in("id", ids).returns<SimpleProfile[]>(),
        currentUserId ? supabase.from("user_followers").select("following_id").eq("follower_id", currentUserId).in("following_id", ids).returns<{ following_id: string }[]>() : Promise.resolve({ data: [] as { following_id: string }[] }),
        currentUserId ? supabase.from("user_followers").select("follower_id").in("follower_id", ids).eq("following_id", currentUserId).returns<{ follower_id: string }[]>() : Promise.resolve({ data: [] as { follower_id: string }[] }),
      ]);

      if (!mounted.current) return;

      if (isFollowers) setFollowers(profiles ?? []);
      else setFollowing(profiles ?? []);

      setFollowingSet(new Set((currentFollowsRes.data ?? []).map((r) => r.following_id)));
      setFollowsMeSet(new Set((theyFollowMeRes.data ?? []).map((r) => r.follower_id)));
      setLoadingFollowList(false);
    },
    [profileId, currentUserId]
  );

  const openFollowersModal = async () => {
    setFollowTab("followers");
    setShowFollowModal(true);
    await loadFollowList("followers");
  };

  const openFollowingModal = async () => {
    setFollowTab("following");
    setShowFollowModal(true);
    await loadFollowList("following");
  };

  const handleItemFollowToggle = async (targetUserId: string) => {
    if (!currentUserId || currentUserId === targetUserId) return;
    const isFollowingNow = followingSet.has(targetUserId);
    if (isFollowingNow) {
      await supabase.from("user_followers").delete().eq("follower_id", currentUserId).eq("following_id", targetUserId);
      if (!mounted.current) return;
      const next = new Set(followingSet);
      next.delete(targetUserId);
      setFollowingSet(next);
    } else {
      await supabase.from("user_followers").insert([{ follower_id: currentUserId, following_id: targetUserId }]);
      if (!mounted.current) return;
      const next = new Set(followingSet);
      next.add(targetUserId);
      setFollowingSet(next);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  return {
    followers,
    following,
    loadingFollowList,
    followingSet,
    followsMeSet,
    currentUserId,
    handleItemFollowToggle,
    openFollowersModal,
    openFollowingModal,
    handleLogout,
  };
}
