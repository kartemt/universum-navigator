import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Header } from '@/components/Header';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { ScrollToTop } from '@/components/ScrollToTop';

interface Post {
  id: string;
  title: string;
  hashtags: string[];
  telegram_url: string;
}

const HashtagGroups = () => {
  const { data: posts = [], isLoading } = useQuery({
    queryKey: ['hashtag-groups'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('posts')
        .select('id, title, hashtags, telegram_url, published_at')
        .order('published_at', { ascending: false });
      if (error) throw error;
      return data as Post[];
    },
  });

  const hashtagMap = React.useMemo(() => {
    const map: Record<string, Post[]> = {};
    posts.forEach((post) => {
      post.hashtags.forEach((tag) => {
        const key = tag.trim();
        if (!map[key]) map[key] = [];
        map[key].push(post);
      });
    });
    return map;
  }, [posts]);

  const sortedHashtags = React.useMemo(
    () => Object.keys(hashtagMap).sort((a, b) => a.localeCompare(b)),
    [hashtagMap]
  );

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <Header />
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">Хештеги</h1>
        {sortedHashtags.length === 0 ? (
          <p className="text-gray-500">Хештеги не найдены</p>
        ) : (
          <div className="space-y-8">
            {sortedHashtags.map((tag) => (
              <div key={tag} className="bg-white shadow rounded-lg p-4">
                <h2 className="text-xl font-semibold mb-2">
                  #{tag}{' '}
                  <span className="text-sm text-gray-500">({hashtagMap[tag].length})</span>
                </h2>
                <ul className="list-disc pl-5 space-y-1">
                  {hashtagMap[tag].map((post) => (
                    <li key={post.id}>
                      <a
                        href={post.telegram_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        {post.title}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>
      <ScrollToTop />
    </div>
  );
};

export default HashtagGroups;
