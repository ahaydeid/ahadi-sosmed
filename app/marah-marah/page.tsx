"use client";
import { useEffect, useState } from "react";
import { icons, MessageCircle } from "lucide-react";
import useSWR from "swr";

import { getDeviceId } from "@/lib/device";
import ModalReact from "./modal/ModalReact";
import ModalPost from "./modal/ModalPost";
import ModalReactList from "./modal/ModalReactList";
import ModalKomentar from "./modal/ModalKomentar";

import { supabase } from "@/lib/supabase/client";
import { RageSkeleton } from "../components/Skeleton";

type RagePost = {
  id: string;
  nickname: string | null;
  kata: string | null;
  isi: string;
  created_at: string;
  device_id: string;
  top_reacts: string[];
  total_react: number;
  total_comment: number;
};


const MarahMarahPage = () => {
  const [showPostModal, setShowPostModal] = useState(false);
  const [showReactModal, setShowReactModal] = useState(false);
  const [showReactList, setShowReactList] = useState(false);
  const [showKomentarModal, setShowKomentarModal] = useState(false);
  const [activePostId, setActivePostId] = useState<string | null>(null);
  const [reactedPosts, setReactedPosts] = useState<string[]>([]);

  const deviceId = getDeviceId();

  const fetcher = async () => {
    const { getRagePosts } = await import("@/lib/services/rageService");
    const { posts, profiles, reacts } = await getRagePosts();
    
    const reacted = reacts?.filter((r) => r.device_id === deviceId).map((r) => r.rage_post_id) || [];
    setReactedPosts(reacted);
    
    return { posts, profiles };
  };

  const { data, isLoading, mutate } = useSWR("rage-posts", fetcher, {
    revalidateOnFocus: false,
    revalidateOnMount: true,
  });

  const posts = data?.posts || [];
  const profiles = data?.profiles || [];
  const loading = isLoading && posts.length === 0;

  useEffect(() => {
    const channel = supabase
      .channel("rage_updates")
      .on("postgres_changes", { event: "*", schema: "public", table: "rage_posts" }, () => mutate())
      .on("postgres_changes", { event: "*", schema: "public", table: "rage_reacts" }, () => mutate())
      .on("postgres_changes", { event: "*", schema: "public", table: "rage_comments" }, () => mutate())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [mutate]);

  const getProfileIcon = (device_id: string) => {
    const profile = profiles.find((p) => p.device_id === device_id);
    if (!profile) return <div className="w-8 h-8 bg-gray-300 rounded-full" />;

    const iconName = profile.icon_name as keyof typeof icons;
    const IconComponent = icons[iconName];
    const bg = profile.bg_color || "#e5e7eb";

    return (
      <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: bg }}>
        {IconComponent && <IconComponent className="w-5 h-5 text-white" />}
      </div>
    );
  };

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    const day = date.getDate();
    const month = date.getMonth() + 1;
    const year = date.getFullYear().toString().slice(-2);
    const hours = date.getHours().toString().padStart(2, "0");
    const minutes = date.getMinutes().toString().padStart(2, "0");
    return `${day}/${month}/${year} | ${hours}:${minutes}`;
  };

  return (
    <div className="min-h-screen bg-white flex flex-col items-center">
      <div className="w-full bg-white shadow-xs sticky top-0 z-50">
        <div className="flex items-center justify-between p-4 mx-auto w-full">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-1">
              Marah-marah <span>😡</span>
            </h1>
            <p className="text-sm text-gray-500 italic">*Lo anonim, bebas luapin semuanya di sini!*</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => setShowPostModal(true)} className="bg-red-600 text-white font-semibold px-3 py-1 rounded-lg hover:bg-red-700 transition">
              marahin
            </button>
          </div>
        </div>
      </div>

      <div className="w-full bg-white">
        <div className="flex flex-col">
          {loading ? (
            <div className="flex flex-col w-full">
              <RageSkeleton />
              <RageSkeleton />
              <RageSkeleton />
            </div>
          ) : posts.length === 0 ? (
            <div className="p-6 text-center text-gray-500 italic">Belum ada yang marah hari ini 😌</div>
          ) : (
            posts.map((post: RagePost) => {
              const alreadyReacted = reactedPosts.includes(post.id);
              const profile = profiles.find((p) => p.device_id === post.device_id);

              return (
                <div key={post.id} className="p-4 border-b border-gray-100 md:p-6 flex gap-3">
                  <div className="flex-1">
                    <h2 className="flex items-center gap-2 font-semibold text-gray-800 text-base md:text-lg">
                      {getProfileIcon(post.device_id)}
                      <div className="flex flex-col">
                        <span>{profile?.nickname || post.nickname || "Anonim"}</span>
                        <span className="text-xs font-light text-gray-400">{formatDate(post.created_at)}</span>
                      </div>
                    </h2>
                    {post.kata && (
                      <h3>
                        <span className="italic text-sm text-gray-600 mr-2">{post.kata}</span>
                      </h3>
                    )}
                    <p className="text-gray-800 md:text-base leading-relaxed mt-1.5">{post.isi}</p>

                    <div className="flex items-center gap-4 mt-3">
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

                      <div
                        className="flex items-center gap-1 text-gray-600 text-sm cursor-pointer"
                        onClick={() => {
                          setActivePostId(post.id);
                          setShowReactList(true);
                        }}
                      >
                        {post.top_reacts.length > 0 && <span>{post.top_reacts.join(" ")}</span>}
                        <span className="font-medium">{post.total_react}</span>
                      </div>

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
                </div>
              );
            })
          )}
        </div>
      </div>

      {showPostModal && <ModalPost onClose={() => setShowPostModal(false)} onPostSuccess={() => mutate()} />}

      {showReactModal && activePostId && <ModalReact onClose={() => setShowReactModal(false)} postId={activePostId} onReactSuccess={() => { setReactedPosts((prev) => [...prev, activePostId]); mutate(); }} />}
      {showReactList && activePostId && <ModalReactList onClose={() => setShowReactList(false)} postId={activePostId} />}
      {showKomentarModal && activePostId && <ModalKomentar onClose={() => setShowKomentarModal(false)} postId={activePostId} />}
    </div>
  );
};

export default MarahMarahPage;
