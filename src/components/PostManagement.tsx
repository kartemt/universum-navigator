
/*
 * Главный компонент управления постами в админ-панели УниверсУм
 * 
 * Назначение:
 * - Координация работы всех подкомпонентов
 * - Управление состоянием фильтров и редактирования
 * - Обработка операций сохранения классификации
 * 
 * Архитектура:
 * - Использует хук usePostManagement для работы с данными
 * - Разделен на компоненты FilterPanel, PostsTable и PostEditDialog
 * - Поддерживает фильтрацию и автоматическую классификацию
 */

import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { FilterPanel } from './PostManagement/FilterPanel';
import { PostsTable } from './PostManagement/PostsTable';
import { PostEditDialog } from './PostManagement/PostEditDialog';
import { usePostManagement } from '@/hooks/usePostManagement';
import type { Post, FilterState } from '@/types/postManagement';

export const PostManagement = () => {
  // # 1. Подключение хука управления данными
  const {
    posts,
    sections,
    materialTypes,
    isLoading,
    error,
    debugInfo,
    loadAllData,
    autoClassifyPost,
    savePostClassification
  } = usePostManagement();

  // # 2. Состояние фильтров
  const [filters, setFilters] = useState<FilterState>({
    searchTerm: '',
    selectedSection: 'all',
    selectedMaterialType: 'all'
  });

  // # 3. Состояние редактирования
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [selectedSections, setSelectedSections] = useState<string[]>([]);
  const [selectedMaterialTypes, setSelectedMaterialTypes] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // # 4. Фильтрация постов
  const filteredPosts = posts.filter(post => {
    const matchesSearch = !filters.searchTerm || 
      post.title.toLowerCase().includes(filters.searchTerm.toLowerCase()) ||
      post.content.toLowerCase().includes(filters.searchTerm.toLowerCase());
    
    const matchesSection = filters.selectedSection === 'all' || 
      post.sections?.some(s => s.id === filters.selectedSection);
    
    const matchesMaterialType = filters.selectedMaterialType === 'all' ||
      post.material_types?.some(mt => mt.id === filters.selectedMaterialType);
    
    return matchesSearch && matchesSection && matchesMaterialType;
  });

  // # 5. Открытие диалога редактирования
  const handleEditPost = (post: Post) => {
    const { autoSections, autoMaterialTypes } = autoClassifyPost(post);
    
    setEditingPost(post);
    setSelectedSections(post.sections?.map(s => s.id) || autoSections);
    setSelectedMaterialTypes(post.material_types?.map(mt => mt.id) || autoMaterialTypes);
  };

  // # 6. Управление выбором разделов
  const handleSectionToggle = (sectionId: string) => {
    setSelectedSections(prev => 
      prev.includes(sectionId) 
        ? prev.filter(id => id !== sectionId)
        : [...prev, sectionId]
    );
  };

  // # 7. Управление выбором типов материалов
  const handleMaterialTypeToggle = (typeId: string) => {
    setSelectedMaterialTypes(prev => 
      prev.includes(typeId) 
        ? prev.filter(id => id !== typeId)
        : [...prev, typeId]
    );
  };

  // # 8. Сохранение изменений
  const handleSave = async () => {
    if (!editingPost) return;

    setIsSaving(true);
    try {
      await savePostClassification(editingPost, selectedSections, selectedMaterialTypes);
      setEditingPost(null);
      loadAllData(); // Перезагружаем данные
    } catch (error) {
      // Ошибка уже обработана в хуке
    } finally {
      setIsSaving(false);
    }
  };

  // # 9. Отображение состояния загрузки
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

  // # 10. Отображение ошибок
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

  // # 11. Основной интерфейс
  return (
    <div className="space-y-6">
      {/* Панель фильтрации */}
      <FilterPanel
        postsCount={posts.length}
        filteredCount={filteredPosts.length}
        sections={sections}
        materialTypes={materialTypes}
        filters={filters}
        onFiltersChange={setFilters}
        debugInfo={debugInfo}
      />

      {/* Таблица постов */}
      <PostsTable
        posts={filteredPosts.length === 0 && posts.length > 0 ? [] : filteredPosts}
        onEditPost={handleEditPost}
      />

      {/* Диалог редактирования */}
      <PostEditDialog
        post={editingPost}
        sections={sections}
        materialTypes={materialTypes}
        selectedSections={selectedSections}
        selectedMaterialTypes={selectedMaterialTypes}
        isSaving={isSaving}
        isOpen={!!editingPost}
        onOpenChange={() => setEditingPost(null)}
        onSectionToggle={handleSectionToggle}
        onMaterialTypeToggle={handleMaterialTypeToggle}
        onSave={handleSave}
      />
    </div>
  );
};
