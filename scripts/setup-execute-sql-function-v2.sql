-- Обновлённая функция для выполнения произвольного SQL (включая DDL)
-- Выполни этот SQL в Supabase SQL Editor, чтобы обновить функцию

create or replace function public.execute_sql(query_text text)
returns json
language plpgsql
security definer
as $$
declare
  result json;
  query_upper text;
begin
  -- Убираем лишние пробелы и переводим в верхний регистр для проверки
  query_upper := upper(trim(query_text));
  
  -- Если это SELECT запрос, возвращаем результат как JSON
  if query_upper like 'SELECT%' then
    execute format('select json_agg(row_to_json(t)) from (%s) t', query_text) into result;
    return coalesce(result, '[]'::json);
  else
    -- Для DDL (CREATE, DROP, ALTER и т.д.) просто выполняем и возвращаем статус
    execute query_text;
    return json_build_object('success', true, 'message', 'Query executed successfully');
  end if;
exception
  when others then
    raise exception 'SQL error: %', sqlerrm;
end;
$$;

-- Даём права на выполнение функции (только для service role)
grant execute on function public.execute_sql(text) to service_role;

