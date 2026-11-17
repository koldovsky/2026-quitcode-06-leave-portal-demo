-- Профіль: користувач сам виправляє ім'я та робочий email (сторінка профілю — наступним PR).
-- Колонковий grant, як і раніше: role у переліку немає, тож самопідвищення ролі цей grant не відкриває
-- (AC-USERS-09). Рядок — лише власний: політика profiles_update_own.
grant update (full_name, email) on table public.profiles to authenticated;
