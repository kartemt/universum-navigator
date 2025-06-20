
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Search, Edit, Hash, ExternalLink, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';

interface Post {
  id: string;
  title: string;
  content: string;
  hashtags: string[];
  telegram_url: string;
  published_at: string;
  sections: Array<{
    id: string;
    name: string;
  }>;
  material_types: Array<{
    id: string;
    name: string;
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
  const [selectedSection, setSelectedSection] = useState<string>('all');
  const [selectedMaterialType, setSelectedMaterialType] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [selectedSections, setSelectedSections] = useState<string[]>([]);
  const [selectedMaterialTypes, setSelectedMaterialTypes] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<string>('');
  const { toast } = useToast();

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    setIsLoading(true);
    setError(null);
    setDebugInfo('');
    
    try {
      console.log('🔍 Начинаем загрузку данных...');
      setDebugInfo('Подключение к базе данных...');

      // Шаг 1: Проверяем базовые таблицы
      console.log('📊 Загружаем базовые данные...');
      
      const { data: postsData, error: postsError } = await supabase
        .from('posts')
        .select('*')
        .order('published_at', { ascending: false });

      if (postsError) {
        console.error('❌ Ошибка загрузки постов:', postsError);
        setDebugInfo(`Ошибка загрузки постов: ${postsError.message}`);
        throw new Error(`Не удалось загрузить посты: ${postsError.message}`);
      }

      console.log(`✅ Загружено ${postsData?.length || 0} постов`);
      setDebugInfo(`Найдено ${postsData?.length || 0} постов в базе данных`);

      const { data: sectionsData, error: sectionsError } = await supabase
        .from('sections')
        .select('*')
        .order('name');

      if (sectionsError) {
        console.error('❌ Ошибка загрузки разделов:', sectionsError);
        throw new Error(`Не удалось загрузить разделы: ${sectionsError.message}`);
      }

      console.log(`✅ Загружено ${sectionsData?.length || 0} разделов`);

      const { data: materialTypesData, error: materialTypesError } = await supabase
        .from('material_types')
        .select('*')
        .order('name');

      if (materialTypesError) {
        console.error('❌ Ошибка загрузки типов материалов:', materialTypesError);
        throw new Error(`Не удалось загрузить типы материалов: ${materialTypesError.message}`);
      }

      console.log(`✅ Загружено ${materialTypesData?.length || 0} типов материалов`);

      // Устанавливаем базовые данные
      setSections(sectionsData || []);
      setMaterialTypes(materialTypesData || []);
      setDebugInfo(`Загружено: ${postsData?.length || 0} постов, ${sectionsData?.length || 0} разделов, ${materialTypesData?.length || 0} типов`);

      // Если нет постов, завершаем
      if (!postsData || postsData.length === 0) {
        console.log('ℹ️ Постов не найдено');
        setPosts([]);
        setDebugInfo('Постов в базе данных не найдено');
        setIsLoading(false);
        return;
      }

      // Шаг 2: Загружаем связи для постов
      console.log('🔗 Загружаем связи постов...');
      setDebugInfo('Загружаем связи разделов и типов материалов...');

      const postsWithRelations = await Promise.all(
        postsData.map(async (post, index) => {
          console.log(`📝 Обрабатываем пост ${index + 1}/${postsData.length}: ${post.title}`);
          
          try {
            // Загружаем разделы поста
            const { data: postSections, error: sectionsError } = await supabase
              .from('post_sections')
              .select(`
                sections!inner (
                  id,
                  name
                )
              `)
              .eq('post_id', post.id);

            if (sectionsError) {
              console.warn(`⚠️ Ошибка загрузки разделов для поста ${post.id}:`, sectionsError);
            }

            // Загружаем типы материалов поста
            const { data: postMaterialTypes, error: typesError } = await supabase
              .from('post_material_types')
              .select(`
                material_types!inner (
                  id,
                  name
                )
              `)
              .eq('post_id', post.id);

            if (typesError) {
              console.warn(`⚠️ Ошибка загрузки типов для поста ${post.id}:`, typesError);
            }

            // Формируем результат
            const sections = (postSections || []).map(ps => ps.sections).filter(Boolean);
            const material_types = (postMaterialTypes || []).map(pmt => pmt.material_types).filter(Boolean);

            console.log(`✅ Пост "${post.title}": ${sections.length} разделов, ${material_types.length} типов`);

            return {
              ...post,
              sections,
              material_types
            };
          } catch (error) {
            console.error(`❌ Ошибка обработки поста ${post.id}:`, error);
            return {
              ...post,
              sections: [],
              material_types: []
            };
          }
        })
      );

      console.log('🎉 Все данные успешно загружены');
      setPosts(postsWithRelations);
      setDebugInfo(`Успешно загружено ${postsWithRelations.length} постов с их связями`);

    } catch (error: any) {
      console.error('💥 Критическая ошибка:', error);
      const errorMessage = error.message || 'Неизвестная ошибка';
      setError(errorMessage);
      setDebugInfo(`Ошибка: ${errorMessage}`);
      toast({
        title: "Ошибка загрузки",
        description: errorMessage,
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
    
    const matchesSection = selectedSection === 'all' || 
      post.sections?.some(s => s.id === selectedSection);
    
    const matchesMaterialType = selectedMaterialType === 'all' ||
      post.material_types?.some(mt => mt.id === selectedMaterialType);
    
    return matchesSearch && matchesSection && matchesMaterialType;
  });

  const openEditDialog = (post: Post) => {
    const { autoSections, autoMaterialTypes } = autoClassifyPost(post);
    
    setEditingPost(post);
    setSelectedSections(post.sections?.map(s => s.id) || autoSections);
    setSelectedMaterialTypes(post.material_types?.map(mt => mt.id) || autoMaterialTypes);
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
      console.log('💾 Сохранение классификации для поста:', editingPost.id);

      // Удаляем старые связи
      const [sectionsDelete, typesDelete] = await Promise.all([
        supabase.from('post_sections').delete().eq('post_id', editingPost.id),
        supabase.from('post_material_types').delete().eq('post_id', editingPost.id)
      ]);

      if (sectionsDelete.error) {
        console.error('❌ Ошибка удаления старых разделов:', sectionsDelete.error);
        throw sectionsDelete.error;
      }

      if (typesDelete.error) {
        console.error('❌ Ошибка удаления старых типов материалов:', typesDelete.error);
        throw typesDelete.error;
      }

      // Добавляем новые связи
      const insertPromises = [];

      if (selectedSections.length > 0) {
        const sectionInserts = selectedSections.map(sectionId => ({
          post_id: editingPost.id,
          section_id: sectionId
        }));
        
        insertPromises.push(
          supabase.from('post_sections').insert(sectionInserts)
        );
      }

      if (selectedMaterialTypes.length > 0) {
        const typeInserts = selectedMaterialTypes.map(typeId => ({
          post_id: editingPost.id,
          material_type_id: typeId
        }));
        
        insertPromises.push(
          supabase.from('post_material_types').insert(typeInserts)
        );
      }

      if (insertPromises.length > 0) {
        const results = await Promise.all(insertPromises);
        for (const result of results) {
          if (result.error) {
            console.error('❌ Ошибка вставки новых связей:', result.error);
            throw result.error;
          }
        }
      }

      toast({
        title: "Успешно",
        description: "Классификация поста обновлена",
      });

      setEditingPost(null);
      loadAllData(); // Перезагружаем данные

    } catch (error: any) {
      console.error('❌ Ошибка обновления классификации поста:', error);
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
            <span className="text-sm text-gray-500">{debugInfo}</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center space-y-4 flex-col text-red-600">
            <AlertCircle className="h-8 w-8" />
            <span className="text-lg">Ошибка загрузки</span>
            <span className="text-sm text-gray-500 max-w-md text-center">{error}</span>
            <span className="text-xs text-gray-400 max-w-md text-center">{debugInfo}</span>
            <Button onClick={loadAllData} variant="outline" className="mt-4">
              <RefreshCw className="mr-2 h-4 w-4" />
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
          <div className="text-xs text-gray-500 bg-blue-50 p-2 rounded">
            Отладка: {debugInfo}
          </div>
          
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
                <SelectItem value="all">Все разделы</SelectItem>
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
                <SelectItem value="all">Все типы</SelectItem>
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
                      {posts.length === 0 
                        ? "Постов в базе данных не найдено" 
                        : "Постов не найдено по заданным критериям"
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
