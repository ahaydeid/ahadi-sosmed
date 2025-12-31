"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import Image from "next/image";
import { ArrowLeft, Heart, BadgeCheck } from "lucide-react";
import ModalLikes from "@/app/components/ModalLikes";

interface RepliesModalProps {
  postId: string;
  rootCommentId: string;
  onClose: () => void;
}

interface Row {
  id: string;
  post_id: string | null;
  user_id: string | null;
  parent_comment_id: string | null;
  mention_user_id: string | null;
  text: string;
  created_at: string;
}

interface Profile {
  id: string;
  display_name: string;
  avatar_url: string | null;
  verified: boolean;
}

interface Item {
  id: string;
  createdAt: string;
  text: string;
  time: string;
  authorId: string | null;
  authorName: string;
  avatarUrl: string | null;
  parentId: string | null;
  level: number;
  mentionUserId: string | null;
  mentionName: string | null;
}

// helper bikin inisial nama
function getInitials(name: string): string {
  const p = name.trim().split(/\s+/);
  if (p.length === 0) return "U";
  if (p.length === 1) return p[0].slice(0, 1).toUpperCase();
  return (p[0].slice(0, 1) + p[p.length - 1].slice(0, 1)).toUpperCase();
}

// format waktu relatif sederhana
function formatRelativeTime(createdAt: string): string {
  const now = new Date();
  const created = new Date(createdAt);
  const diffMs = now.getTime() - created.getTime();
  const m = Math.floor(diffMs / 60000);
  const h = Math.floor(m / 60);
  const d = Math.floor(h / 24);
  const mo = Math.floor(d / 30);
  const y = Math.floor(d / 365);
  if (m < 1) return "Baru saja";
  if (m < 60) return `${m} menit`;
  if (h < 24) return `${h} jam`;
  if (d < 30) return `${d} hari`;
  if (mo < 12) return `${mo} bulan`;
  return `${y} tahun`;
}

// auto resize textarea kecil
const useAutosizeTextArea = (textareaRef: React.RefObject<HTMLTextAreaElement>, value: string) => {
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = textareaRef.current.scrollHeight + "px";
    }
  }, [textareaRef, value]);
};

