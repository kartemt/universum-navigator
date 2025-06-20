
-- Обновляем хеш пароля для admin123 с использованием SHA-256
UPDATE public.admins 
SET password_hash = '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9'
WHERE email = 'kartem2001@yahoo.com';
