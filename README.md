# Angola Metrics Hub

Crie uma aplicação SaaS full-stack chamada “UTMify Angola”, uma plataforma própria de tracking e analytics de marketing inspirada na categoria de ferramentas UTM/tracking, sem copiar identidade visual, código ou textos de terceiros.

OBJETIVO DO MVP
Construir a primeira versão funcional para pequenos negócios e gestores de tráfego acompanharem campanhas e vendas, começando por Meta/Facebook Ads. O sistema deve estar preparado para atribuir uma venda a uma campanha através de UTMs/fbclid e registrar conversões via backend/webhook. Não fingir integração real com a Meta se as credenciais/API ainda não estiverem configuradas: criar a infraestrutura e telas de configuração, usando dados demo apenas para visualização.

STACK
- TypeScript
- React/Next ou stack padrão full-stack do Lovable
- Tailwind + shadcn/ui
- Supabase para Auth, PostgreSQL e backend/edge functions quando apropriado
- Arquitetura limpa, responsiva e preparada para produção

IDENTIDADE/UX
- Nome: UTMify Angola
- Interface SaaS premium, moderna e limpa
- Português
- Moeda padrão: Kz (AOA)
- Tema claro por padrão, com dark mode
- Sidebar no desktop e navegação adequada no mobile
- Não usar logotipo ou identidade da UTMify; criar branding próprio simples para UTMify Angola.

PÁGINAS DO MVP
1. Landing/login
2. Dashboard
3. Campanhas
4. Gerador de UTMs
5. Conversões/Vendas
6. Rastreamento/Links
7. Integrações
8. Configurações

DASHBOARD
Cards:
- Investimento
- Cliques
- Conversões
- Vendas
- Receita
- ROAS
- CPA
- Lucro estimado
Gráficos:
- Receita e investimento ao longo do tempo
- Conversões por campanha
- Origem das vendas
Tabela de campanhas com status e métricas.
Adicionar seletor de período.

CAMPANHAS
CRUD para campanhas:
- nome
- plataforma/origem (Meta, Google, TikTok, Outro)
- orçamento
- investimento
- produto
- status
- utm_source
- utm_medium
- utm_campaign
- utm_content
- utm_term
Mostrar cliques, vendas, receita, CPA e ROAS.
Filtros e pesquisa.

GERADOR DE UTM
Formulário com URL destino e campos:
utm_source, utm_medium, utm_campaign, utm_content, utm_term.
Gerar URL final automaticamente.
Adicionar opção de copiar.
Também gerar um “tracking link” interno que preserve UTMs e fbclid quando o visitante entrar.

TRACKING
Criar modelo de dados para:
- tracking_links
- visits/events
- sessions
- conversions
- campaigns
- products
- workspaces/users
Registrar parâmetros:
- fbclid
- gclid
- ttclid
- utm_source
- utm_medium
- utm_campaign
- utm_content
- utm_term
- landing_page
- referrer
- device
- timestamp
Criar endpoint/backend para receber eventos de conversão com segurança.
Criar evento padrão PURCHASE com:
- transaction_id
- value
- currency (AOA)
- product
- timestamp
- tracking/session identifiers

ATRIBUIÇÃO
Implementar no MVP uma atribuição simples e transparente:
- primeiro toque
- último toque
- prioridade ao identificador da sessão quando disponível
- janela de atribuição configurável
Guardar o caminho de atribuição para auditoria.
Nunca declarar uma venda como proveniente do Facebook apenas porque ocorreu no mesmo período; exigir dados de tracking.

META/FACEBOOK
Criar página de Integrações com Meta Ads:
- campo para Pixel ID
- campo para Conversions API Access Token (guardar de forma segura, nunca mostrar o token completo)
- seleção de eventos: PageView, ViewContent, Lead, InitiateCheckout, Purchase
- botão “Testar conexão”
- status da integração
- instruções de configuração
Criar a base para enviar Purchase pela Conversions API através do backend/edge function.
Não colocar tokens secretos no frontend.
Se a API da Meta não puder ser chamada sem credenciais reais, deixar a integração configurável e demonstrar claramente o estado “Não configurado”.

CONVERSÕES/VENDAS
Tabela com:
- data
- produto
- valor
- moeda
- campanha
- origem
- UTMs
- fbclid
- método de atribuição
- transaction_id
- status
Permitir abrir detalhes da conversão.

BANCO DE DADOS
Criar schema Supabase com RLS adequado por usuário/workspace.
Tabelas mínimas:
profiles
workspaces
workspace_members
campaigns
tracking_links
tracking_events
sessions
conversions
products
integrations
daily_metrics
Criar índices para campos usados no tracking e atribuição.

DEMO
Criar seed/dados demonstrativos para o dashboard mostrar como o sistema funciona, claramente identificados como “Dados de demonstração”.
Não misturar dados demo com dados reais.

SEGURANÇA
- RLS por workspace
- validação de payloads
- endpoints de tracking sem expor segredos
- deduplicação de Purchase por transaction_id/event_id
- não armazenar dados pessoais desnecessários
- nunca expor tokens da Meta no cliente

IMPORTANTE
O MVP precisa ser funcional, não apenas uma landing page. Priorizar:
1) autenticação e workspace
2) banco de dados
3) gerador de UTM
4) tracking link/eventos
5) registro de conversão
6) atribuição
7) dashboard
8) integração Meta/CAPI preparada
9) UI profissional

Adicionar estados vazios, loading, erros e mensagens de sucesso. Usar componentes reutilizáveis.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://angola-metrics-hub.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/2634741d-a3fd-4786-8f56-5406e0a0a394).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
