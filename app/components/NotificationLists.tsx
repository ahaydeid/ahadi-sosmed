"use client";
import { useState } from "react";
import { User } from "lucide-react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { supabase } from "@/lib/supabase/client";
import { NotifSkeleton } from "./Skeleton";
import useSWRInfinite from "swr/infinite";

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
  ids?: string[];
  type: string | null;
  is_read: boolean | null;
  created_at: string | null;
  summary?: string | null;
  actors?: Actor[] | null;
  actor?: Actor | null;
  comment: CommentRef | null;
  post: PostRef | null;
  reference_post_id?: string | null;
  reference_comment_id?: string | null;
};

export default function NotificationLists() {
  const [marking, setMarking] = useState<Record<string, boolean>>({});
  const router = useRouter();

  const getKey = (pageIndex: number, previousPageData: any) => {
    if (previousPageData && !previousPageData.hasMore) return null;
    return `/api/notifications?page=${pageIndex + 1}`;
  };

  const fetcher = async (url: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token ?? null;
    if (!token) throw new Error("No token");

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
      credentials: "same-origin",
    });

    if (!res.ok) throw new Error("Fetch failed");
    return res.json();
  };

  const { data, size, setSize, isLoading, mutate } = useSWRInfinite(getKey, fetcher, {
    revalidateFirstPage: true,
    revalidateOnFocus: false,
  });

  const notificationsPages = data ? data.map(page => page.notifications) : [];
  const items: NotificationItem[] = notificationsPages.flat();
  const hasMore = data ? data[data.length - 1].hasMore : false;
  const loading = isLoading || (size > 0 && data && typeof data[size - 1] === "undefined");

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

  async function handleClick(n: NotificationItem) {
    if (marking[n.id]) return;
    setMarking((s) => ({ ...s, [n.id]: true }));

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;
      const userId = session.user.id;

      const isGrouped = n.summary && ["post_like", "post_comment", "comment_post"].includes(n.type ?? "");

      if (n.ids && n.ids.length > 1) {
        await supabase.from("notifications").update({ is_read: true }).in("id", n.ids);
      } else if (n.reference_post_id || n.reference_comment_id) {
        let q = supabase.from("notifications").update({ is_read: true }).eq("user_id", userId);
        if (n.reference_post_id) q = q.eq("reference_post_id", n.reference_post_id);
        if (n.reference_comment_id) q = q.eq("reference_comment_id", n.reference_comment_id);
        await q;
      } else {
        await supabase.from("notifications").update({ is_read: true }).eq("id", n.id);
      }

      mutate(
        data?.map(page => ({
          ...page,
          notifications: page.notifications.map((it: NotificationItem) => {
            const sameGroup = isGrouped && ((n.reference_post_id && it.reference_post_id === n.reference_post_id) || (n.reference_comment_id && it.reference_comment_id === n.reference_comment_id));
            return sameGroup || it.id === n.id ? { ...it, is_read: true } : it;
          })
        })),
        false
      );

      const t = n.type?.toLowerCase() ?? "";
      const mainActor = n.actors?.[0] ?? n.actor;

      if (t === "follow" && mainActor?.id) {
        router.push(`/profile/${mainActor.id}`);
        return;
      }

      if (["post_comment", "comment_post", "comment_reply", "mention"].includes(t)) {
        if (n.post?.slug) {
          const anchor = n.comment?.id ? `#comment-${n.comment.id}` : "";
          router.push(`/post/${n.post.slug}${anchor}`);
          return;
        }
        if (n.post?.id) {
          const anchor = n.comment?.id ? `#comment-${n.comment.id}` : "";
          router.push(`/post/${n.post.id}${anchor}`);
          return;
        }
      }

      if (["post_like"].includes(t)) {
        if (n.post?.slug) {
          router.push(`/post/${n.post.slug}`);
          return;
        }
        if (n.post?.id) {
          router.push(`/post/${n.post.id}`);
          return;
        }
      }

      router.push("/");
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
    setSize(size + 1);
  }

  const displayItems = [...items].sort((a, b) => new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime());

  return (
    <div suppressHydrationWarning className="w-full min-h-[50vh] bg-white relative">
      <div suppressHydrationWarning className="w-full overflow-hidden">
        {loading && items.length === 0 && (
          <div suppressHydrationWarning className="flex flex-col w-full">
            <NotifSkeleton />
            <NotifSkeleton />
            <NotifSkeleton />
            <NotifSkeleton />
            <NotifSkeleton />
          </div>
        )}

        {!loading && items.length === 0 && (
          <div suppressHydrationWarning className="flex flex-col items-center justify-center py-20 px-4 text-center">
            <div suppressHydrationWarning className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
              <User className="w-8 h-8 text-gray-300" />
            </div>
            <h3 suppressHydrationWarning className="text-lg font-medium text-gray-900">Belum ada Notifikasi</h3>
          </div>
        )}

        <div suppressHydrationWarning className="flex flex-col w-full">
          {displayItems.map((n) => (
            <div suppressHydrationWarning key={n.id} onClick={() => void handleClick(n)} className={`flex gap-4 items-start px-4 py-2 cursor-pointer border-b border-gray-50 ${n.is_read ? "bg-white" : "bg-sky-50/50"}`}>
              <div suppressHydrationWarning className="shrink-0 flex -space-x-7">
                {n.actors && n.actors.length > 0 ? (
                  [...new Map(n.actors.filter(Boolean).map((a) => [a.id, a])).values()]
                    .slice(0, 3)
                    .reverse()
                    .map((a, i) =>
                      a?.avatar_url ? (
                        <Image key={a.id ?? i} src={a.avatar_url} alt={a.display_name ?? "avatar"} width={48} height={48} className="object-cover w-12 h-12 rounded-full border border-white relative" style={{ zIndex: 10 + i }} />
                      ) : (
                        <div key={a.id ?? i} className="w-12 h-12 rounded-full bg-gray-200 border border-white flex items-center justify-center text-sm text-gray-600 relative" style={{ zIndex: 10 + i }}>
                          {a.display_name?.charAt(0) ?? "?"}
                        </div>
                      )
                    )
                ) : n.actor?.avatar_url ? (
                  <Image src={n.actor.avatar_url} alt={n.actor.display_name ?? "avatar"} width={64} height={64} className="object-cover rounded-full w-16 h-16 border border-gray-200" />
                ) : (
                  <div suppressHydrationWarning className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
                    <User suppressHydrationWarning className="w-7 h-7 text-gray-400" />
                  </div>
                )}
              </div>

              <div suppressHydrationWarning className="flex-1 min-w-0 py-1">
                <div
                  suppressHydrationWarning
                  className="text-[15px] leading-snug text-gray-900"
                  dangerouslySetInnerHTML={{
                    __html: n.summary ?? renderNotificationTitle(n),
                  }}
                />
                <div suppressHydrationWarning className="mt-1 text-xs text-gray-400 font-medium">{formatTime(n.created_at)}</div>
              </div>

              <div suppressHydrationWarning className="shrink-0 pt-2">
                <div suppressHydrationWarning className={`w-2 h-2 rounded-full ${n.is_read ? "bg-transparent" : "bg-sky-500"}`}></div>
              </div>
            </div>
          ))}
        </div>

        {items.length > 0 && (
          <div className="px-4 py-8 flex justify-center">
            {hasMore ? (
              <button 
                onClick={() => void loadMore()} 
                disabled={loading} 
                className="px-6 py-2 bg-white border border-gray-200 text-gray-600 text-sm font-medium rounded-full hover:bg-gray-50 transition-colors disabled:opacity-60 flex items-center gap-2 shadow-sm"
              >
                {loading && <div className="w-4 h-4 border-2 border-gray-200 border-t-gray-600 rounded-full animate-spin"></div>}
                {loading ? "Memuat..." : "Tampilkan lebih banyak"}
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <div className="h-[1px] w-8 bg-gray-100"></div>
                <div className="text-xs text-gray-400 font-medium tracking-wider">Tidak ada lagi notifikasi</div>
                <div className="h-[1px] w-8 bg-gray-100"></div>
              </div>
            )}
          </div>
        )}
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
