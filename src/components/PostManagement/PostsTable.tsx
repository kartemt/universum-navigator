
/*
 * Таблица постов с их классификацией
 * 
 * Назначение:
 * - Отображение списка постов в табличном виде
 * - Показ текущих разделов и типов материалов
 * - Кнопки для редактирования и перехода к постам
 */

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Edit, ExternalLink, Hash } from 'lucide-react';
import type { Post } from '@/types/postManagement';

interface PostsTableProps {
  posts: Post[];
  onEditPost: (post: Post) => void;
}

export const PostsTable: React.FC<PostsTableProps> = ({ posts, onEditPost }) => {
  return (
    <Card>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[300px]">Заголовок</TableHead>
                <TableHead className="min-w-[200px]">Разделы</TableHead>
                <TableHead className="min-w-[200px]">Типы материалов</TableHead>
                <TableHead className="min-w-[150px]">Хештеги</TableHead>
                <TableHead className="w-[100px]">Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {posts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                    Постов не найдено по заданным критериям
                  </TableCell>
                </TableRow>
              ) : (
                posts.map(post => (
                  <TableRow key={post.id}>
                    {/* Колонка заголовка и даты */}
                    <TableCell className="max-w-xs">
                      <div className="truncate font-medium">{post.title}</div>
                      <div className="text-xs text-gray-500">
                        {new Date(post.published_at).toLocaleDateString('ru-RU')}
                      </div>
                    </TableCell>

                    {/* Колонка разделов */}
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {post.sections?.map(section => (
                          <Badge key={section.id} variant="secondary" className="text-xs">
                            {section.name}
                          </Badge>
                        ))}
                        {(!post.sections || post.sections.length === 0) && (
                          <span className="text-xs text-gray-400">Не назначен</span>
                        )}
                      </div>
                    </TableCell>

                    {/* Колонка типов материалов */}
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {post.material_types?.map(type => (
                          <Badge key={type.id} variant="outline" className="text-xs">
                            {type.name}
                          </Badge>
                        ))}
                        {(!post.material_types || post.material_types.length === 0) && (
                          <span className="text-xs text-gray-400">Не назначен</span>
                        )}
                      </div>
                    </TableCell>

                    {/* Колонка хештегов */}
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {post.hashtags?.slice(0, 3).map(hashtag => (
                          <span key={hashtag} className="inline-flex items-center text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
                            <Hash className="h-3 w-3 mr-0.5" />
                            {hashtag}
                          </span>
                        ))}
                        {post.hashtags && post.hashtags.length > 3 && (
                          <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded">+{post.hashtags.length - 3}</span>
                        )}
                      </div>
                    </TableCell>

                    {/* Колонка действий */}
                    <TableCell>
                      <div className="flex gap-2">
                        {/* Кнопка редактирования */}
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => onEditPost(post)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        
                        {/* Кнопка перехода к посту в Telegram */}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(post.telegram_url, '_blank')}
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};
