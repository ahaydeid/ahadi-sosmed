import { MetadataRoute } from "next";
import { supabaseServer } from "@/lib/supabaseServer";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = supabaseServer();
  const { data: posts } = await supabase.from("post_content").select("slug, updated_at").order("updated_at", { ascending: false });

  const base = "https://ahadi.my.id";

  return [
    { url: `${base}/`, lastModified: new Date() },
    { url: `${base}/kebijakan`, lastModified: new Date() },
    ...(posts?.map((p) => ({
      url: `${base}/post/${p.slug}`,
      lastModified: new Date(p.updated_at),
    })) ?? []),
  ];
}
