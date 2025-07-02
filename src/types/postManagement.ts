
/*
 * Типы данных для системы управления постами
 * 
 * Содержит интерфейсы для:
 * - Структуры постов с их связями
 * - Разделов и типов материалов
 * - Состояний компонентов
 */

export interface Post {
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

export interface Section {
  id: string;
  name: string;
  hashtags: string[];
}

export interface MaterialType {
  id: string;
  name: string;
  hashtags: string[];
}

export interface FilterState {
  searchTerm: string;
  selectedSection: string;
  selectedMaterialType: string;
}
