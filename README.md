# PreFlopGuru

Explorador visual das 169 mãos iniciais do Texas Hold’em. Sem dependências ou build.

## Executar

Na pasta do projeto, execute `python3 -m http.server 3000 --bind 0.0.0.0` e abra a porta 3000 no navegador. Também é possível abrir `index.html` diretamente.

O slider seleciona as melhores ou piores mãos, com percentual ponderado pelas 1.326 combinações possíveis. Pares têm 6 combinações, mãos do mesmo naipe têm 4 e de naipes diferentes têm 12. O percentual é arredondado para o prefixo de mãos completas mais próximo.

Ranking aproximado pela fórmula de Chen sem arredondamento do score, com desempate pelas cartas mais altas. Não representa equidade calculada nem uma solução GTO.
