# Consulta economica do MasterMind na tela CEO

## Objetivo
Fazer a tela CEO usar o MasterMind por camadas para reduzir leitura excessiva, economizar tokens e manter sugestoes baseadas em sinais consolidados.

## Rotina aplicada
1. Usar `Memoria_Ativa_CEO` como primeira camada.
2. Usar hubs diarios e executivos como segunda camada.
3. Manter indices e notas brutas fora das sugestoes primarias.
4. Exibir alerta quando houver evidencia bruta repetida ou sem hub.
5. Registrar aprendizado quando a consulta economica for aplicada.

## Impacto
| Dimensao | Impacto |
| --- | --- |
| Tecnico | Alto: separa contexto primario de evidencias brutas e reduz ruido no kernel CEO. |
| Operacional | Alto: a tela passa a mostrar alertas de consolidacao quando depender de nota bruta. |
| Conversao | Medio: sugestoes comerciais usam sinais consolidados, reduzindo decisoes por duplicacao. |
| Lucro | Medio/alto: reduz custo de contexto e tempo de analise antes de automacoes. |
| Retencao | Medio: melhora qualidade das decisoes que afetam cliente, onboarding e suporte. |

## Gate operacional
Uma sugestao CEO deve nascer preferencialmente de:
- memoria ativa;
- hub diario;
- indice tematico consolidado.

Notas brutas, reunioes e aprovacoes soltas devem virar alerta ate serem consolidadas em hub.

## Proxima sugestao esperada
Depois desta melhoria, a proxima sugestao nao deve repetir a automacao da consulta economica. O CEO deve sugerir consolidar evidencias brutas ou repetidas quando os alertas aparecerem.

#kentauros #ceo #mastermind #workflow #governanca #operacional
