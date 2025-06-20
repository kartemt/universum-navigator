
-- Удаляем все разделы, созданные до сегодняшнего дня (2025-06-20)
DELETE FROM public.sections 
WHERE created_at < '2025-06-20'::date;

-- Удаляем все типы материалов, созданные до сегодняшнего дня (2025-06-20)
DELETE FROM public.material_types 
WHERE created_at < '2025-06-20'::date;
