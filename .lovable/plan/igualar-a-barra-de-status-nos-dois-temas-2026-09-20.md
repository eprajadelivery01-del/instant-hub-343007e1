# Igualar a barra de status nos dois temas

## Resultado
A área da hora, sinal e bateria terá exatamente a mesma aparência do print do tema escuro em ambos os temas: fundo cinza `#5A5A5A` e ícones brancos.

## Correção
- Manter `#5A5A5A` como cor única da barra, sem depender do tema claro ou escuro.
- Adicionar no Android uma faixa nativa fixa atrás da área da hora e bateria. Isso evita que o Android 15/16 deixe a barra transparente e revele o fundo branco do tema claro.
- Reaplicar os ícones claros quando o aplicativo abrir, voltar ao primeiro plano ou trocar de tema.
- Não alterar o cabeçalho, o conteúdo das telas, a barra inferior ou as cores gerais dos temas.

## Detalhes técnicos
- A configuração atual já solicita `#5A5A5A`, mas o projeto usa Android alvo 36, onde a barra pode ser transparente; por isso o fundo branco da página aparece no tema claro.
- A proteção será feita na camada nativa da área de status, usando a altura real informada pelo aparelho, em vez de depender somente da antiga configuração de cor da janela.
- As configurações web e do Capacitor continuarão alinhadas com a mesma cor para evitar diferenças entre aplicativo instalado e navegador.

## Validação
- Confirmar compilação sem erros.
- Conferir no preview que nenhuma outra parte da tela mudou.
- Gerar e instalar um novo build Android, executar `npx cap sync` e testar alternando claro/escuro no aparelho real.
- Confirmar visualmente que hora, sinal e bateria permanecem brancos sobre `#5A5A5A` nos dois temas.
