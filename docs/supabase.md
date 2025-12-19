# Структура базы данных Supabase

## Обзор

База данных построена на PostgreSQL и использует Supabase для управления. Все таблицы находятся в схеме `public` и защищены Row Level Security (RLS).

## Таблицы

### 1. `daily_entries` - Записи о приёмах пищи

Хранит информацию о каждом приёме пищи пользователя.

**Структура:**

| Поле | Тип | Описание | Ограничения |
|------|-----|----------|-------------|
| `id` | `uuid` | Уникальный идентификатор | PRIMARY KEY, DEFAULT `gen_random_uuid()` |
| `user_id` | `uuid` | ID пользователя | NOT NULL, FOREIGN KEY → `auth.users(id)` ON DELETE CASCADE |
| `name` | `text` | Название продукта/блюда | NOT NULL |
| `kcal` | `integer` | Калории | NOT NULL |
| `protein` | `integer` | Белки (г) | DEFAULT 0 |
| `fat` | `integer` | Жиры (г) | DEFAULT 0 |
| `carbs` | `integer` | Углеводы (г) | DEFAULT 0 |
| `amount` | `numeric(10,2)` | Количество | NULL |
| `unit` | `text` | Единица измерения (г/мл) | DEFAULT 'g' |
| `eaten_at` | `timestamptz` | Время приёма пищи | NOT NULL, DEFAULT `now()` |
| `note` | `text` | Примечание (бренд, фото и т.д.) | NULL |
| `created_at` | `timestamptz` | Время создания записи | NOT NULL, DEFAULT `now()` |

**Индексы:**
- `daily_entries_user_date_idx` на `(user_id, eaten_at DESC)` - для быстрого поиска записей пользователя по дате

**RLS политики:**
- `Users can manage own entries` - пользователи могут управлять только своими записями
  - `USING`: `auth.uid() = user_id`
  - `WITH CHECK`: `auth.uid() = user_id`

**Использование:**
- Хранит все приёмы пищи пользователя
- Используется для расчёта потреблённых калорий за день
- Поле `note` может содержать ссылку на фото или другую информацию

---

### 2. `activities` - Записи о физической активности

Хранит информацию о физических активностях пользователя.

**Структура:**

| Поле | Тип | Описание | Ограничения |
|------|-----|----------|-------------|
| `id` | `uuid` | Уникальный идентификатор | PRIMARY KEY, DEFAULT `gen_random_uuid()` |
| `user_id` | `uuid` | ID пользователя | NOT NULL, FOREIGN KEY → `auth.users(id)` ON DELETE CASCADE |
| `type` | `text` | Тип активности (название) | NOT NULL |
| `duration_minutes` | `integer` | Длительность в минутах | NOT NULL |
| `calories` | `integer` | Сожжённые калории | NOT NULL |
| `occurred_at` | `timestamptz` | Время активности | NOT NULL, DEFAULT `now()` |
| `intensity` | `text` | Интенсивность (опционально) | NULL |
| `created_at` | `timestamptz` | Время создания записи | NOT NULL, DEFAULT `now()` |

**Индексы:**
- `activities_user_date_idx` на `(user_id, occurred_at DESC)` - для быстрого поиска активностей пользователя по дате

**RLS политики:**
- `Users can manage own activities` - пользователи могут управлять только своими активностями
  - `USING`: `auth.uid() = user_id`
  - `WITH CHECK`: `auth.uid() = user_id`

**Использование:**
- Хранит все активности пользователя
- Используется для расчёта сожжённых калорий за день
- Калории рассчитываются на основе MET, веса и длительности

---

### 3. `daily_states` - Состояние дня

Хранит ежедневные метрики пользователя (вода, цикл, настроение и т.д.).

**Структура:**

| Поле | Тип | Описание | Ограничения |
|------|-----|----------|-------------|
| `id` | `uuid` | Уникальный идентификатор | PRIMARY KEY, DEFAULT `gen_random_uuid()` |
| `user_id` | `uuid` | ID пользователя | NOT NULL, FOREIGN KEY → `auth.users(id)` ON DELETE CASCADE |
| `date` | `date` | Дата | NOT NULL |
| `water_intake_ml` | `integer` | Потребление воды (мл) | DEFAULT 0 |
| `water_goal_ml` | `integer` | Цель по воде (мл) | DEFAULT 2000 |
| `cycle_phase` | `text` | Фаза менструального цикла | DEFAULT 'none' |
| `mood` | `text` | Настроение | NULL |
| `symptoms` | `jsonb` | Симптомы (JSON) | NULL |
| `created_at` | `timestamptz` | Время создания | NOT NULL, DEFAULT `now()` |
| `updated_at` | `timestamptz` | Время обновления | NOT NULL, DEFAULT `now()` |

