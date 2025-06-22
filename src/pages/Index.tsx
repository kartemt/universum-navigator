import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { SafePostCard } from '@/components/SafePostCard';
import { FilterSidebar } from '@/components/FilterSidebar';
import { Header } from '@/components/Header';
import { SearchBar } from '@/components/SearchBar';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { ScrollToTop } from '@/components/ScrollToTop';
import { SecurityWrapper } from '@/components/SecurityWrapper';
import { useSecurity } from '@/hooks/useSecurity';
import { ContentSanitizer } from '@/utils/sanitization';

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
  const { checkRateLimit } = useSecurity();

  const { data: posts = [], isLoading } = useQuery({
    queryKey: ['posts', selectedSections, selectedMaterialTypes, searchQuery],
    queryFn: async () => {
      if (!checkRateLimit()) {
        throw new Error('Rate limit exceeded');
      }

      let query = supabase
        .from('posts')
        .select(`
          *,
          post_sections(sections(id, name)),
          post_material_types(material_types(id, name))
        `)
        .order('published_at', { ascending: false });

      // Sanitize search query before using it
      if (searchQuery) {
        const sanitizedQuery = ContentSanitizer.sanitizeText(searchQuery);
        query = query.or(`title.ilike.%${sanitizedQuery}%,content.ilike.%${sanitizedQuery}%`);
      }

      const { data, error } = await query;
      
      if (error) throw error;
      
      // Client-side filtering by sections and material types
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
      if (!checkRateLimit()) {
        throw new Error('Rate limit exceeded');
      }

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
      if (!checkRateLimit()) {
        throw new Error('Rate limit exceeded');
      }

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
    <SecurityWrapper protectContent={true}>
      <div className="min-h-screen bg-gradient-to-br from-universum-dark-blue via-universum-blue to-universum-teal font-pt-sans">
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
              <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl border border-white/30 overflow-hidden">
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
                  <div className="bg-white/90 backdrop-blur-sm rounded-3xl p-12 shadow-xl border border-white/30 max-w-md mx-auto relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-r from-universum-orange/10 to-universum-teal/10"></div>
                    <div className="relative z-10">
                      <div className="w-16 h-16 bg-gradient-to-r from-universum-orange to-universum-accent-orange rounded-full mx-auto mb-6 flex items-center justify-center shadow-lg">
                        <span className="text-2xl">🔍</span>
                      </div>
                      <h3 className="text-xl font-semibold text-universum-dark-blue mb-2 font-akrobat">
                        {searchQuery || selectedSections.length > 0 || selectedMaterialTypes.length > 0
                          ? "Ничего не найдено"
                          : "Посты загружаются"}
                      </h3>
                      <p className="text-universum-gray font-pt-sans">
                        {searchQuery || selectedSections.length > 0 || selectedMaterialTypes.length > 0
                          ? "Попробуйте изменить параметры поиска"
                          : "Контент появится здесь после загрузки"}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="bg-white/90 backdrop-blur-sm rounded-xl p-4 shadow-lg border border-white/30 relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-r from-universum-teal/5 to-universum-orange/5"></div>
                    <p className="text-sm text-universum-gray relative z-10 font-pt-sans">
                      Найдено материалов: <span className="font-semibold text-universum-blue">{posts.length}</span>
                    </p>
                  </div>
                  
                  <div className="grid gap-6">
                    {posts.map((post) => (
                      <div key={post.id} className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl border border-white/30 overflow-hidden hover:shadow-2xl transition-all duration-300 hover:scale-[1.02] relative group">
                        <div className="absolute inset-0 bg-gradient-to-r from-universum-teal/5 to-universum-orange/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                        <div className="relative z-10">
                          <SafePostCard post={post} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </main>
          </div>
        </div>
        
        <ScrollToTop />
      </div>
    </SecurityWrapper>
  );
};

export default Index;
