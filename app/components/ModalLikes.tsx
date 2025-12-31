"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import Image from "next/image";
import Link from "next/link";
import { X } from "lucide-react";

type Liker = {
  id: string;
  display_name: string;
  avatar_url?: string | null;
};

export default function ModalLikes({ postId, commentId, open, onClose }: { postId?: string; commentId?: string; open: boolean; onClose: () => void }) {
  const [likers, setLikers] = useState<Liker[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;

    let mounted = true;

    const fetchLikes = async () => {
      setLoading(true);

      try {
        if (commentId) {
          const { data: likesData, error: likesError } = await supabase.from("comment_likes").select("user_id").eq("comment_id", commentId);

          if (likesError) throw likesError;

          const likes = (likesData ?? []) as { user_id: string | null }[];
          const ids = likes.map((r) => r.user_id).filter(Boolean) as string[];

          if (!ids.length) {
            if (mounted) {
              setLikers([]);
              setLoading(false);
            }
            return;
          }

          const { data: profilesData, error: profilesError } = await supabase.from("user_profile").select("id, display_name, avatar_url").in("id", ids);

          if (profilesError) throw profilesError;

          const profiles = (profilesData ?? []) as {
            id: string;
            display_name: string;
            avatar_url?: string | null;
          }[];

          if (mounted) {
            setLikers(
              profiles.map((p) => ({
                id: p.id,
                display_name: p.display_name,
                avatar_url: p.avatar_url,
              }))
            );
            setLoading(false);
          }
        } else if (postId) {
          const { data: likesData, error: likesError } = await supabase.from("post_likes").select("user_id").eq("post_id", postId).eq("liked", true);

          if (likesError) throw likesError;

          const likes = (likesData ?? []) as { user_id: string | null }[];
          const ids = likes.map((r) => r.user_id).filter(Boolean) as string[];

          if (!ids.length) {
            if (mounted) {
              setLikers([]);
              setLoading(false);
            }
            return;
          }

          const { data: profilesData, error: profilesError } = await supabase.from("user_profile").select("id, display_name, avatar_url").in("id", ids);

          if (profilesError) throw profilesError;

          const profiles = (profilesData ?? []) as {
            id: string;
            display_name: string;
            avatar_url?: string | null;
          }[];

          if (mounted) {
            setLikers(
              profiles.map((p) => ({
                id: p.id,
                display_name: p.display_name,
                avatar_url: p.avatar_url,
              }))
            );
            setLoading(false);
          }
        } else {
          if (mounted) {
            setLikers([]);
            setLoading(false);
          }
        }
      } catch (error) {
        // laporkan error, lalu tampilkan list kosong sebagai fallback
        console.error(error);
        if (mounted) {
          setLikers([]);
          setLoading(false);
        }
      }
    };

    fetchLikes();

    return () => {
      mounted = false;
    };
  }, [open, postId, commentId]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" aria-modal="true" role="dialog">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} aria-hidden />
      <div className="relative z-10 w-[min(520px,95%)] max-h-[80vh] overflow-auto bg-white rounded-lg shadow-lg p-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold">Yang menyukai</h3>
          <button onClick={onClose} className="text-sm px-3 py-1 rounded-full cursor-pointer hover:bg-gray-100">
            <X />
          </button>
        </div>
        <hr className="border-t border-gray-300 my-6" />
        {loading ? (
          <div className="text-sm text-gray-500">Memuat...</div>
        ) : likers.length === 0 ? (
          <div className="text-sm text-gray-500">Belum ada yang menyukai.</div>
        ) : (
          <div className="space-y-2">
            {likers.map((l) => (
              <Link href={`/profile/${l.id}`} key={l.id} className="flex items-center gap-3 p-2 rounded hover:bg-gray-50" onClick={onClose}>
                <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-200 flex items-center justify-center">
                  {l.avatar_url ? <Image src={l.avatar_url} alt={l.display_name} width={32} height={32} className="object-cover w-8 h-8" /> : <div className="w-8 h-8 bg-gray-300" />}
                </div>
                <div>
                  <div className="text-sm font-medium">{l.display_name}</div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