**Индексы:**
- `daily_states_user_date_uniq` UNIQUE на `(user_id, date)` - гарантирует одну запись на пользователя в день

**RLS политики:**
- `Users can manage own daily state` - пользователи могут управлять только своим состоянием
  - `USING`: `auth.uid() = user_id`
  - `WITH CHECK`: `auth.uid() = user_id`

**Использование:**
- Хранит ежедневные метрики (в первую очередь воду)
- Одна запись на пользователя в день (через UNIQUE индекс)
- Используется `upsert` для обновления существующих записей

---

### 4. `profiles` - Профили пользователей

Хранит настройки и цели пользователя.

**Структура:**

| Поле | Тип | Описание | Ограничения |
|------|-----|----------|-------------|
| `id` | `uuid` | ID пользователя | PRIMARY KEY, FOREIGN KEY → `auth.users(id)` ON DELETE CASCADE |
| `height_cm` | `integer` | Рост (см) | NULL |
| `start_weight_kg` | `numeric(5,2)` | Начальный вес (кг) | NULL |
| `current_weight_kg` | `numeric(5,2)` | Текущий вес (кг) | NULL |
| `goal_weight_kg` | `numeric(5,2)` | Целевой вес (кг) | NULL |
| `calorie_goal` | `integer` | Цель по калориям (ккал/день) | NULL |
| `protein_goal_g` | `integer` | Цель по белкам (г/день) | NULL |
| `fat_goal_g` | `integer` | Цель по жирам (г/день) | NULL |
| `carbs_goal_g` | `integer` | Цель по углеводам (г/день) | NULL |
| `water_goal_ml` | `integer` | Цель по воде (мл/день) | DEFAULT 2000 |
| `show_cycle_tracking` | `boolean` | Показывать отслеживание цикла | DEFAULT false |
| `locale` | `text` | Язык интерфейса | DEFAULT 'ru' |
| `created_at` | `timestamptz` | Время создания | NOT NULL, DEFAULT `now()` |
| `updated_at` | `timestamptz` | Время обновления | NOT NULL, DEFAULT `now()` |

**RLS политики:**
- `Users can manage own profile` - пользователи могут управлять только своим профилем
  - `USING`: `auth.uid() = id`
  - `WITH CHECK`: `auth.uid() = id`

**Использование:**
- Хранит настройки и цели пользователя
- Используется для расчёта калорий активности (нужен вес)
- Используется для отображения цели по калориям
- Создаётся автоматически при регистрации через триггер

---

## Триггеры

### `handle_new_user()`

**Назначение:** Автоматически создаёт профиль пользователя при регистрации.

**Триггер:** `on_auth_user_created`
- Срабатывает: `AFTER INSERT` на `auth.users`
- Для каждой строки: `FOR EACH ROW`

**Логика:**
```sql
INSERT INTO public.profiles (id, locale, water_goal_ml, calorie_goal, show_cycle_tracking)
VALUES (
  new.id,
  'ru',
  2000,
  1900,
  false
);
```

**Параметры безопасности:**
- `SECURITY DEFINER` - выполняется с правами создателя функции
- `SET search_path = public` - явно указывает схему

---

## Storage Buckets

### `food-photos`

**Назначение:** Хранение фотографий еды пользователей.

**Структура:**
- Путь: `{user_id}/{timestamp}.{ext}`
- Пример: `550e8400-e29b-41d4-a716-446655440000/1704067200000.jpg`

**Политики доступа:**
- Пользователи могут загружать файлы только в свою папку
- Пользователи могут читать только свои файлы

**Fallback:**
- Если Storage недоступен, фото сохраняется в base64 в поле `note` таблицы `daily_entries`

---

## Связи между таблицами

```
auth.users
  ├── profiles (1:1) - один профиль на пользователя
  ├── daily_entries (1:N) - множество записей о еде
  ├── activities (1:N) - множество активностей
  └── daily_states (1:N) - множество состояний дней
```

**Каскадное удаление:**
- При удалении пользователя из `auth.users` автоматически удаляются все связанные записи благодаря `ON DELETE CASCADE`

---

## Индексы

### Оптимизация запросов

1. **`daily_entries_user_date_idx`**
   - Поля: `(user_id, eaten_at DESC)`
   - Использование: Быстрый поиск записей пользователя за определённый период

2. **`activities_user_date_idx`**
   - Поля: `(user_id, occurred_at DESC)`
   - Использование: Быстрый поиск активностей пользователя за определённый период

3. **`daily_states_user_date_uniq`**
   - Поля: `(user_id, date)` UNIQUE
   - Использование: Гарантия одной записи на день и быстрый поиск

