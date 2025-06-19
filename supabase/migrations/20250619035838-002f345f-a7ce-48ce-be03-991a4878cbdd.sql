
-- Создаем таблицу для разделов (тематических категорий)
CREATE TABLE public.sections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  hashtags TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Создаем таблицу для типов материалов
CREATE TABLE public.material_types (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  hashtags TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Создаем таблицу для постов
CREATE TABLE public.posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  telegram_message_id INTEGER NOT NULL UNIQUE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  hashtags TEXT[] NOT NULL DEFAULT '{}',
  telegram_url TEXT NOT NULL,
  published_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Создаем связующую таблицу между постами и разделами
CREATE TABLE public.post_sections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE,
  section_id UUID REFERENCES public.sections(id) ON DELETE CASCADE,
  UNIQUE(post_id, section_id)
);

-- Создаем связующую таблицу между постами и типами материалов
CREATE TABLE public.post_material_types (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE,
  material_type_id UUID REFERENCES public.material_types(id) ON DELETE CASCADE,
  UNIQUE(post_id, material_type_id)
);

-- Создаем таблицу для админов
CREATE TABLE public.admins (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  ip_whitelist TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Включаем RLS для всех таблиц
ALTER TABLE public.sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.material_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_material_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;

-- Политики для публичного доступа к чтению постов и классификаций
CREATE POLICY "Anyone can view sections" ON public.sections FOR SELECT USING (true);
CREATE POLICY "Anyone can view material types" ON public.material_types FOR SELECT USING (true);
CREATE POLICY "Anyone can view posts" ON public.posts FOR SELECT USING (true);
CREATE POLICY "Anyone can view post sections" ON public.post_sections FOR SELECT USING (true);
CREATE POLICY "Anyone can view post material types" ON public.post_material_types FOR SELECT USING (true);

-- Политики для админов (пока простые, потом добавим аутентификацию)
CREATE POLICY "Admins can manage sections" ON public.sections FOR ALL USING (true);
CREATE POLICY "Admins can manage material types" ON public.material_types FOR ALL USING (true);
CREATE POLICY "Admins can manage posts" ON public.posts FOR ALL USING (true);
CREATE POLICY "Admins can manage post sections" ON public.post_sections FOR ALL USING (true);
CREATE POLICY "Admins can manage post material types" ON public.post_material_types FOR ALL USING (true);
CREATE POLICY "Admins can manage admins" ON public.admins FOR ALL USING (true);

-- Заполняем начальные данные для разделов
INSERT INTO public.sections (name, hashtags) VALUES
('Стратегия и бизнес-моделирование', ARRAY['бизнес', 'драйв_в_дело', 'делай', 'МСПспасибо', 'кейсы', 'предпринимательство', 'системноемышление', 'стратегия', 'финансы', 'гранты']),
('Инновации и развитие продукта', ARRAY['ИИ', 'AI']),
('Лидерство и развитие персонала', ARRAY['softskills', 'вдохновение', 'адизес', 'джохари', 'лидерство', 'личное_развитие', 'менторство', 'мотивация_размышления_выходные', 'управление', 'рост', 'саморазвитие', 'энергия', 'тревога']),
('Командное развитие и фасилитация', ARRAY['команда', 'командообразование', 'сопротивление', 'тиминг', 'прокрастинация']),
('Операционная эффективность и процессы', ARRAY['тайм_менеджмент', 'управление_вниманием']);

-- Заполняем начальные данные для типов материалов
INSERT INTO public.material_types (name, hashtags) VALUES
('Дискуссия', ARRAY['дискуссия']),
('Квиз', ARRAY['квиз']),
('Книги', ARRAY['книги']),
('Фильмы', ARRAY['фильмы']),
('Упражнения', ARRAY['упражнения']),
('Эфир', ARRAY['эфир']),
('Статьи', ARRAY['статьи']),
('Мероприятия', ARRAY['мероприятия', 'SELFMADEWOMAN2025', 'Skoltech', 'форум']),
('Кейсы', ARRAY['кейсы']);
