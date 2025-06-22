
import React from 'react';
import { ExternalLink, Calendar, Hash } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ContentSanitizer } from '@/utils/sanitization';

interface Post {
  id: string;
  title: string;
  content: string;
  hashtags: string[];
  telegram_url: string;
  published_at: string;
  post_sections?: Array<{
    sections: {
      id: string;
      name: string;
    };
  }>;
  post_material_types?: Array<{
    material_types: {
      id: string;
      name: string;
    };
  }>;
}

interface SafePostCardProps {
  post: Post;
}

export const SafePostCard = ({ post }: SafePostCardProps) => {
  // Sanitize all content before rendering
  const sanitizedTitle = ContentSanitizer.sanitizeText(post.title);
  const sanitizedContent = ContentSanitizer.sanitizeHTML(post.content);
  const sanitizedUrl = ContentSanitizer.sanitizeURL(post.telegram_url);
  const sanitizedHashtags = post.hashtags.map(tag => ContentSanitizer.sanitizeHashtag(tag));

  const publishedDate = new Date(post.published_at).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  // Extract sections and material types safely
  const sections = post.post_sections?.map(ps => ps.sections) || [];
  const materialTypes = post.post_material_types?.map(pmt => pmt.material_types) || [];

  return (
    <article className="p-6 space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-bold text-universum-dark-blue mb-2 font-akrobat line-clamp-2">
            {sanitizedTitle}
          </h2>
          
          <div className="flex items-center gap-4 text-sm text-universum-gray mb-3 font-pt-sans">
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              <time dateTime={post.published_at}>{publishedDate}</time>
            </div>
          </div>
          
          <div 
            className="text-universum-gray leading-relaxed mb-4 line-clamp-3 font-pt-sans"
            dangerouslySetInnerHTML={{ __html: sanitizedContent }}
          />
        </div>
        
        {sanitizedUrl && (
          <a
            href={sanitizedUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-shrink-0 p-3 bg-universum-blue hover:bg-universum-dark-blue text-white rounded-xl transition-colors duration-200 group"
            aria-label="Открыть пост в Telegram"
          >
            <ExternalLink className="h-5 w-5 group-hover:scale-110 transition-transform duration-200" />
          </a>
        )}
      </div>

      <div className="space-y-3">
        {sections.length > 0 && (
          <div>
            <div className="text-xs font-medium text-universum-gray mb-2 uppercase tracking-wider font-pt-sans">
              Разделы
            </div>
            <div className="flex flex-wrap gap-2">
              {sections.map((section) => (
                <Badge 
                  key={section.id} 
                  variant="secondary" 
                  className="bg-universum-teal/10 text-universum-teal border-universum-teal/20 hover:bg-universum-teal/20 transition-colors font-pt-sans"
                >
                  {ContentSanitizer.sanitizeText(section.name)}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {materialTypes.length > 0 && (
          <div>
            <div className="text-xs font-medium text-universum-gray mb-2 uppercase tracking-wider font-pt-sans">
              Тип материала
            </div>
            <div className="flex flex-wrap gap-2">
              {materialTypes.map((type) => (
                <Badge 
                  key={type.id} 
                  variant="outline" 
                  className="border-universum-orange/30 text-universum-orange hover:bg-universum-orange/10 transition-colors font-pt-sans"
                >
                  {ContentSanitizer.sanitizeText(type.name)}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {sanitizedHashtags.length > 0 && (
          <div>
            <div className="text-xs font-medium text-universum-gray mb-2 uppercase tracking-wider font-pt-sans">
              Хештеги
            </div>
            <div className="flex flex-wrap gap-2">
              {sanitizedHashtags.slice(0, 10).map((hashtag, index) => (
                <span 
                  key={index}
                  className="inline-flex items-center text-xs bg-universum-blue/10 text-universum-blue px-3 py-1 rounded-full font-pt-sans"
                >
                  <Hash className="h-3 w-3 mr-1" />
                  {hashtag}
                </span>
              ))}
              {sanitizedHashtags.length > 10 && (
                <span className="text-xs text-universum-gray bg-gray-100 px-3 py-1 rounded-full font-pt-sans">
                  +{sanitizedHashtags.length - 10}
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </article>
  );
};
