
-- Удаляем старую запись, если она существует
DELETE FROM public.admins WHERE email = 'admin@universum.com';

-- Вставляем администратора с реальным email
INSERT INTO public.admins (email, password_hash) 
VALUES ('kartem2001@yahoo.com', 'admin123')
ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash;
