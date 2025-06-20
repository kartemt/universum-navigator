
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Upload, FileText } from 'lucide-react';

export const TelegramImport = () => {
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile && selectedFile.type === 'application/json') {
      setFile(selectedFile);
    } else {
      toast({
        title: "Ошибка",
        description: "Пожалуйста, выберите JSON файл",
        variant: "destructive",
      });
    }
  };

  const handleImport = async () => {
    if (!file) {
      toast({
        title: "Ошибка",
        description: "Выберите файл для импорта",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      console.log('Starting import with file:', file.name);
      
      const formData = new FormData();
      formData.append('file', file);

      const { data, error } = await supabase.functions.invoke('import-telegram-history', {
        body: formData,
        // Убираем заголовок Content-Type - браузер установит его автоматически с правильным boundary
      });

      if (error) {
        throw error;
      }

      console.log('Import result:', data);

      toast({
        title: "Импорт завершен",
        description: `Обработано ${data.processedPosts} новых постов, пропущено ${data.skippedPosts} существующих`,
      });

      setFile(null);
      // Очищаем input
      const fileInput = document.getElementById('file-input') as HTMLInputElement;
      if (fileInput) fileInput.value = '';

      // уведомляем другие компоненты об успешном импорте
      window.dispatchEvent(new Event('posts-imported'));

    } catch (error: any) {
      console.error('Import error:', error);
      const message =
        error?.message ??
        (typeof error === 'string' ? error : 'Произошла ошибка при импорте данных');
      toast({
        title: 'Ошибка импорта',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Импорт истории канала
        </CardTitle>
        <CardDescription>
          Загрузите JSON файл с экспортом истории Telegram канала
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="file-input">JSON файл экспорта</Label>
          <Input
            id="file-input"
            type="file"
            accept=".json"
            onChange={handleFileChange}
          />
          {file && (
            <p className="text-sm text-green-600">
              Выбран файл: {file.name}
            </p>
          )}
        </div>

        <Button 
          onClick={handleImport} 
          disabled={isLoading || !file}
          className="w-full"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Импортирую...
            </>
          ) : (
            <>
              <Upload className="mr-2 h-4 w-4" />
              Импортировать историю
            </>
          )}
        </Button>

        <div className="bg-blue-50 p-4 rounded-lg">
          <h4 className="font-medium text-blue-900 mb-2">Как получить файл экспорта:</h4>
          <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
            <li>Откройте Telegram Desktop</li>
            <li>Перейдите в нужный канал</li>
            <li>Нажмите на три точки → "Экспорт истории чата"</li>
            <li>Выберите формат "JSON" и нужный период</li>
            <li>Дождитесь завершения экспорта</li>
            <li>Загрузите полученный JSON файл сюда</li>
          </ol>
        </div>

        <div className="bg-yellow-50 p-4 rounded-lg">
          <h4 className="font-medium text-yellow-900 mb-2">Важно:</h4>
          <ul className="text-sm text-yellow-800 space-y-1 list-disc list-inside">
            <li>Используйте этот метод только для исторических данных</li>
            <li>Для новых сообщений используйте основную синхронизацию с ботом</li>
            <li>Дублирование постов автоматически предотвращается</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};
