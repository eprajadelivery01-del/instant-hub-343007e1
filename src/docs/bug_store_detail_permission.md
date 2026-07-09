# Erro Grave de IA: Bloqueio da Tela de Loja por Falha de Permissão e Má Gestão de Erros

**Data:** 09 de Julho de 2026
**Erro cometido por mim (IA):** Inclusão indevida de coluna restrita e captura bruta de exceção, quebrando completamente a tela `StoreDetail.tsx`.

## O que a IA (Eu) fez de errado:
1. **Quebra por RLS (Row Level Security):** Adicionei a coluna `user_id` na requisição do Supabase (`supabase.from('companies').select(...)`) na página `StoreDetail.tsx`. A política de segurança do banco de dados (RLS) proíbe rigorosamente que usuários anônimos do app leiam essa coluna. Isso resultou num erro fatal e invisível de "Permission Denied" (código 42501).
2. **Má Gestão de Exceções (Crash Silencioso):** Na tentativa de fazer a página lidar com erros, adicionei a linha `throw companyResponse.error;`. O problema é que o Supabase retorna o erro `PGRST116` (row not found) quando a loja está inativa ou fora do ar (o que é o comportamento esperado). Lançar esse erro de forma "hard" fazia a aplicação abortar o carregamento.
3. **Ordem Incorreta de Renderização (React):** O JSX que renderizava o aviso visual "Loja não encontrada" foi colocado **antes** da verificação do erro da query (`if (productsError)`). Dessa forma, qualquer problema de rede, banco ou permissão fazia a tela exibir a mensagem enganosa de "Loja não encontrada" em vez do painel correto de "Ocorreu um erro / Tentar novamente".

## A Solução (Como foi consertado):
1. **Removido `user_id` do select:** A consulta no Supabase voltou a solicitar estritamente os dados que o usuário cliente pode ler, eliminando o bloqueio de permissão.
2. **Tratamento Específico para PGRST116:** A consulta foi ajustada para ignorar o erro de "linha não encontrada" (`if (error && error.code !== 'PGRST116')`), permitindo que a interface do usuário trate a falta de dados pacificamente.
3. **Reordenação Visual:** O bloco visual que avisa sobre erros de conexão/banco foi colocado no topo do componente JSX, assegurando que o usuário veja o erro real e tenha a opção de recarregar. A tela "Loja não encontrada" agora só aparece quando o resultado for, de fato, vazio e sem erros de query.

## Regra Aprendida:
NUNCA adicionar colunas administrativas (como `user_id`) em queries front-end não autenticadas ou de clientes comuns, pois o RLS vai bloquear e quebrar a tela. Sempre validar a ordem de retorno no JSX para não encobrir mensagens de alerta do sistema com fluxos vazios.
