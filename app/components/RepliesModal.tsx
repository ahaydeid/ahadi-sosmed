"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import Image from "next/image";
import { ArrowLeft } from "lucide-react";

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
}

interface Item {
  id: string;
  createdAt: string; // <-- simpan timestamp mentah untuk sorting
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

/* util kecil */
function getInitials(name: string): string {
  const p = name.trim().split(/\s+/);
  if (p.length === 0) return "U";
  if (p.length === 1) return p[0].slice(0, 1).toUpperCase();
  return (p[0].slice(0, 1) + p[p.length - 1].slice(0, 1)).toUpperCase();
}

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

/* auto-resize textarea */
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

  // ambil anak dari daftar parent ids (order di sini tidak krusial karena kita sort manual)
  const fetchLevel = useCallback(
    async (parents: string[]): Promise<Row[]> => {
      if (parents.length === 0) return [];
      const { data, error } = await supabase
        .from("comments")
        .select("id, post_id, user_id, parent_comment_id, mention_user_id, text, created_at")
        .eq("post_id", postId)
        .in("parent_comment_id", parents)
        .order("created_at", { ascending: true }) // bisa apa saja, nanti disort ulang
        .order("id", { ascending: true });
      if (error) return [];
      return data ?? [];
    },
    [postId]
  );