export default function RepliesModal({ postId, rootCommentId, onClose }: RepliesModalProps) {
  const [items, setItems] = useState<Item[]>([]);
  const [profiles, setProfiles] = useState<Map<string, Profile>>(new Map());
  const [loading, setLoading] = useState(true);
  const [replyingTo, setReplyingTo] = useState<{ id: string; authorId: string | null; authorName: string; level: number } | null>(null);
  const [text, setText] = useState("");
  const [meId, setMeId] = useState<string | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null!);
  useAutosizeTextArea(textareaRef, text);

  const [rootLikes, setRootLikes] = useState<number>(0);
  const [showLikesForCommentId, setShowLikesForCommentId] = useState<string | null>(null);

  const fetchLevel = useCallback(
    async (parents: string[]): Promise<Row[]> => {
      if (parents.length === 0) return [];
      const res = await supabase
        .from("comments")
        .select("id, post_id, user_id, parent_comment_id, mention_user_id, text, created_at")
        .eq("post_id", postId)
        .in("parent_comment_id", parents)
        .order("created_at", { ascending: true })
        .order("id", { ascending: true });

      if (res.error) return [];
      return (res.data ?? []) as Row[];
    },
    [postId]
  );

  const buildThread = useCallback(async () => {
    setLoading(true);

    const rootRes = await supabase.from("comments").select("id, post_id, user_id, parent_comment_id, mention_user_id, text, created_at").eq("id", rootCommentId).single();

    if (rootRes.error || !rootRes.data) {
      setItems([]);
      setRootLikes(0);
      setLoading(false);
      return;
    }

    const rootRow = rootRes.data as Row;

    const levels: Row[][] = [];
    levels.push([rootRow]);

    let frontier = [rootRow.id];
    const maxDepth = 5;
    for (let depth = 1; depth <= maxDepth; depth++) {
      const rows = await fetchLevel(frontier);
      if (!rows || rows.length === 0) break;
      levels.push(rows);
      frontier = rows.map((r) => r.id);
    }

    const flatRows: Array<{ row: Row; level: number }> = [];
    levels.forEach((rows, idx) => {
      if (idx === 0) flatRows.push({ row: rows[0], level: 0 });
      else rows.forEach((r) => flatRows.push({ row: r, level: idx }));
    });

    const authorIds = flatRows.map((x) => x.row.user_id).filter(Boolean) as string[];
    const mentionIds = flatRows.map((x) => x.row.mention_user_id).filter(Boolean) as string[];
    const uniqIds = [...new Set([...authorIds, ...mentionIds])];

    const profMap = new Map(profiles);
    const idsToFetch = uniqIds.filter((id) => !profMap.has(id));
    if (idsToFetch.length > 0) {
      const profRes = await supabase.from("user_profile").select("id, display_name, avatar_url, verified").in("id", idsToFetch);

      if (!profRes.error && profRes.data) {
        (profRes.data as Profile[]).forEach((p) =>
          profMap.set(p.id, {
            id: p.id,
            display_name: p.display_name,
            avatar_url: p.avatar_url ?? null,
            verified: !!p.verified,
          })
        );
      }

      setProfiles(new Map(profMap));
    }

    const mapped: Item[] = flatRows.map(({ row, level }) => {
      const a = row.user_id ? profMap.get(row.user_id) : undefined;
      const m = row.mention_user_id ? profMap.get(row.mention_user_id) : undefined;
      return {
        id: row.id,
        createdAt: row.created_at,
        text: row.text,
        time: formatRelativeTime(row.created_at),
        authorId: row.user_id,
        authorName: a?.display_name ?? "Anonim",
        avatarUrl: a?.avatar_url ?? null,
        parentId: row.parent_comment_id,
        level,
        mentionUserId: row.mention_user_id,
        mentionName: m?.display_name ?? null,
      };
    });

    const root = mapped.find((i) => i.id === rootCommentId)!;
    const repliesSorted = mapped.filter((i) => i.id !== rootCommentId).sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    setItems([root, ...repliesSorted]);

    const likesRes = await supabase.from("comment_likes").select("*", { count: "exact", head: true }).eq("comment_id", rootCommentId);
    const cnt = (likesRes.count as number) ?? 0;
    setRootLikes(cnt);

    setLoading(false);
  }, [rootCommentId, fetchLevel, profiles]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!mounted) return;
      setMeId(data.user?.id ?? null);
    })();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    (async () => {
      await buildThread();
    })();
  }, [buildThread]);

  useEffect(() => {
    const onRefresh = (e: Event) => {
      const ev = e as CustomEvent<{ postId: string }>;
      if (ev.detail?.postId !== postId) return;
      void buildThread();
    };
    window.addEventListener("comments:refresh", onRefresh as EventListener);
    return () => window.removeEventListener("comments:refresh", onRefresh as EventListener);
  }, [postId, buildThread]);

  const rootItem = useMemo(() => items.find((i) => i.id === rootCommentId) ?? null, [items, rootCommentId]);
  const activeTarget = useMemo(() => (replyingTo ? replyingTo : rootItem ? { id: rootItem.id, authorId: rootItem.authorId, authorName: rootItem.authorName, level: 0 } : null), [replyingTo, rootItem]);

  useEffect(() => {
    if (!loading && rootItem && !replyingTo) requestAnimationFrame(() => textareaRef.current?.focus());
  }, [loading, rootItem, replyingTo]);

  const handleStartReply = (target: Item) => {
    setReplyingTo({ id: target.id, authorId: target.authorId, authorName: target.authorName, level: target.level });
    setText("");
    requestAnimationFrame(() => textareaRef.current?.focus());
  };

  const handleSubmit = async () => {
    if (!meId || !activeTarget) return;
    const payloadText = text.trim();
    if (!payloadText) return;

    const mention_user_id = activeTarget.level > 0 ? activeTarget.authorId : null;

    const insertRes = await supabase
      .from("comments")
      .insert({
        post_id: postId,
        user_id: meId,
        parent_comment_id: activeTarget.id,
        mention_user_id,
        text: payloadText,
      })
      .select("id, created_at, user_id, parent_comment_id, mention_user_id")
      .single();

    if (insertRes.error || !insertRes.data) return;

    const profMap = new Map(profiles);
    if (meId && !profMap.has(meId)) {
      const meProf = await supabase.from("user_profile").select("id, display_name, avatar_url, verified").eq("id", meId).maybeSingle();
      if (!meProf.error && meProf.data) {
        profMap.set(meProf.data.id, {
          id: meProf.data.id,
          display_name: meProf.data.display_name,
          avatar_url: meProf.data.avatar_url ?? null,
          verified: !!meProf.data.verified,
        });
        setProfiles(new Map(profMap));
      }
    }

    const a = meId ? profMap.get(meId) : undefined;
    const m = insertRes.data.mention_user_id ? profMap.get(insertRes.data.mention_user_id) : undefined;

    const newItem: Item = {
      id: insertRes.data.id,
      createdAt: insertRes.data.created_at,
      text: payloadText,
      time: formatRelativeTime(insertRes.data.created_at),
      authorId: meId,
      authorName: a?.display_name ?? "Saya",
      avatarUrl: a?.avatar_url ?? null,
      parentId: activeTarget.id,
      level: activeTarget.level + 1,
      mentionUserId: insertRes.data.mention_user_id,
      mentionName: m?.display_name ?? null,
    };

    setItems((prev) => {
      const root = prev.find((i) => i.id === rootCommentId);
      const rest = [...prev.filter((i) => i.id !== rootCommentId), newItem].sort((x, y) => new Date(x.createdAt).getTime() - new Date(y.createdAt).getTime());
      return root ? [root, ...rest] : rest;
    });

    setText("");

    void (async () => {
      const parentRowRes = await supabase.from("comments").select("id, user_id").eq("id", activeTarget.id).single();
      const parentRow = parentRowRes.data as { id: string; user_id: string } | null;

      const notifRows: Array<{ user_id: string | null; actor_id: string | null; type: string; reference_id: string | null }> = [];

      if (parentRow?.user_id && parentRow.user_id !== meId) {
        notifRows.push({
          user_id: parentRow.user_id,
          actor_id: meId,
          type: "comment_reply",
          reference_id: postId,
        });
      }

      if (insertRes.data.mention_user_id && insertRes.data.mention_user_id !== meId && insertRes.data.mention_user_id !== parentRow?.user_id) {
        notifRows.push({
          user_id: insertRes.data.mention_user_id,
          actor_id: meId,
          type: "comment_mention",
          reference_id: postId,
        });
      }

      if (notifRows.length > 0) {
        await supabase.from("notifications").insert(
          notifRows.map((n) => ({
            user_id: n.user_id,
            actor_id: n.actor_id,
            type: n.type,
            reference_id: n.reference_id,
          }))
        );
      }
    })();
  };

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="absolute inset-0 bg-white flex flex-col">
        <div className="pt-4 pb-3 px-4">
          <div className="flex items-center justify-between">
            <button className="text-gray-700 text-lg" onClick={onClose}>
              <ArrowLeft />
            </button>
            <div className="text-gray-800 font-semibold text-lg">Balasan</div>
            <div className="w-16" />
          </div>
          <div className="mt-3 h-px bg-gray-200" />
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-8">
          {loading ? (
            <div className="text-sm text-gray-500">Memuat balasan...</div>
          ) : (
            <div className="space-y-4">
              {items.map((it) => (
                <ReplyItem key={it.id} item={it} profiles={profiles} onReply={() => handleStartReply(it)} onShowLikes={() => setShowLikesForCommentId(it.id)} likes={it.id === rootCommentId ? rootLikes : undefined} />
              ))}
            </div>
          )}
        </div>

        <div className="border-t border-gray-200 pb-16 p-3">
          <div className="flex items-end gap-2">
            <textarea
              ref={textareaRef}
              className="flex-1 border border-gray-300 rounded-sm p-2 text-sm outline-none resize-none min-h-8 max-h-[150px]"
              placeholder={activeTarget ? (activeTarget.level === 0 ? "Balas komentar..." : `Balas ${activeTarget.authorName}...`) : "Tulis balasan..."}
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
            <button onClick={handleSubmit} className="shrink-0 px-4 py-2 rounded-sm bg-sky-600 text-white text-sm disabled:opacity-50" disabled={!meId || !text.trim() || !activeTarget}>
              Kirim
            </button>
          </div>
          {!meId && <div className="text-xs text-gray-500 mt-2">Login untuk membalas</div>}
        </div>
      </div>

      <ModalLikes commentId={showLikesForCommentId ?? undefined} open={!!showLikesForCommentId} onClose={() => setShowLikesForCommentId(null)} />
    </div>
  );
}

