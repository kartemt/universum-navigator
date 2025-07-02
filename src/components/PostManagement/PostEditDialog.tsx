
/*
 * Диалог редактирования классификации поста
 * 
 * Назначение:
 * - Отображение информации о посте
 * - Выбор разделов и типов материалов
 * - Сохранение изменений классификации
 */

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2 } from 'lucide-react';
import type { Post, Section, MaterialType } from '@/types/postManagement';

interface PostEditDialogProps {
  post: Post | null;
  sections: Section[];
  materialTypes: MaterialType[];
  selectedSections: string[];
  selectedMaterialTypes: string[];
  isSaving: boolean;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSectionToggle: (sectionId: string) => void;
  onMaterialTypeToggle: (typeId: string) => void;
  onSave: () => void;
}

export const PostEditDialog: React.FC<PostEditDialogProps> = ({
  post,
  sections,
  materialTypes,
  selectedSections,
  selectedMaterialTypes,
  isSaving,
  isOpen,
  onOpenChange,
  onSectionToggle,
  onMaterialTypeToggle,
  onSave
}) => {
  if (!post) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Редактировать классификацию</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Заголовок поста */}
          <div>
            <h4 className="font-medium mb-2">Заголовок:</h4>
            <p className="text-sm text-gray-600 bg-gray-50 p-2 rounded">{post.title}</p>
          </div>
          
          {/* Выбор разделов */}
          <div>
            <h4 className="font-medium mb-2">Разделы:</h4>
            <div className="grid grid-cols-1 gap-2 max-h-40 overflow-y-auto border rounded p-3 bg-gray-50">
              {sections.map(section => (
                <div key={section.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`section-${section.id}`}
                    checked={selectedSections.includes(section.id)}
                    onCheckedChange={() => onSectionToggle(section.id)}
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

          {/* Выбор типов материалов */}
          <div>
            <h4 className="font-medium mb-2">Типы материалов:</h4>
            <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto border rounded p-3 bg-gray-50">
              {materialTypes.map(type => (
                <div key={type.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`type-${type.id}`}
                    checked={selectedMaterialTypes.includes(type.id)}
                    onCheckedChange={() => onMaterialTypeToggle(type.id)}
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

          {/* Кнопки управления */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Отмена
            </Button>
            <Button onClick={onSave} disabled={isSaving}>
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
  );
};
