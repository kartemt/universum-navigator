
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

        // Улучшенная классификация по разделам
        const matchingSections = classifyByTags(hashtags, sections || [], 'sections');
        
        // Улучшенная классификация по типам материалов
        const matchingMaterialTypes = classifyByTags(hashtags, materialTypes || [], 'material_types');

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
        console.log(`Processed post ${message.id}: ${matchingSections.length} sections, ${matchingMaterialTypes.length} material types`);

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

function classifyByTags(postHashtags: string[], categories: any[], type: string): any[] {
  const matches: { category: any; score: number }[] = [];
  
  for (const category of categories) {
    let score = 0;
    let exactMatches = 0;
    
    // Считаем точные совпадения хештегов
    for (const categoryTag of category.hashtags) {
      for (const postTag of postHashtags) {
        if (categoryTag.toLowerCase() === postTag.toLowerCase()) {
          exactMatches++;
          score += 10; // Высокий балл за точное совпадение
        } else if (
          categoryTag.toLowerCase().includes(postTag.toLowerCase()) ||
          postTag.toLowerCase().includes(categoryTag.toLowerCase())
        ) {
          score += 3; // Средний балл за частичное совпадение
        }
      }
    }
    
    // Добавляем категорию только если есть хотя бы одно точное совпадение
    // или несколько частичных совпадений с высоким суммарным баллом
    if (exactMatches > 0 || score >= 6) {
      matches.push({ category, score });
      console.log(`${type} "${category.name}" matched with score: ${score} (exact matches: ${exactMatches})`);
    }
  }
  
  // Сортируем по убыванию баллов и берем только лучшие совпадения
  matches.sort((a, b) => b.score - a.score);
  
  // Возвращаем категории с высоким баллом (не менее 70% от максимального)
  if (matches.length > 0) {
    const maxScore = matches[0].score;
    const threshold = Math.max(6, maxScore * 0.7);
    return matches.filter(match => match.score >= threshold).map(match => match.category);
  }
  
  return [];
}
