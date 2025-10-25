"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import PostCard from "@/app/components/PostCard";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, MoreVertical, User } from "lucide-react";

interface PostContent {
  post_id: string;
  title: string | null;
  description: string | null;
}

interface PostRow {
  id: string;
  created_at: string;
  user_id: string;
}

interface PostCardData {
  id: string;
  author: string;
  title: string;
  description: string;
  date: string;
  views: number;
  likes: number;
  comments: number;
}

export default function ProfilePage() {
  const router = useRouter();
  const [posts, setPosts] = useState<PostCardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [displayName, setDisplayName] = useState<string>("Memuat...");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const loadUserData = async () => {
      setLoading(true);

      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session) {
        console.error("Gagal mengambil session:", sessionError?.message);
        router.push("/login");
        return;
      }

      const userId = session.user.id;

      // 🔹 Ambil profil user (display_name + avatar_url)
      const { data: profile, error: profileError } = await supabase.from("user_profile").select("display_name, avatar_url").eq("id", userId).single();

      if (profileError) {
        console.error("Error mengambil profil:", profileError.message);
        setDisplayName("Profil Tidak Ditemukan");
      } else {
        setDisplayName(profile?.display_name || "Pengguna");
        setAvatarUrl(profile?.avatar_url || null);
      }

      // 🔹 Ambil posting user
      const { data: postData, error: postError } = await supabase.from("post").select("id, created_at, user_id, visibility").eq("user_id", userId).order("created_at", { ascending: false });

      if (postError) {
        console.error("Error loading posts:", postError.message);
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

      const { data: contents } = await supabase.from("post_content").select("post_id, title, description").in("post_id", postIds);

      const contentMap = new Map<string, PostContent>();
      (contents ?? []).forEach((c) => contentMap.set(c.post_id, c));

      const formattedPosts: PostCardData[] = await Promise.all(
        typedPosts.map(async (p) => {
          const [likes, comments, views] = await Promise.all([
            supabase.from("post_likes").select("*", { count: "exact", head: true }).eq("post_id", p.id),
            supabase.from("comments").select("*", { count: "exact", head: true }).eq("post_id", p.id),
            supabase.from("post_views").select("*", { count: "exact", head: true }).eq("post_id", p.id),
          ]);

          const content = contentMap.get(p.id);

          return {
            id: p.id,
            author: profile?.display_name ?? "Anonim",
            title: content?.title ?? "(Tanpa judul)",
            description: content?.description ?? "",
            date: new Date(p.created_at).toLocaleDateString("id-ID", {
              day: "numeric",
              month: "short",
            }),
            views: views.count ?? 0,
            likes: likes.count ?? 0,
            comments: comments.count ?? 0,
          };
        })
      );

      setPosts(formattedPosts);
      setLoading(false);
    };

    loadUserData();
  }, [router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
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
      <div className="flex flex-col items-center text-center pt-6 pb-4">
        <div className="w-24 h-24 rounded-full bg-gray-200 mb-3 overflow-hidden flex items-center justify-center">
          {avatarUrl ? <Image src={avatarUrl} alt={displayName} width={96} height={96} className="object-cover w-24 h-24" /> : <User className="w-12 h-12 text-gray-500" />}
        </div>
        <h1 className="text-2xl font-bold text-gray-800 mb-2">{displayName}</h1>

        <div className="flex justify-center gap-6 mb-4">
          <div>
            <p className="font-semibold text-gray-800 text-lg">{posts.length}</p>
            <p className="text-gray-500 text-sm">tulisan</p>
          </div>
          <div>
            <p className="font-semibold text-gray-800 text-lg">37</p>
            <p className="text-gray-500 text-sm">pengikut</p>
          </div>
          <div>
            <p className="font-semibold text-gray-800 text-lg">17</p>
            <p className="text-gray-500 text-sm">mengikuti</p>
          </div>
        </div>

        <h2 className="text-lg font-bold mb-4">
          Tulisan <span className="font-normal text-gray-600">({posts.length})</span>
        </h2>
      </div>

      {/* POSTINGAN */}
      <div className="max-w-full mx-auto space-y-2">
        {loading && <p className="text-center py-5 text-gray-500">Memuat tulisan...</p>}
        {!loading && posts.length === 0 && <p className="text-center py-5 text-gray-500">Belum ada tulisan</p>}
        {!loading &&
          posts.map((post) => (
            <Link key={post.id} href={`/post/${post.id}`} className="block">
              <PostCard post={post} />
            </Link>
          ))}
      </div>
    </div>
  );
}
