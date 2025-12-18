import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

async function main() {
  let sqlText = process.argv.slice(2).join(' ').trim()

  // Если первый аргумент начинается с @, читаем из файла
  if (sqlText.startsWith('@')) {
    const filePath = sqlText.slice(1).trim()
    const fullPath = join(__dirname, '..', filePath)
    try {
      sqlText = readFileSync(fullPath, 'utf-8')
    } catch (error) {
      console.error(`Cannot read file: ${filePath}`, error.message)
      process.exit(1)
    }
  }

  if (!sqlText) {
    console.error('Usage: npm run sql -- "SELECT 1" or npm run sql -- @scripts/file.sql')
    process.exit(1)
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    console.error(
      'VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env',
    )
    process.exit(1)
  }

  // Создаём клиент с service role key для админских операций
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })

  try {
    // Вызываем функцию execute_sql через RPC
    // (эту функцию нужно создать в Postgres один раз)
    const { data, error } = await supabase.rpc('execute_sql', {
      query_text: sqlText,
    })

    if (error) {
      console.error('SQL error:', error.message)
      process.exitCode = 1
      return
    }

    console.log(JSON.stringify(data, null, 2))
  } catch (error) {
    console.error('Error:', error.message)
    process.exitCode = 1
  }
}

main()
