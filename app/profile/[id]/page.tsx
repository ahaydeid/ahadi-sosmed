"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import PostCard from "@/app/components/PostCard";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";
import Image from "next/image";
import { PostCardData } from "@/lib/types/post";
import { MoreVertical, UserPlus, ArrowLeft } from "lucide-react";

const formatPostDate = (dateString: string): string => {
  const postDate = new Date(dateString);
  const currentYear = new Date().getFullYear();
  const postYear = postDate.getFullYear();
  const options: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" };
  if (postYear !== currentYear) options.year = "numeric";
  return postDate.toLocaleDateString("id-ID", options).replace(/,$/, "").trim();
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

  // NEW: counters from DB
  const [followersCount, setFollowersCount] = useState<number>(0); // orang yang mengikuti profileId
  const [followingCount, setFollowingCount] = useState<number>(0); // orang yang diikuti profileId

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.auth.getSession();
      setCurrentUserId(data.session?.user.id ?? null);
    };
    load();
  }, []);

  // Cek status mengikuti
  useEffect(() => {
    const checkFollow = async () => {
      if (!currentUserId || !profileId || currentUserId === profileId) return;
      const { data } = await supabase.from("user_followers").select("follower_id").eq("follower_id", currentUserId).eq("following_id", profileId).maybeSingle();
      setIsFollowing(!!data);
    };
    checkFollow();
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

      // Ambil post + counters followers/following paralel
      const [{ data: postData, error: postError }, { count: followersCnt }, { count: followingCnt }] = await Promise.all([
        supabase.from("post").select("id, created_at, user_id, visibility").eq("user_id", profileId).order("created_at", { ascending: false }),
        supabase.from("user_followers").select("*", { count: "exact", head: true }).eq("following_id", profileId), // orang lain yang mengikuti profileId
        supabase.from("user_followers").select("*", { count: "exact", head: true }).eq("follower_id", profileId), // profileId mengikuti berapa orang
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

  // Toggle Follow/Unfollow
  const handleToggleFollow = async () => {
    if (!currentUserId) {
      router.push("/login");
      return;
    }
    if (!profileId || currentUserId === profileId) return;

    if (isFollowing) {
      await supabase.from("user_followers").delete().eq("follower_id", currentUserId).eq("following_id", profileId);
      setIsFollowing(false);
      // Update counter di UI
      setFollowersCount((v) => Math.max(0, v - 1));
    } else {
      await supabase.from("user_followers").insert([{ follower_id: currentUserId, following_id: profileId }]);
      setIsFollowing(true);
      setFollowersCount((v) => v + 1);
    }
  };

  // Kirim pesan (ke user lain) atau bagikan profil (profil sendiri)
  const handleSecondary = async () => {
    if (isOwnProfile) {
      const url = `${window.location.origin}/profile/${profileId}`;
      if (navigator.share) {
        try {
          await navigator.share({ title: displayName, url });
        } catch {
          // ignored
        }
      } else {
        await navigator.clipboard.writeText(url);
        alert("Tautan profil disalin ke papan klip");
      }
    } else {
      if (!currentUserId) {
        router.push("/login");
        return;
      }
      // sesuai permintaan → /chat/[id]/
      router.push(`/chat/${profileId}/`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-16 pt-14">
      {/* HEADER */}
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

      {/* PROFIL */}
      <div className="flex flex-col items-center text-center pt-6">
        <div className="w-24 h-24 rounded-full bg-gray-200 mb-3 overflow-hidden flex items-center justify-center">
          {avatarUrl ? <Image src={avatarUrl} alt={displayName} width={96} height={96} className="object-cover w-24 h-24" /> : <div className="w-12 h-12 rounded-full bg-gray-300" />}
        </div>
        <h1 className="text-2xl font-bold text-gray-800 mb-2">{displayName}</h1>

        {/* COUNTERS from DB */}
        <div className="flex justify-center gap-6 mb-4">
          <div>
            <p className="font-semibold text-gray-800 text-lg">{posts.length}</p>
            <p className="text-gray-500 text-sm">tulisan</p>
          </div>
          <div>
            <p className="font-semibold text-gray-800 text-lg">{followersCount}</p>
            <p className="text-gray-500 text-sm">pengikut</p>
          </div>
          <div>
            <p className="font-semibold text-gray-800 text-lg">{followingCount}</p>
            <p className="text-gray-500 text-sm">mengikuti</p>
          </div>
        </div>
      </div>

      {/* ACTIONS */}
      <div className="flex justify-center gap-3 mb-6">
        {!isOwnProfile && (
          <button
            onClick={handleToggleFollow}
            className={`px-4 py-2 min-w-[120px] rounded-md text-sm font-medium transition flex items-center justify-center gap-1 ${
              isFollowing ? "bg-gray-200 text-gray-800 border border-gray-300 hover:bg-gray-300 italic" : "bg-sky-600 text-white hover:bg-sky-700"
            }`}
          >
            <UserPlus className="w-4 h-4" />
            {isFollowing ? "Mengikuti" : "Ikuti"}
          </button>
        )}

        <button onClick={handleSecondary} className="bg-gray-100 border border-gray-300 min-w-[120px] text-gray-800 px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-200 transition">
          {isOwnProfile ? "Bagikan profil" : "Kirim pesan"}
        </button>
      </div>

      <div className="mb-5">
        <hr className="border border-gray-200 max-w-[90%] mx-auto" />
      </div>

      {/* POSTS */}
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
    </div>
  );
}
