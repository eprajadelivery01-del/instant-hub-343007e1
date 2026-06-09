🚨 ERRO DETECTADO NO SISTEMA 🚨

📱 App: Painel Lojista
🕒 Hora: 09 /06 / 2026, 08: 21:04
🔗 URL: https://lojista.eprajadelivery.com/business

👤 Usuário: Anônimo(Não autenticado)

❌ Mensagem: [Console Error] Invalid Refresh Token: Refresh Token Not Found
AuthApiError: Invalid Refresh Token: Refresh Token Not Found
    at tF(https://lojista.eprajadelivery.com/assets/index-Data7hxk.js:95:8717)
  at async Due(https://lojista.eprajadelivery.com/assets/index-Data7hxk.js:95:9711)
    at async zt(https://lojista.eprajadelivery.com/assets/index-Data7hxk.js:95:9369)
      at async https://lojista.eprajadelivery.com/assets/index-Data7hxk.js:111:20344
      at async https://lojista.eprajadelivery.com/assets/index-Data7hxk.js:95:3871

📝 Stack Trace:
      Error
    at Sde.console.error(https://lojista.eprajadelivery.com/assets/index-Data7hxk.js:112:362)
        at yde._recoverAndRefresh(https://lojista.eprajadelivery.com/assets/index-Data7hxk.js:111:22205)
          at async yde._initialize(https://lojista.eprajadelivery.com/assets/index-Data7hxk.js:110:18310)
            at async https://lojista.eprajadelivery.com/assets/index-Data7hxk.js:110:17401

⚙️ Detalhes Extras:
            {
              "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36",
              "screenResolution": "1600x773",
              "time": "2026-06-09T12:21:03.316Z",
              "isConsoleError": true
            }const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const env = fs.readFileSync('../pronto-agora-hub/.env', 'utf8');
const key = env.match(/VITE_SUPABASE_PUBLISHABLE_KEY="(.*)"/)[1];
const url = env.match(/VITE_SUPABASE_URL="(.*)"/)[1];
const s = createClient(url, key);
async function test() {
  const { data } = await s.storage.listBuckets();
  console.log('Buckets on VITE_SUPABASE_URL:', data?.map(b => b.name));
}
test();
