
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TelegramExportMessage {
  id: number;
  date: string;
  text?: string | Array<{ type: string; text: string }>;
  text_entities?: Array<{
    type: string;
    offset: number;
    length: number;
  }>;
}

interface TelegramExportData {
  name: string;
  type: string;
  id: number;
  messages: TelegramExportMessage[];
}

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting Telegram history import...');

    const formData = await req.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return new Response(
        JSON.stringify({ error: 'No file provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const jsonContent = await file.text();
    const exportData: TelegramExportData = JSON.parse(jsonContent);

    console.log(`Processing export from channel: ${exportData.name} with ${exportData.messages.length} messages`);

    // Получаем существующие разделы и типы материалов
    const { data: sections } = await supabase.from('sections').select('*');
    const { data: materialTypes } = await supabase.from('material_types').select('*');

    console.log(`Found ${sections?.length} sections and ${materialTypes?.length} material types`);

    let processedCount = 0;
    let skippedCount = 0;

    for (const message of exportData.messages) {
      try {
        // Извлекаем текст сообщения
        let messageText = '';
        if (typeof message.text === 'string') {
          messageText = message.text;
        } else if (Array.isArray(message.text)) {
          messageText = message.text.map(item => item.text || '').join('');
        }

        if (!messageText.trim()) {
          console.log(`Skipping message ${message.id}: no text content`);
          skippedCount++;
          continue;
        }

        // Проверяем, не существует ли уже этот пост
        const { data: existingPost } = await supabase
          .from('posts')
          .select('id')
          .eq('telegram_message_id', message.id)
          .single();

        if (existingPost) {
          console.log(`Post ${message.id} already exists, skipping`);
          skippedCount++;
          continue;
        }

        // Извлекаем хештеги
        const hashtags = extractHashtags(messageText, message.text_entities || []);
        console.log(`Message ${message.id} hashtags: ${hashtags.join(', ')}`);
        
        // Генерируем заголовок
        const title = messageText.split('\n')[0].substring(0, 100).trim() || 'Без заголовка';
        
        // Создаем URL поста (используем ID канала из экспорта)
        const telegramPostUrl = `https://t.me/c/${Math.abs(exportData.id)}/${message.id}`;

        // Парсим дату
        const publishedAt = new Date(message.date).toISOString();

        // Сохраняем пост
        const { data: savedPost, error: postError } = await supabase
          .from('posts')
          .insert({
            telegram_message_id: message.id,
            title,
            content: messageText,
            hashtags,
            telegram_url: telegramPostUrl,
            published_at: publishedAt,
          })
          .select()
          .single();

        if (postError) {
          console.error(`Error saving post ${message.id}:`, postError);
          continue;
        }

        console.log(`Saved post ${message.id} with ID: ${savedPost.id}`);

        // Исправленная классификация по разделам
        const matchingSections = classifyByTags(hashtags, sections || []);
        
        // Исправленная классификация по типам материалов
        const matchingMaterialTypes = classifyByTags(hashtags, materialTypes || []);

        console.log(`Classifications for post ${message.id}:`);
        console.log(`- Sections: ${matchingSections.map(s => s.name).join(', ')}`);
        console.log(`- Material types: ${matchingMaterialTypes.map(m => m.name).join(', ')}`);

        // Сохраняем связи с разделами
        for (const section of matchingSections) {
          await supabase.from('post_sections').insert({
            post_id: savedPost.id,
            section_id: section.id,
          });
        }

        // Сохраняем связи с типами материалов
        for (const materialType of matchingMaterialTypes) {
          await supabase.from('post_material_types').insert({
            post_id: savedPost.id,
            material_type_id: materialType.id,
          });
        }

        processedCount++;

      } catch (error) {
        console.error(`Error processing message ${message.id}:`, error);
      }
    }

    console.log(`Import completed. Processed ${processedCount} new posts, skipped ${skippedCount} existing posts.`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        processedPosts: processedCount,
        skippedPosts: skippedCount,
        totalMessages: exportData.messages.length,
        channelName: exportData.name,
        channelId: exportData.id
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in import-telegram-history:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function extractHashtags(text: string, entities: Array<{ type: string; offset: number; length: number; }>): string[] {
  const hashtags: string[] = [];
  
  // Извлекаем хештеги из entities
  entities.forEach(entity => {
    if (entity.type === 'hashtag') {
      const hashtag = text.substring(entity.offset + 1, entity.offset + entity.length); // +1 чтобы убрать #
      hashtags.push(hashtag);
    }
  });

  // Дополнительно ищем хештеги регулярным выражением
  const hashtagRegex = /#([а-яё\w]+)/gi;
  let match;
  while ((match = hashtagRegex.exec(text)) !== null) {
    const hashtag = match[1];
    if (!hashtags.includes(hashtag)) {
      hashtags.push(hashtag);
    }
  }

  return hashtags;
}

function classifyByTags(postHashtags: string[], categories: any[]): any[] {
  const matches: any[] = [];
  
  for (const category of categories) {
    // Проверяем точные совпадения хештегов (без учета регистра)
    const hasExactMatch = category.hashtags.some((categoryTag: string) =>
      postHashtags.some(postTag => 
        categoryTag.toLowerCase() === postTag.toLowerCase()
      )
    );
    
    if (hasExactMatch) {
      matches.push(category);
      console.log(`Exact match found: "${category.name}" for hashtags: ${postHashtags.join(', ')}`);
    }
  }
  
  return matches;
}
