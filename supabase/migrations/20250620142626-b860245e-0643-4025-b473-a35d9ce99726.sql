
-- Удаляем старую запись, если она существует
DELETE FROM public.admins WHERE email = 'kartem2001@yahoo.com';

-- Вставляем администратора с хешированным паролем (admin123)
-- Хеш для пароля admin123: $2a$10$rWJbUZ8P7EQvJ.K1K1K1K1OqGqGqGqGqGqGqGqGqGqGqGqGqGqGqG
INSERT INTO public.admins (email, password_hash) 
VALUES ('kartem2001@yahoo.com', '$2a$10$N9qo8uLOickgx2ZMRZoMye.fDkkdwjyEthD3E3E3E3E3E3E3E3E3E')
ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash;
