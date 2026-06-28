Plano para corrigir o checkout agora:

1. Corrigir o erro real na Edge Function `create-order`
   - Alterar a busca de produtos para não depender de `.select('*')`, porque isso pode trazer incompatibilidades/erros silenciosos com schemas diferentes.
   - Buscar somente os campos necessários: `id`, `company_id`, `name`, `price`.
   - Separar a checagem de disponibilidade em consultas tolerantes para `active` e `is_active`, sem quebrar o pedido quando uma dessas colunas não existir.
   - Se a coluna de disponibilidade não existir, assumir o produto como disponível em vez de bloquear a compra.

2. Melhorar o retorno de erro para descobrir a causa em produção
   - Garantir que qualquer falha de produtos retorne `request_id`, `failure_kind`, `debug_code`, mensagem original e hint no `audit_logs`.
   - No frontend, logar no console o `request_id`, `error_code`, `failure_kind` e `debug_code` recebidos da Edge Function.

3. Corrigir a mensagem genérica no Checkout
   - Remover o fallback que continua exibindo “Não conseguimos carregar os produtos agora...” para erros desconhecidos de produto.
   - Mostrar uma mensagem acionável ao cliente, por exemplo: “Não foi possível validar sua sacola. Atualize a sacola ou tente novamente.”
   - Manter botão “Tentar novamente” apenas para falhas realmente retriáveis.

4. Evitar spam no Monitorepraja
   - Não reportar para Telegram toasts repetidos do mesmo erro de checkout quando já houver `request_id`/diagnóstico da Edge Function.
   - Continuar registrando falhas técnicas reais no `audit_logs` da Edge Function.

5. Observação obrigatória de produção
   - Após aplicar o código, será necessário fazer deploy da Edge Function `create-order` no Supabase externo `nptkxlrhrlssdsevpgqe`, senão o domínio `eprajadelivery.com` continuará usando a versão antiga.