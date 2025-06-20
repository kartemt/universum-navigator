
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
  chat?: {
    id: number;
    title?: string;
    username?: string;
    type?: string;
  };
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
    const targetChatId = chatInfo.result.id.toString();
    console.log(`Target chat ID: ${targetChatId}`);

    // Получаем существующие разделы и типы материалов
    const { data: sections } = await supabase.from('sections').select('*');
    const { data: materialTypes } = await supabase.from('material_types').select('*');

    console.log(`Found ${sections?.length} sections and ${materialTypes?.length} material types`);

    // Определяем дату начала для поиска постов
    const fromTimestamp = fromDate ? Math.floor(new Date(fromDate).getTime() / 1000) : Math.floor((Date.now() - 24 * 60 * 60 * 1000) / 1000);
    console.log(`Searching for posts from timestamp: ${fromTimestamp} (${new Date(fromTimestamp * 1000).toISOString()})`);

    // Получаем обновления с большим лимитом и правильными параметрами
    console.log('Fetching recent updates from Telegram...');
    
    const updatesUrl = `https://api.telegram.org/bot${telegramBotToken}/getUpdates`;
    const params = new URLSearchParams({
      limit: '100',
      allowed_updates: JSON.stringify(['channel_post'])
    });
    
    const response = await fetch(`${updatesUrl}?${params.toString()}`);
    const telegramData = await response.json();

    console.log('Telegram API response:', telegramData.ok ? 'Success' : 'Failed', telegramData);

    let allPosts: TelegramMessage[] = [];

    if (telegramData.ok) {
      const updates = telegramData.result || [];
      console.log(`Received ${updates.length} recent updates from Telegram API`);

      // Фильтруем обновления для нашего канала
      const channelUpdates = updates.filter((update: any) => {
        if (!update.channel_post || !update.channel_post.chat) {
          console.log('Update without channel_post or chat:', update);
          return false;
        }
        
        const postChatId = update.channel_post.chat.id.toString();
        const matches = postChatId === targetChatId;
        console.log(`Update chat ID: ${postChatId}, target: ${targetChatId}, matches: ${matches}`);
        return matches;
      });

      console.log(`Found ${channelUpdates.length} updates from target channel`);

      // Применяем фильтр по дате и проверяем существование постов
      const filteredPosts = [];
      
      for (const update of channelUpdates) {
        const post = update.channel_post;
        
        // Проверяем дату
        const isAfterDate = post.date >= fromTimestamp;
        const postDate = new Date(post.date * 1000).toISOString();
        console.log(`Post ${post.message_id} date: ${postDate}, timestamp: ${post.date}, filter timestamp: ${fromTimestamp}, passes date filter: ${isAfterDate}`);
        
        if (!isAfterDate) {
          console.log(`Skipping post ${post.message_id}: too old`);
          continue;
        }

        // Проверяем, не существует ли уже этот пост
        const { data: existingPost } = await supabase
          .from('posts')
          .select('id')
          .eq('telegram_message_id', post.message_id)
          .single();

        if (existingPost) {
          console.log(`Skipping post ${post.message_id}: already exists in database`);
          continue;
        }

        console.log(`Post ${post.message_id} is new and within date range, adding to processing queue`);
        filteredPosts.push(post);
      }

      allPosts = filteredPosts;
      console.log(`Total posts to process: ${allPosts.length}`);
    } else {
      console.error('Failed to get updates from Telegram:', telegramData);
      return new Response(
        JSON.stringify({ error: `Failed to get updates from Telegram: ${telegramData.description}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let processedCount = 0;

    for (const message of allPosts) {
      const messageText = message.text || message.caption || '';
      
      console.log(`Processing message ${message.message_id}: "${messageText.substring(0, 50)}..."`);
      
      if (!messageText.trim()) {
        console.log(`Skipping message ${message.message_id}: no text content`);
        continue;
      }

      // Извлекаем хештеги
      const hashtags = extractHashtags(messageText, message.entities || message.caption_entities || []);
      console.log(`Found hashtags for message ${message.message_id}:`, hashtags);
      
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
        totalFound: allPosts.length,
        channelInfo: chatInfo.result,
        botInfo: botInfo.result,
        fromDate: fromDate,
        fromTimestamp: fromTimestamp,
        targetChatId: targetChatId,
        method: 'bot_recent_updates_improved'
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
