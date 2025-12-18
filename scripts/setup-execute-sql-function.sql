-- Создаём функцию для выполнения произвольного SQL через Supabase API
-- ВНИМАНИЕ: Эта функция позволяет выполнять любой SQL, используйте только с service role key!
-- Выполни этот SQL один раз в Supabase SQL Editor

create or replace function public.execute_sql(query_text text)
returns json
language plpgsql
security definer
as $$
declare
  result json;
begin
  -- Выполняем SQL и возвращаем результат как JSON
  execute format('select json_agg(row_to_json(t)) from (%s) t', query_text) into result;
  return coalesce(result, '[]'::json);
exception
  when others then
    raise exception 'SQL error: %', sqlerrm;
end;
$$;

-- Даём права на выполнение функции (только для service role)
grant execute on function public.execute_sql(text) to service_role;

