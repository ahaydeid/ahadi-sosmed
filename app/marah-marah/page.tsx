"use client";
import { useEffect, useState } from "react";
import { Search, MessageCircle } from "lucide-react";
import { createClient } from "@supabase/supabase-js";
import { getDeviceId } from "@/lib/device";
import ModalReact from "./modal/ModalReact";
import ModalPost from "./modal/ModalPost";
import ModalReactList from "./modal/ModalReactList";
import ModalKomentar from "./modal/ModalKomentar";

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

type RagePost = {
  id: string;
  nickname: string | null;
  rage_level: string;
  rage_emoji: string;
  kata: string | null;
  isi: string;
  created_at: string;
  top_reacts: string[];
  total_react: number;
  total_comment: number;
};

const MarahMarahPage = () => {
  const [posts, setPosts] = useState<RagePost[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPostModal, setShowPostModal] = useState(false);
  const [showReactModal, setShowReactModal] = useState(false);
  const [showReactList, setShowReactList] = useState(false);
  const [showKomentarModal, setShowKomentarModal] = useState(false);
  const [activePostId, setActivePostId] = useState<string | null>(null);
  const [reactedPosts, setReactedPosts] = useState<string[]>([]);

  const deviceId = getDeviceId();

  // 🔥 Fetch postingan + agregasi
  const fetchPosts = async () => {
    setLoading(true);

    const { data: postsData, error: postError } = await supabase.from("rage_posts").select("*").order("created_at", { ascending: false });

    if (postError || !postsData) {
      console.error("Error fetching posts:", postError);
      setLoading(false);
      return;
    }

    const { data: commentsData } = await supabase.from("rage_comments").select("rage_post_id");

    const { data: reactsData } = await supabase.from("rage_reacts").select("rage_post_id, emoji, device_id");

    // Hitung total react + top emoji
    const merged = postsData.map((post) => {
      const reacts = reactsData?.filter((r) => r.rage_post_id === post.id) || [];
      const comments = commentsData?.filter((c) => c.rage_post_id === post.id) || [];

      const emojiCount: Record<string, number> = {};
      reacts.forEach((r) => {
        emojiCount[r.emoji] = (emojiCount[r.emoji] || 0) + 1;
      });

      const topReacts = Object.entries(emojiCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 2)
        .map(([emoji]) => emoji);

      return {
        ...post,
        top_reacts: topReacts.length ? topReacts : [post.rage_emoji],
        total_react: reacts.length,
        total_comment: comments.length,
      };
    });

    // 🔥 Urutkan: total_react → total_comment → created_at desc
    const sorted = merged.sort((a, b) => {
      if (b.total_react !== a.total_react) return b.total_react - a.total_react;
      if (b.total_comment !== a.total_comment) return b.total_comment - a.total_comment;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    setPosts(sorted);

    setPosts(merged);

    const reacted = reactsData?.filter((r) => r.device_id === deviceId).map((r) => r.rage_post_id) || [];

    setReactedPosts(reacted);
    setLoading(false);
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchPosts();
    }, 0);

    const channel = supabase
      .channel("rage_updates")
      .on("postgres_changes", { event: "*", schema: "public", table: "rage_reacts" }, () => fetchPosts())
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "rage_comments" }, () => fetchPosts())
      .subscribe();

    return () => {
      clearTimeout(timer);
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center">
      {/* Sticky Header */}
      <div className="w-full bg-white shadow-sm fixed top-0 left-0 right-0 z-50">
        <div className="flex items-center justify-between p-4 mx-auto">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-1">
              Marah-marah
              <span>😡</span>
            </h1>
            <p className="text-sm text-gray-500 italic">*Lo anonim, bebas luapin semuanya di sini!*</p>
          </div>
          <div className="flex items-center gap-3">
            <button type="button" className="text-gray-700 hover:text-black transition">
              <Search className="w-6 h-6" />
            </button>
            <button onClick={() => setShowPostModal(true)} className="bg-red-600 text-white font-semibold px-3 py-1 rounded-full hover:bg-red-700 transition">
              marahin
            </button>
          </div>
        </div>
      </div>

      {/* Daftar postingan */}
      <div className="pt-25 w-full bg-white">
        <div className="flex flex-col">
          {loading ? (
            <div className="p-6 text-center text-gray-500">Loading...</div>
          ) : posts.length === 0 ? (
            <div className="p-6 text-center text-gray-500 italic">Belum ada yang marah hari ini 😌</div>
          ) : (
            posts.map((post) => {
              const alreadyReacted = reactedPosts.includes(post.id);

              return (
                <div key={post.id} className="p-4 border-b-3 border-b-gray-50 md:p-6">
                  <h2 className="font-semibold text-gray-800 text-base md:text-lg">{post.nickname || "Anonim"}</h2>
                  <h3>
                    <span>{post.rage_emoji}</span> <span className="italic text-gray-600">{post.kata}</span>
                  </h3>
                  <p className="text-gray-700 text-sm md:text-base leading-relaxed mt-1.5">{post.isi}</p>

                  <div className="flex items-center gap-4 mt-3">
                    {/* Tombol Reaksi */}
                    {!alreadyReacted && (
                      <button
                        onClick={() => {
                          setActivePostId(post.id);
                          setShowReactModal(true);
                        }}
                        className="flex items-center gap-1 bg-red-600 text-white px-3 py-0.5 rounded-full text-sm font-medium hover:bg-red-700 transition"
                      >
                        Reaksi
                      </button>
                    )}

                    {/* Daftar reaksi (2 emoji teratas + total) */}
                    <div
                      className="flex items-center gap-1 text-gray-600 text-sm cursor-pointer"
                      onClick={() => {
                        setActivePostId(post.id);
                        setShowReactList(true);
                      }}
                    >
                      <span>{post.top_reacts.join(" ")}</span>
                      <span className="font-medium">{post.total_react}</span>
                    </div>

                    {/* Tombol komentar */}
                    <div
                      className="flex items-center gap-1 text-gray-600 text-sm cursor-pointer"
                      onClick={() => {
                        setActivePostId(post.id);
                        setShowKomentarModal(true);
                      }}
                    >
                      <MessageCircle className="w-4 h-4" />
                      <span className="font-medium">{post.total_comment}</span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Semua modal */}
      {showPostModal && <ModalPost onClose={() => setShowPostModal(false)} />}
      {showReactModal && activePostId && <ModalReact onClose={() => setShowReactModal(false)} postId={activePostId} onReactSuccess={() => setReactedPosts((prev) => [...prev, activePostId])} />}
      {showReactList && activePostId && <ModalReactList onClose={() => setShowReactList(false)} postId={activePostId} />}
      {showKomentarModal && activePostId && <ModalKomentar onClose={() => setShowKomentarModal(false)} postId={activePostId} />}
    </div>
  );
};

export default MarahMarahPage;
