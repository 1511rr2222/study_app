// Supabase 클라이언트 초기화
// - 번들러 없이 브라우저에서 바로 쓸 수 있도록 esm.sh CDN에서 라이브러리를 불러옵니다.
// - SUPABASE_URL, SUPABASE_ANON_KEY는 Supabase 프로젝트 Settings > API 에서 확인할 수 있어요.
//   anon public key는 "공개되어도 되는" 키라 프론트엔드 코드에 그대로 넣어도 안전합니다.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = 'https://otjjcetgsohyomwtamkn.supabase.co'; // ⬅️ 여기에 본인 프로젝트 URL 입력
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im90ampjZXRnc29oeW9td3RhbWtuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMwNjkzODMsImV4cCI6MjA5ODY0NTM4M30.9-c7nS0yj1HuNk5v8q3UhFHy4FXoTGHR9yEa3UIz2u4';  

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);