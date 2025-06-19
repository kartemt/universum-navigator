
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Filter, X } from 'lucide-react';

interface FilterSidebarProps {
  sections: Array<{ id: string; name: string }>;
  materialTypes: Array<{ id: string; name: string }>;
  selectedSections: string[];
  selectedMaterialTypes: string[];
  onSectionsChange: (sections: string[]) => void;
  onMaterialTypesChange: (types: string[]) => void;
}

export const FilterSidebar: React.FC<FilterSidebarProps> = ({
  sections,
  materialTypes,
  selectedSections,
  selectedMaterialTypes,
  onSectionsChange,
  onMaterialTypesChange,
}) => {
  const handleSectionToggle = (sectionId: string) => {
    if (selectedSections.includes(sectionId)) {
      onSectionsChange(selectedSections.filter(id => id !== sectionId));
    } else {
      onSectionsChange([...selectedSections, sectionId]);
    }
  };

  const handleMaterialTypeToggle = (typeId: string) => {
    if (selectedMaterialTypes.includes(typeId)) {
      onMaterialTypesChange(selectedMaterialTypes.filter(id => id !== typeId));
    } else {
      onMaterialTypesChange([...selectedMaterialTypes, typeId]);
    }
  };

  const clearAllFilters = () => {
    onSectionsChange([]);
    onMaterialTypesChange([]);
  };

  const hasActiveFilters = selectedSections.length > 0 || selectedMaterialTypes.length > 0;

  return (
    <Card className="sticky top-4">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center text-lg">
            <Filter className="h-5 w-5 mr-2" />
            Фильтры
          </CardTitle>
          {hasActiveFilters && (
            <Button
              variant="outline"
              size="sm"
              onClick={clearAllFilters}
              className="text-xs"
            >
              <X className="h-3 w-3 mr-1" />
              Очистить
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        <div>
          <h3 className="font-medium text-gray-900 mb-3">Разделы</h3>
          <div className="space-y-2">
            {sections.map((section) => (
              <div key={section.id} className="flex items-center space-x-2">
                <Checkbox
                  id={`section-${section.id}`}
                  checked={selectedSections.includes(section.id)}
                  onCheckedChange={() => handleSectionToggle(section.id)}
                />
                <label
                  htmlFor={`section-${section.id}`}
                  className="text-sm text-gray-700 cursor-pointer leading-tight"
                >
                  {section.name}
                </label>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h3 className="font-medium text-gray-900 mb-3">Типы материалов</h3>
          <div className="space-y-2">
            {materialTypes.map((type) => (
              <div key={type.id} className="flex items-center space-x-2">
                <Checkbox
                  id={`type-${type.id}`}
                  checked={selectedMaterialTypes.includes(type.id)}
                  onCheckedChange={() => handleMaterialTypeToggle(type.id)}
                />
                <label
                  htmlFor={`type-${type.id}`}
                  className="text-sm text-gray-700 cursor-pointer"
                >
                  {type.name}
                </label>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
