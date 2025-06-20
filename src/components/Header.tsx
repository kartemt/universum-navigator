
import React from 'react';
import { Search, BookOpen } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const Header = () => {
  const navigate = useNavigate();

  return (
    <header className="bg-white shadow-sm border-b">
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between">
          <div 
            className="flex items-center space-x-3 cursor-pointer"
            onClick={() => navigate('/')}
          >
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-2 rounded-lg">
              <BookOpen className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">УниверсУм знаний</h1>
              <p className="text-sm text-gray-600">Автоматическая классификация полезного контента</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="hidden md:flex items-center space-x-2 text-sm text-gray-500">
              <Search className="h-4 w-4" />
              <span>Поиск и фильтрация материалов</span>
            </div>
            <button
              onClick={() => navigate('/hashtags')}
              className="text-sm text-blue-600 hover:underline"
            >
              Хештеги
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
