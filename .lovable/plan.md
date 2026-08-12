# Push Firebase nativo no iPhone e Android

## Objetivo
Garantir que as atualizações de pedido cheguem à central de notificações do aparelho usando tokens FCM válidos, sem conflito entre plugins nativos.

## Plano
1. **Unificar o plugin de push**
   - Remover `@capacitor/push-notifications`, pois a documentação do `@capacitor-firebase/messaging` proíbe a coexistência dos dois plugins.
   - Manter somente `@capacitor-firebase/messaging` para permissão, token FCM, recebimento, clique e canais Android.

2. **Corrigir o registro do token no app**
   - Migrar `useOrderNotifications` para os eventos `tokenReceived`, `notificationReceived` e `notificationActionPerformed`.
   - Obter o token inicial com `FirebaseMessaging.getToken()` e sincronizá-lo em `device_tokens`.
   - Preservar a abertura da tela correta do pedido ao tocar na notificação.

3. **Atualizar diagnóstico e configuração nativa**
   - Migrar a tela de diagnóstico para consultar permissões e token pelo Firebase Messaging.
   - Configurar `FirebaseMessaging.presentationOptions` para exibir alerta, som e badge no primeiro plano do iPhone.
   - Adicionar a opção SwiftPM exigida pelo plugin no Capacitor.

4. **Simplificar o AppDelegate do iOS**
   - Seguir o fluxo oficial: encaminhar o token APNs bruto ao plugin e deixar o SDK Firebase produzir o token FCM.
   - Manter a capability Push Notifications, `App.entitlements` e `GoogleService-Info.plist` vinculados ao target.

5. **Sincronizar e validar**
   - Executar a sincronização nativa do Capacitor para remover o plugin antigo dos projetos iOS/Android.
   - Rodar testes e verificar que o pacote nativo contém somente a integração Firebase Messaging.
   - Validar em aparelho físico com build assinado: permissão concedida, token FCM salvo e push exibido na central.

## Detalhes técnicos
- O erro de `aps-environment` ainda depende de um provisioning profile com Push Notifications habilitado no Apple Developer; o código não consegue adicionar essa autorização a um perfil já emitido.
- O build Codemagic continuará bloqueando a publicação caso `GoogleService-Info.plist` ou o entitlement APNs estejam ausentes.
- Depois das alterações nativas, será necessário baixar as mudanças, executar `npm install`, `npx cap sync` e gerar um novo IPA/AAB; uma instalação antiga não recebe a correção.
