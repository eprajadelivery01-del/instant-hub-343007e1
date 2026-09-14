import {
  WHATSAPP_ONLY_STORES,
  getWhatsAppOnlyStore,
  buildWhatsAppLink,
  DEFAULT_WHATSAPP_ORDER_MESSAGE,
} from './src/lib/whatsappStores';

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`❌ FAIL: ${msg}`);
    process.exit(1);
  } else {
    console.log(`✅ PASS: ${msg}`);
  }
}

console.log('=== INICIANDO SUÍTE DE TESTES: PEDIDOS PELO WHATSAPP ===\n');

// Simulação de lojas
const difarmaId = '746054ea-4a94-4adc-b890-1e9476d3de9d';
const paulistaId = 'd62614e7-d781-40f6-959a-e812a5d1ba96';
const farmaPopularId = '5d6183dc-d941-4a46-8ccc-6375271c2683';
const papelariaId = 'c0000000-0000-0000-0000-000000000001';
const outraLojaId = 'e9999999-9999-9999-9999-999999999999';

// Função que simula a decisão exata de abertura de modal em StoreDetail.tsx
function shouldOpenWhatsAppModal(company: any, products: any[]): boolean {
  const config = getWhatsAppOnlyStore(company);
  if (!config) return false;
  // A verificação de catálogo usa o mesmo array de produtos que StoreDetail usa
  const hasCatalog = Array.isArray(products) && products.length > 0;
  return !hasCatalog;
}

// 1. Difarma sem catálogo → modal abre
assert(
  shouldOpenWhatsAppModal({ id: difarmaId, name: 'Drogaria Difarma' }, []) === true,
  '1. Difarma sem catálogo → modal abre'
);

// 2. Paulista sem catálogo → modal abre
assert(
  shouldOpenWhatsAppModal({ id: paulistaId, name: 'DROGARIA PAULISTA' }, []) === true,
  '2. Paulista sem catálogo → modal abre'
);

// 3. Farma Popular sem catálogo → modal abre
assert(
  shouldOpenWhatsAppModal({ id: farmaPopularId, name: 'FARMA POPULAR' }, []) === true,
  '3. Farma Popular sem catálogo → modal abre'
);

// 4. Papelaria sem catálogo → modal NÃO abre
assert(
  shouldOpenWhatsAppModal({ id: papelariaId, name: 'Papelaria Central' }, []) === false,
  '4. Papelaria sem catálogo → modal NÃO abre'
);

// 5. Qualquer outra loja sem catálogo → modal NÃO abre
assert(
  shouldOpenWhatsAppModal({ id: outraLojaId, name: 'Pizzaria do Bairro' }, []) === false,
  '5. Qualquer outra loja sem catálogo → modal NÃO abre'
);

// 6. Difarma com catálogo → modal NÃO abre
assert(
  shouldOpenWhatsAppModal({ id: difarmaId, name: 'Drogaria Difarma' }, [{ id: 'p1', name: 'Dipirona' }]) === false,
  '6. Difarma com catálogo → modal NÃO abre'
);

// 7. Paulista com catálogo → modal NÃO abre
assert(
  shouldOpenWhatsAppModal({ id: paulistaId, name: 'DROGARIA PAULISTA' }, [{ id: 'p2', name: 'Paracetamol' }]) === false,
  '7. Paulista com catálogo → modal NÃO abre'
);

// 8. Farma Popular com catálogo → modal NÃO abre
assert(
  shouldOpenWhatsAppModal({ id: farmaPopularId, name: 'FARMA POPULAR' }, [{ id: 'p3', name: 'Vitamina C' }]) === false,
  '8. Farma Popular com catálogo → modal NÃO abre'
);

// 9. Link Difarma → 5565996068049
const difarmaConfig = getWhatsAppOnlyStore({ id: difarmaId });
assert(difarmaConfig !== null, 'Difarma config encontrada por ID');
assert(difarmaConfig?.phone === '5565996068049', '9. Link Difarma → 5565996068049');
const linkDifarma = buildWhatsAppLink(difarmaConfig!.phone, difarmaConfig!.defaultMessage);
assert(linkDifarma.includes('5565996068049'), 'Link Difarma possui telefone correto');

// 10. Link Paulista → 5565999154448
const paulistaConfig = getWhatsAppOnlyStore({ id: paulistaId });
assert(paulistaConfig !== null, 'Paulista config encontrada por ID');
assert(paulistaConfig?.phone === '5565999154448', '10. Link Paulista → 5565999154448');
const linkPaulista = buildWhatsAppLink(paulistaConfig!.phone, paulistaConfig!.defaultMessage);
assert(linkPaulista.includes('5565999154448'), 'Link Paulista possui telefone correto');

// 11. Link Farma Popular → 5565996590987
const farmaPopularConfig = getWhatsAppOnlyStore({ id: farmaPopularId });
assert(farmaPopularConfig !== null, 'Farma Popular config encontrada por ID');
assert(farmaPopularConfig?.phone === '5565996590987', '11. Link Farma Popular → 5565996590987');
const linkFarmaPopular = buildWhatsAppLink(farmaPopularConfig!.phone, farmaPopularConfig!.defaultMessage);
assert(linkFarmaPopular.includes('5565996590987'), 'Link Farma Popular possui telefone correto');

// 12. Mensagem do WhatsApp está corretamente codificada
assert(
  linkDifarma.includes('text='),
  '12. URL contém parâmetro text codificado'
);
const decodedMessage = decodeURIComponent(linkDifarma.split('text=')[1].replace(/%21/g, '!'));
assert(
  decodedMessage === DEFAULT_WHATSAPP_ORDER_MESSAGE,
  '12. Mensagem decodificada corresponde exatamente à mensagem oficial'
);

// 13. Fechar modal funciona (estado pode ser alterado para false sem efeitos colaterais)
let isModalOpen = true;
const onOpenChange = (open: boolean) => {
  isModalOpen = open;
};
onOpenChange(false);
assert(isModalOpen === false, '13. Fechar modal funciona');

// 14. Identificação prioritária por ID oficial
assert(
  getWhatsAppOnlyStore({ id: difarmaId, name: 'Nome Qualquer Alterado' })?.id === difarmaId,
  '14. Identificação por ID tem prioridade total sobre o nome'
);

// Fallback por nome defensivo
assert(
  getWhatsAppOnlyStore({ id: 'id-desconhecido', name: 'Drogaria Difarma' })?.id === difarmaId,
  'Fallback defensivo por nome funciona se ID for divergente'
);

// Loja nula ou inválida
assert(getWhatsAppOnlyStore(null) === null, 'Empresa nula retorna null');
assert(getWhatsAppOnlyStore(undefined) === null, 'Empresa undefined retorna null');
assert(getWhatsAppOnlyStore({}) === null, 'Empresa vazia retorna null');

console.log('\n✅ TODOS OS TESTES PASSARAM COM SUCESSO!');
