
-- Удаляем все связи постов с разделами и типами материалов
DELETE FROM public.post_sections;
DELETE FROM public.post_material_types;

-- Удаляем все посты
DELETE FROM public.posts;
