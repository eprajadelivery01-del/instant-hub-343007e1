# Corrigir ícones do manifest (404 icon-192.webp)

## Diagnóstico

- O `manifest.json` publicado hoje em `https://eprajadelivery.com/manifest.json` aponta para `/icon-192x192.png`, `/icon-512x512.png` e `/logo.png` — não para `.webp`.
- O erro do console cita `https://eprajadelivery.com/icons/icon-192.webp`, que responde **404**. Esse caminho só existe no manifest antigo empacotado no app iOS (`ios/App/App/public/manifest.json`, que usa `../icons/icon-*.webp`). Ou seja: é um manifest **antigo em cache** (PWA instalado / build nativo antigo), não o do site atual.
- Problema real adicional: os PNGs em `public/` não são quadrados — `icon-192x192.png` e `icon-512x512.png` têm **379x340 px**. O manifest declara 192x192 e 512x512 com `purpose: any maskable`, então o navegador rejeita/deforma o ícone na instalação.

## O que fazer

1. Gerar ícones quadrados de verdade a partir de `public/logo.png`, com padding (sem esticar) e fundo da marca:
   - `public/icon-192x192.png` (192x192)
   - `public/icon-512x512.png` (512x512)
   - `public/apple-touch-icon.png` (180x180)
2. Criar os caminhos legados `public/icons/icon-48|72|96|128|192|256|512.webp` apontando para o mesmo ícone, para que manifests antigos em cache (site e build iOS) parem de dar 404.
3. Alinhar `ios/App/App/public/manifest.json` com o manifest da web (mesmos caminhos absolutos `/icons/...`, sem `../`), e remover a divergência com `manifest.webmanifest` (que ainda usa `/logo.png` como 192/512).
4. Adicionar versão de cache (`?v=8`) nas referências de ícone do manifest para forçar revalidação nos apps já instalados.

## Detalhes técnicos

- Redimensionamento via ImageMagick: `-resize 192x192 -background "#0D0D0D" -gravity center -extent 192x192` (ou fundo transparente para o PNG maskable, mantendo margem de ~10% de safe zone).
- Nenhuma mudança em código React; apenas assets em `public/`, `public/manifest.json`, `public/manifest.webmanifest` e o manifest espelhado do iOS.
- Após publicar, o PWA instalado só pega o manifest novo no próximo ciclo de atualização; para o app nativo é preciso `npx cap sync` + novo build.
