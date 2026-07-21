# Team 2 DB Credentials — Supabase project UserRoles

## Direct Postgres (FastAPI / asyncpg / psql)
```
postgresql://postgres.gbzvunmywuuwfhyhsahl:T2people_37d100993b04889d942b4ddb@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres
```
- Transaction pooler (port 6543) — best for FastAPI/asyncpg
- Session pooler (port 5432, same host/user) — use if you need prepared statements / LISTEN
- Password: `T2people_37d100993b04889d942b4ddb`

## Supabase API
- URL: `https://gbzvunmywuuwfhyhsahl.supabase.co`
- service_role key (backend only, bypasses RLS):
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdienZ1bm15d3V1d2ZoeWhzYWhsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NDYyNjQ1NiwiZXhwIjoyMTAwMjAyNDU2fQ.Mv15BHTTgFYrs0nFhSN22wTlL1SbV2-W8zCkeVEtE9k
```
- anon key (sees nothing — RLS on, no policies):
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdienZ1bm15d3V1d2ZoeWhzYWhsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ2MjY0NTYsImV4cCI6MjEwMDIwMjQ1Nn0.Ws4cTAg3ecxZFLQCVo1JqFzupo3QRO67Wf_FhXC69NE
```

## .env for FastAPI
```
DATABASE_URL=postgresql://postgres.gbzvunmywuuwfhyhsahl:T2people_37d100993b04889d942b4ddb@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres
SUPABASE_URL=https://gbzvunmywuuwfhyhsahl.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdienZ1bm15d3V1d2ZoeWhzYWhsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NDYyNjQ1NiwiZXhwIjoyMTAwMjAyNDU2fQ.Mv15BHTTgFYrs0nFhSN22wTlL1SbV2-W8zCkeVEtE9k
```
