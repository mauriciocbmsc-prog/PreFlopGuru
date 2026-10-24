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
