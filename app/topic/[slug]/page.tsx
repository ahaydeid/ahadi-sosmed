import { notFound } from "next/navigation";
import { getPublicPosts } from "@/lib/services/postService";
import { createClient } from "@/lib/supabase/server";
import Feed from "@/app/components/Feed";
import TopBar from "@/app/components/TopBar";
import type { Metadata } from "next";
import { Mountain, Plane, PenLine, UtensilsCrossed, Camera, MessageCircle, Palette, Laptop, LucideIcon } from "lucide-react";

interface TopicPageProps {
  params: Promise<{ slug: string }>;
}

// List of valid topics
const VALID_TOPICS = [
  "pendakian",
  "traveling",
  "opini",
  "kuliner",
  "fotografi",
  "refleksi",
  "seni",
  "teknologi",
];

// Topic metadata
const TOPIC_INFO: Record<string, { name: string; icon: LucideIcon; description: string }> = {
  pendakian: {
    name: "Pendakian",
    icon: Mountain,
    description: "Cerita dan tips pendakian gunung di Indonesia",
  },
  traveling: {
    name: "Traveling",
    icon: Plane,
    description: "Kisah perjalanan dan destinasi wisata menarik",
  },
  opini: {
    name: "Opini",
    icon: PenLine,
    description: "Opini dan pandangan tentang berbagai topik",
  },
  kuliner: {
    name: "Kuliner",
    icon: UtensilsCrossed,
    description: "Rekomendasi makanan dan tempat makan",
  },
  fotografi: {
    name: "Fotografi",
    icon: Camera,
    description: "Tips fotografi dan hasil karya fotografer",
  },
  refleksi: {
    name: "Refleksi",
    icon: MessageCircle,
    description: "Renungan dan refleksi kehidupan",
  },
  seni: {
    name: "Seni",
    icon: Palette,
    description: "Karya seni dan apresiasi seni",
  },
  teknologi: {
    name: "Teknologi",
    icon: Laptop,
    description: "Berita dan pembahasan teknologi",
  },
};

export async function generateMetadata({ params }: TopicPageProps): Promise<Metadata> {
  const { slug } = await params;
  const topic = TOPIC_INFO[slug];

  if (!topic) {
    return {
      title: "Topic Not Found | Ahadi",
    };
  }

  return {
    title: `${topic.name} | Ahadi`,
    description: topic.description,
  };
}

export default async function TopicPage({ params }: TopicPageProps) {
  const { slug } = await params;

  // Validate topic
  if (!VALID_TOPICS.includes(slug)) {
    notFound();
  }

  const topic = TOPIC_INFO[slug];

  // Get posts filtered by hashtag
  let posts: any[] = [];
  let totalPosts = 0;
  
  try {
    const supabase = await createClient();
    
    // First, get the hashtag ID
    const { data: hashtagData } = await supabase
      .from('hashtags')
      .select('id')
      .eq('name', slug)
      .maybeSingle();

    if (hashtagData) {
      // Get posts through junction table
      const { data: postHashtags, error } = await supabase
        .from('post_hashtags')
        .select(`
          post:post_id (
            id,
            created_at,
            user_id
          )
        `)
        .eq('hashtag_id', hashtagData.id)
        .order('created_at', { ascending: false });

      if (!error && postHashtags) {
        // Extract unique post IDs
        const postIds = postHashtags
          .map((ph: any) => ph.post?.id)
          .filter(Boolean);

        if (postIds.length > 0) {
          // Fetch full post data
          const { data: postsData } = await supabase
            .from('post')
            .select(`
              id,
              created_at,
              user_id,
              post_content (
                title,
                description,
                slug,
                author_image
              ),
              user_profile:user_id (
                id,
                display_name,
                avatar_url
              )
            `)
            .in('id', postIds)
            .order('created_at', { ascending: false });

          if (postsData) {
            // Get engagement metrics for each post
            posts = await Promise.all(
              postsData.map(async (post: any) => {
                const [likesData, commentsData, viewsData] = await Promise.all([
                  supabase
                    .from('post_likes')
                    .select('*', { count: 'exact', head: true })
                    .eq('post_id', post.id)
                    .eq('liked', true),
                  supabase
                    .from('comments')
                    .select('*', { count: 'exact', head: true })
                    .eq('post_id', post.id),
                  supabase
                    .from('post_views')
                    .select('views')
                    .eq('post_id', post.id)
                    .single(),
                ]);

                const content = post.post_content?.[0] || post.post_content;
                const profile = post.user_profile;

                return {
                  id: post.id,
                  title: content?.title || '',
                  description: content?.description || '',
                  slug: content?.slug || '',
                  author_image: content?.author_image,
                  author: {
                    id: profile?.id || '',
                    display_name: profile?.display_name || 'Unknown',
                    avatar_url: profile?.avatar_url || '',
                  },
                  created_at: post.created_at,
                  likes_count: likesData.count || 0,
                  comments_count: commentsData.count || 0,
                  views: viewsData.data?.views || 0,
                };
              })
            );
            
            totalPosts = posts.length;
          }
        }
      }
    }
  } catch (error) {
    console.error("Error loading posts:", error);
  }

  return (
    <div className="min-h-screen bg-gray-50/10">
      <TopBar />

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Topic Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <topic.icon className="w-10 h-10 text-sky-500" />
            <h1 className="text-3xl font-bold text-gray-900">{topic.name}</h1>
          </div>
          <p className="text-gray-600">{topic.description}</p>
          <p className="text-sm text-gray-500 mt-2">
            {posts.length} {posts.length === 1 ? "tulisan" : "tulisan"}
          </p>
        </div>

        {/* Posts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8">
            {posts.length > 0 ? (
              <Feed initialPosts={posts} />
            ) : (
              <div className="bg-white rounded-lg p-12 text-center">
                <topic.icon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h2 className="text-xl font-semibold text-gray-900 mb-2">
                  Belum ada tulisan
                </h2>
                <p className="text-gray-600">
                  Jadilah yang pertama menulis tentang {topic.name.toLowerCase()}!
                </p>
              </div>
            )}
          </div>

          {/* Sidebar - Other Topics */}
          <div className="lg:col-span-4">
            <div className="bg-white rounded-lg p-4 border border-gray-100">
              <h3 className="font-bold text-gray-900 mb-4">Topik Lainnya</h3>
              <div className="space-y-2">
                {VALID_TOPICS.filter((t) => t !== slug).map((topicSlug) => {
                  const otherTopic = TOPIC_INFO[topicSlug];
                  const OtherIcon = otherTopic.icon;
                  return (
                    <a
                      key={topicSlug}
                      href={`/topic/${topicSlug}`}
                      className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 transition"
                    >
                      <OtherIcon className="w-5 h-5 text-sky-500" />
                      <div className="flex-1">
                        <div className="font-medium text-gray-900 text-sm">
                          {otherTopic.name}
                        </div>
                        <div className="text-xs text-gray-500 line-clamp-1">
                          {otherTopic.description}
                        </div>
                      </div>
                    </a>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
