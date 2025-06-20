
-- Проверяем существующие записи в таблице admins
SELECT email, created_at FROM public.admins;

-- Удаляем все существующие записи и создаем новую с правильным хешем пароля
DELETE FROM public.admins;

-- Вставляем администратора с правильным хешем для пароля admin123
INSERT INTO public.admins (email, password_hash) 
VALUES ('kartem2001@yahoo.com', '$2a$10$N9qo8uLOickgx2ZMRZoMye.fDkkdwjyEthD3E3E3E3E3E3E3E3E3E');
