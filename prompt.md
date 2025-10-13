### Prompt para o Assistente de IA

**Persona:** Aja como um arquiteto de software sênior e especialista em DevSecOps. Sua tarefa é me guiar, passo a passo, na construção de uma aplicação completa de Mock API Server.

**Visão Geral do Projeto:**

Vamos construir uma aplicação full-stack que consiste em dois componentes principais:

1.  **Backend (Mock API Server):** Um servidor Node.js/Express que servirá endpoints de API dinâmicos baseados em uma configuração definida pelo usuário.

2.  **Frontend (Painel de Controle):** Uma aplicação React (Single Page Application) que servirá como uma interface de usuário para criar, visualizar e gerenciar as configurações do Mock API Server (endpoints, chaves de API, etc.).



O foco principal é controle, flexibilidade e segurança. O usuário final deve ser capaz de simular qualquer cenário de API para seus projetos frontend sem escrever uma linha de código de backend.

---

### **Parte 1: Especificações do Backend (Mock API Server)**

**Stack Tecnológica:**

*   Linguagem: **TypeScript**

*   Framework: **Express.js**

*   Gerenciador de Pacotes: **npm** ou **yarn**

**Funcionalidades Principais:**

1.  **Roteamento Dinâmico:** O servidor não terá rotas hard-coded. Ele deve ler um arquivo de configuração (ex: `db.json`) na inicialização e criar dinamicamente os endpoints.

2.  **Configuração de Endpoints:** Para cada endpoint, o usuário deve poder configurar:

  *   **Path:** ex: `/users/:id`

  *   **Método HTTP:** `GET`, `POST`, `PUT`, `DELETE`, etc.

  *   **Código de Status da Resposta:** `200`, `201`, `404`, `500`, etc.

  *   **Cabeçalhos da Resposta:** ex: `Content-Type: application/json`

  *   **Corpo da Resposta (Body):** Um corpo JSON customizado.

  *   **Latência (Delay):** Um atraso opcional em milissegundos para simular a latência da rede.

3.  **Persistência:** As configurações criadas pelo usuário através do frontend devem ser salvas em um arquivo `db.json` no servidor. O servidor deve recarregar as rotas dinamicamente sempre que este arquivo for alterado.

4.  **API de Gerenciamento:** O servidor deve expor uma API RESTful interna (ex: em uma rota `/admin/...`) para que o frontend possa ler e escrever as configurações no `db.json`. Esta API de gerenciamento deve ser protegida.


**Requisitos de DevSecOps (Backend):**

1.  **Gerenciamento de Segredos:** A API de gerenciamento (`/admin/...`) deve ser protegida por uma chave de API mestre. Esta chave **NUNCA** deve ser hard-coded. Use variáveis de ambiente com o pacote `dotenv`.

2.  **Segurança de Cabeçalhos HTTP:** Use o middleware `helmet` para configurar cabeçalhos HTTP seguros e proteger contra vulnerabilidades conhecidas.

3.  **Controle de Acesso (CORS):** Implemente o pacote `cors` com uma configuração dinâmica. O usuário deve poder definir, através do painel, quais origens (`origin`) são permitidas. O padrão deve ser restritivo.

4.  **Rate Limiting:** Implemente `express-rate-limit` na API de gerenciamento e, opcionalmente, nos endpoints mockados para prevenir abuso.

5.  **Validação de Input:** Todos os dados recebidos na API de gerenciamento (vindos do frontend) devem ser rigorosamente validados para prevenir injeção de dados maliciosos. Use uma biblioteca como `express-validator`.

6.  **Logging:** Implemente logs de requisição (com `morgan`) em modo de desenvolvimento e logs de erro robustos para produção.

7.  **Análise de Dependências:** Adicione um script no `package.json` para rodar `npm audit --audit-level=high` como parte do processo de CI/CD.



---



### **Parte 2: Especificações do Frontend (Painel de Controle)**



**Stack Tecnológica:**

*   Framework: **React** com **Vite**

*   Linguagem: **TypeScript**

*   Estilização: **Tailwind CSS**

*   Cliente HTTP: **Axios** (para fácil configuração de headers e interceptors)



