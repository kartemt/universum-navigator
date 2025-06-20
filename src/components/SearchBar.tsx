
import React, { useState } from 'react';
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
  const [inputValue, setInputValue] = useState(value);

  const handleSearch = () => {
    onChange(inputValue);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handleClear = () => {
    setInputValue('');
    onChange('');
  };

  return (
    <div className="relative max-w-2xl mx-auto">
      <div className="relative">
        <div className="bg-white/95 backdrop-blur-sm rounded-3xl shadow-xl border border-white/40 overflow-hidden relative">
          <div className="absolute inset-0 bg-gradient-to-r from-universum-teal/10 to-universum-orange/10"></div>
          <div className="relative z-10">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSearch}
              className="absolute left-3 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0 text-universum-blue hover:text-universum-orange hover:bg-universum-orange/10 rounded-full"
            >
              <Search className="h-5 w-5" />
            </Button>
            <Input
              type="text"
              placeholder={placeholder}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              className="pl-14 pr-14 py-6 text-lg border-0 bg-transparent focus:ring-2 focus:ring-universum-teal/30 focus:border-transparent rounded-3xl placeholder:text-universum-light-gray font-pt-sans"
            />
            {inputValue && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClear}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0 text-universum-gray hover:text-universum-orange hover:bg-universum-orange/10 rounded-full"
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
