/*
 * Хук для управления данными постов в админ-панели
 * 
 * Назначение:
 * - Загрузка постов, разделов и типов материалов
 * - Управление состоянием загрузки и ошибок
 * - Автоматическая классификация постов по хештегам
 * - Сохранение изменений классификации
 */

import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { SessionManager } from '@/utils/sessionManager';
import { createClient } from '@supabase/supabase-js';
import type { Post, Section, MaterialType } from '@/types/postManagement';

export const usePostManagement = () => {
  // # 1. Состояния данных
  const [posts, setPosts] = useState<Post[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [materialTypes, setMaterialTypes] = useState<MaterialType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<string>('');
  const { toast } = useToast();

  // # 2. Загрузка данных при инициализации
  useEffect(() => {
    loadAllData();
  }, []);

  // # 3. Основная функция загрузки всех данных
  const loadAllData = async () => {
    setIsLoading(true);
    setError(null);
    setDebugInfo('');
    
    try {
      console.log('🔍 Начинаем загрузку данных...');
      setDebugInfo('Подключение к базе данных...');

      // Загружаем базовые данные
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

      // Если нет постов, завершаем загрузку
      if (!postsData || postsData.length === 0) {
        console.log('ℹ️ Постов не найдено');
        setPosts([]);
        setDebugInfo('Постов в базе данных не найдено');
        setIsLoading(false);
        return;
      }

      // # 4. Загрузка связей для каждого поста
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

            // Формируем итоговый объект поста
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

  // # 5. Автоматическая классификация по хештегам
  const autoClassifyPost = (post: Post) => {
    const autoSections: string[] = [];
    const autoMaterialTypes: string[] = [];

    // Проверяем соответствие хештегов разделам
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

    // Проверяем соответствие хештегов типам материалов
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

  // # 6. Сохранение классификации поста
  const savePostClassification = async (
    post: Post, 
    selectedSections: string[], 
    selectedMaterialTypes: string[]
  ) => {
    try {
      console.log('💾 Сохранение классификации для поста:', post.id);

      // Получаем текущую админскую сессию
      const currentSession = SessionManager.getCurrentSession();
      if (!currentSession) {
        throw new Error('Нет активной админской сессии');
      }

      console.log('🔑 Используем админскую сессию для операций удаления');

      // Создаем админский клиент для всех операций с правильной авторизацией
      const adminSupabase = createClient(
        'https://gpfsdgrpnlnpjovhufxu.supabase.co',
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdwZnNkZ3JwbmxucGpvdmh1Znh1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAyOTk2MTQsImV4cCI6MjA2NTg3NTYxNH0.1-fuATIN4x7754HajqvGGKLrQ3tkjbxyw7QluoulJ_8',
        {
          global: {
            headers: {
              'authorization': currentSession.sessionToken
            }
          }
        }
      );

      // Удаляем старые связи
      console.log('🗑️ Удаляем старые связи разделов и типов');
      const [sectionsDelete, typesDelete] = await Promise.all([
        adminSupabase.from('post_sections').delete().eq('post_id', post.id),
        adminSupabase.from('post_material_types').delete().eq('post_id', post.id)
      ]);

      if (sectionsDelete.error) {
        console.error('❌ Ошибка удаления старых разделов:', sectionsDelete.error);
        throw sectionsDelete.error;
      }

      if (typesDelete.error) {
        console.error('❌ Ошибка удаления старых типов материалов:', typesDelete.error);
        throw typesDelete.error;
      }

      console.log('✅ Старые связи успешно удалены');

      // Добавляем новые связи используя adminSupabase
      const insertPromises = [];

      if (selectedSections.length > 0) {
        console.log('➕ Добавляем новые связи с разделами:', selectedSections);
        const sectionInserts = selectedSections.map(sectionId => ({
          post_id: post.id,
          section_id: sectionId
        }));
        
        insertPromises.push(
          adminSupabase.from('post_sections').insert(sectionInserts)
        );
      }

      if (selectedMaterialTypes.length > 0) {
        console.log('➕ Добавляem новые связи с типами материалов:', selectedMaterialTypes);
        const typeInserts = selectedMaterialTypes.map(typeId => ({
          post_id: post.id,
          material_type_id: typeId
        }));
        
        insertPromises.push(
          adminSupabase.from('post_material_types').insert(typeInserts)
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

      console.log('🎉 Классификация поста успешно обновлена');

      toast({
        title: "Успешно",
        description: "Классификация поста обновлена",
      });

      return true;

    } catch (error: any) {
      console.error('❌ Ошибка обновления классификации поста:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось обновить классификацию поста",
        variant: "destructive",
      });
      throw error;
    }
  };

  return {
    // Данные
    posts,
    sections,
    materialTypes,
    
    // Состояния
    isLoading,
    error,
    debugInfo,
    
    // Функции
    loadAllData,
    autoClassifyPost,
    savePostClassification
  };
};
