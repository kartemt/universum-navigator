
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Trash2, Edit, Hash, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';

interface Section {
  id: string;
  name: string;
  hashtags: string[];
  created_at: string;
}

export const SectionManagement = () => {
  const [sections, setSections] = useState<Section[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingSection, setEditingSection] = useState<Section | null>(null);
  const [newSectionName, setNewSectionName] = useState('');
  const [newSectionHashtags, setNewSectionHashtags] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    loadSections();
  }, []);

  const loadSections = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('sections')
        .select('*')
        .order('name');

      if (error) throw error;
      setSections(data || []);
    } catch (error) {
      console.error('Ошибка загрузки разделов:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить разделы",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const createSection = async () => {
    if (!newSectionName.trim()) {
      toast({
        title: "Ошибка",
        description: "Введите название раздела",
        variant: "destructive",
      });
      return;
    }

    setIsCreating(true);
    try {
      const hashtags = newSectionHashtags
        .split(',')
        .map(tag => tag.trim())
        .filter(tag => tag.length > 0);

      const { error } = await supabase
        .from('sections')
        .insert({
          name: newSectionName.trim(),
          hashtags: hashtags
        });

      if (error) throw error;

      toast({
        title: "Успешно",
        description: "Раздел создан",
      });

      setNewSectionName('');
      setNewSectionHashtags('');
      loadSections();
    } catch (error) {
      console.error('Ошибка создания раздела:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось создать раздел",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  const updateSection = async () => {
    if (!editingSection || !editingSection.name.trim()) return;

    setIsEditing(true);
    try {
      const hashtags = newSectionHashtags
        .split(',')
        .map(tag => tag.trim())
        .filter(tag => tag.length > 0);

      const { error } = await supabase
        .from('sections')
        .update({
          name: editingSection.name.trim(),
          hashtags: hashtags
        })
        .eq('id', editingSection.id);

      if (error) throw error;

      toast({
        title: "Успешно",
        description: "Раздел обновлен",
      });

      setEditingSection(null);
      setNewSectionHashtags('');
      loadSections();
    } catch (error) {
      console.error('Ошибка обновления раздела:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось обновить раздел",
        variant: "destructive",
      });
    } finally {
      setIsEditing(false);
    }
  };

  const deleteSection = async (id: string) => {
    if (!confirm('Вы уверены, что хотите удалить этот раздел?')) return;

    try {
      const { error } = await supabase
        .from('sections')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Успешно",
        description: "Раздел удален",
      });

      loadSections();
    } catch (error) {
      console.error('Ошибка удаления раздела:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось удалить раздел",
        variant: "destructive",
      });
    }
  };

  const openEditDialog = (section: Section) => {
    setEditingSection(section);
    setNewSectionHashtags(section.hashtags.join(', '));
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Hash className="h-5 w-5" />
          Управление разделами ({sections.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
          <div>
            <Label htmlFor="sectionName">Название раздела</Label>
            <Input
              id="sectionName"
              placeholder="Введите название раздела"
              value={newSectionName}
              onChange={(e) => setNewSectionName(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="sectionHashtags">Хештеги (через запятую)</Label>
            <Input
              id="sectionHashtags"
              placeholder="хештег1, хештег2, хештег3"
              value={newSectionHashtags}
              onChange={(e) => setNewSectionHashtags(e.target.value)}
            />
          </div>
          <div className="md:col-span-2">
            <Button onClick={createSection} disabled={isCreating}>
              {isCreating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Создание...
                </>
              ) : (
                <>
                  <Plus className="mr-2 h-4 w-4" />
                  Создать раздел
                </>
              )}
            </Button>
          </div>
        </div>

        <div className="space-y-3">
          {sections.map(section => (
            <div key={section.id} className="flex items-center justify-between p-4 border rounded-lg bg-white">
              <div className="flex-1">
                <h4 className="font-medium">{section.name}</h4>
                <div className="flex flex-wrap gap-1 mt-2">
                  {section.hashtags.map(hashtag => (
                    <Badge key={hashtag} variant="secondary" className="text-xs">
                      #{hashtag}
                    </Badge>
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                <Dialog>
                  <DialogTrigger asChild>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => openEditDialog(section)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Редактировать раздел</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="editSectionName">Название</Label>
                        <Input
                          id="editSectionName"
                          value={editingSection?.name || ''}
                          onChange={(e) => setEditingSection(prev => 
                            prev ? { ...prev, name: e.target.value } : null
                          )}
                        />
                      </div>
                      <div>
                        <Label htmlFor="editSectionHashtags">Хештеги (через запятую)</Label>
                        <Textarea
                          id="editSectionHashtags"
                          value={newSectionHashtags}
                          onChange={(e) => setNewSectionHashtags(e.target.value)}
                          rows={3}
                        />
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setEditingSection(null)}>
                          Отмена
                        </Button>
                        <Button onClick={updateSection} disabled={isEditing}>
                          {isEditing ? (
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
                  onClick={() => deleteSection(section.id)}
                >
                  <Trash2 className="h-4 w-4 text-red-500" />
                </Button>
              </div>
            </div>
          ))}
          {sections.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              Разделов пока нет
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
