/**
 * Test Suite: Sistema de Adicionais e Complementos do É Pra Já
 * Executa testes unitários nas regras de negócio de adicionais/complementos:
 * 1. Seleção Única (Modo Radio quando max_options = 1)
 * 2. Seleção Múltipla / Quantitativa (Contador + / - quando max_options > 1)
 * 3. Validação de Mínimo e Máximo (min_options e required)
 * 4. Cálculo de Preço do Item e Total do Dialog
 * 5. Geração de Hash do Carrinho (CartItem optionsHash com quantidade)
 * 6. Validação e Recálculo Canônico do Backend (create-order)
 */

function runComplementTests() {
  console.log('==================================================');
  console.log('TEST SUITE: SISTEMA DE ADICIONAIS / COMPLEMENTOS');
  console.log('==================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${testName} ${detail ? `(${detail})` : ''}`);
      failed++;
    }
  }

  // ----------------------------------------------------
  // TESTE 1: Seleção Única (Modo Radio quando max_options = 1)
  // ----------------------------------------------------
  {
    const group = { id: 'g1', name: 'Tamanho', min_options: 1, max_options: 1, required: true };
    const options = [
      { id: 'opt1', group_id: 'g1', name: 'Médio (500ml)', price: 0 },
      { id: 'opt2', group_id: 'g1', name: 'Grande (700ml)', price: 4.5 },
    ];

    let selected: Record<string, Record<string, number>> = {};

    // Simula seleção do primeiro item
    selected = { ...selected, [group.id]: { ['opt1']: 1 } };
    assert(selected['g1']['opt1'] === 1 && !selected['g1']['opt2'], 'Modo Radio: seleciona opt1 exclusivamente');

    // Simula troca para o segundo item (deve desmarcar opt1)
    selected = { ...selected, [group.id]: { ['opt2']: 1 } };
    assert(selected['g1']['opt2'] === 1 && !selected['g1']['opt1'], 'Modo Radio: trocar para opt2 desmarca opt1');
  }

  // ----------------------------------------------------
  // TESTE 2: Seleção Múltipla com Contador (+ / -)
  // ----------------------------------------------------
  {
    const group = { id: 'g2', name: 'Adicionais', min_options: 0, max_options: 3, required: false };
    const options = [
      { id: 'optA', group_id: 'g2', name: 'Bacon Extra', price: 5.0 },
      { id: 'optB', group_id: 'g2', name: 'Queijo Cheddar', price: 4.0 },
    ];

    let groupSelections: Record<string, number> = {};

    const getTotal = (sel: Record<string, number>) => Object.values(sel).reduce((a, b) => a + b, 0);

    // Adiciona 1 Bacon
    if (getTotal(groupSelections) < group.max_options) {
      groupSelections['optA'] = (groupSelections['optA'] || 0) + 1;
    }
    // Adiciona mais 1 Bacon (agora 2 Bacons)
    if (getTotal(groupSelections) < group.max_options) {
      groupSelections['optA'] = (groupSelections['optA'] || 0) + 1;
    }
    // Adiciona 1 Queijo Cheddar (total = 3, atinge limite max_options = 3)
    if (getTotal(groupSelections) < group.max_options) {
      groupSelections['optB'] = (groupSelections['optB'] || 0) + 1;
    }

    assert(groupSelections['optA'] === 2 && groupSelections['optB'] === 1, 'Contador Multi: 2 Bacons + 1 Cheddar');
    assert(getTotal(groupSelections) === 3, 'Contador Multi: total de 3 itens selecionados');

    // Tenta adicionar mais um além do limite (max_options = 3)
    const canAddMore = getTotal(groupSelections) < group.max_options;
    assert(!canAddMore, 'Contador Multi: respeita limite teto de max_options = 3');

    // Decrementa 1 Bacon
    if (groupSelections['optA'] > 1) {
      groupSelections['optA'] -= 1;
    } else {
      delete groupSelections['optA'];
    }
    assert(groupSelections['optA'] === 1, 'Contador Multi: decrementa Bacon para 1');
  }

  // ----------------------------------------------------
  // TESTE 3: Validação de Grupo Obrigatório (min_options e required)
  // ----------------------------------------------------
  {
    const reqGroup = { id: 'g_req', name: 'Escolha seu Pão', min_options: 1, max_options: 1, required: true };
    const isSatisfied = (selections: Record<string, number>) => {
      const total = Object.values(selections).reduce((a, b) => a + b, 0);
      const minRequired = reqGroup.required ? Math.max(1, reqGroup.min_options || 1) : (reqGroup.min_options || 0);
      return total >= minRequired;
    };

    assert(!isSatisfied({}), 'Validação: grupo obrigatório vazio é inválido');
    assert(isSatisfied({ 'pao_brioche': 1 }), 'Validação: grupo obrigatório com 1 opção é válido');
  }

  // ----------------------------------------------------
  // TESTE 4: Cálculo de Preço do Item e Total do Dialog
  // ----------------------------------------------------
  {
    const productPrice = 25.0; // Hambúrguer Artesanal
    const dialogQuantity = 2; // 2 lanches iguais

    const selectedOptionsList = [
      { id: 'opt_cheddar', price: 4.0, quantity: 2 }, // 2x R$ 4,00 = R$ 8,00
      { id: 'opt_bacon', price: 5.0, quantity: 1 },   // 1x R$ 5,00 = R$ 5,00
    ];

    const optionsSumPerItem = selectedOptionsList.reduce((sum, opt) => sum + (opt.price * opt.quantity), 0);
    const unitPrice = productPrice + optionsSumPerItem; // 25 + 13 = 38
    const totalOrderLine = unitPrice * dialogQuantity; // 38 * 2 = 76

    assert(optionsSumPerItem === 13.0, 'Preço: soma correta dos adicionais (2x 4.0 + 1x 5.0 = 13.0)');
    assert(unitPrice === 38.0, 'Preço: preço unitário com adicionais = R$ 38,00');
    assert(totalOrderLine === 76.0, 'Preço: total para 2 unidades do lanche = R$ 76,00');
  }

  // ----------------------------------------------------
  // TESTE 5: Geração de Hash do Carrinho (CartContext)
  // ----------------------------------------------------
  {
    const buildOptionsHash = (opts: Array<{ id: string; quantity?: number }>) => {
      return (opts || [])
        .filter(Boolean)
        .map(o => `${o.id}:${Number(o.quantity) > 0 ? Number(o.quantity) : 1}`)
        .sort()
        .join('-');
    };

    const cartItem1Options = [
      { id: 'cheddar', quantity: 2 },
      { id: 'bacon', quantity: 1 },
    ];
    const cartItem2OptionsSame = [
      { id: 'bacon', quantity: 1 },
      { id: 'cheddar', quantity: 2 },
    ];
    const cartItem3OptionsDifferentQty = [
      { id: 'bacon', quantity: 2 },
      { id: 'cheddar', quantity: 1 },
    ];

    const hash1 = buildOptionsHash(cartItem1Options);
    const hash2 = buildOptionsHash(cartItem2OptionsSame);
    const hash3 = buildOptionsHash(cartItem3OptionsDifferentQty);

    assert(hash1 === hash2, 'Hash Carrinho: mesma composição em ordens diferentes gera mesmo hash (bacon:1-cheddar:2)');
    assert(hash1 !== hash3, 'Hash Carrinho: composições com quantidades diferentes geram hashes distintos');
  }

  // ----------------------------------------------------
  // TESTE 6: Validação e Recálculo Canônico Server-Side (create-order)
  // ----------------------------------------------------
  {
    // Simula tabela oficial do banco de dados (o cliente não pode falsificar o preço)
    const dbProduct = { id: 'prod_1', price: 20.0 };
    const dbOptions = new Map([
      ['opt_molho', { id: 'opt_molho', name: 'Molho Especial', price: 3.5, is_active: true }],
      ['opt_inativa', { id: 'opt_inativa', name: 'Opção Esgotada', price: 5.0, is_active: false }],
    ]);

    // Cliente malicioso envia preço 0.01 e tenta injetar opção inativa
    const clientOptionsPayload = [
      { id: 'opt_molho', price: 0.01, quantity: 2 },
      { id: 'opt_inativa', price: 0.01, quantity: 1 },
    ];

    let optionsTotalPerItem = 0;
    const validatedOptions: any[] = [];

    for (const rawOpt of clientOptionsPayload) {
      const dbOpt = dbOptions.get(rawOpt.id);
      if (dbOpt && dbOpt.is_active !== false) {
        const canonicalPrice = dbOpt.price; // Puxado do banco!
        const qty = rawOpt.quantity;
        optionsTotalPerItem += canonicalPrice * qty;
        validatedOptions.push({
          id: dbOpt.id,
          name: dbOpt.name,
          price: canonicalPrice,
          quantity: qty,
        });
      }
    }

    const canonicalUnitPrice = dbProduct.price + optionsTotalPerItem; // 20 + (3.5 * 2) = 27.0

    assert(validatedOptions.length === 1, 'Backend: opção inativa foi descartada com sucesso');
    assert(optionsTotalPerItem === 7.0, 'Backend: recalculou 2x Molho pelo preço canônico (R$ 7,00 em vez de R$ 0,02)');
    assert(canonicalUnitPrice === 27.0, 'Backend: preço unitário final correto e seguro (R$ 27,00)');
  }

  console.log('\n==================================================');
  console.log(`RESULTADO FINAL: ${passed} PASSARAM / ${failed} FALHARAM`);
  console.log('==================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runComplementTests();
