
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

    console.log(`Attempting to sync channel: ${channelId} from date: ${fromDate}`);

    // Проверим, что бот может получить информацию о себе
    const botInfoUrl = `https://api.telegram.org/bot${telegramBotToken}/getMe`;
    const botInfoResponse = await fetch(botInfoUrl);
    const botInfo = await botInfoResponse.json();
    
    if (!botInfo.ok) {
      console.error('Bot token is invalid:', botInfo);
      return new Response(
        JSON.stringify({ error: `Invalid bot token: ${botInfo.description}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Bot info: ${botInfo.result.username} (${botInfo.result.first_name})`);

    // Получаем информацию о канале
    const chatInfoUrl = `https://api.telegram.org/bot${telegramBotToken}/getChat`;
    const chatInfoResponse = await fetch(`${chatInfoUrl}?chat_id=${encodeURIComponent(channelId)}`);
    const chatInfo = await chatInfoResponse.json();
    
    if (!chatInfo.ok) {
      console.error('Cannot access channel:', chatInfo);
      return new Response(
        JSON.stringify({ 
          error: `Cannot access channel: ${chatInfo.description}. Make sure the bot is added to the channel as an administrator.`,
          details: chatInfo 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Channel info: ${chatInfo.result.title} (${chatInfo.result.type})`);

    // Получаем существующие разделы и типы материалов
    const { data: sections } = await supabase.from('sections').select('*');
    const { data: materialTypes } = await supabase.from('material_types').select('*');

    console.log(`Found ${sections?.length} sections and ${materialTypes?.length} material types`);

    // Определяем дату начала для поиска постов
    const fromTimestamp = fromDate ? Math.floor(new Date(fromDate).getTime() / 1000) : 0;
    console.log(`Searching for posts from timestamp: ${fromTimestamp} (${new Date(fromTimestamp * 1000).toISOString()})`);

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
      console.log(`Starting from message ID: ${offset} (last saved: ${lastPost.telegram_message_id})`);
    } else {
      console.log('No existing posts found, starting from the beginning');
    }

    // Получаем все обновления начиная с последнего сохраненного поста
    let allPosts: TelegramMessage[] = [];
    let currentOffset = offset;
    let hasMorePosts = true;

    while (hasMorePosts) {
      const telegramUrl = `https://api.telegram.org/bot${telegramBotToken}/getUpdates`;
      const params = new URLSearchParams({
        offset: currentOffset.toString(),
        limit: '100',
        timeout: '10',
        allowed_updates: JSON.stringify(['channel_post'])
      });
      
      console.log(`Fetching updates from offset ${currentOffset}...`);
      
      const response = await fetch(`${telegramUrl}?${params.toString()}`);
      const telegramData = await response.json();

      if (!telegramData.ok) {
        console.error('Telegram API error:', telegramData);
        throw new Error(`Telegram API error: ${telegramData.description}`);
      }

      const updates: TelegramUpdate[] = telegramData.result || [];
      console.log(`Received ${updates.length} updates from Telegram API`);

      if (updates.length === 0) {
        hasMorePosts = false;
        break;
      }

      // Фильтруем только обновления от нужного канала
      const channelUpdates = updates.filter(update => {
        if (!update.channel_post) return false;
        
        const post = update.channel_post as any;
        if (post.chat && post.chat.id) {
          const postChatId = post.chat.id.toString();
          const targetChatId = channelId.toString().replace('@', '');
          
          return postChatId === targetChatId || postChatId === channelId;
        }
        
        return true;
      });

      // Фильтруем посты по дате
      const filteredPosts = channelUpdates
        .map(update => update.channel_post)
        .filter(post => post.date >= fromTimestamp);

      console.log(`Found ${channelUpdates.length} channel updates, ${filteredPosts.length} after date filter`);

      allPosts.push(...filteredPosts);

      // Обновляем offset для следующей итерации
      if (updates.length > 0) {
        currentOffset = Math.max(...updates.map(u => u.update_id || 0)) + 1;
      } else {
        hasMorePosts = false;
      }

      // Если получили менее 100 обновлений, значит больше нет
      if (updates.length < 100) {
        hasMorePosts = false;
      }
    }

    console.log(`Total posts found after filtering: ${allPosts.length}`);

    let processedCount = 0;

    for (const message of allPosts) {
      const messageText = message.text || message.caption || '';
      
      console.log(`Processing message ${message.message_id}: "${messageText.substring(0, 50)}..."`);
      
      if (!messageText.trim()) {
        console.log(`Skipping message ${message.message_id}: no text content`);
        continue;
      }

      // Проверяем, не существует ли уже этот пост
      const { data: existingPost } = await supabase
        .from('posts')
        .select('id')
        .eq('telegram_message_id', message.message_id)
        .single();

      if (existingPost) {
        console.log(`Post ${message.message_id} already exists, skipping`);
        continue;
      }

      // Извлекаем хештеги
      const hashtags = extractHashtags(messageText, message.entities || message.caption_entities || []);
      console.log(`Found hashtags: ${hashtags.join(', ')}`);
      
      // Генерируем заголовок (первые 100 символов текста)
      const title = messageText.split('\n')[0].substring(0, 100).trim() || 'Без заголовка';
      
      // Создаем URL поста
      const telegramPostUrl = `https://t.me/${channelId.replace('@', '')}/${message.message_id}`;

      try {
        // Сохраняем пост
        const { data: savedPost, error: postError } = await supabase
          .from('posts')
          .insert({
            telegram_message_id: message.message_id,
            title,
            content: messageText,
            hashtags,
            telegram_url: telegramPostUrl,
            published_at: new Date(message.date * 1000).toISOString(),
          })
          .select()
          .single();

        if (postError) {
          console.error(`Error saving post ${message.message_id}:`, postError);
          continue;
        }

        console.log(`Saved post ${message.message_id} with ID: ${savedPost.id}`);

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

    console.log(`Sync completed. Processed ${processedCount} new posts from ${allPosts.length} total posts found.`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        processedPosts: processedCount,
        totalUpdates: allPosts.length,
        channelInfo: chatInfo.result,
        botInfo: botInfo.result,
        fromDate: fromDate,
        fromTimestamp: fromTimestamp
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
