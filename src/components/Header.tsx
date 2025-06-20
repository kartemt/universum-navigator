
import React from 'react';
import { Search, BookOpen } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const Header = () => {
  const navigate = useNavigate();

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between">
          <div 
            className="flex items-center space-x-4 cursor-pointer group"
            onClick={() => navigate('/')}
          >
            <div className="bg-universum-gradient p-3 rounded-xl shadow-lg group-hover:shadow-xl transition-shadow duration-200">
              <BookOpen className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-universum-dark to-universum-blue bg-clip-text text-transparent">
                УниверсУм знаний
              </h1>
              <p className="text-sm text-universum-gray font-medium">
                Автоматическая классификация полезного контента
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-6">
            <div className="hidden md:flex items-center space-x-2 text-sm text-universum-gray">
              <Search className="h-4 w-4" />
              <span>Поиск и фильтрация материалов</span>
            </div>
            <button
              onClick={() => navigate('/hashtags')}
              className="text-sm text-universum-blue hover:text-universum-dark font-medium transition-colors duration-200 hover:underline"
            >
              Хештеги
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
