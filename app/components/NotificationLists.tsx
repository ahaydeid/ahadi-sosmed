"use client";
import { useEffect, useState } from "react";
import { User, MoreVertical } from "lucide-react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { supabase } from "@/lib/supabaseClient";

type Actor = {
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
  user_id?: string | null;
  actor_id?: string | null;
  type: string | null;
  reference_type: "post" | "comment" | "user" | null;
  reference_id: string | null;
  is_read: boolean | null;
  created_at: string | null;
  actor: Actor | null;
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
      // update read status
      const { error } = await supabase.from("notifications").update({ is_read: true }).eq("id", n.id);

      if (error) return;

      setItems((s) => s.map((it) => (it.id === n.id ? { ...it, is_read: true } : it)));

      const t = n.type?.toLowerCase() ?? "";
      const r = n.reference_type?.toLowerCase() ?? null;

      // =========== ARAH UNTUK FOLLOW ===========
      // jika notifikasi follow, buka profil orang yang follow (actor_id)
      if (t === "follow" || r === "user") {
        if (n.actor_id) {
          pushPath(`/profile/${n.actor_id}`);
          return;
        }
      }

      // =========== ARAH UNTUK KOMENTAR ===========
      if (["post_comment", "comment_post", "comment_reply", "mention"].includes(t) || r === "comment") {
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

      // =========== ARAH UNTUK LIKE POST ===========
      if (["post_like", "post_like_grouped"].includes(t) || r === "post") {
        if (n.post?.slug) {
          pushPath(`/post/${n.post.slug}`);
          return;
        }
        if (n.post?.id) {
          pushPath(`/post/${n.post.id}`);
          return;
        }
        if (n.reference_id) {
          pushPath(`/post/${n.reference_id}`);
          return;
        }
      }

      // fallback
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

  // gabung like
  function groupPostLikes(notifs: NotificationItem[]): NotificationItem[] {
    const grouped = new Map<string, NotificationItem[]>();

    for (const n of notifs) {
      const type = n.type?.toLowerCase() ?? "";
      if (type === "post_like" && n.reference_id) {
        if (!grouped.has(n.reference_id)) grouped.set(n.reference_id, []);
        grouped.get(n.reference_id)!.push(n);
      }
    }

    const merged: NotificationItem[] = [];
    for (const arr of grouped.values()) {
      const sorted = arr.sort((a, b) => new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime());
      const latestTwo = sorted.slice(0, 2).map((x) => x.actor?.display_name ?? "Seseorang");
      const total = new Set(sorted.map((x) => x.actor?.display_name)).size;
      const base = { ...sorted[0] };
      const postTitle = base.post?.title ?? "";

      const bold = (t: string) => `<b>${t}</b>`;
      let text = "";

      if (total === 1) text = `${bold(latestTwo[0])} menyukai tulisan anda yang berjudul “${postTitle}”`;
      else if (total === 2) text = `${bold(latestTwo[0])} dan ${bold(latestTwo[1])} menyukai tulisan anda yang berjudul “${postTitle}”`;
      else {
        const others = total - 2;
        text = `${bold(latestTwo[0])}, ${bold(latestTwo[1])} dan ${others} orang lainnya menyukai tulisan anda yang berjudul “${postTitle}”`;
      }

      merged.push({ ...base, type: "post_like_grouped", comment: { id: null, text } });
    }

    const others = notifs.filter((n) => (n.type?.toLowerCase() ?? "") !== "post_like");
    return [...merged, ...others];
  }

  // gabung komentar
  function groupPostComments(notifs: NotificationItem[]): NotificationItem[] {
    const grouped = new Map<string, NotificationItem[]>();

    for (const n of notifs) {
      const type = n.type?.toLowerCase() ?? "";
      if ((type === "post_comment" || type === "comment_post") && n.post?.id) {
        if (!grouped.has(n.post.id)) grouped.set(n.post.id, []);
        grouped.get(n.post.id)!.push(n);
      }
    }

    const merged: NotificationItem[] = [];
    for (const arr of grouped.values()) {
      const sorted = arr.sort((a, b) => new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime());
      const latestTwo = sorted.slice(0, 2).map((x) => x.actor?.display_name ?? "Seseorang");
      const total = new Set(sorted.map((x) => x.actor?.display_name)).size;
      const base = { ...sorted[0] };
      const postTitle = base.post?.title ?? "";

      const bold = (t: string) => `<b>${t}</b>`;
      let text = "";

      if (total === 1) text = `${bold(latestTwo[0])} mengomentari tulisan anda yang berjudul “${postTitle}”`;
      else if (total === 2) text = `${bold(latestTwo[0])} dan ${bold(latestTwo[1])} mengomentari tulisan anda yang berjudul “${postTitle}”`;
      else {
        const others = total - 2;
        text = `${bold(latestTwo[0])}, ${bold(latestTwo[1])} dan ${others} orang lainnya mengomentari tulisan anda yang berjudul “${postTitle}”`;
      }

      merged.push({ ...base, type: "comment_post_grouped", comment: { id: null, text } });
    }

    const others = notifs.filter((n) => !["post_comment", "comment_post"].includes(n.type?.toLowerCase() ?? ""));
    // gabungkan hasil group dengan notifikasi komentar asli yang punya comment.text
    return [...merged, ...others].map((n) => {
      if ((n.type === "post_comment" || n.type === "comment_post") && n.comment?.text) {
        return {
          ...n,
          comment: { id: n.comment.id, text: n.comment.text },
        };
      }
      return n;
    });
  }

  // urutkan semua hasil gabungan
  const displayItems = groupPostComments(groupPostLikes(items)).sort((a, b) => new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime());

  return (
    <div className="w-full min-h-screen bg-white">
      <div className="w-full overflow-hidden">
        {loading && items.length === 0 && <div className="py-6 px-4 text-sm text-gray-500">Memuat notifikasi...</div>}

        {displayItems.map((n) => (
          <div key={n.id} onClick={() => void handleClick(n)} className={`flex gap-4 items-start px-4 py-5 cursor-pointer ${n.is_read ? "bg-white" : "bg-sky-100"}`}>
            <div className="shrink-0">
              <div className="w-16 h-16 rounded-full bg-white border border-gray-300 flex items-center justify-center overflow-hidden">
                {n.actor?.avatar_url ? <Image src={n.actor.avatar_url} alt={n.actor.display_name ?? "avatar"} width={64} height={64} className="object-cover" /> : <User className="w-7 h-7 text-gray-600" />}
              </div>
            </div>

            <div className="flex-1 min-w-0">
              <div className="text-base leading-tight text-gray-900" dangerouslySetInnerHTML={{ __html: renderNotificationTitle(n) }} />
              <div className="mt-3 text-sm text-gray-400">{formatTime(n.created_at)}</div>
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

// renderer HTML biar bisa bold dua nama
function renderNotificationTitle(n: NotificationItem): string {
  const actorName = n.actor?.display_name ?? "Seseorang";

  const truncate = (text?: string | null) => {
    if (!text) return "";
    const parts = text.trim().split(/\s+/);
    return parts.length > 5 ? parts.slice(0, 5).join(" ") + "…" : parts.join(" ");
  };

  const postSnippet = truncate(n.post?.title);
  const commentSnippet = truncate(n.comment?.text);

  switch (n.type?.toLowerCase()) {
    case "post_like_grouped":
    case "comment_post_grouped":
      return n.comment?.text ?? "";

    case "post_like":
      return `<b>${actorName}</b> menyukai tulisan anda yang berjudul “${postSnippet}”`;

    case "post_comment":
    case "comment_post":
      return `<b>${actorName}</b> mengomentari tulisan anda yang berjudul “${postSnippet}”${commentSnippet ? ` dengan “${commentSnippet}”` : ""}`;

    case "mention":
      return `<b>${actorName}</b> menyebut anda dalam komentar${commentSnippet ? ` “${commentSnippet}”` : ""}`;

    case "follow":
      return `<b>${actorName}</b> mengikuti anda`;

    default:
      return `<b>${actorName}</b> melakukan sesuatu — buka notifikasi untuk detail`;
  }
}
