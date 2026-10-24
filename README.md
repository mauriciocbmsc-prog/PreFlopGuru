# PreFlopGuru

Explorador visual das 169 mãos iniciais do Texas Hold’em. Sem dependências ou build.

## Executar

Na pasta do projeto, execute `python3 -m http.server 3000 --bind 0.0.0.0` e abra a porta 3000 no navegador. A simulação usa um Web Worker e requer HTTP: abrir `index.html` diretamente pode impedir o cálculo.

O slider seleciona as melhores ou piores mãos, com percentual ponderado pelas 1.326 combinações possíveis. Pares têm 6 combinações, mãos do mesmo naipe têm 4 e de naipes diferentes têm 12. O percentual é arredondado para o prefixo de mãos completas mais próximo.

Ranking aproximado pela fórmula de Chen sem arredondamento do score, com desempate pelas cartas mais altas. Não representa equidade calculada nem uma solução GTO.

## Range polarizado

Em “Selecionar a partir das”, escolha “Polarizado · melhores + piores”. Ajuste as duas alças (thumbs) na mesma barra (por padrão, 10% melhores e 5% piores). Verde indica as melhores mãos e laranja as piores. A alça verde marca o fim do grupo das melhores (à esquerda); a laranja marca o início das piores (à direita). O centro não é selecionado. As alças não se cruzam; a soma é limitada a 100%. Mãos completas nunca são contadas duas vezes.

## Matemática

A seção ao final da página documenta as combinações, probabilidades de distribuição, ponderação e arredondamento do range, união dos extremos no modo polarizado, score de Chen usado no código e a diferença entre frequência de distribuição e equidade. O exemplo numérico acompanha a seleção atual. Ao incluir novos cálculos no projeto, atualize essa seção com as fórmulas, hipóteses e limitações correspondentes.

## Hero e Villain

Dois editores independentes, lado a lado no desktop e empilhados em telas menores. Cada um mantém seu próprio range simples ou polarizado e seu exemplo matemático. Três mostradores abaixo dos ranges estimam vitória, empate e derrota do Hero em 60.000 simulações Monte Carlo. Cada amostra escolhe uniformemente um confronto de combinações compatíveis e um board de cinco cartas sem reposição. O cálculo roda em um Web Worker, é cancelado quando os ranges mudam e não modela apostas ou folds. A equidade é exibida separadamente (vitória + metade dos empates). A margem conservadora aproximada de 95% por probabilidade é de até ±0,4 ponto percentual. Resultados são estimativas reproduzíveis, não enumerações exatas. Ranges vazios não geram resultados.

## Verificação

Execute `node --test tests/equity.test.js` para validar o avaliador de showdown, expansão das combinações e amostragem. Sem dependências adicionais.

## Edição manual

Clique em qualquer mão, no Hero ou no Villain, para adicionar ou remover aquele tipo completo do range. O primeiro clique ativa “Personalizado · por clique”, preservando as demais seleções e atualizando o percentual ponderado pelas combinações, a contagem e a simulação. Os sliders ficam ocultos enquanto a seleção é personalizada, pois um percentual sozinho não descreve um range arbitrário. “Voltar aos sliders” recria o range usando os últimos ajustes automáticos. Também é possível selecionar diretamente outro modo no menu. Teclas Enter e Espaço alternam a mão focada; `aria-pressed` informa seu estado.

## Participação por range

A seção abaixo do showdown calcula exatamente as chances de ambos entrarem, apenas Hero, apenas Villain e nenhum entrar. As distribuições sem repetição de cartas totalizam C(52,2) × C(50,2) = 1.624.350; bloqueadores são considerados. Os resultados gerais usam a lei da probabilidade total: apenas um participante ganha automaticamente, ambos usam o showdown e nenhum participante deixa o pote sem atribuição. Não há custos, blinds, apostas ou acumulação entre rodadas; a fração média do pote não representa lucro financeiro. Cenários com ranges vazios continuam definidos. A matemática e a relação limitada com fold equity estão documentadas no item 09.

## Mesa de seis jogadores

A aba “Mesa de 6 jogadores” apresenta UTG, HJ, CO, BTN, SB e BB ao redor de uma mesa. Clique em um lugar para editar seu range: cada posição tem sliders simples, polarização, edição manual e contagem própria. Alterações ficam preservadas ao alternar posições ou abas durante a sessão da página; recarregar reinicia as seleções. Todos começam no mesmo range de 20% solicitado (não é recomendação estratégica por posição). O botão é fixo no BTN. Esta etapa configura ranges e ainda não calcula equidade ou participação multiway; os resultados de dois jogadores permanecem na aba Hero × Villain.