**Funcionalidades Principais (Páginas/Componentes):**

1.  **Dashboard de Endpoints:**

  *   Uma tabela/lista mostrando todos os endpoints mockados configurados.

  *   Para cada endpoint, mostrar o método HTTP (com um badge colorido), o path, e o código de status da resposta.

  *   Botões para Editar e Deletar cada endpoint.

  *   Um botão "Adicionar Novo Endpoint" que leva ao formulário de criação.

2.  **Formulário de Criação/Edição de Endpoint:**

  *   Um formulário completo para configurar um endpoint (conforme especificado no backend).

  *   Campos para: Path, Método (dropdown), Status Code, Latência.

  *   Uma área para adicionar Headers da Resposta (Key-Value).

  *   Um editor de JSON (ex: usando `react-json-editor-ajrm`) para o Corpo da Resposta, com validação de sintaxe.

3.  **Página de Configurações Globais:**

  *   **Configuração de CORS:** Um campo de texto para o administrador inserir as URLs de origem permitidas (separadas por vírgula).

  *   **Gerenciamento de API Keys (Opcional Avançado):** Uma interface para criar múltiplas chaves de API que podem ser usadas para proteger endpoints mockados específicos, além da chave mestre do admin.



**Requisitos de DevSecOps (Frontend):**

1.  **Gerenciamento de Segredos:** A chave de API mestre usada para comunicar com a API de gerenciamento do backend deve ser configurada através de variáveis de ambiente do Vite (ex: `VITE_ADMIN_API_KEY`).

2.  **Validação de Formulários:** Toda entrada do usuário deve ser validada no lado do cliente antes de ser enviada para o backend.

3.  **Tratamento de Erros:** Exiba mensagens de erro claras e úteis para o usuário caso uma chamada de API falhe. Não exponha detalhes sensíveis do erro.



---



### **Parte 3: Estrutura do Projeto e Plano de Implementação**



Sugira a seguinte estrutura de monorepo:



```

/mock-api-server-app
├── /server
│   ├── src/
│   ├── package.json
│   └── tsconfig.json
├── /client
│   ├── src/
│   ├── package.json
│   └── tsconfig.json
└── docker-compose.yml (Opcional)

```



**Plano de Ação Passo a Passo:**

1.  **Setup Inicial:** Crie a estrutura de pastas e inicialize os projetos `npm` para o `server` (Node/Express/TS) e `client` (React/Vite/TS).

2.  **Backend - Núcleo do Servidor:** Crie o servidor Express básico com TypeScript. Implemente a leitura do `db.json` e o mecanismo de roteamento dinâmico que cria as rotas na inicialização.

3.  **Backend - API de Gerenciamento:** Crie os endpoints `/admin/endpoints` (`GET`, `POST`, `PUT`, `DELETE`) que manipulam o `db.json`. Proteja-os com a chave de API mestre via middleware.

4.  **Backend - Segurança:** Integre `helmet`, `cors` (com configuração inicial) e `rate-limit`.

5.  **Frontend - Estrutura e Rotas:** Crie a estrutura básica do app React com `react-router-dom` para as páginas: Dashboard, Criar/Editar Endpoint e Configurações.

6.  **Frontend - Conexão API:** Configure o Axios com uma instância base, incluindo o header de autorização com a chave mestre.

7.  **Frontend - UI do Dashboard:** Construa a tabela de endpoints, buscando os dados da API de gerenciamento (`GET /admin/endpoints`).

8.  **Frontend - UI do Formulário:** Construa o formulário completo de criação/edição. Implemente a lógica de submissão para as rotas `POST` e `PUT` da API de gerenciamento.

9.  **Integração Final:** Conecte a funcionalidade de deleção, a navegação entre as páginas e refine a UI.

10. **Refinamento de Segurança:** Implemente a validação de input no backend (`express-validator`) e no frontend. Adicione a configuração de CORS dinâmica na página de Configurações.

---

**Instrução final para a IA:** "Vamos começar pelo passo 1. Por favor, gere os comandos de terminal e o conteúdo inicial dos arquivos `package.json` e `tsconfig.json` para as pastas `server` e `client`."



