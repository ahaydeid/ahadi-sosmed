import { MetadataRoute } from "next";
import { admin } from "@/lib/supabase/admin";

export const revalidate = 0; // <= ini penting, biar tidak di-cache oleh Next.js

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = "https://ahadi.my.id";
  const supabase = admin;

  const { data: posts } = await supabase.from("post_content").select("slug, updated_at").order("updated_at", { ascending: false });

  return [
    { url: `${base}/`, lastModified: new Date() },
    { url: `${base}/kebijakan`, lastModified: new Date() },
    ...(posts?.map((p) => ({
      url: `${base}/post/${p.slug}`,
      lastModified: new Date(p.updated_at ?? new Date()),
    })) ?? []),
  ];
}
