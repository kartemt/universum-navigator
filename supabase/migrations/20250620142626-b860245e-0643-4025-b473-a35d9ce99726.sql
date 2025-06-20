
-- Вставляем администратора по умолчанию
INSERT INTO public.admins (email, password_hash) 
VALUES ('admin@universum.com', 'admin123')
ON CONFLICT (email) DO NOTHING;