---

## Row Level Security (RLS)

Все таблицы защищены RLS политиками, которые гарантируют:

1. **Изоляция данных:** Пользователи видят только свои данные
2. **Безопасность:** Невозможно получить доступ к чужим данным через API
3. **Автоматическая фильтрация:** Supabase автоматически добавляет `WHERE user_id = auth.uid()` к запросам

**Политики применяются к:**
- `SELECT` - чтение данных
- `INSERT` - создание записей
- `UPDATE` - обновление записей
- `DELETE` - удаление записей

---

## Типичные запросы

### Получить все приёмы пищи за день
```sql
SELECT * FROM daily_entries
WHERE user_id = auth.uid()
  AND eaten_at >= '2025-01-08 00:00:00'
  AND eaten_at <= '2025-01-08 23:59:59'
ORDER BY eaten_at DESC;
```

### Получить все активности за день
```sql
SELECT * FROM activities
WHERE user_id = auth.uid()
  AND occurred_at >= '2025-01-08 00:00:00'
  AND occurred_at <= '2025-01-08 23:59:59'
ORDER BY occurred_at DESC;
```

### Получить состояние дня
```sql
SELECT * FROM daily_states
WHERE user_id = auth.uid()
  AND date = '2025-01-08';
```

### Получить профиль пользователя
```sql
SELECT * FROM profiles
WHERE id = auth.uid();
```

### Добавить воду (upsert)
```sql
INSERT INTO daily_states (user_id, date, water_intake_ml, water_goal_ml)
VALUES (auth.uid(), '2025-01-08', 200, 2000)
ON CONFLICT (user_id, date)
DO UPDATE SET
  water_intake_ml = daily_states.water_intake_ml + 200,
  updated_at = now();
```

---

## Миграции

### Создание таблиц

Выполнить SQL из `scripts/create-tables.sql`:
```bash
npm run sql -- "$(cat scripts/create-tables.sql)"
```

### Создание триггера

Выполнить SQL из `scripts/create-profile-trigger.sql` в Supabase SQL Editor.

---

## Рекомендации по использованию

1. **Всегда используйте `auth.uid()`** в запросах - RLS автоматически отфильтрует данные
2. **Используйте индексы** для запросов по датам
3. **Используйте `upsert`** для `daily_states` вместо проверки существования
4. **Храните даты в UTC** (`timestamptz`) для корректной работы с часовыми поясами
5. **Используйте транзакции** для атомарных операций (если нужно)

---

## Работа с SQL через скрипты

### Обзор

Проект включает систему для выполнения SQL-запросов к Supabase из командной строки. Это позволяет автоматизировать миграции, создание таблиц и другие операции с базой данных.

### Компоненты системы

#### 1. Node.js скрипт `run-sql.mjs`

**Расположение:** `scripts/run-sql.mjs`

**Назначение:** Выполняет SQL-запросы через Supabase RPC API.

**Использование:**
```bash
# Выполнить SQL напрямую
npm run sql -- "SELECT * FROM profiles LIMIT 1"

# Выполнить SQL из файла
npm run sql -- "@scripts/create-tables.sql"

# Выполнить SQL из файла (альтернативный способ)
npm run sql -- "$(cat scripts/create-tables.sql)"
```

**Как работает:**

1. **Чтение SQL:**
   - Если аргумент начинается с `@`, читает SQL из файла
   - Иначе использует аргумент как SQL-запрос напрямую
   - Поддерживает многострочные запросы

2. **Подключение к Supabase:**
   - Использует `VITE_SUPABASE_URL` из `.env`
   - Использует `SUPABASE_SERVICE_ROLE_KEY` из `.env` (не anon key!)
   - Создаёт клиент с правами администратора

3. **Выполнение:**
   - Вызывает функцию `execute_sql` через RPC
   - Передаёт SQL-запрос как параметр `query_text`
   - Выводит результат в формате JSON

**Требования:**
- Файл `.env` с переменными:
  ```
  VITE_SUPABASE_URL=https://your-project.supabase.co
  SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
  ```
- Функция `execute_sql` должна быть создана в Supabase (см. ниже)

**Безопасность:**
- ⚠️ Использует `SERVICE_ROLE_KEY` - имеет полный доступ к БД
- ⚠️ Не коммитьте `.env` файл в репозиторий
- ⚠️ Функция `execute_sql` может выполнять любой SQL

#### 2. PostgreSQL функция `execute_sql`

**Расположение:** `scripts/setup-execute-sql-function-v2.sql`

**Назначение:** Позволяет выполнять произвольный SQL через Supabase RPC API.

