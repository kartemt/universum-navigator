
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Search, Edit, Hash, ExternalLink } from 'lucide-react';
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
  const [selectedHashtag, setSelectedHashtag] = useState<string>('');
  const [allHashtags, setAllHashtags] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [selectedSections, setSelectedSections] = useState<string[]>([]);
  const [selectedMaterialTypes, setSelectedMaterialTypes] = useState<string[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      // Загружаем посты
      const { data: postsData, error: postsError } = await supabase
        .from('posts')
        .select(`
          *,
          post_sections(
            sections(id, name)
          ),
          post_material_types(
            material_types(id, name)
          )
        `)
        .order('published_at', { ascending: false });

      if (postsError) throw postsError;

      // Загружаем разделы
      const { data: sectionsData, error: sectionsError } = await supabase
        .from('sections')
        .select('*');

      if (sectionsError) throw sectionsError;

      // Загружаем типы материалов
      const { data: materialTypesData, error: materialTypesError } = await supabase
        .from('material_types')
        .select('*');

      if (materialTypesError) throw materialTypesError;

      setPosts(postsData || []);
      setSections(sectionsData || []);
      setMaterialTypes(materialTypesData || []);

      // Собираем все уникальные хештеги
      const hashtagsSet = new Set<string>();
      postsData?.forEach(post => {
        post.hashtags.forEach(tag => hashtagsSet.add(tag));
      });
      setAllHashtags(Array.from(hashtagsSet).sort());

    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить данные",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const filteredPosts = posts.filter(post => {
    const matchesSearch = !searchTerm || 
      post.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      post.content.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesHashtag = !selectedHashtag || 
      post.hashtags.some(tag => tag.toLowerCase() === selectedHashtag.toLowerCase());
    
    return matchesSearch && matchesHashtag;
  });

  const openEditDialog = (post: Post) => {
    setEditingPost(post);
    setSelectedSections(post.post_sections.map(ps => ps.sections.id));
    setSelectedMaterialTypes(post.post_material_types.map(pmt => pmt.material_types.id));
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

    try {
      // Удаляем старые связи
      await supabase.from('post_sections').delete().eq('post_id', editingPost.id);
      await supabase.from('post_material_types').delete().eq('post_id', editingPost.id);

      // Добавляем новые связи с разделами
      if (selectedSections.length > 0) {
        const sectionInserts = selectedSections.map(sectionId => ({
          post_id: editingPost.id,
          section_id: sectionId
        }));
        
        const { error: sectionsError } = await supabase
          .from('post_sections')
          .insert(sectionInserts);
        
        if (sectionsError) throw sectionsError;
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
        
        if (typesError) throw typesError;
      }

      toast({
        title: "Успешно",
        description: "Классификация поста обновлена",
      });

      setEditingPost(null);
      loadData(); // Перезагружаем данные

    } catch (error) {
      console.error('Error updating post classification:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось обновить классификацию поста",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">Загрузка...</div>
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
            Управление постами
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Поиск по заголовку или содержимому..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="w-64">
              <Select value={selectedHashtag} onValueChange={setSelectedHashtag}>
                <SelectTrigger>
                  <SelectValue placeholder="Фильтр по хештегу" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Все хештеги</SelectItem>
                  {allHashtags.map(hashtag => (
                    <SelectItem key={hashtag} value={hashtag}>
                      #{hashtag}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="text-sm text-gray-600">
            Показано {filteredPosts.length} из {posts.length} постов
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Заголовок</TableHead>
                <TableHead>Разделы</TableHead>
                <TableHead>Типы материалов</TableHead>
                <TableHead>Хештеги</TableHead>
                <TableHead>Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPosts.map(post => (
                <TableRow key={post.id}>
                  <TableCell className="max-w-xs">
                    <div className="truncate font-medium">{post.title}</div>
                    <div className="text-xs text-gray-500">
                      {new Date(post.published_at).toLocaleDateString('ru-RU')}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {post.post_sections.map(ps => (
                        <Badge key={ps.sections.id} variant="secondary" className="text-xs">
                          {ps.sections.name}
                        </Badge>
                      ))}
                      {post.post_sections.length === 0 && (
                        <span className="text-xs text-gray-400">Не назначен</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {post.post_material_types.map(pmt => (
                        <Badge key={pmt.material_types.id} variant="outline" className="text-xs">
                          {pmt.material_types.name}
                        </Badge>
                      ))}
                      {post.post_material_types.length === 0 && (
                        <span className="text-xs text-gray-400">Не назначен</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {post.hashtags.slice(0, 3).map(hashtag => (
                        <span key={hashtag} className="inline-flex items-center text-xs text-gray-500">
                          <Hash className="h-3 w-3 mr-0.5" />
                          {hashtag}
                        </span>
                      ))}
                      {post.hashtags.length > 3 && (
                        <span className="text-xs text-gray-400">+{post.hashtags.length - 3}</span>
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
                        <DialogContent className="max-w-2xl">
                          <DialogHeader>
                            <DialogTitle>Редактировать классификацию</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div>
                              <h4 className="font-medium mb-2">Заголовок:</h4>
                              <p className="text-sm text-gray-600">{editingPost?.title}</p>
                            </div>
                            
                            <div>
                              <h4 className="font-medium mb-2">Разделы:</h4>
                              <div className="grid grid-cols-1 gap-2 max-h-40 overflow-y-auto">
                                {sections.map(section => (
                                  <div key={section.id} className="flex items-center space-x-2">
                                    <Checkbox
                                      id={`section-${section.id}`}
                                      checked={selectedSections.includes(section.id)}
                                      onCheckedChange={() => handleSectionToggle(section.id)}
                                    />
                                    <label 
                                      htmlFor={`section-${section.id}`}
                                      className="text-sm cursor-pointer"
                                    >
                                      {section.name}
                                    </label>
                                  </div>
                                ))}
                              </div>
                            </div>

                            <div>
                              <h4 className="font-medium mb-2">Типы материалов:</h4>
                              <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto">
                                {materialTypes.map(type => (
                                  <div key={type.id} className="flex items-center space-x-2">
                                    <Checkbox
                                      id={`type-${type.id}`}
                                      checked={selectedMaterialTypes.includes(type.id)}
                                      onCheckedChange={() => handleMaterialTypeToggle(type.id)}
                                    />
                                    <label 
                                      htmlFor={`type-${type.id}`}
                                      className="text-sm cursor-pointer"
                                    >
                                      {type.name}
                                    </label>
                                  </div>
                                ))}
                              </div>
                            </div>

                            <div className="flex justify-end gap-2">
                              <Button variant="outline" onClick={() => setEditingPost(null)}>
                                Отмена
                              </Button>
                              <Button onClick={savePostClassification}>
                                Сохранить
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
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};
