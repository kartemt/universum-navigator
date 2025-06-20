
import React from 'react';
import { Search, BookOpen, Rocket } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const Header = () => {
  const navigate = useNavigate();

  return (
    <header className="bg-white/95 backdrop-blur-sm shadow-lg border-b border-universum-teal/20">
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between">
          <div 
            className="flex items-center space-x-4 cursor-pointer group"
            onClick={() => navigate('/')}
          >
            <div className="relative">
              <div className="bg-universum-cosmic p-4 rounded-xl shadow-xl group-hover:shadow-2xl transition-all duration-300 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-universum-dark-blue to-universum-teal opacity-20"></div>
                <Rocket className="h-10 w-10 text-white relative z-10" />
              </div>
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-universum-dark-blue via-universum-blue to-universum-teal bg-clip-text text-transparent">
                УниверсУм знаний
              </h1>
              <p className="text-sm text-universum-gray font-medium">
                Автоматическая классификация полезного контента
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-6">
            <div className="hidden md:flex items-center space-x-2 text-sm text-universum-gray">
              <Search className="h-4 w-4 text-universum-teal" />
              <span>Поиск и фильтрация материалов</span>
            </div>
            <button
              onClick={() => navigate('/hashtags')}
              className="px-4 py-2 bg-gradient-to-r from-universum-orange to-universum-accent-orange text-white font-medium rounded-lg hover:shadow-lg transition-all duration-200 hover:scale-105"
            >
              Хештеги
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
