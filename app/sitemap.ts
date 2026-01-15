import { MetadataRoute } from 'next'
import { admin } from '@/lib/supabase/admin'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://ahadi.my.id";

  // Fetch all public posts for the sitemap with error handling
  let postEntries: MetadataRoute.Sitemap = [];
  
  try {
    const { data: posts, error } = await admin
      .from('post_content')
      .select('slug, post!post_content_post_id_fkey(created_at)')
      .order('post_id', { ascending: false });

    if (error) {
      console.error('Sitemap: Error fetching posts:', error);
    } else if (posts) {
      postEntries = posts.map((p: any) => {
        const postData = p.post as unknown as { created_at: string };
        return {
          url: `${baseUrl}/post/${p.slug}`,
          lastModified: new Date(postData.created_at),
          changeFrequency: 'weekly' as const,
          priority: 0.7,
        };
      });
    }
  } catch (error) {
    console.error('Sitemap: Exception fetching posts:', error);
    // Continue with empty postEntries if database fails
  }

  return [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 1,
    },
    {
      url: `${baseUrl}/marah-marah`,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 0.8,
    },
    {
      url: `${baseUrl}/kebijakan/layanan`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.3,
    },
    {
      url: `${baseUrl}/kebijakan/privasi`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.3,
    },
    ...postEntries,
  ]
}
