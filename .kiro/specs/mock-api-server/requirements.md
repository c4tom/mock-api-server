# Requirements Document

## Introduction

Este projeto visa criar um servidor backend flexível que pode atuar tanto como um servidor de dados mockados (similar ao jsonplaceholder) quanto como um proxy CORS para contornar limitações de CORS durante o desenvolvimento. O servidor será configurável através de arquivos de ambiente (.env.local, .env.production) e permitirá aos desenvolvedores criar rapidamente APIs de teste ou proxificar requisições para APIs externas.

## Requirements

### Requirement 1

**User Story:** Como um desenvolvedor frontend, eu quero um servidor que forneça dados mockados através de endpoints REST, para que eu possa desenvolver e testar minha aplicação sem depender de uma API real.

#### Acceptance Criteria

1. WHEN o servidor é iniciado THEN o sistema SHALL carregar configurações de dados mockados dos arquivos de ambiente
2. WHEN uma requisição GET é feita para um endpoint configurado THEN o sistema SHALL retornar os dados mockados correspondentes em formato JSON
3. WHEN uma requisição POST/PUT/DELETE é feita para um endpoint mockado THEN o sistema SHALL simular a operação e retornar uma resposta apropriada
4. IF um endpoint não está configurado THEN o sistema SHALL retornar um erro 404 com uma mensagem descritiva

### Requirement 2

**User Story:** Como um desenvolvedor, eu quero que o servidor atue como um proxy CORS, para que eu possa fazer requisições para APIs externas que não permitem CORS durante o desenvolvimento.

#### Acceptance Criteria

1. WHEN uma requisição é feita para o endpoint de proxy THEN o sistema SHALL encaminhar a requisição para a URL de destino configurada
2. WHEN a resposta é recebida da API externa THEN o sistema SHALL adicionar os headers CORS apropriados antes de retornar ao cliente
3. WHEN uma requisição de proxy falha THEN o sistema SHALL retornar o erro original com headers CORS adicionados
4. IF a URL de destino não está configurada THEN o sistema SHALL retornar um erro 400 com instruções de configuração

### Requirement 3

**User Story:** Como um desenvolvedor, eu quero configurar o servidor através de arquivos de ambiente, para que eu possa ter diferentes configurações para desenvolvimento e produção.

#### Acceptance Criteria

1. WHEN o servidor inicia THEN o sistema SHALL carregar configurações do arquivo .env.local se estiver em modo desenvolvimento
2. WHEN o servidor inicia em produção THEN o sistema SHALL carregar configurações do arquivo .env.production
3. WHEN configurações são alteradas THEN o sistema SHALL permitir recarregamento sem reiniciar o servidor (hot reload)
4. IF arquivos de configuração estão ausentes THEN o sistema SHALL criar arquivos de exemplo com configurações padrão

### Requirement 4

**User Story:** Como um desenvolvedor, eu quero endpoints de administração, para que eu possa gerenciar as configurações do servidor em tempo de execução.

#### Acceptance Criteria

1. WHEN uma requisição é feita para /admin/config THEN o sistema SHALL retornar as configurações atuais (sem dados sensíveis)
2. WHEN uma requisição POST é feita para /admin/reload THEN o sistema SHALL recarregar as configurações dos arquivos de ambiente
3. WHEN uma requisição GET é feita para /admin/health THEN o sistema SHALL retornar o status de saúde do servidor
4. IF o modo de administração está desabilitado THEN o sistema SHALL retornar 403 para endpoints administrativos

### Requirement 5

**User Story:** Como um desenvolvedor, eu quero logs detalhados das requisições, para que eu possa debugar problemas durante o desenvolvimento.

#### Acceptance Criteria

1. WHEN uma requisição é recebida THEN o sistema SHALL logar método, URL, headers e timestamp
2. WHEN uma resposta é enviada THEN o sistema SHALL logar status code, tempo de resposta e tamanho da resposta
3. WHEN ocorre um erro THEN o sistema SHALL logar detalhes do erro com stack trace se disponível
4. IF o modo de log está configurado como 'silent' THEN o sistema SHALL suprimir logs não essenciais

