# Contrato de Importacao CapLead -> Kentauros

## Endpoint
`POST /api/leads/import`

## Seguranca
- Producao exige `CAPLEAD_IMPORT_API_KEY`.
- A chave deve ser enviada no header `x-caplead-api-key`.
- `CAPLEAD_IMPORT_ALLOWED_ORIGINS` deve listar as origens autorizadas separadas por virgula.

## Payload
```json
{
  "tenantId": "tenant-a",
  "userId": 1,
  "userEmail": "leadhunter@kentauros.consulting",
  "userName": "Matheus F. Batista",
  "capturedBySource": "Matheus F. Batista",
  "leads": [
    {
      "nome": "Centro da Pele",
      "email": "contato@centrodapele.com.br",
      "telefone": "(11) 93018-6652",
      "website": "https://centrodapele.com.br",
      "categoria": "Saude",
      "estimatedValue": 9000,
      "pricingModel": "ai_development",
      "pricingBasis": "Projeto estimado para entrega assistida por IA",
      "whatsappSent": true,
      "whatsappSentAt": "2026-05-18T12:00:00.000Z"
    }
  ]
}
```

## Campos obrigatorios por lead
- `nome`, `name`, `empresa` ou `titulo`
- `website`, `url`, `site_oficial` ou `maps_url`

## Campos comerciais preservados
- Empresa
- E-mail
- Telefone/WhatsApp
- Site
- Fonte de captura
- Valor estimado
- Modelo de precificacao
- Status de WhatsApp
- Dados originais em `metadata.originalData`

## Comportamento esperado
- Lead duplicado por dominio ou empresa nao deve gerar novo registro.
- Lead duplicado pode atualizar valor estimado quando o novo valor for maior.
- Status de WhatsApp enviado deve ser sincronizado para a Kentauros.
- Leads de teste devem ser rejeitados.
