
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Download, Calendar, FileText, Settings, Edit, Hash } from 'lucide-react';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { TelegramImport } from './TelegramImport';
import { PasswordChange } from './PasswordChange';
import { PostManagement } from './PostManagement';
import { SectionManagement } from './SectionManagement';
import { MaterialTypeManagement } from './MaterialTypeManagement';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { logger, GENERIC_ERRORS } from '@/utils/logger';

export const AdminPanel = () => {
  const [channelId, setChannelId] = useState('@UniversUm_R');
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSyncPosts = async () => {
    if (!channelId.trim()) {
      toast({
        title: "Ошибка",
        description: GENERIC_ERRORS.INVALID_INPUT,
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      logger.debug('Starting Telegram sync', { channelId: channelId.trim() });
      
      const { data, error } = await supabase.functions.invoke('sync-telegram-posts', {
        body: { 
          channelId: channelId.trim(),
          fromDate: startDate.toISOString()
        }
      });

      if (error) {
        logger.error('Telegram sync function error');
        throw new Error(GENERIC_ERRORS.OPERATION_FAILED);
      }

      logger.info('Telegram sync completed', { 
        processedPosts: data?.processedPosts, 
        totalFound: data?.totalFound 
      });

      toast({
        title: "Синхронизация завершена",
        description: `Обработано ${data.processedPosts} постов из ${data.totalFound} найденных`,
      });

    } catch (error: any) {
      logger.error('Telegram sync error');
      toast({
        title: "Ошибка синхронизации",
        description: GENERIC_ERRORS.OPERATION_FAILED,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2 font-akrobat">Панель администратора</h1>
          <p className="text-gray-600 font-pt-sans">Управление контентом базы знаний УниверсУм</p>
        </div>
        
        <Tabs defaultValue="sync" className="max-w-6xl mx-auto">
          <TabsList className="grid w-full grid-cols-6 bg-white border border-gray-200">
            <TabsTrigger value="sync" className="flex items-center gap-2 text-gray-700 data-[state=active]:bg-universum-blue data-[state=active]:text-white">
              <Download className="h-4 w-4" />
              Синхронизация
            </TabsTrigger>
            <TabsTrigger value="import" className="flex items-center gap-2 text-gray-700 data-[state=active]:bg-universum-blue data-[state=active]:text-white">
              <FileText className="h-4 w-4" />
              Импорт истории
            </TabsTrigger>
            <TabsTrigger value="manage" className="flex items-center gap-2 text-gray-700 data-[state=active]:bg-universum-blue data-[state=active]:text-white">
              <Edit className="h-4 w-4" />
              Посты
            </TabsTrigger>
            <TabsTrigger value="sections" className="flex items-center gap-2 text-gray-700 data-[state=active]:bg-universum-blue data-[state=active]:text-white">
              <Hash className="h-4 w-4" />
              Разделы
            </TabsTrigger>
            <TabsTrigger value="types" className="flex items-center gap-2 text-gray-700 data-[state=active]:bg-universum-blue data-[state=active]:text-white">
              <FileText className="h-4 w-4" />
              Типы материалов
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2 text-gray-700 data-[state=active]:bg-universum-blue data-[state=active]:text-white">
              <Settings className="h-4 w-4" />
              Настройки
            </TabsTrigger>
          </TabsList>

          <TabsContent value="sync">
            <Card className="bg-white border border-gray-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-gray-900 font-akrobat">
                  <Download className="h-5 w-5" />
                  Синхронизация с Telegram ботом
                </CardTitle>
                <CardDescription className="text-gray-600 font-pt-sans">
                  Загрузка новых постов через Telegram бота (рекомендуется для текущих сообщений)
                </CardDescription>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="channelId" className="text-gray-700 font-pt-sans">ID или username канала</Label>
                  <Input
                    id="channelId"
                    placeholder="@your_channel или -1001234567890"
                    value={channelId}
                    onChange={(e) => setChannelId(e.target.value)}
                    className="bg-white border-gray-300 text-gray-900"
                  />
                  <p className="text-sm text-gray-500 font-pt-sans">
                    Введите username канала (например, @channelname) или его ID
                  </p>
                </div>

                <div className="space-y-2">
                  <Label className="text-gray-700 font-pt-sans">Дата начала загрузки</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal bg-white border-gray-300 text-gray-900 hover:bg-gray-50",
                          !startDate && "text-gray-500"
                        )}
                      >
                        <Calendar className="mr-2 h-4 w-4" />
                        {startDate ? format(startDate, "dd.MM.yyyy") : "Выберите дату"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 bg-white border border-gray-200">
                      <CalendarComponent
                        mode="single"
                        selected={startDate}
                        onSelect={setStartDate}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <p className="text-sm text-gray-500 font-pt-sans">
                    Посты будут загружены начиная с этой даты
                  </p>
                </div>

                <Button 
                  onClick={handleSyncPosts} 
                  disabled={isLoading || !channelId.trim()}
                  className="w-full bg-universum-blue hover:bg-universum-dark-blue text-white"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Синхронизация...
                    </>
                  ) : (
                    <>
                      <Calendar className="mr-2 h-4 w-4" />
                      Загрузить новые посты
                    </>
                  )}
                </Button>

                <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                  <h4 className="font-medium text-green-900 mb-2 font-akrobat">Рекомендуется для:</h4>
                  <ul className="text-sm text-green-800 space-y-1 list-disc list-inside font-pt-sans">
                    <li>Загрузки новых сообщений</li>
                    <li>Регулярной синхронизации</li>
                    <li>Автоматического обновления контента</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="import">
            <TelegramImport />
          </TabsContent>

          <TabsContent value="manage">
            <PostManagement />
          </TabsContent>

          <TabsContent value="sections">
            <SectionManagement />
          </TabsContent>

          <TabsContent value="types">
            <MaterialTypeManagement />
          </TabsContent>

          <TabsContent value="settings">
            <div className="space-y-6">
              <div className="bg-white rounded-lg p-6 border border-gray-200">
                <h3 className="text-lg font-medium mb-4 text-gray-900 font-akrobat">Безопасность</h3>
                <PasswordChange />
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};