  // bangun thread, lalu URUTKAN: root tetap paling atas, sisanya sort by createdAt ascending
  const buildThread = useCallback(async () => {
    setLoading(true);

    const { data: rootRow, error: rootErr } = await supabase.from("comments").select("id, post_id, user_id, parent_comment_id, mention_user_id, text, created_at").eq("id", rootCommentId).single();

    if (rootErr || !rootRow) {
      setItems([]);
      setLoading(false);
      return;
    }

    const levels: Row[][] = [];
    levels.push([rootRow]);

    let frontier = [rootRow.id];
    const maxDepth = 5;
    for (let depth = 1; depth <= maxDepth; depth++) {
      const rows = await fetchLevel(frontier);
      if (rows.length === 0) break;
      levels.push(rows);
      frontier = rows.map((r) => r.id);
    }

    const flatRows: Array<{ row: Row; level: number }> = [];
    levels.forEach((rows, idx) => {
      if (idx === 0) flatRows.push({ row: rows[0], level: 0 });
      else rows.forEach((r) => flatRows.push({ row: r, level: idx }));
    });

    // siapkan profil
    const authorIds = flatRows.map((x) => x.row.user_id).filter(Boolean) as string[];
    const mentionIds = flatRows.map((x) => x.row.mention_user_id).filter(Boolean) as string[];
    const uniqIds = [...new Set([...authorIds, ...mentionIds])];

    const profMap = new Map(profiles);
    const idsToFetch = uniqIds.filter((id) => !profMap.has(id));
    if (idsToFetch.length > 0) {
      const { data: profs } = await supabase.from("user_profile").select("id, display_name, avatar_url").in("id", idsToFetch);
      (profs ?? []).forEach((p) => profMap.set(p.id, { id: p.id, display_name: p.display_name, avatar_url: p.avatar_url ?? null }));
      setProfiles(profMap);
    }

    const mapped: Item[] = flatRows.map(({ row, level }) => {
      const a = row.user_id ? profMap.get(row.user_id) : undefined;
      const m = row.mention_user_id ? profMap.get(row.mention_user_id) : undefined;
      return {
        id: row.id,
        createdAt: row.created_at, // <-- simpan untuk sorting
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

    // KEEP root first, then sort the rest by createdAt ASC
    const root = mapped.find((i) => i.id === rootCommentId)!;
    const repliesSorted = mapped.filter((i) => i.id !== rootCommentId).sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    setItems([root, ...repliesSorted]);
    setLoading(false);
  }, [rootCommentId, fetchLevel, profiles]);

  // auth
  useEffect(() => {
    const t = setTimeout(() => {
      supabase.auth.getUser().then(({ data }) => setMeId(data.user?.id ?? null));
    }, 0);
    return () => clearTimeout(t);
  }, []);

  // initial load
  useEffect(() => {
    const t = setTimeout(() => {
      void buildThread();
    }, 0);
    return () => clearTimeout(t);
  }, [buildThread]);

  const rootItem = useMemo(() => items.find((i) => i.id === rootCommentId) ?? null, [items, rootCommentId]);
  const activeTarget = useMemo(() => (replyingTo ? replyingTo : rootItem ? { id: rootItem.id, authorId: rootItem.authorId, authorName: rootItem.authorName, level: 0 } : null), [replyingTo, rootItem]);

  useEffect(() => {
    if (!loading && rootItem && !replyingTo) requestAnimationFrame(() => textareaRef.current?.focus());
  }, [loading, rootItem, replyingTo]);

  // realtime insert → push lalu SORT ULANG by createdAt
  useEffect(() => {
    const chan = supabase
      .channel(`replies-modal-${postId}-${rootCommentId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "comments" }, async (payload) => {
        const row = payload.new as Row;
        if (row.post_id !== postId) return;

        const known = new Set(items.map((i) => i.id));
        known.add(rootCommentId);
        if (!row.parent_comment_id || !known.has(row.parent_comment_id)) return;

        const needIds: string[] = [];
        if (row.user_id && !profiles.has(row.user_id)) needIds.push(row.user_id);
        if (row.mention_user_id && !profiles.has(row.mention_user_id)) needIds.push(row.mention_user_id);

        const profMap = new Map(profiles);
        if (needIds.length > 0) {
          const { data: profs } = await supabase.from("user_profile").select("id, display_name, avatar_url").in("id", needIds);
          (profs ?? []).forEach((p) => profMap.set(p.id, { id: p.id, display_name: p.display_name, avatar_url: p.avatar_url ?? null }));
          setProfiles(profMap);
        }

        const a = row.user_id ? profMap.get(row.user_id) : undefined;
        const m = row.mention_user_id ? profMap.get(row.mention_user_id) : undefined;

        const newItem: Item = {
          id: row.id,
          createdAt: row.created_at,
          text: row.text,
          time: formatRelativeTime(row.created_at),
          authorId: row.user_id,
          authorName: a?.display_name ?? "Anonim",
          avatarUrl: a?.avatar_url ?? null,
          parentId: row.parent_comment_id,
          level: (items.find((i) => i.id === row.parent_comment_id)?.level ?? 0) + 1,
          mentionUserId: row.mention_user_id,
          mentionName: m?.display_name ?? null,
        };

        setItems((prev) => {
          if (prev.some((p) => p.id === newItem.id)) return prev;
          const root = prev.find((i) => i.id === rootCommentId);
          const rest = [...prev.filter((i) => i.id !== rootCommentId), newItem].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
          return root ? [root, ...rest] : rest;
        });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(chan);
    };
  }, [postId, rootCommentId, items, profiles]);

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

    const { data: insertRes, error: insertErr } = await supabase
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

    if (insertErr || !insertRes) return;

    const profMap = new Map(profiles);
    if (meId && !profMap.has(meId)) {
      const { data: meProf } = await supabase.from("user_profile").select("id, display_name, avatar_url").eq("id", meId).maybeSingle();
      if (meProf) {
        profMap.set(meProf.id, { id: meProf.id, display_name: meProf.display_name, avatar_url: meProf.avatar_url ?? null });
        setProfiles(profMap);
      }
    }

    const a = meId ? profMap.get(meId) : undefined;
    const m = insertRes.mention_user_id ? profMap.get(insertRes.mention_user_id) : undefined;

    const newItem: Item = {
      id: insertRes.id,
      createdAt: insertRes.created_at,
      text: payloadText,
      time: formatRelativeTime(insertRes.created_at),
      authorId: meId,
      authorName: a?.display_name ?? "Saya",
      avatarUrl: a?.avatar_url ?? null,
      parentId: activeTarget.id,
      level: activeTarget.level + 1,
      mentionUserId: insertRes.mention_user_id,
      mentionName: m?.display_name ?? null,
    };

    // tambah lalu sort by createdAt ASC (root tetap pertama)
    setItems((prev) => {
      const root = prev.find((i) => i.id === rootCommentId);
      const rest = [...prev.filter((i) => i.id !== rootCommentId), newItem].sort((x, y) => new Date(x.createdAt).getTime() - new Date(y.createdAt).getTime());
      return root ? [root, ...rest] : rest;
    });

    setText("");

    await createNotificationsAfterReply({
      actorId: meId,
      parentCommentId: activeTarget.id,
      mentionUserId: insertRes.mention_user_id,
    });
  };

  const createNotificationsAfterReply = async ({ actorId, parentCommentId, mentionUserId }: { actorId: string; parentCommentId: string; mentionUserId: string | null }) => {
    const { data: parentRow } = await supabase.from("comments").select("id, user_id").eq("id", parentCommentId).single();

    const notifRows: Array<{ user_id: string | null; actor_id: string | null; type: string; reference_id: string | null }> = [];

    if (parentRow?.user_id && parentRow.user_id !== actorId) {
      notifRows.push({
        user_id: parentRow.user_id,
        actor_id: actorId,
        type: "comment_reply",
        reference_id: postId,
      });
    }

    if (mentionUserId && mentionUserId !== actorId && mentionUserId !== parentRow?.user_id) {
      notifRows.push({
        user_id: mentionUserId,
        actor_id: actorId,
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
            <div className="space-y-6">
              {items.map((it) => (
                <ReplyItem key={it.id} item={it} onReply={() => handleStartReply(it)} />
              ))}
            </div>
          )}
        </div>

        <div className="border-t border-gray-200 p-3 mb-12">
          <div className="flex items-end gap-2">
            <textarea
              ref={textareaRef}
              className="flex-1 border border-gray-300 rounded-sm p-2 text-sm outline-none resize-none min-h-8 max-h-[150px]"
              placeholder={activeTarget ? (activeTarget.level === 0 ? "Balas komentar utama..." : `Balas ${activeTarget.authorName}...`) : "Tulis balasan..."}
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
    </div>
  );
}

function ReplyItem({ item, onReply }: { item: Item; onReply: () => void }) {
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
        <div className="bg-gray-100 rounded-xl p-4">
          <div className="font-semibold text-gray-900">{item.authorName}</div>
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

        <div className="flex items-center gap-6 text-gray-600 text-sm mt-3 pl-1">
          <div>{item.time}</div>
          <button className="hover:underline" onClick={onReply}>
            Balas
          </button>
        </div>
      </div>
    </div>
  );
}