**Установка:**
1. Откройте Supabase Dashboard → SQL Editor
2. Скопируйте содержимое `setup-execute-sql-function-v2.sql`
3. Выполните SQL один раз

**Структура функции:**

```sql
create or replace function public.execute_sql(query_text text)
returns json
language plpgsql
security definer
```

**Логика работы:**

1. **Определение типа запроса:**
   - Если запрос начинается с `SELECT` → возвращает результат как JSON массив
   - Иначе (DDL: CREATE, DROP, ALTER и т.д.) → выполняет и возвращает статус

2. **Обработка SELECT:**
   ```sql
   execute format('select json_agg(row_to_json(t)) from (%s) t', query_text) into result;
   return coalesce(result, '[]'::json);
   ```
   - Выполняет запрос и преобразует результат в JSON
   - Возвращает пустой массив, если результатов нет

3. **Обработка DDL:**
   ```sql
   execute query_text;
   return json_build_object('success', true, 'message', 'Query executed successfully');
   ```
   - Выполняет команду и возвращает статус успеха

4. **Обработка ошибок:**
   - Перехватывает исключения и возвращает понятное сообщение об ошибке

**Параметры безопасности:**
- `SECURITY DEFINER` - выполняется с правами создателя функции (администратора)
- Доступ только для `service_role` (не для обычных пользователей)
- Права выдаются через `GRANT EXECUTE`

**Примеры использования:**

```bash
# Создать таблицу
npm run sql -- "CREATE TABLE test (id serial PRIMARY KEY, name text)"

# Вставить данные
npm run sql -- "INSERT INTO test (name) VALUES ('test')"

# Выбрать данные
npm run sql -- "SELECT * FROM test"

# Выполнить миграцию из файла
npm run sql -- "@scripts/create-tables.sql"
```

#### 3. Версии функции

**Базовая версия** (`setup-execute-sql-function.sql`):
- Поддерживает только SELECT запросы
- Возвращает результат как JSON

**Улучшенная версия** (`setup-execute-sql-function-v2.sql`):
- ✅ Поддерживает SELECT и DDL команды (CREATE, DROP, ALTER)
- ✅ Возвращает статус для DDL команд
- ✅ Более гибкая обработка ошибок

**Рекомендация:** Используйте версию v2 для полной функциональности.

### Типичные сценарии использования

#### Создание таблиц
```bash
npm run sql -- "@scripts/create-tables.sql"
```

#### Создание триггера
```bash
npm run sql -- "@scripts/create-profile-trigger.sql"
```

#### Проверка данных
```bash
npm run sql -- "SELECT COUNT(*) FROM daily_entries"
```

#### Просмотр структуры таблицы
```bash
npm run sql -- "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'profiles'"
```

#### Очистка тестовых данных
```bash
npm run sql -- "DELETE FROM daily_entries WHERE user_id = 'test-user-id'"
```

### Ограничения и особенности

1. **Размер запроса:**
   - Supabase RPC имеет ограничение на размер параметра
   - Для очень больших SQL используйте Supabase SQL Editor напрямую

2. **Транзакции:**
   - Каждый вызов `execute_sql` выполняется в отдельной транзакции
   - Для многошаговых операций используйте BEGIN/COMMIT в одном запросе

3. **Многострочные запросы:**
   - Поддерживаются через файлы или многострочные строки в bash
   - Рекомендуется использовать файлы для сложных запросов

4. **Безопасность:**
   - ⚠️ Никогда не используйте `SERVICE_ROLE_KEY` в клиентском коде
   - ⚠️ Храните `.env` файл в `.gitignore`
   - ⚠️ Ограничьте доступ к скрипту только для разработчиков

### Альтернативные способы выполнения SQL

1. **Supabase SQL Editor:**
   - Веб-интерфейс в Dashboard
   - Подходит для разовых операций и отладки

2. **psql (PostgreSQL клиент):**
   - Прямое подключение к базе данных
   - Требует настройки подключения

3. **Supabase CLI:**
   - Официальный CLI инструмент
   - Поддерживает миграции и другие операции

### Рекомендации

1. **Для миграций:** Используйте файлы SQL и скрипт `run-sql.mjs`
2. **Для отладки:** Используйте Supabase SQL Editor
3. **Для продакшена:** Создавайте миграции через Supabase Dashboard или CLI
4. **Для безопасности:** Всегда проверяйте SQL перед выполнением

---

## Будущие улучшения

- Таблица `food_photos` для более структурированного хранения фото
- Таблица `favorites` для избранных продуктов
- Таблица `cycle_tracking` для отслеживания менструального цикла
- Таблица `weight_logs` для истории веса
- Материализованные представления для аналитики

