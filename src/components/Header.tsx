
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
                <img 
                  src="/lovable-uploads/042c386e-ed2a-4e24-99d8-37f6edd77253.png" 
                  alt="UniversUm Logo" 
                  className="h-10 w-10 relative z-10 object-contain"
                />
              </div>
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-universum-dark-blue via-universum-blue to-universum-teal bg-clip-text text-transparent font-akrobat">
                УниверсУм знаний
              </h1>
              <p className="text-xs md:text-sm text-universum-gray font-medium font-pt-sans max-w-2xl">
                найдите полезный контент из телеграм-канала @UniversUm_R: стратегии, кейсы, инструменты развития и многое другое
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-6">
            <button
              onClick={() => navigate('/hashtags')}
              className="px-4 py-2 bg-gradient-to-r from-universum-orange to-universum-accent-orange text-white font-medium rounded-lg hover:shadow-lg transition-all duration-200 hover:scale-105 font-pt-sans"
            >
              Хештеги
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
