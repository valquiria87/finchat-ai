# Segurança, privacidade e LGPD — Nexora Finance

## Escopo e estado

O Nexora Finance é um projeto de portfólio e demonstração técnica. A presença de autenticação, políticas RLS ou OAuth no código não significa que o ambiente publicado esteja configurado ou que uma auditoria jurídica/de segurança tenha sido concluída. Não use dados bancários reais até concluir os itens de produção descritos abaixo.

## Dados tratados

O fluxo pode processar identificador do usuário autenticado, identificadores de conexão/conta/transação fornecidos pela Pluggy, saldos, moedas, datas, descrições, categorias e eventos técnicos de webhook. Descrições de transações podem revelar hábitos e informações pessoais; devem ser tratadas como dados financeiros sensíveis em termos de risco, mesmo quando a LGPD não as classifica automaticamente como dado pessoal sensível do art. 5º, II.

## Modelo de ameaças

| Ameaça | Controle esperado no projeto | Risco residual / validação |
|---|---|---|
| Roubo ou vazamento de credenciais | Segredos somente no servidor/secret store; nunca em variáveis `VITE_*`, frontend, logs ou Git | Rotacionar imediatamente qualquer segredo exposto; verificar histórico Git e logs do provedor |
| Acesso cruzado entre usuários | JWT Supabase validado no servidor, vínculo usuário–Item conferido e RLS nas tabelas financeiras | Testes com dois usuários distintos e revisão das políticas RLS ainda são obrigatórios |
| Webhook falso ou repetido | Segredo compartilhado validado, persistência por `event_id`, deduplicação e estado de processamento | Confirmar o método de assinatura suportado pela configuração Pluggy e testar repetição/concor­rência no ambiente real |
| Entrada malformada / abuso de recursos | Validação de esquema, limites de paginação, períodos e quantidade máxima | Monitorar limites e adicionar rate limiting no gateway/edge quando disponível |
| Token MCP usado por terceiro | OAuth, consentimento explícito e ferramentas somente leitura | OAuth precisa ser configurado e testado ponta a ponta no Supabase; o CI não comprova isso |
| Vazamento por logs/observabilidade | Logs estruturados sem tokens, descrições, valores, e-mails ou payload bancário bruto; endpoint de observabilidade restrito a e-mails administrativos | Confirmar acesso administrativo e política de retenção do provedor de logs |
| Retenção excessiva / exclusão incompleta | Documentar a origem, o prazo e a exclusão por sistema | Prazo formal deve ser definido pelo controlador e conferido com contratos e fornecedores; não afirmar exclusão automática sem prova |

## Onde ficam os segredos

- `PLUGGY_CLIENT_ID`, `PLUGGY_CLIENT_SECRET`, `PLUGGY_WEBHOOK_SECRET` e `FINCHAT_SESSION_SECRET`: variáveis de ambiente/secret store exclusivamente no servidor.
- `SUPABASE_SERVICE_ROLE_KEY`: exclusivamente no servidor, pois ignora RLS. Nunca disponibilizar ao navegador nem a clientes MCP.
- Chaves públicas do Supabase podem ser usadas no navegador somente para operações protegidas por autenticação e políticas RLS apropriadas.
- Segredos não devem aparecer em URLs, mensagens de erro, logs, screenshots, issues ou commits. Tokens de acesso devem ser enviados em cabeçalhos de autorização, não em query strings.

## Por que o MCP é somente leitura

As ferramentas MCP consultam contas, saldos e transações para limitar o impacto de uma autorização indevida. Elas não transferem dinheiro, não alteram transações, não apagam conexões e não mudam saldos. As anotações `readOnlyHint` descrevem a intenção da ferramenta; não substituem autorização, RLS, validação do usuário ou testes. Não inclua credenciais bancárias, tokens de conexão ou dados de autenticação em argumentos MCP.

## Retenção e exclusão

- O histórico do chat de demonstração fica no `localStorage` do navegador e pode persistir até ser apagado pelo usuário ou pelo navegador.
- Os dados financeiros sincronizados e os eventos de webhook podem permanecer no Supabase até serem excluídos por procedimento administrativo ou política implementada. Não há, neste momento, prazo de retenção automático comprovado para todas essas tabelas.
- Desconectar uma instituição solicita a exclusão do Item na Pluggy; isso não deve ser interpretado como prova de exclusão de todas as cópias locais, logs, backups ou dados retidos por obrigação legal.
- Para atender a uma solicitação de exclusão, identificar e tratar dados no Supabase, Pluggy, logs, backups e demais fornecedores aplicáveis; registrar o resultado sem copiar dados financeiros para o registro de auditoria.
- Antes de produção, definir prazos de retenção, procedimento de solicitação do titular, responsável pelo atendimento e confirmação de exclusão com cada fornecedor.

## Princípios de privacidade

Aplicar finalidade, adequação, necessidade, transparência, segurança, prevenção e prestação de contas. Solicitar somente os dados necessários; restringir acessos; proteger transporte e armazenamento; registrar incidentes; evitar que dados financeiros reais sejam usados em datasets de teste. O benchmark de categorização deve conter somente descrições sintéticas, nunca extratos reais.

## Checklist de produção

- [ ] Revisar e testar RLS para cada tabela financeira com dois usuários e um usuário sem sessão.
- [ ] Confirmar vínculo persistente e inequívoco entre cada Item Pluggy e o usuário Supabase.
- [ ] Configurar OAuth 2.1, URL de retorno, consentimento e chaves JWT assimétricas no Supabase; executar teste ponta a ponta.
- [ ] Configurar `OBSERVABILITY_ADMIN_EMAILS` com uma lista mínima de e-mails administrativos.
- [ ] Definir retenção e exclusão para banco, Pluggy, logs e backups.
- [ ] Verificar logs, histórico Git, secrets do CI e variáveis de deploy; rotacionar qualquer credencial exposta.
- [ ] Revisar contratos, base legal, avisos de privacidade e obrigações com assessoria adequada antes de uso comercial. Este documento é uma orientação técnica, não parecer jurídico nem certificação de conformidade LGPD.
