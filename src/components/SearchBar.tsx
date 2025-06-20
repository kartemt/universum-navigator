
import React from 'react';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  value,
  onChange,
  placeholder = "Поиск..."
}) => {
  return (
    <div className="relative max-w-2xl mx-auto">
      <div className="relative">
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-white/60 overflow-hidden">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-universum-gray h-5 w-5" />
            <Input
              type="text"
              placeholder={placeholder}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              className="pl-12 pr-12 py-4 text-lg border-0 bg-transparent focus:ring-2 focus:ring-universum-blue/20 focus:border-transparent rounded-2xl placeholder:text-universum-light-gray"
            />
            {value && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onChange('')}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0 text-universum-gray hover:text-universum-blue hover:bg-universum-blue/10"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
