"use client";

import type { Route } from "next";
import { useEffect, useMemo, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import PostCard from "@/app/components/PostCard";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";
import Image from "next/image";
import { PostCardData } from "@/lib/types/post";
import { MoreVertical, UserPlus, ArrowLeft, X } from "lucide-react";

const formatPostDate = (dateString: string): string => {
  const d = new Date(dateString);
  const postYear = d.getUTCFullYear();
  const nowYear = new Date().getUTCFullYear();
  const opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", timeZone: "UTC" };
  if (postYear !== nowYear) opts.year = "numeric";
  return new Intl.DateTimeFormat("id-ID", opts).format(d);
};

interface PostContent {
  post_id: string;
  title: string | null;
  description: string | null;
  image_url?: string | null;
  author_image?: string | null;
}

interface PostRow {
  id: string;
  created_at: string;
  user_id: string;
}

interface SimpleProfile {
  id: string;
  display_name: string;
  avatar_url: string | null;
}

export default function ProfilePage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const profileId = params?.id;

  const [posts, setPosts] = useState<PostCardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [displayName, setDisplayName] = useState<string>("Memuat...");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [theyFollowMeProfile, setTheyFollowMeProfile] = useState(false);

  const [followersCount, setFollowersCount] = useState<number>(0);
  const [followingCount, setFollowingCount] = useState<number>(0);

  const [showFollowModal, setShowFollowModal] = useState(false);
  const [followTab, setFollowTab] = useState<"followers" | "following">("followers");
  const [followers, setFollowers] = useState<SimpleProfile[]>([]);
  const [following, setFollowing] = useState<SimpleProfile[]>([]);
  const [loadingFollowList, setLoadingFollowList] = useState(false);

  const [followingSet, setFollowingSet] = useState<Set<string>>(new Set());
  const [followsMeSet, setFollowsMeSet] = useState<Set<string>>(new Set());

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.auth.getSession();
      setCurrentUserId(data.session?.user.id ?? null);
    };
    load();
  }, []);

  // cek status mengikuti dan apakah dia mengikuti saya
  useEffect(() => {
    const run = async () => {
      if (!currentUserId || !profileId || currentUserId === profileId) return;
      const [iFollowRes, theyFollowMeRes] = await Promise.all([
        supabase.from("user_followers").select("follower_id").eq("follower_id", currentUserId).eq("following_id", profileId).maybeSingle(),
        supabase.from("user_followers").select("follower_id").eq("follower_id", profileId).eq("following_id", currentUserId).maybeSingle(),
      ]);
      setIsFollowing(!!iFollowRes.data);
      setTheyFollowMeProfile(!!theyFollowMeRes.data);
    };
    run();
  }, [currentUserId, profileId]);

  useEffect(() => {
    const loadUserData = async () => {
      if (!profileId) return;
      setLoading(true);

      const { data: profile, error: profileError } = await supabase.from("user_profile").select("display_name, avatar_url, id").eq("id", profileId).single();

      if (profileError || !profile) {
        setDisplayName("Profil Tidak Ditemukan");
        setAvatarUrl(null);
        setPosts([]);
        setFollowersCount(0);
        setFollowingCount(0);
        setLoading(false);
        return;
      }

      setDisplayName(profile.display_name || "Pengguna");
      setAvatarUrl(profile.avatar_url || null);

      const [{ data: postData, error: postError }, { count: followersCnt }, { count: followingCnt }] = await Promise.all([
        supabase.from("post").select("id, created_at, user_id, visibility").eq("user_id", profileId).order("created_at", { ascending: false }),
        supabase.from("user_followers").select("*", { count: "exact", head: true }).eq("following_id", profileId),
        supabase.from("user_followers").select("*", { count: "exact", head: true }).eq("follower_id", profileId),
      ]);

      setFollowersCount(followersCnt ?? 0);
      setFollowingCount(followingCnt ?? 0);

      if (postError) {
        setPosts([]);
        setLoading(false);
        return;
      }

      if (!postData || postData.length === 0) {
        setPosts([]);
        setLoading(false);
        return;
      }

      const typedPosts: PostRow[] = postData as PostRow[];
      const postIds = typedPosts.map((p) => p.id);

      const { data: contents } = await supabase.from("post_content").select("post_id, title, description, image_url, author_image").in("post_id", postIds);

      const contentMap = new Map<string, PostContent>();
      (contents ?? []).forEach((c) => contentMap.set(c.post_id, c as PostContent));

      const formattedPosts: PostCardData[] = await Promise.all(
        typedPosts.map(async (p) => {
          const [likes, comments, views] = await Promise.all([
            supabase.from("post_likes").select("*", { count: "exact", head: true }).eq("post_id", p.id).eq("liked", true),
            supabase.from("comments").select("*", { count: "exact", head: true }).eq("post_id", p.id),
            supabase.from("post_views").select("*", { count: "exact", head: true }).eq("post_id", p.id),
          ]);
          const content = contentMap.get(p.id);
          const authorImageToUse = content?.author_image ?? profile.avatar_url ?? null;
          return {
            id: p.id,
            author: profile.display_name,
            authorImage: authorImageToUse,
            title: content?.title ?? "(Tanpa judul)",
            description: content?.description ?? "",
            imageUrl: content?.image_url ?? null,
            date: formatPostDate(p.created_at),
            views: views.count ?? 0,
            likes: likes.count ?? 0,
            comments: comments.count ?? 0,
          } as PostCardData;
        })
      );

      setPosts(formattedPosts);
      setLoading(false);
    };

    loadUserData();
  }, [profileId]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  const isOwnProfile = currentUserId !== null && currentUserId === profileId;

  const handleToggleFollow = async () => {
    if (!currentUserId) {
      router.push("/login");
      return;
    }
    if (!profileId || currentUserId === profileId) return;

    if (isFollowing) {
      await supabase.from("user_followers").delete().eq("follower_id", currentUserId).eq("following_id", profileId);
      setIsFollowing(false);
      setFollowersCount((v) => Math.max(0, v - 1));
    } else {
      await supabase.from("user_followers").insert([{ follower_id: currentUserId, following_id: profileId }]);
      setIsFollowing(true);
      setFollowersCount((v) => v + 1);
    }
  };

  const handleSecondary = async () => {
    if (isOwnProfile) {
      const url = `${window.location.origin}/profile/${profileId}`;
      if (navigator.share) {
        try {
          await navigator.share({ title: displayName, url });
        } catch {}
      } else {
        await navigator.clipboard.writeText(url);
        alert("Tautan profil disalin ke papan klip");
      }
    } else {
      if (!currentUserId) {
        router.push("/login");
        return;
      }
      const chatRoute = `/chat/${profileId}/` as Route;
      router.push(chatRoute);
    }
  };

  const loadFollowList = useMemo(
    () => async (target: "followers" | "following") => {
      if (!profileId) return;
      setLoadingFollowList(true);

      if (target === "followers") {
        const { data: links, error } = await supabase.from("user_followers").select("follower_id").eq("following_id", profileId);

        if (error || !links) {
          setFollowers([]);
          setFollowingSet(new Set());
          setFollowsMeSet(new Set());
          setLoadingFollowList(false);
          return;
        }

        const ids = links.map((l) => l.follower_id).filter(Boolean);
        if (ids.length === 0) {
          setFollowers([]);
          setFollowingSet(new Set());
          setFollowsMeSet(new Set());
          setLoadingFollowList(false);
          return;
        }

        const [{ data: profiles }, currentFollowsRes, theyFollowMeRes] = await Promise.all([
          supabase.from("user_profile").select("id, display_name, avatar_url").in("id", ids),
          currentUserId ? supabase.from("user_followers").select("following_id").eq("follower_id", currentUserId).in("following_id", ids) : Promise.resolve({ data: [] as { following_id: string }[] }),
          currentUserId ? supabase.from("user_followers").select("follower_id").in("follower_id", ids).eq("following_id", currentUserId) : Promise.resolve({ data: [] as { follower_id: string }[] }),
        ]);

        setFollowers((profiles as SimpleProfile[]) ?? []);

        const myFollowSet = new Set<string>((currentFollowsRes.data as { following_id: string }[]).map((r) => r.following_id));
        const theyFollowMe = new Set<string>((theyFollowMeRes.data as { follower_id: string }[]).map((r) => r.follower_id));
        setFollowingSet(myFollowSet);
        setFollowsMeSet(theyFollowMe);
        setLoadingFollowList(false);
      } else {
        const { data: links, error } = await supabase.from("user_followers").select("following_id").eq("follower_id", profileId);

        if (error || !links) {
          setFollowing([]);
          setFollowingSet(new Set());
          setFollowsMeSet(new Set());
          setLoadingFollowList(false);
          return;
        }

        const ids = links.map((l) => l.following_id).filter(Boolean);
        if (ids.length === 0) {
          setFollowing([]);
          setFollowingSet(new Set());
          setFollowsMeSet(new Set());
          setLoadingFollowList(false);
          return;
        }

        const [{ data: profiles }, currentFollowsRes, theyFollowMeRes] = await Promise.all([
          supabase.from("user_profile").select("id, display_name, avatar_url").in("id", ids),
          currentUserId ? supabase.from("user_followers").select("following_id").eq("follower_id", currentUserId).in("following_id", ids) : Promise.resolve({ data: [] as { following_id: string }[] }),
          currentUserId ? supabase.from("user_followers").select("follower_id").in("follower_id", ids).eq("following_id", currentUserId) : Promise.resolve({ data: [] as { follower_id: string }[] }),
        ]);

        setFollowing((profiles as SimpleProfile[]) ?? []);

        const myFollowSet = new Set<string>((currentFollowsRes.data as { following_id: string }[]).map((r) => r.following_id));
        const theyFollowMe = new Set<string>((theyFollowMeRes.data as { follower_id: string }[]).map((r) => r.follower_id));
        setFollowingSet(myFollowSet);
        setFollowsMeSet(theyFollowMe);
        setLoadingFollowList(false);
      }
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
    if (!currentUserId) {
      router.push("/login");
      return;
    }
    if (currentUserId === targetUserId) return;

    const isFollowingNow = followingSet.has(targetUserId);

    if (isFollowingNow) {
      await supabase.from("user_followers").delete().eq("follower_id", currentUserId).eq("following_id", targetUserId);
      const next = new Set(followingSet);
      next.delete(targetUserId);
      setFollowingSet(next);
    } else {
      await supabase.from("user_followers").insert([{ follower_id: currentUserId, following_id: targetUserId }]);
      const next = new Set(followingSet);
      next.add(targetUserId);
      setFollowingSet(next);
    }
  };

  const mainFollowLabel = isFollowing ? "Mengikuti" : theyFollowMeProfile ? "Ikuti balik" : "Ikuti";

  // Variabel baru untuk mengontrol tampilan ikon
  const showUserPlusIcon = !isFollowing;

  return (
    <div className="min-h-screen bg-gray-50 pb-16 pt-14">
      <header className="fixed top-0 left-0 w-full bg-white border-b border-gray-200 shadow-sm z-20 h-14 flex items-center justify-between px-4">
        <div className="flex items-center">
          <button onClick={() => window.history.back()} aria-label="Kembali" className="mr-4 text-gray-700 hover:text-black transition">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-lg font-bold text-gray-800 truncate">{displayName}</h1>
        </div>

        <div className="relative">
          <button onClick={() => setMenuOpen((prev) => !prev)} aria-label="Menu" className="text-gray-700 hover:text-black transition">
            <MoreVertical className="w-6 h-6" />
          </button>
          {menuOpen && (
            <div className="absolute right-0 mt-2 w-40 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-50">
              <button onClick={handleLogout} className="block w-full text-left px-4 py-2 text-sm text-red-700 hover:bg-gray-100">
                Logout
              </button>
              <button onClick={() => setMenuOpen(false)} className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                Pengaturan Akun
              </button>
            </div>
          )}
        </div>
      </header>

      <div className="flex flex-col items-center text-center pt-6">
        <div className="w-24 h-24 rounded-full bg-gray-200 mb-3 overflow-hidden flex items-center justify-center">
          {avatarUrl ? <Image src={avatarUrl} alt={displayName} width={96} height={96} className="object-cover w-24 h-24" /> : <div className="w-12 h-12 rounded-full bg-gray-300" />}
        </div>
        <h1 className="text-2xl font-bold text-gray-800 mb-2">{displayName}</h1>

        <div className="flex justify-center gap-6 mb-4">
          <div>
            <p className="font-semibold text-gray-800 text-lg">{posts.length}</p>
            <p className="text-gray-500 text-sm">tulisan</p>
          </div>
          <div onClick={openFollowersModal} className="cursor-pointer select-none active:scale-[0.98]">
            <p className="font-semibold text-gray-800 text-lg">{followersCount}</p>
            <p className="text-gray-500 text-sm">pengikut</p>
          </div>
          <div onClick={openFollowingModal} className="cursor-pointer select-none active:scale-[0.98]">
            <p className="font-semibold text-gray-800 text-lg">{followingCount}</p>
            <p className="text-gray-500 text-sm">mengikuti</p>
          </div>
        </div>
      </div>

      <div className="flex justify-center gap-3 mb-6">
        {!isOwnProfile && (
          <button
            onClick={handleToggleFollow}
            className={`px-4 py-2 min-w-[120px] rounded-md text-sm font-medium transition flex items-center justify-center gap-1 ${
              isFollowing ? "bg-gray-200 text-gray-800 border border-gray-300 hover:bg-gray-300 italic" : "bg-sky-600 text-white hover:bg-sky-700"
            }`}
          >
            {/* PERUBAHAN: Tampilkan UserPlus hanya jika isFollowing FALSE */}
            {showUserPlusIcon && <UserPlus className="w-4 h-4" />}
            {mainFollowLabel}
          </button>
        )}

        <button onClick={handleSecondary} className="bg-gray-100 border border-gray-300 min-w-[120px] text-gray-800 px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-200 transition">
          {isOwnProfile ? "Bagikan profil saya" : "Kirim pesan"}
        </button>
      </div>

      <div className="mb-5">
        <hr className="border border-gray-200 max-w-[90%] mx-auto" />
      </div>

      <div className="ms-5">
        <h2 className="text-lg mb-1">
          Tulisan <span className="font-normal text-gray-600">({posts.length})</span>
        </h2>
      </div>
      <hr className="border border-gray-100 dark:border-gray-100" />

      <div className="max-w-full mx-auto space-y-2">
        {loading && <p className="text-center py-5 text-gray-500">Memuat tulisan...</p>}
        {!loading && posts.length === 0 && <p className="text-center py-5 text-gray-500">Belum ada tulisan</p>}
        {!loading &&
          posts.map((post) => (
            <Link key={post.id} href={`/post/${post.id}`} className="block transition hover:bg-gray-100">
              <PostCard post={post} />
            </Link>
          ))}
      </div>

      {showFollowModal && (
        <div className="fixed inset-0 z-50 mb-13 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowFollowModal(false)} />
          <div className="relative w-full sm:max-w-md bg-white rounded-t-2xl sm:rounded-2xl shadow-xl max-h-[80vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="text-base font-semibold text-gray-900">{followTab === "followers" ? "Pengikut" : "Mengikuti"}</h3>
              <button onClick={() => setShowFollowModal(false)} aria-label="Tutup" className="p-2 rounded-md hover:bg-gray-100 text-gray-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3">
              {loadingFollowList && <p className="text-center py-4 text-gray-500">Memuat daftar...</p>}

              {!loadingFollowList && followTab === "followers" && followers.length === 0 && <p className="text-center py-6 text-gray-500">Belum ada pengikut</p>}
              {!loadingFollowList && followTab === "following" && following.length === 0 && <p className="text-center py-6 text-gray-500">Belum mengikuti siapa pun</p>}

              {!loadingFollowList && followTab === "followers" && followers.length > 0 && (
                <ul className="divide-y divide-gray-100 max-h-[60vh] overflow-auto">
                  {followers.map((u) => {
                    const iFollow = followingSet.has(u.id);
                    const theyFollowMe = followsMeSet.has(u.id);
                    const label = iFollow ? "Mengikuti" : theyFollowMe ? "Ikuti balik" : "Ikuti";
                    return (
                      <li key={u.id} className="flex items-center gap-3 p-3">
                        <Link href={`/profile/${u.id}`} className="flex items-center gap-3 flex-1 hover:bg-gray-50 rounded-md" onClick={() => setShowFollowModal(false)}>
                          <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-200 flex items-center justify-center">
                            {u.avatar_url ? <Image src={u.avatar_url} alt={u.display_name} width={40} height={40} className="object-cover w-10 h-10" /> : <div className="w-6 h-6 rounded-full bg-gray-300" />}
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-semibold text-gray-900">{u.display_name}</p>
                            <p className="text-xs text-gray-500">Lihat profil</p>
                          </div>
                        </Link>
                        {currentUserId && currentUserId !== u.id && (
                          <button
                            onClick={() => handleItemFollowToggle(u.id)}
                            className={`px-3 py-1 text-xs rounded-md border transition ${iFollow ? "bg-gray-200 text-gray-800 border-gray-300 hover:bg-gray-300 italic" : "bg-sky-600 text-white border-sky-700 hover:bg-sky-700"}`}
                          >
                            {label}
                          </button>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}

              {!loadingFollowList && followTab === "following" && following.length > 0 && (
                <ul className="divide-y divide-gray-100 max-h-[60vh] overflow-auto">
                  {following.map((u) => {
                    const iFollow = followingSet.has(u.id);
                    const theyFollowMe = followsMeSet.has(u.id);
                    const label = iFollow ? "Mengikuti" : theyFollowMe ? "Ikuti balik" : "Ikuti";
                    return (
                      <li key={u.id} className="flex items-center gap-3 p-3">
                        <Link href={`/profile/${u.id}`} className="flex items-center gap-3 flex-1 hover:bg-gray-50 rounded-md" onClick={() => setShowFollowModal(false)}>
                          <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-200 flex items-center justify-center">
                            {u.avatar_url ? <Image src={u.avatar_url} alt={u.display_name} width={40} height={40} className="object-cover w-10 h-10" /> : <div className="w-6 h-6 rounded-full bg-gray-300" />}
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-semibold text-gray-900">{u.display_name}</p>
                            <p className="text-xs text-gray-500">Lihat profil</p>
                          </div>
                        </Link>
                        {currentUserId && currentUserId !== u.id && (
                          <button
                            onClick={() => handleItemFollowToggle(u.id)}
                            className={`px-3 py-1 text-xs rounded-md border transition ${iFollow ? "bg-gray-200 text-gray-800 border-gray-300 hover:bg-gray-300 italic" : "bg-sky-600 text-white border-sky-700 hover:bg-sky-700"}`}
                          >
                            {label}
                          </button>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
