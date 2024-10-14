## Concurrent Mode (cooperative scheduling)

- A renderização precisa ser rápida pois o navegador é bloqueado pela execução de JavaScript e isso pode impedir animações, leitura do teclado, etc.
- Se a árvore de elementos for grande, pode bloquear a thread principal por muito tempo.
- Divimos o trabalho de renderização em unit of works.
- Agendamos utilizando a função `requestIdleCallback` que permite executar tarefas em períodos IDLE do navegador.
  - O primeiro parâmetro é a `deadline`
    - `timeRemaining()`: Quando tempo resta antes que o navegador precise retomar suas tarefas prioritárias.
  - O segundo parâmetro especifica um objeto `options`:
    - `timeout`: Tempo máximo que a tarefa ficará aguardando (em ms).
- Isto é feito para implementar o que chamamos de cooperative scheduling, um modo de execução onde tarefas estão compartilhando o tempo do processador de forma cooperativa, cada uma devolvendo o controle para o processador de forma voluntária.
- Ajuda na responsividade da interface.

## Fiber Tree

- Fiber é uma estrutura de dados em árvore.
- Serve para organizas as unit of works.
- Há uma fiber para cada elemento.
- Depois de executar o trabalho para uma fiber, a próxima unit of work é seu first child.
- Se não tiver, é seu sibling.
- Se não tiver, é o sibling do parent.
- E assim vai até o root, neste ponto onde paramos e o trabalho de renderização é finalizado.
- Cada fiber tem um child, sibling e parent.

## Commit

- O navegador pode interromper a renderização completa da árvore.
- Criamos os nós DOM depois inserimos no nó raiz, para evitar a renderização de fiber trees incompletas.
- Isto é feito quando não há mais nenhuma `nextUnitOfWork`.

## Reconciliation

- Compara o virtual DOM com o DOM real e aplica as mudanças necessárias.
- Mantemos uma referência para a última fiber tree commitada para o DOM.
- Comparamos os elementos recebidos na função de renderização com a última fiber tree commitada para o DOM.

## Processo

- Renderização
- Commit
