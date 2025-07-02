
/*
 * Панель поиска и фильтрации постов
 * 
 * Назначение:
 * - Поиск по заголовку и содержимому постов
 * - Фильтрация по разделам и типам материалов
 * - Отображение статистики найденных постов
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Edit } from 'lucide-react';
import type { Section, MaterialType, FilterState } from '@/types/postManagement';

interface FilterPanelProps {
  postsCount: number;
  filteredCount: number;
  sections: Section[];
  materialTypes: MaterialType[];
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  debugInfo: string;
}

export const FilterPanel: React.FC<FilterPanelProps> = ({
  postsCount,
  filteredCount,
  sections,
  materialTypes,
  filters,
  onFiltersChange,
  debugInfo
}) => {
  // # 1. Обработчики изменения фильтров
  const handleSearchChange = (value: string) => {
    onFiltersChange({ ...filters, searchTerm: value });
  };

  const handleSectionChange = (value: string) => {
    onFiltersChange({ ...filters, selectedSection: value });
  };

  const handleMaterialTypeChange = (value: string) => {
    onFiltersChange({ ...filters, selectedMaterialType: value });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Edit className="h-5 w-5" />
          Управление постами ({postsCount} постов)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Отладочная информация */}
        <div className="text-xs text-gray-500 bg-blue-50 p-2 rounded">
          Отладка: {debugInfo}
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Поле поиска */}
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Поиск по заголовку или содержимому..."
              value={filters.searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-10"
            />
          </div>
          
          {/* Фильтр по разделам */}
          <Select value={filters.selectedSection} onValueChange={handleSectionChange}>
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

          {/* Фильтр по типам материалов */}
          <Select value={filters.selectedMaterialType} onValueChange={handleMaterialTypeChange}>
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

        {/* Статистика */}
        <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded-lg">
          Показано {filteredCount} из {postsCount} постов
        </div>
      </CardContent>
    </Card>
  );
};