### Requirement 6

**User Story:** Como um desenvolvedor, eu quero que o servidor suporte diferentes formatos de dados, para que eu possa trabalhar com diversos tipos de APIs.

#### Acceptance Criteria

1. WHEN dados JSON são solicitados THEN o sistema SHALL retornar com Content-Type application/json
2. WHEN dados XML são solicitados THEN o sistema SHALL retornar com Content-Type application/xml
3. WHEN dados de texto são solicitados THEN o sistema SHALL retornar com Content-Type text/plain
4. IF o formato solicitado não é suportado THEN o sistema SHALL retornar erro 415 com formatos suportados

### Requirement 7

**User Story:** Como um administrador de sistema, eu quero controlar quais origens podem acessar o servidor, para que eu possa prevenir uso não autorizado e ataques de origem cruzada.

#### Acceptance Criteria

1. WHEN o servidor inicia THEN o sistema SHALL carregar uma lista de origens permitidas do arquivo de configuração
2. WHEN uma requisição é recebida THEN o sistema SHALL verificar se a origem está na lista de permitidas
3. WHEN uma origem não autorizada faz uma requisição THEN o sistema SHALL retornar erro 403 com mensagem de origem não permitida
4. IF a lista de origens está vazia ou contém "*" THEN o sistema SHALL permitir todas as origens (modo desenvolvimento)
5. WHEN uma requisição não contém header Origin THEN o sistema SHALL aplicar regras específicas para requisições diretas

### Requirement 8

**User Story:** Como um administrador de sistema, eu quero proteção contra spoofing e ataques maliciosos, para que o servidor seja seguro em ambiente de produção.

#### Acceptance Criteria

1. WHEN uma requisição é recebida THEN o sistema SHALL validar headers críticos (Origin, Referer, User-Agent)
2. WHEN headers suspeitos são detectados THEN o sistema SHALL logar o evento e aplicar rate limiting mais restritivo
3. WHEN múltiplas requisições suspeitas vêm do mesmo IP THEN o sistema SHALL implementar bloqueio temporário
4. IF rate limiting é excedido THEN o sistema SHALL retornar erro 429 com header Retry-After
5. WHEN o servidor está em modo produção THEN o sistema SHALL aplicar validações de segurança mais rigorosas
6. WHEN uma requisição contém payloads muito grandes THEN o sistema SHALL rejeitar com erro 413

### Requirement 9

**User Story:** Como um desenvolvedor, eu quero configurar diferentes níveis de segurança, para que eu possa ter flexibilidade no desenvolvimento e rigor na produção.

#### Acceptance Criteria

1. WHEN o ambiente é 'development' THEN o sistema SHALL usar configurações de segurança relaxadas
2. WHEN o ambiente é 'production' THEN o sistema SHALL aplicar todas as validações de segurança
3. WHEN configurações de segurança são alteradas THEN o sistema SHALL validar a consistência das regras
4. IF configurações de segurança são inválidas THEN o sistema SHALL falhar na inicialização com mensagens claras

### Requirement 10

**User Story:** Como um desenvolvedor, eu quero controlar o acesso através de autenticação configurável, para que eu possa simular diferentes cenários de autenticação e usar o servidor em ambientes como AI Studio.

#### Acceptance Criteria

1. WHEN autenticação JWT está habilitada THEN o sistema SHALL validar tokens JWT em requisições protegidas
2. WHEN autenticação HTTP Basic está habilitada THEN o sistema SHALL validar credenciais usando header Authorization
3. WHEN modo 'dev-token' está ativo THEN o sistema SHALL aceitar um token fixo configurado no .env para desenvolvimento
4. WHEN modo 'bypass' está ativo THEN o sistema SHALL permitir acesso livre com header especial (X-Dev-Bypass)
5. IF autenticação está desabilitada THEN o sistema SHALL permitir acesso livre total
6. WHEN uma requisição não contém credenciais válidas THEN o sistema SHALL retornar erro 401 com instruções de configuração
7. WHEN o ambiente é AI Studio ou similar THEN o sistema SHALL sugerir uso do modo 'dev-token' ou 'bypass' na resposta de erro