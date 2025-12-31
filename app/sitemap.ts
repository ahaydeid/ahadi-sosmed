import { MetadataRoute } from 'next'
import { admin } from '@/lib/supabase/admin'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://ahadi.my.id";

  // Fetch all public posts for the sitemap
  const { data: posts } = await admin
    .from('post_content')
    .select('slug, post:post_id(created_at)')
    .order('post_id', { ascending: false });

  const postEntries: MetadataRoute.Sitemap = (posts || []).map((p) => {
    // Handling nested post data from the join
    const postData = p.post as unknown as { created_at: string };
    return {
      url: `${baseUrl}/post/${p.slug}`,
      lastModified: new Date(postData.created_at),
      changeFrequency: 'weekly',
      priority: 0.7,
    };
  });

  return [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${baseUrl}/marah-marah`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.8,
    },
    ...postEntries,
  ]
}
