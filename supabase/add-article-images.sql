-- Image fournie par le flux RSS de chaque article (media:content, enclosure…).
-- Elle sert d'illustration quand la page de l'article ne peut pas être lue.
-- Run once in Supabase -> SQL Editor.

alter table articles add column if not exists image_url text;
