# Plano de hardening CapLead antes da escala

## Veredito
BLOQUEADO para escala ampla ate mitigacao dos riscos high do CapLead.

## Inventario
- Kentauros: `npm audit --audit-level=high` sem high/critical; 2 moderadas (`brace-expansion`, `ws`).
- CapLead: `npm audit --audit-level=high` com 13 high e 19 totais.
- Artefatos locais CapLead: `dist`, `dist-electron`, `dist-electron-export`, `dist-electron-novo`, `scratch`, `temp_wincode`, `database.sqlite`.
- Scan de secrets: sem secret real confirmado; achados foram uso de `api_key` em URL e falso positivo em HTML/LICENCA.

## Bloqueadores
- Atualizar ou substituir `electron`, `electron-builder` e cadeia `tar`.
- Atualizar `axios` e `basic-ftp`.
- Substituir ou isolar `xlsx`, pois nao ha fix automatico no audit.
- Remover artefatos locais do pacote final e validar `.gitignore`/release.

## Gate de escala
Escala e envios externos so podem seguir quando:
- `npm audit --audit-level=high` do CapLead nao tiver high/critical.
- pacote distribuido vier de build versionado e limpo.
- envios externos continuarem exigindo `approvalRequest` aprovado.
- CORS/API key de importacao Kentauros estiverem configurados em producao.
