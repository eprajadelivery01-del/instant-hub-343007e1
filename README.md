# App Marketplace (Instant Hub)

## Como enviar atualizaÃ§Ãµes para a App Store (Apple)
Este projeto utiliza Capacitor. Ao fazer alteraÃ§Ãµes, se ocorrer problemas de compilaÃ§Ã£o no Mac devido Ã  falta de arquivos do iOS (`config.xml`, `capacitor.config.json` ou Ã­cones faltando), certifique-se de rodar:
`npx cap sync ios` e `npx @capacitor/assets generate --ios` no ambiente de compilaÃ§Ã£o, ou garantir que esses arquivos sejam forÃ§ados no Github. O erro `invalid escape sequence` no Mac tambÃ©m pode ocorrer se o `Package.swift` do Capacitor estiver usando barras invertidas de Windows (`\`) - troque por barras normais (`/`).

### 1. PrÃ©-requisitos (Chave da API App Store Connect)
VocÃª precisa de uma chave `.p8` gerada no App Store Connect com acesso de Administrador. Salve-a no Mac remoto:
```bash
mkdir -p ~/.private_keys
cat << 'EOF' > ~/.private_keys/AuthKey_SUACHAVE.p8
-----BEGIN PRIVATE KEY-----
(sua chave aqui)
-----END PRIVATE KEY-----
EOF
```

### 2. Script de Build e Upload (Sem Xcode App)
Substitua `TEAM_ID`, `KEY_ID` e `ISSUER_ID` pelos seus dados reais.

```bash
cd ~/Documents/instant-hub-343007e1
git pull origin main

mkdir -p build
cat << EOF > build/ExportOptions.plist
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>method</key>
    <string>app-store</string>
    <key>teamID</key>
    <string>SEU_TEAM_ID</string>
    <key>manageAppVersionAndBuildNumber</key>
    <true/>
</dict>
</plist>
EOF

rm -rf build/App.xcarchive build/App.ipa

# 1. Archive
xcodebuild -project ios/App/App.xcodeproj -scheme App -configuration Release archive -archivePath build/App.xcarchive DEVELOPMENT_TEAM="SEU_TEAM_ID" -allowProvisioningUpdates -authenticationKeyPath "$HOME/.private_keys/AuthKey_SUACHAVE.p8" -authenticationKeyID "SEU_KEY_ID" -authenticationKeyIssuerID "SEU_ISSUER_ID"

# 2. Export
xcodebuild -exportArchive -archivePath build/App.xcarchive -exportOptionsPlist build/ExportOptions.plist -exportPath build/ -allowProvisioningUpdates -authenticationKeyPath "$HOME/.private_keys/AuthKey_SUACHAVE.p8" -authenticationKeyID "SEU_KEY_ID" -authenticationKeyIssuerID "SEU_ISSUER_ID"

# 3. Upload
xcrun altool --upload-app -f build/App.ipa -t ios --apiKey "SEU_KEY_ID" --apiIssuer "SEU_ISSUER_ID"
```

## Bugs Conhecidos e Soluções (Marketplace vs Lojista)

### 1. Fuso Horário Diferente Quebrando "Aberta Agora"
**O Bug:** O código no storeHours.ts pegava o fuso do servidor/navegador, fechando as lojas em MT quando acessado da nuvem (UTC).
**A Solução:** Forçar Intl.DateTimeFormat com "America/Cuiaba" (fuso local).

### 2. Lojista Preenchendo "business_hours" como texto inválido
**O Bug:** Se o lojista digita "07:00 - 10:00", o Zod falha e o parseBusinessHours ignora. O sistema retornava true por engano, deixando a loja aberta 24h.
**A Solução:** Se parseBusinessHours falhar, isStoreOpenBySchedule retorna false por segurança. Lojas com cronograma malformado ficam fechadas até o lojista corrigir.

### 3. Lovable Preview Desatualizado
**O Bug:** O cliente não via as correções na tela mesmo após commits no GitHub.
**A Solução:** É obrigatório clicar em "Sync with GitHub" ou "Pull" no Lovable.
