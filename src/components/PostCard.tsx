
import React from 'react';
import { Calendar, ExternalLink, Hash } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface PostCardProps {
  post: {
    id: string;
    title: string;
    content: string;
    hashtags: string[];
    telegram_url: string;
    published_at: string;
    post_sections: Array<{
      sections: {
        id: string;
        name: string;
      };
    }>;
    post_material_types: Array<{
      material_types: {
        id: string;
        name: string;
      };
    }>;
  };
}

export const PostCard: React.FC<PostCardProps> = ({ post }) => {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const truncateContent = (content: string, maxLength: number = 300) => {
    if (content.length <= maxLength) return content;
    return content.slice(0, maxLength) + '...';
  };

  return (
    <Card className="hover:shadow-lg transition-shadow duration-200">
      <CardHeader>
        <div className="flex items-start justify-between">
          <CardTitle className="text-xl text-gray-900 leading-tight">
            {post.title}
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            className="ml-4 flex-shrink-0"
            onClick={() => window.open(post.telegram_url, '_blank')}
          >
            <ExternalLink className="h-4 w-4 mr-1" />
            Telegram
          </Button>
        </div>
        
        <div className="flex items-center text-sm text-gray-500 mt-2">
          <Calendar className="h-4 w-4 mr-1" />
          {formatDate(post.published_at)}
        </div>
      </CardHeader>

      <CardContent>
        <p className="text-gray-700 mb-4 leading-relaxed">
          {truncateContent(post.content)}
        </p>

        <div className="space-y-3">
          {post.post_sections.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-2">Разделы:</h4>
              <div className="flex flex-wrap gap-2">
                {post.post_sections.map((ps) => (
                  <Badge key={ps.sections.id} variant="secondary" className="bg-blue-100 text-blue-800">
                    {ps.sections.name}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {post.post_material_types.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-2">Тип материала:</h4>
              <div className="flex flex-wrap gap-2">
                {post.post_material_types.map((pmt) => (
                  <Badge key={pmt.material_types.id} variant="outline" className="border-green-200 text-green-800">
                    {pmt.material_types.name}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {post.hashtags.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-2">Хештеги:</h4>
              <div className="flex flex-wrap gap-1">
                {post.hashtags.map((hashtag, index) => (
                  <span key={index} className="inline-flex items-center text-xs text-gray-500">
                    <Hash className="h-3 w-3 mr-0.5" />
                    {hashtag}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
