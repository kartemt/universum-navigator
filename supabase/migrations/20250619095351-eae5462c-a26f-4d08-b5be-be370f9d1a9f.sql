
-- Удаляем неправильные разделы, которые были добавлены ранее
DELETE FROM sections WHERE name LIKE 'Финансы -%' OR name LIKE 'Драйв в дело -%' OR name LIKE 'Технологии -%' OR name LIKE 'Новости -%';

-- Обновляем существующие разделы с правильными хештегами
UPDATE sections SET hashtags = ARRAY['бизнес', 'драйв_в_дело', 'делай', 'МСПспасибо', 'кейсы', 'предпринимательство', 'системноемышление', 'стратегия', 'финансы', 'гранты'] 
WHERE name = 'Стратегия и бизнес-моделирование';

UPDATE sections SET hashtags = ARRAY['ИИ', 'AI'] 
WHERE name = 'Инновации и развитие продукта';

UPDATE sections SET hashtags = ARRAY['softskills', 'вдохновение', 'адизес', 'джохари', 'лидерство', 'личное_развитие', 'менторство', 'мотивация_размышления_выходные', 'управление', 'рост', 'саморазвитие', 'энергия', 'тревога'] 
WHERE name = 'Лидерство и развитие персонала';

UPDATE sections SET hashtags = ARRAY['команда', 'командообразование', 'сопротивление', 'тиминг', 'прокрастинация'] 
WHERE name = 'Командное развитие и фасилитация';

UPDATE sections SET hashtags = ARRAY['тайм_менеджмент', 'управление_вниманием'] 
WHERE name = 'Операционная эффективность и процессы';

-- Обновляем типы материалов с правильными хештегами
UPDATE material_types SET hashtags = ARRAY['дискуссия'] WHERE name = 'Дискуссия';
UPDATE material_types SET hashtags = ARRAY['квиз'] WHERE name = 'Квиз';
UPDATE material_types SET hashtags = ARRAY['книги'] WHERE name = 'Книги';
UPDATE material_types SET hashtags = ARRAY['фильмы'] WHERE name = 'Фильмы';
UPDATE material_types SET hashtags = ARRAY['упражнения'] WHERE name = 'Упражнения';
UPDATE material_types SET hashtags = ARRAY['эфир'] WHERE name = 'Эфир';
UPDATE material_types SET hashtags = ARRAY['статьи'] WHERE name = 'Статьи';
UPDATE material_types SET hashtags = ARRAY['мероприятия', 'SELFMADEWOMAN2025', 'Skoltech', 'форум'] WHERE name = 'Мероприятия';
UPDATE material_types SET hashtags = ARRAY['кейсы'] WHERE name = 'Кейсы';
