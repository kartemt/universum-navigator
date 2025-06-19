
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Download, Calendar } from 'lucide-react';

export const AdminPanel = () => {
  const [channelId, setChannelId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSyncPosts = async () => {
    if (!channelId.trim()) {
      toast({
        title: "Ошибка",
        description: "Введите ID или username канала",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      console.log('Starting sync with channel:', channelId);
      
      const { data, error } = await supabase.functions.invoke('sync-telegram-posts', {
        body: { 
          channelId: channelId.trim(),
          fromDate: new Date().toISOString()
        }
      });

      if (error) {
        throw error;
      }

      console.log('Sync result:', data);

      toast({
        title: "Синхронизация завершена",
        description: `Обработано ${data.processedPosts} постов из ${data.totalUpdates} обновлений`,
      });

    } catch (error) {
      console.error('Sync error:', error);
      toast({
        title: "Ошибка синхронизации",
        description: error.message || "Произошла ошибка при загрузке постов",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Админ панель
          </CardTitle>
          <CardDescription>
            Управление загрузкой и синхронизацией постов из Telegram-канала
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="channelId">ID или username канала</Label>
            <Input
              id="channelId"
              placeholder="@your_channel или -1001234567890"
              value={channelId}
              onChange={(e) => setChannelId(e.target.value)}
            />
            <p className="text-sm text-gray-500">
              Введите username канала (например, @channelname) или его ID
            </p>
          </div>

          <Button 
            onClick={handleSyncPosts} 
            disabled={isLoading || !channelId.trim()}
            className="w-full"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Синхронизация...
              </>
            ) : (
              <>
                <Calendar className="mr-2 h-4 w-4" />
                Загрузить посты
              </>
            )}
          </Button>

          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">Как работает система:</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Загружаются новые посты из указанного канала</li>
              <li>• Автоматически извлекаются хештеги</li>
              <li>• Посты классифицируются по разделам и типам материалов</li>
              <li>• Избегается дублирование уже загруженных постов</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
