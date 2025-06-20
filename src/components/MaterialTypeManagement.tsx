
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Trash2, Edit, FileText, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';

interface MaterialType {
  id: string;
  name: string;
  hashtags: string[];
  created_at: string;
}

export const MaterialTypeManagement = () => {
  const [materialTypes, setMaterialTypes] = useState<MaterialType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingType, setEditingType] = useState<MaterialType | null>(null);
  const [newTypeName, setNewTypeName] = useState('');
  const [newTypeHashtags, setNewTypeHashtags] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    loadMaterialTypes();
  }, []);

  const loadMaterialTypes = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('material_types')
        .select('*')
        .order('name');

      if (error) throw error;
      setMaterialTypes(data || []);
    } catch (error) {
      console.error('Ошибка загрузки типов материалов:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить типы материалов",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const createMaterialType = async () => {
    if (!newTypeName.trim()) {
      toast({
        title: "Ошибка",
        description: "Введите название типа материала",
        variant: "destructive",
      });
      return;
    }

    setIsCreating(true);
    try {
      const hashtags = newTypeHashtags
        .split(',')
        .map(tag => tag.trim())
        .filter(tag => tag.length > 0);

      const { error } = await supabase
        .from('material_types')
        .insert({
          name: newTypeName.trim(),
          hashtags: hashtags
        });

      if (error) throw error;

      toast({
        title: "Успешно",
        description: "Тип материала создан",
      });

      setNewTypeName('');
      setNewTypeHashtags('');
      loadMaterialTypes();
    } catch (error) {
      console.error('Ошибка создания типа материала:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось создать тип материала",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  const updateMaterialType = async () => {
    if (!editingType || !editingType.name.trim()) return;

    setIsEditing(true);
    try {
      const hashtags = newTypeHashtags
        .split(',')
        .map(tag => tag.trim())
        .filter(tag => tag.length > 0);

      const { error } = await supabase
        .from('material_types')
        .update({
          name: editingType.name.trim(),
          hashtags: hashtags
        })
        .eq('id', editingType.id);

      if (error) throw error;

      toast({
        title: "Успешно",
        description: "Тип материала обновлен",
      });

      setEditingType(null);
      setNewTypeHashtags('');
      loadMaterialTypes();
    } catch (error) {
      console.error('Ошибка обновления типа материала:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось обновить тип материала",
        variant: "destructive",
      });
    } finally {
      setIsEditing(false);
    }
  };

  const deleteMaterialType = async (id: string) => {
    if (!confirm('Вы уверены, что хотите удалить этот тип материала?')) return;

    try {
      const { error } = await supabase
        .from('material_types')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Успешно",
        description: "Тип материала удален",
      });

      loadMaterialTypes();
    } catch (error) {
      console.error('Ошибка удаления типа материала:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось удалить тип материала",
        variant: "destructive",
      });
    }
  };

  const openEditDialog = (materialType: MaterialType) => {
    setEditingType(materialType);
    setNewTypeHashtags(materialType.hashtags.join(', '));
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
          <FileText className="h-5 w-5" />
          Управление типами материалов ({materialTypes.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
          <div>
            <Label htmlFor="typeName">Название типа материала</Label>
            <Input
              id="typeName"
              placeholder="Введите название типа материала"
              value={newTypeName}
              onChange={(e) => setNewTypeName(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="typeHashtags">Хештеги (через запятую)</Label>
            <Input
              id="typeHashtags"
              placeholder="хештег1, хештег2, хештег3"
              value={newTypeHashtags}
              onChange={(e) => setNewTypeHashtags(e.target.value)}
            />
          </div>
          <div className="md:col-span-2">
            <Button onClick={createMaterialType} disabled={isCreating}>
              {isCreating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Создание...
                </>
              ) : (
                <>
                  <Plus className="mr-2 h-4 w-4" />
                  Создать тип материала
                </>
              )}
            </Button>
          </div>
        </div>

        <div className="space-y-3">
          {materialTypes.map(materialType => (
            <div key={materialType.id} className="flex items-center justify-between p-4 border rounded-lg bg-white">
              <div className="flex-1">
                <h4 className="font-medium">{materialType.name}</h4>
                <div className="flex flex-wrap gap-1 mt-2">
                  {materialType.hashtags.map(hashtag => (
                    <Badge key={hashtag} variant="outline" className="text-xs">
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
                      onClick={() => openEditDialog(materialType)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Редактировать тип материала</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="editTypeName">Название</Label>
                        <Input
                          id="editTypeName"
                          value={editingType?.name || ''}
                          onChange={(e) => setEditingType(prev => 
                            prev ? { ...prev, name: e.target.value } : null
                          )}
                        />
                      </div>
                      <div>
                        <Label htmlFor="editTypeHashtags">Хештеги (через запятую)</Label>
                        <Textarea
                          id="editTypeHashtags"
                          value={newTypeHashtags}
                          onChange={(e) => setNewTypeHashtags(e.target.value)}
                          rows={3}
                        />
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setEditingType(null)}>
                          Отмена
                        </Button>
                        <Button onClick={updateMaterialType} disabled={isEditing}>
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
                  onClick={() => deleteMaterialType(materialType.id)}
                >
                  <Trash2 className="h-4 w-4 text-red-500" />
                </Button>
              </div>
            </div>
          ))}
          {materialTypes.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              Типов материалов пока нет
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
