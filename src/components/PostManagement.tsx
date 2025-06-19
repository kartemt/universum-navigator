
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Search, Edit, Hash, ExternalLink, Loader2, AlertCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';

interface Post {
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
}

interface Section {
  id: string;
  name: string;
  hashtags: string[];
}

interface MaterialType {
  id: string;
  name: string;
  hashtags: string[];
}

export const PostManagement = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [materialTypes, setMaterialTypes] = useState<MaterialType[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSection, setSelectedSection] = useState<string>('');
  const [selectedMaterialType, setSelectedMaterialType] = useState<string>('');
  const [allHashtags, setAllHashtags] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [selectedSections, setSelectedSections] = useState<string[]>([]);
  const [selectedMaterialTypes, setSelectedMaterialTypes] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('Загрузка данных постов...');
      
      // Загружаем посты
      const { data: postsData, error: postsError } = await supabase
        .from('posts')
        .select('*')
        .order('published_at', { ascending: false });

      if (postsError) {
        console.error('Ошибка загрузки постов:', postsError);
        throw postsError;
      }

      // Для каждого поста загружаем связи отдельно
      const postsWithRelations = await Promise.all(
        (postsData || []).map(async (post) => {
          const [postSectionsResult, postMaterialTypesResult] = await Promise.all([
            supabase
              .from('post_sections')
              .select('sections(id, name)')
              .eq('post_id', post.id),
            supabase
              .from('post_material_types')
              .select('material_types(id, name)')
              .eq('post_id', post.id)
          ]);

          return {
            ...post,
            post_sections: postSectionsResult.data || [],
            post_material_types: postMaterialTypesResult.data || []
          };
        })
      );

      setPosts(postsWithRelations);

      // Загружаем разделы
      const { data: sectionsData, error: sectionsError } = await supabase
        .from('sections')
        .select('*')
        .order('name');

      if (sectionsError) {
        console.error('Ошибка загрузки разделов:', sectionsError);
      } else {
        setSections(sectionsData || []);
      }

      // Загружаем типы материалов
      const { data: materialTypesData, error: materialTypesError } = await supabase
        .from('material_types')
        .select('*')
        .order('name');

      if (materialTypesError) {
        console.error('Ошибка загрузки типов материалов:', materialTypesError);
      } else {
        setMaterialTypes(materialTypesData || []);
      }

      // Собираем все уникальные хештеги из постов
      const hashtagsSet = new Set<string>();
      postsWithRelations.forEach(post => {
        if (post.hashtags && Array.isArray(post.hashtags)) {
          post.hashtags.forEach(tag => {
            if (tag && typeof tag === 'string') {
              hashtagsSet.add(tag);
            }
          });
        }
      });
      setAllHashtags(Array.from(hashtagsSet).sort());

      console.log('Данные успешно загружены:', {
        posts: postsWithRelations.length,
        sections: sectionsData?.length || 0,
        materialTypes: materialTypesData?.length || 0,
        hashtags: hashtagsSet.size
      });

    } catch (error) {
      console.error('Ошибка загрузки данных:', error);
      setError('Не удалось загрузить данные. Проверьте подключение к базе данных.');
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить данные",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Функция для автоматической классификации поста по хештегам
  const autoClassifyPost = (post: Post) => {
    const autoSections: string[] = [];
    const autoMaterialTypes: string[] = [];

    // Классификация по разделам
    sections.forEach(section => {
      const hasMatchingHashtag = section.hashtags.some(sectionTag =>
        post.hashtags.some(postTag => 
          postTag.toLowerCase() === sectionTag.toLowerCase()
        )
      );
      if (hasMatchingHashtag) {
        autoSections.push(section.id);
      }
    });

    // Классификация по типам материалов
    materialTypes.forEach(type => {
      const hasMatchingHashtag = type.hashtags.some(typeTag =>
        post.hashtags.some(postTag => 
          postTag.toLowerCase() === typeTag.toLowerCase()
        )
      );
      if (hasMatchingHashtag) {
        autoMaterialTypes.push(type.id);
      }
    });

    return { autoSections, autoMaterialTypes };
  };

  const filteredPosts = posts.filter(post => {
    const matchesSearch = !searchTerm || 
      post.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      post.content.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesSection = !selectedSection || 
      post.post_sections.some(ps => ps.sections?.id === selectedSection);
    
    const matchesMaterialType = !selectedMaterialType ||
      post.post_material_types.some(pmt => pmt.material_types?.id === selectedMaterialType);
    
    return matchesSearch && matchesSection && matchesMaterialType;
  });

  const openEditDialog = (post: Post) => {
    const { autoSections, autoMaterialTypes } = autoClassifyPost(post);
    
    setEditingPost(post);
    setSelectedSections(post.post_sections?.map(ps => ps.sections?.id).filter(Boolean) || autoSections);
    setSelectedMaterialTypes(post.post_material_types?.map(pmt => pmt.material_types?.id).filter(Boolean) || autoMaterialTypes);
  };

  const handleSectionToggle = (sectionId: string) => {
    setSelectedSections(prev => 
      prev.includes(sectionId) 
        ? prev.filter(id => id !== sectionId)
        : [...prev, sectionId]
    );
  };

  const handleMaterialTypeToggle = (typeId: string) => {
    setSelectedMaterialTypes(prev => 
      prev.includes(typeId) 
        ? prev.filter(id => id !== typeId)
        : [...prev, typeId]
    );
  };

  const savePostClassification = async () => {
    if (!editingPost) return;

    setIsSaving(true);
    try {
      console.log('Сохранение классификации для поста:', editingPost.id);

      // Удаляем старые связи
      await Promise.all([
        supabase.from('post_sections').delete().eq('post_id', editingPost.id),
        supabase.from('post_material_types').delete().eq('post_id', editingPost.id)
      ]);

      // Добавляем новые связи с разделами
      if (selectedSections.length > 0) {
        const sectionInserts = selectedSections.map(sectionId => ({
          post_id: editingPost.id,
          section_id: sectionId
        }));
        
        const { error: sectionsError } = await supabase
          .from('post_sections')
          .insert(sectionInserts);
        
        if (sectionsError) {
          console.error('Ошибка вставки разделов:', sectionsError);
          throw sectionsError;
        }
      }

      // Добавляем новые связи с типами материалов
      if (selectedMaterialTypes.length > 0) {
        const typeInserts = selectedMaterialTypes.map(typeId => ({
          post_id: editingPost.id,
          material_type_id: typeId
        }));
        
        const { error: typesError } = await supabase
          .from('post_material_types')
          .insert(typeInserts);
        
        if (typesError) {
          console.error('Ошибка вставки типов материалов:', typesError);
          throw typesError;
        }
      }

      toast({
        title: "Успешно",
        description: "Классификация поста обновлена",
      });

      setEditingPost(null);
      loadData(); // Перезагружаем данные

    } catch (error) {
      console.error('Ошибка обновления классификации поста:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось обновить классификацию поста",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center space-y-2 flex-col">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            <span className="text-lg">Загрузка данных...</span>
            <span className="text-sm text-gray-500">Получение постов и настроек</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center space-y-2 flex-col text-red-600">
            <AlertCircle className="h-8 w-8" />
            <span className="text-lg">Ошибка загрузки</span>
            <span className="text-sm text-gray-500">{error}</span>
            <Button onClick={loadData} variant="outline" className="mt-4">
              Попробовать снова
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Edit className="h-5 w-5" />
            Управление постами ({posts.length} постов)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Поиск по заголовку или содержимому..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={selectedSection} onValueChange={setSelectedSection}>
              <SelectTrigger>
                <SelectValue placeholder="Фильтр по разделу" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Все разделы</SelectItem>
                {sections.map(section => (
                  <SelectItem key={section.id} value={section.id}>
                    {section.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedMaterialType} onValueChange={setSelectedMaterialType}>
              <SelectTrigger>
                <SelectValue placeholder="Фильтр по типу материала" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Все типы</SelectItem>
                {materialTypes.map(type => (
                  <SelectItem key={type.id} value={type.id}>
                    {type.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded-lg">
            Показано {filteredPosts.length} из {posts.length} постов
          </div>
        </CardContent>
      </Card>

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
                {filteredPosts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                      {searchTerm || selectedSection || selectedMaterialType
                        ? "Постов не найдено по заданным критериям" 
                        : "Постов пока нет"
                      }
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredPosts.map(post => (
                    <TableRow key={post.id}>
                      <TableCell className="max-w-xs">
                        <div className="truncate font-medium">{post.title}</div>
                        <div className="text-xs text-gray-500">
                          {new Date(post.published_at).toLocaleDateString('ru-RU')}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {post.post_sections?.map(ps => ps.sections && (
                            <Badge key={ps.sections.id} variant="secondary" className="text-xs">
                              {ps.sections.name}
                            </Badge>
                          ))}
                          {(!post.post_sections || post.post_sections.length === 0) && (
                            <span className="text-xs text-gray-400">Не назначен</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {post.post_material_types?.map(pmt => pmt.material_types && (
                            <Badge key={pmt.material_types.id} variant="outline" className="text-xs">
                              {pmt.material_types.name}
                            </Badge>
                          ))}
                          {(!post.post_material_types || post.post_material_types.length === 0) && (
                            <span className="text-xs text-gray-400">Не назначен</span>
                          )}
                        </div>
                      </TableCell>
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
                      <TableCell>
                        <div className="flex gap-2">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => openEditDialog(post)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                              <DialogHeader>
                                <DialogTitle>Редактировать классификацию</DialogTitle>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div>
                                  <h4 className="font-medium mb-2">Заголовок:</h4>
                                  <p className="text-sm text-gray-600 bg-gray-50 p-2 rounded">{editingPost?.title}</p>
                                </div>
                                
                                <div>
                                  <h4 className="font-medium mb-2">Разделы:</h4>
                                  <div className="grid grid-cols-1 gap-2 max-h-40 overflow-y-auto border rounded p-3 bg-gray-50">
                                    {sections.map(section => (
                                      <div key={section.id} className="flex items-center space-x-2">
                                        <Checkbox
                                          id={`section-${section.id}`}
                                          checked={selectedSections.includes(section.id)}
                                          onCheckedChange={() => handleSectionToggle(section.id)}
                                        />
                                        <label 
                                          htmlFor={`section-${section.id}`}
                                          className="text-sm cursor-pointer flex-1 font-medium"
                                        >
                                          {section.name}
                                        </label>
                                      </div>
                                    ))}
                                  </div>
                                </div>

                                <div>
                                  <h4 className="font-medium mb-2">Типы материалов:</h4>
                                  <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto border rounded p-3 bg-gray-50">
                                    {materialTypes.map(type => (
                                      <div key={type.id} className="flex items-center space-x-2">
                                        <Checkbox
                                          id={`type-${type.id}`}
                                          checked={selectedMaterialTypes.includes(type.id)}
                                          onCheckedChange={() => handleMaterialTypeToggle(type.id)}
                                        />
                                        <label 
                                          htmlFor={`type-${type.id}`}
                                          className="text-sm cursor-pointer flex-1 font-medium"
                                        >
                                          {type.name}
                                        </label>
                                      </div>
                                    ))}
                                  </div>
                                </div>

                                <div className="flex justify-end gap-2 pt-4 border-t">
                                  <Button variant="outline" onClick={() => setEditingPost(null)}>
                                    Отмена
                                  </Button>
                                  <Button onClick={savePostClassification} disabled={isSaving}>
                                    {isSaving ? (
                                      <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Сохранение...
                                      </>
                                    ) : (
                                      'Сохранить'
                                    )}
                                  </Button>
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>
                          
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
    </div>
  );
};
