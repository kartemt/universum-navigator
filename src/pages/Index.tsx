
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      <Header />
      
      <div className="container mx-auto px-4 py-8">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 shadow-lg border border-white/60 max-w-4xl mx-auto">
            <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-universum-dark-blue via-universum-blue to-universum-purple bg-clip-text text-transparent mb-4">
              База знаний УниверсУм
            </h1>
            <p className="text-lg text-universum-gray leading-relaxed max-w-2xl mx-auto">
              Найдите полезный контент из телеграм-канала @UniversUm_R: стратегии, кейсы, инструменты развития и многое другое
            </p>
          </div>
        </div>

        <div className="mb-8">
          <SearchBar 
            value={searchQuery} 
            onChange={setSearchQuery}
            placeholder="Поиск по заголовкам и содержимому..."
          />
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          <aside className="lg:w-80">
            <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-white/60 overflow-hidden">
              <FilterSidebar
                sections={sections}
                materialTypes={materialTypes}
                selectedSections={selectedSections}
                selectedMaterialTypes={selectedMaterialTypes}
                onSectionsChange={setSelectedSections}
                onMaterialTypesChange={setSelectedMaterialTypes}
              />
            </div>
          </aside>

          <main className="flex-1">
            {posts.length === 0 ? (
              <div className="text-center py-16">
                <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-12 shadow-lg border border-white/60 max-w-md mx-auto">
                  <div className="w-16 h-16 bg-gradient-to-r from-universum-blue to-universum-purple rounded-full mx-auto mb-6 flex items-center justify-center">
                    <span className="text-2xl">🔍</span>
                  </div>
                  <h3 className="text-xl font-semibold text-universum-dark-blue mb-2">
                    {searchQuery || selectedSections.length > 0 || selectedMaterialTypes.length > 0
                      ? "Ничего не найдено"
                      : "Посты загружаются"}
                  </h3>
                  <p className="text-universum-gray">
                    {searchQuery || selectedSections.length > 0 || selectedMaterialTypes.length > 0
                      ? "Попробуйте изменить параметры поиска"
                      : "Контент появится здесь после загрузки"}
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Stats bar */}
                <div className="bg-white/80 backdrop-blur-sm rounded-lg p-4 shadow-sm border border-white/60">
                  <p className="text-sm text-universum-gray">
                    Найдено материалов: <span className="font-semibold text-universum-blue">{posts.length}</span>
                  </p>
                </div>
                
                {/* Posts grid */}
                <div className="grid gap-6">
                  {posts.map((post) => (
                    <div key={post.id} className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-white/60 overflow-hidden hover:shadow-xl transition-all duration-300">
                      <PostCard post={post} />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
};

export default Index;