function ReplyItem({ item, profiles, onReply, onShowLikes, likes }: { item: Item; profiles: Map<string, Profile>; onReply: () => void; onShowLikes: () => void; likes?: number }) {
  const pad = item.level > 0 ? 40 : 0;
  const isRoot = item.level === 0;

  return (
    <div className="flex items-start gap-3" style={{ paddingLeft: pad }}>
      {item.avatarUrl ? (
        <Image src={item.avatarUrl} alt={item.authorName} width={36} height={36} className="w-9 h-9 rounded-full object-cover" />
      ) : (
        <div className="w-9 h-9 rounded-full bg-gray-300 flex items-center justify-center text-white text-sm">{getInitials(item.authorName)}</div>
      )}

      <div className="flex-1">
        <div className="bg-gray-100 rounded-xl p-3">
          <div className="flex items-center gap-1 font-semibold text-sm text-gray-900">
            <span>{item.authorName}</span>
            {profiles.get(item.authorId!)?.verified && <BadgeCheck className="w-4 h-4 text-sky-600" />}
          </div>
          <div className="mt-1 text-gray-700 text-sm leading-relaxed">
            {isRoot ? (
              <span>{item.text}</span>
            ) : (
              <span>
                {item.mentionName && <span className="text-sky-600 font-semibold">@{item.mentionName}</span>} {item.text}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-6 text-gray-600 text-sm mt-2 pl-1">
          <div>{item.time}</div>
          <button className="hover:underline" onClick={onReply}>
            Balas
          </button>

          {isRoot && (
            <button type="button" onClick={onShowLikes} className="flex hover:text-sky-400 cursor-pointer items-center gap-1" aria-label="Lihat yang menyukai komentar">
              <Heart className="w-4 h-4 text-gray-700 hover:text-sky-400 cursor-pointer" />
              <span>{likes ?? 0}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
