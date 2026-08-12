# Corrigir notificações push no iPhone

## Diagnóstico confirmado

O erro ocorre antes da geração do token: o iOS está recusando o registro no APNs porque o aplicativo instalado não foi assinado com um entitlement `aps-environment` válido.

No projeto atual:
- o arquivo `App.entitlements` declara `aps-environment`, porém só está associado à configuração **Release** do target;
- a capability **Push Notifications** não está registrada no projeto Xcode;
- o pacote Swift gerado não lista os plugins nativos `PushNotifications` e `LocalNotifications`;
- o pipeline instala manualmente um provisioning profile, mas não valida se esse profile contém `aps-environment` para `br.com.epraja.appFma`;
- o `GoogleService-Info.plist` do app iOS ainda não está incluído no target.

## Implementação

1. **Corrigir o target iOS**
   - Vincular `App.entitlements` às configurações Debug e Release.
   - Registrar a capability `com.apple.Push` no target.
   - Manter `aps-environment` compatível com a assinatura, deixando o profile definir o ambiente correto no build.
   - Adicionar `GoogleService-Info.plist` ao target e à fase de recursos, usando o arquivo correspondente ao bundle ID `br.com.epraja.appFma`.

2. **Completar a integração nativa do Firebase/Capacitor**
   - Garantir que `@capacitor/push-notifications` e `@capacitor/local-notifications` façam parte do pacote Swift do app iOS após o sync.
   - Adicionar/configurar o Firebase Messaging no target iOS quando necessário para converter o token APNs em token FCM aceito pelo pipeline existente.
   - Preservar o encaminhamento de registro APNs já existente no `AppDelegate`.

3. **Tornar o registro do app mais robusto**
   - Registrar os listeners antes de chamar `PushNotifications.register()`, evitando perder eventos rápidos de sucesso ou erro.
   - Diferenciar erro de configuração APNs de permissão negada pelo cliente e evitar repetição do mesmo alerta em cada navegação.
   - Manter a sincronização do token válido com `device_tokens` e o fluxo atual da Edge Function `send-push`.

4. **Blindar o build de produção**
   - Atualizar o workflow iOS para inspecionar o provisioning profile antes do archive.
   - Interromper o build com mensagem clara se bundle ID, application identifier ou `aps-environment` estiverem ausentes/incorretos.
   - Após gerar o IPA, validar que o app assinado realmente contém o entitlement APNs e o `GoogleService-Info.plist`.

5. **Validação final**
   - Confirmar que o sync do Capacitor preserva os plugins e configurações.
   - Validar o projeto iOS e os testes existentes disponíveis no ambiente.
   - Gerar uma lista curta para o teste em aparelho físico: instalação limpa, permissão, token salvo em `device_tokens`, push com app aberto, em segundo plano e encerrado.

## Dependência fornecida pelo cliente

Será necessário anexar ao projeto o `GoogleService-Info.plist` já existente para o bundle ID `br.com.epraja.appFma`. A chave APNs já vinculada no Firebase será validada no teste final; ela não deve ser colocada no repositório.
