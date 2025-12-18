-- Триггер для автоматического создания профиля при регистрации пользователя
-- Выполни этот SQL в Supabase SQL Editor

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, locale, water_goal_ml, calorie_goal, show_cycle_tracking)
  values (
    new.id,
    'ru',
    2000,
    1900,
    false
  );
  return new;
end;
$$;

-- Создаём триггер, который срабатывает после создания пользователя в auth.users
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

