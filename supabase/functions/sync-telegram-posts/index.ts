
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TelegramMessage {
  message_id: number;
  date: number;
  text?: string;
  caption?: string;
  entities?: Array<{
    type: string;
    offset: number;
    length: number;
  }>;
  caption_entities?: Array<{
    type: string;
    offset: number;
    length: number;
  }>;
}

interface TelegramUpdate {
  channel_post: TelegramMessage;
}

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const telegramBotToken = Deno.env.get('TELEGRAM_BOT_TOKEN')!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting Telegram posts sync...');

    const { channelId, fromDate } = await req.json();
    
    if (!channelId) {
      return new Response(
        JSON.stringify({ error: 'Channel ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Получаем существующие разделы и типы материалов
    const { data: sections } = await supabase.from('sections').select('*');
    const { data: materialTypes } = await supabase.from('material_types').select('*');

    console.log(`Found ${sections?.length} sections and ${materialTypes?.length} material types`);

    // Получаем последний сохраненный пост для определения offset
    const { data: lastPost } = await supabase
      .from('posts')
      .select('telegram_message_id')
      .order('telegram_message_id', { ascending: false })
      .limit(1)
      .single();

    let offset = 0;
    if (lastPost) {
      offset = lastPost.telegram_message_id + 1;
    }

    console.log(`Starting from message ID: ${offset}`);

    // Получаем обновления из канала
    const telegramUrl = `https://api.telegram.org/bot${telegramBotToken}/getUpdates`;
    const response = await fetch(`${telegramUrl}?offset=${offset}&limit=100&allowed_updates=["channel_post"]`);
    const telegramData = await response.json();

    if (!telegramData.ok) {
      throw new Error(`Telegram API error: ${telegramData.description}`);
    }

    const updates: TelegramUpdate[] = telegramData.result || [];
    console.log(`Found ${updates.length} new updates`);

    let processedCount = 0;

    for (const update of updates) {
      if (!update.channel_post) continue;

      const message = update.channel_post;
      const messageText = message.text || message.caption || '';
      
      if (!messageText.trim()) continue;

      // Извлекаем хештеги
      const hashtags = extractHashtags(messageText, message.entities || message.caption_entities || []);
      
      // Генерируем заголовок (первые 100 символов текста)
      const title = messageText.split('\n')[0].substring(0, 100).trim() || 'Без заголовка';
      
      // Создаем URL поста
      const telegramUrl = `https://t.me/${channelId.replace('@', '')}/${message.message_id}`;

      try {
        // Сохраняем пост
        const { data: savedPost, error: postError } = await supabase
          .from('posts')
          .insert({
            telegram_message_id: message.message_id,
            title,
            content: messageText,
            hashtags,
            telegram_url: telegramUrl,
            published_at: new Date(message.date * 1000).toISOString(),
          })
          .select()
          .single();

        if (postError) {
          console.error(`Error saving post ${message.message_id}:`, postError);
          continue;
        }

        // Классифицируем пост по разделам
        const matchingSections = sections?.filter(section =>
          section.hashtags.some((hashtag: string) =>
            hashtags.some(postHashtag => 
              postHashtag.toLowerCase().includes(hashtag.toLowerCase()) ||
              hashtag.toLowerCase().includes(postHashtag.toLowerCase())
            )
          )
        ) || [];

        // Классифицируем пост по типам материалов
        const matchingMaterialTypes = materialTypes?.filter(materialType =>
          materialType.hashtags.some((hashtag: string) =>
            hashtags.some(postHashtag => 
              postHashtag.toLowerCase().includes(hashtag.toLowerCase()) ||
              hashtag.toLowerCase().includes(postHashtag.toLowerCase())
            )
          )
        ) || [];

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
        console.log(`Processed post ${message.message_id}: ${matchingSections.length} sections, ${matchingMaterialTypes.length} material types`);

      } catch (error) {
        console.error(`Error processing post ${message.message_id}:`, error);
      }
    }

    console.log(`Sync completed. Processed ${processedCount} posts.`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        processedPosts: processedCount,
        totalUpdates: updates.length 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in sync-telegram-posts:', error);
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

  // Дополнительно ищем хештеги регулярным выражением на случай, если entities неполные
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
