import { readFileSync } from 'fs'
import { join } from 'path'

export default defineEventHandler((event) => {
  setHeader(event, 'Content-Type', 'text/html; charset=utf-8')
  return readFileSync(join(process.cwd(), 'public', 'docs.html'), 'utf8')
})
