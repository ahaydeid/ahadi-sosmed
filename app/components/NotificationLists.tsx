"use client";
import { useEffect, useState } from "react";
import { User, MoreVertical } from "lucide-react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { supabase } from "@/lib/supabaseClient";

type Actor = {
  id?: string | null;
  display_name: string | null;
  avatar_url: string | null;
};

type CommentRef = {
  id: string | null;
  text: string | null;
};

type PostRef = {
  id: string | null;
  title: string | null;
  slug: string | null;
};

export type NotificationItem = {
  id: string;
  type: string | null;
  is_read: boolean | null;
  created_at: string | null;
  summary?: string | null; // ditambahkan untuk format grouped
  actors?: Actor[] | null; // ditambahkan untuk avatar bertumpuk
  actor?: Actor | null; // tetap ada untuk kompatibilitas lama
  comment: CommentRef | null;
  post: PostRef | null;
};

export default function NotificationLists() {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [page, setPage] = useState<number>(1);
  const [hasMore, setHasMore] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [marking, setMarking] = useState<Record<string, boolean>>({});
  const router = useRouter();

  function formatTime(dateStr: string | null | undefined): string {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    if (diffMs < 60000) return "Baru";
    const dayStart = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
    const dayDiff = Math.floor((dayStart(now) - dayStart(d)) / 86400000);
    if (dayDiff === 0) return d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
    if (dayDiff === 1) return "Kemarin";
    return d.toLocaleDateString("id-ID", { day: "2-digit", month: "2-digit", year: "2-digit" });
  }

  function pushPath(path: string) {
    router.push(path as unknown as Parameters<typeof router.push>[0]);
  }

  async function fetchNotifications(p = 1) {
    setLoading(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token ?? null;
      if (!token) {
        setItems([]);
        setLoading(false);
        return;
      }

      const res = await fetch(`/api/notifications?page=${p}`, {
        headers: { Authorization: `Bearer ${token}` },
        credentials: "same-origin",
      });

      if (!res.ok) {
        setItems([]);
        setLoading(false);
        return;
      }

      const { notifications, hasMore }: { notifications: NotificationItem[]; hasMore: boolean } = await res.json();

      if (p === 1) setItems(notifications);
      else setItems((prev) => [...prev, ...notifications]);

      setHasMore(hasMore);
      setPage(p);
    } catch (err) {
      console.error("fetchNotifications failed", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void fetchNotifications(1);
  }, []);

  async function handleClick(n: NotificationItem) {
    if (marking[n.id]) return;
    setMarking((s) => ({ ...s, [n.id]: true }));

    try {
      const { error } = await supabase.from("notifications").update({ is_read: true }).eq("id", n.id);
      if (error) return;

      setItems((s) => s.map((it) => (it.id === n.id ? { ...it, is_read: true } : it)));

      const t = n.type?.toLowerCase() ?? "";

      // === FOLLOW → ke profil actor pertama
      const mainActor = n.actors?.[0] ?? n.actor;
      if (t === "follow" && mainActor?.id) {
        pushPath(`/profile/${mainActor.id}`);
        return;
      }

      // === KOMENTAR → ke post + anchor komentar
      if (["post_comment", "comment_post", "comment_reply", "mention"].includes(t)) {
        if (n.post?.slug) {
          const anchor = n.comment?.id ? `#comment-${n.comment.id}` : "";
          pushPath(`/post/${n.post.slug}${anchor}`);
          return;
        }
        if (n.post?.id) {
          const anchor = n.comment?.id ? `#comment-${n.comment.id}` : "";
          pushPath(`/post/${n.post.id}${anchor}`);
          return;
        }
      }

      // === LIKE → ke post
      if (["post_like", "post_like_grouped"].includes(t)) {
        if (n.post?.slug) {
          pushPath(`/post/${n.post.slug}`);
          return;
        }
        if (n.post?.id) {
          pushPath(`/post/${n.post.id}`);
          return;
        }
      }

      pushPath("/");
    } catch (err) {
      console.error("handleClick failed:", err);
    } finally {
      setMarking((s) => {
        const c = { ...s };
        delete c[n.id];
        return c;
      });
    }
  }

  async function loadMore() {
    if (!hasMore || loading) return;
    await fetchNotifications(page + 1);
  }

  const displayItems = items.sort((a, b) => new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime());

  return (
    <div className="w-full min-h-screen bg-white">
      <div className="w-full overflow-hidden">
        {loading && items.length === 0 && <div className="py-6 px-4 text-sm text-gray-500">Memuat notifikasi...</div>}

        {displayItems.map((n) => (
          <div key={n.id} onClick={() => void handleClick(n)} className={`flex gap-4 items-start px-4 py-2 cursor-pointer ${n.is_read ? "bg-white" : "bg-sky-100"}`}>
            <div className="shrink-0 flex -space-x-7">
              {/* tampilkan avatar bertumpuk jika grouped */}
              {n.actors && n.actors.length > 0 ? (
                [...n.actors]
                  .slice(0, 3)
                  .reverse() // urutan dibalik, terbaru paling depan
                  .map((a, i) =>
                    a?.avatar_url ? (
                      <Image key={i} src={a.avatar_url} alt={a.display_name ?? "avatar"} width={48} height={48} className={`object-cover w-12 h-12 rounded-full border border-white relative z-[${10 + i}]`} />
                    ) : (
                      <div key={i} className={`w-12 h-12 rounded-full bg-gray-200 border border-white flex items-center justify-center text-sm text-gray-600 relative z-[${10 + i}]`}>
                        {a.display_name?.charAt(0) ?? "?"}
                      </div>
                    )
                  )
              ) : n.actor?.avatar_url ? (
                <Image src={n.actor.avatar_url} alt={n.actor.display_name ?? "avatar"} width={64} height={64} className="object-cover rounded-full w-16 h-16 border border-gray-200" />
              ) : (
                <User className="w-7 h-7 text-gray-600" />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div
                className="text-base leading-tight text-gray-900"
                dangerouslySetInnerHTML={{
                  __html: n.summary ?? renderNotificationTitle(n),
                }}
              />
              <div className="mt-1 text-sm text-gray-400">{formatTime(n.created_at)}</div>
            </div>

            <div className="shrink-0 ml-3">
              <MoreVertical className="w-6 h-6 text-sky-500" />
            </div>
          </div>
        ))}

        <div className="px-4 py-6 flex justify-center">
          {hasMore ? (
            <button onClick={() => void loadMore()} disabled={loading} className="px-4 py-2 bg-sky-600 text-white rounded disabled:opacity-60">
              {loading ? "Memuat..." : "Load more"}
            </button>
          ) : (
            <div className="text-sm text-gray-400">Tidak ada lagi notifikasi</div>
          )}
        </div>
      </div>
    </div>
  );
}

function renderNotificationTitle(n: NotificationItem): string {
  const actorName = n.actor?.display_name ?? "Seseorang";
  const postTitle = n.post?.title ?? "";
  const commentText = n.comment?.text ?? "";

  switch (n.type?.toLowerCase()) {
    case "post_like":
      return `<b>${actorName}</b> menyukai tulisan anda “${postTitle}”`;
    case "post_comment":
    case "comment_post":
      return `<b>${actorName}</b> mengomentari “${postTitle}”${commentText ? ` dengan “${commentText}”` : ""}`;
    case "mention":
      return `<b>${actorName}</b> menyebut anda dalam komentar${commentText ? ` “${commentText}”` : ""}`;
    case "follow":
      return `<b>${actorName}</b> mengikuti anda`;
    default:
      return `<b>${actorName}</b> melakukan sesuatu — buka notifikasi untuk detail`;
  }
}
