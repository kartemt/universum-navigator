
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { PostCard } from '@/components/PostCard';
import { FilterSidebar } from '@/components/FilterSidebar';
import { Header } from '@/components/Header';
import { SearchBar } from '@/components/SearchBar';
import { LoadingSpinner } from '@/components/LoadingSpinner';

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

const Index = () => {
  const [selectedSections, setSelectedSections] = useState<string[]>([]);
  const [selectedMaterialTypes, setSelectedMaterialTypes] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  const { data: posts = [], isLoading } = useQuery({
    queryKey: ['posts', selectedSections, selectedMaterialTypes, searchQuery],
    queryFn: async () => {
      let query = supabase
        .from('posts')
        .select(`
          *,
          post_sections(sections(id, name)),
          post_material_types(material_types(id, name))
        `)
        .order('published_at', { ascending: false });

      // Фильтрация по поисковому запросу
      if (searchQuery) {
        query = query.or(`title.ilike.%${searchQuery}%,content.ilike.%${searchQuery}%`);
      }

      const { data, error } = await query;
      
      if (error) throw error;
      
      // Фильтрация по разделам и типам материалов на клиенте
      let filteredData = data || [];
      
      if (selectedSections.length > 0) {
        filteredData = filteredData.filter(post =>
          post.post_sections.some(ps => selectedSections.includes(ps.sections.id))
        );
      }
      
      if (selectedMaterialTypes.length > 0) {
        filteredData = filteredData.filter(post =>
          post.post_material_types.some(pmt => selectedMaterialTypes.includes(pmt.material_types.id))
        );
      }
      
      return filteredData as Post[];
    },
  });

  const { data: sections = [] } = useQuery({
    queryKey: ['sections'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sections')
        .select('*')
        .order('name');
      
      if (error) throw error;
      return data;
    },
  });

  const { data: materialTypes = [] } = useQuery({
    queryKey: ['material_types'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('material_types')
        .select('*')
        .order('name');
      
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <Header />
      
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <SearchBar 
            value={searchQuery} 
            onChange={setSearchQuery}
            placeholder="Поиск по заголовкам и содержимому..."
          />
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          <aside className="lg:w-80">
            <FilterSidebar
              sections={sections}
              materialTypes={materialTypes}
              selectedSections={selectedSections}
              selectedMaterialTypes={selectedMaterialTypes}
              onSectionsChange={setSelectedSections}
              onMaterialTypesChange={setSelectedMaterialTypes}
            />
          </aside>

          <main className="flex-1">
            {posts.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500 text-lg">
                  {searchQuery || selectedSections.length > 0 || selectedMaterialTypes.length > 0
                    ? "По заданным фильтрам ничего не найдено"
                    : "Посты еще не загружены"}
                </p>
              </div>
            ) : (
              <div className="grid gap-6">
                {posts.map((post) => (
                  <PostCard key={post.id} post={post} />
                ))}
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
};

export default Index;
