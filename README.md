# Microsserviço de atualização de status

Este serviço é um dos três microsserviços criados para a arquitetura do projeto. Sua responsabilidade é receber eventos de atualização de status, validar a progressão do fluxo e armazenar o histórico no MongoDB. O RabbitMQ realiza o transporte assíncrono das mensagens entre os serviços.

Esta documentação apresenta a contribuição do serviço para uma arquitetura de microsserviços e para um fluxo de negócio baseado em Saga Pattern.

## Contexto do negócio

O serviço principal continua responsável por criar a ordem de serviço. Durante o ciclo de vida da ordem, as ações de negócio produzem eventos de status. Este microsserviço consome esses eventos e registra os estados para consulta e acompanhamento:

```text
Serviço principal de criação da ordem de serviço
                 |
                 v
Ações do fluxo geram atualizações de status
(recebimento, diagnóstico, aprovação, execução, finalização...)
                 |
                 v
RabbitMQ -> Microsserviço de atualização de status
                 |
                 v
Validação da transição e persistência do histórico no MongoDB
```

O serviço também consulta os microsserviços de ordens e pagamentos quando precisa validar informações necessárias a uma transição. Cada serviço mantém sua responsabilidade e seus dados; este microsserviço concentra o histórico de status.

## Responsabilidades e benefícios

- Centraliza a persistência e a consulta do histórico de status.
- Recebe atualizações de forma assíncrona, reduzindo o acoplamento temporal entre o produtor e o consumidor.
- Mantém o histórico por serviço solicitado e o status agregado da ordem.
- Valida a sequência de estados antes de registrar uma transição.
- Trata mensagens repetidas e falhas de processamento com idempotência, retry limitado e DLQ.
- Integra-se com serviços de negócio por comunicação M2M.
- É implantável como serviço independente em infraestrutura própria baseada em Kubernetes.

## Fluxo de status

O evento usa o padrão RabbitMQ `requested-service.status`. O listener valida a mensagem e encaminha a transição ao serviço de domínio correspondente.

| Status do serviço solicitado | Regra aplicada |
| --- | --- |
| `RECEBIDA` | Consulta a ordem no serviço de ordens, identifica os serviços solicitados e cria seus históricos iniciais. Também inicializa o status agregado da ordem como `PENDENTE`. |
| `EM DIAGNÓSTICO` | Requer que o status anterior seja `RECEBIDA` e verifica, no serviço de ordens, a existência de funcionário e a chegada do veículo. |
| `AGUARDANDO APROVAÇÃO` | Requer o status anterior `EM DIAGNÓSTICO`. |
| `APROVADO` | Requer `AGUARDANDO APROVAÇÃO`, registra a aprovação e atualiza o status agregado da ordem conforme as regras de negócio. |
| `CANCELADO` | Requer `AGUARDANDO APROVAÇÃO`, registra o cancelamento e atualiza a ordem quando as condições do fluxo são atendidas. |
| `EM EXECUÇÃO` | Requer `APROVADO`. |
| `FINALIZADA` | Requer `EM EXECUÇÃO`. |
| `ENTREGUE` | Consulta o pagamento, valida a finalização dos serviços associados e registra a entrega para a ordem e os serviços. |


### Formato da mensagem

Exemplo do payload consumido:

```json
{
  "requested_service_number": 1042,
  "service_order_number": 501,
  "status": "EM DIAGNÓSTICO"
}
```

O `messageId` é uma propriedade de metadados da mensagem RabbitMQ, separada do payload. Quando fornecido pelo produtor, ele também participa do controle de duplicidade.

## Arquitetura modular

A aplicação usa TypeScript e NestJS. O módulo principal ([src/app.module.ts](./src/app.module.ts)) compõe os módulos e registra os schemas do MongoDB.

| Módulo/camada | Responsabilidade |
| --- | --- |
| `requestedServiceUpdate` | Recepção dos eventos RabbitMQ, endpoint HTTP de status, DTO, estados permitidos, regras das transições e histórico dos serviços solicitados. |
| `serviceOrderUpdate` | Histórico agregado da ordem, associação dos serviços solicitados e regras de aprovação, cancelamento e entrega. |
| `httpClient` | Clientes M2M para consulta ao serviço de ordens e ao serviço de pagamentos; centraliza requisições HTTP autenticadas. |
| `auth` | Guard JWT para as rotas HTTP protegidas. |
| `common/decorators` | Decorator para marcar rotas públicas, utilizado pelo health check. |
| `health` | Endpoint público `/health`, utilizado também pelo probe de saúde do Kubernetes. |
| `fallback` | Tratamento de rotas HTTP que não correspondem a endpoints existentes. |
| `config` | Configurações do RabbitMQ, incluindo fila principal e topologia de dead-letter. |
| `main.ts` | Inicialização do servidor HTTP, configuração de validação, criação da topologia RabbitMQ e conexão do consumidor. |

### Persistência no MongoDB

O serviço registra os dados usando Mongoose:

- **Histórico do serviço solicitado**: número do serviço, número da ordem e uma lista ordenada de status, cada um com nome e data de criação.
- **Histórico da ordem**: número da ordem, serviços solicitados associados e sua lista de status.
- **Mensagens processadas**: `message_id` único para reconhecer mensagens já consumidas. O schema possui índice TTL de sete dias para expiração dos registros de deduplicação.

As listas de status preservam as etapas anteriores, permitindo consultar a evolução do atendimento em vez de manter somente o estado atual.

### API HTTP

Além do consumo por fila, o serviço expõe:

| Método | Rota | Finalidade |
| --- | --- | --- |
| `GET` | `/health` | Verificar a disponibilidade da aplicação; rota pública. |
| `POST` | `/status` | Processar uma atualização de status pelo serviço de domínio. |
| `GET` | `/status/:id` | Consultar o histórico do serviço solicitado. |
| `GET` | `/api` | Acessar a documentação Swagger. |

As rotas HTTP de negócio utilizam autenticação JWT Bearer. O health check é público para permitir verificações operacionais.

## Comunicação M2M

A comunicação M2M (*Machine-to-Machine*) em microsserviços é a troca de dados e autenticação direta entre serviços de backend, sem intervenção ou contexto de um usuário final. Ela viabiliza que os componentes da arquitetura consultem e validem informações uns dos outros de forma controlada.

Neste projeto, as integrações M2M são usadas para:

1. Consultar a ordem e os serviços solicitados no serviço responsável por ordens.
2. Consultar informações do serviço solicitado durante a validação do diagnóstico.
3. Consultar a situação do pagamento antes da entrega.
4. Obter e reutilizar token de acesso para as chamadas HTTP autenticadas.

O RabbitMQ complementa essas integrações com comunicação assíncrona: o serviço produtor publica a atualização e o consumidor a processa sem exigir que ambos estejam executando a mesma chamada HTTP síncrona.

## Saga Pattern no fluxo

As técnicas relacionadas à Saga implementadas neste serviço são:

### Eventos assíncronos e autonomia dos serviços

O produtor publica a atualização no RabbitMQ; este serviço consome o evento e persiste seu próprio histórico no MongoDB. Essa separação permite que o serviço de origem e o consumidor evoluam e processem suas responsabilidades de maneira independente.

### Progressão de estado

Cada transição verifica o estado anterior antes de registrar o próximo. Por exemplo, a execução requer aprovação e a finalização requer execução. Essa regra de domínio mantém o histórico coerente e evita que uma mesma transição seja acrescentada novamente como uma nova etapa válida.

### Idempotência

A idempotência é tratada de duas formas complementares:

- **Regra simples de domínio**: a validação do estado anterior controla a progressão e impede aplicar a mesma transição como uma nova mudança válida.
- **Deduplicação de mensagem**: quando a mensagem tem `messageId`, o consumidor consulta a coleção de mensagens processadas. Mensagens com identificador já registrado são reconhecidas e confirmadas sem repetir o processamento. O identificador possui restrição de unicidade e os registros têm retenção TTL de sete dias.

Essas regras reduzem duplicações de histórico quando a mensageria entrega novamente uma mensagem ou quando uma transição já foi aplicada.

### Tratamento de falhas: retry e DLQ

O consumidor confirma (`ack`) mensagens processadas com sucesso e classifica falhas para encaminhamento adequado:

- **Erros permanentes**, como payload inválido ou erro de negócio HTTP abaixo de `500`, são rejeitados sem reencaminhamento para a fila principal e direcionados à dead-letter exchange.
- **Erros transitórios**, como falhas temporárias de integração ou infraestrutura, aguardam dois segundos e são reenfileirados para nova tentativa.
- **Limite de entrega**: a fila principal é do tipo quorum e configura limite de cinco entregas. Ao atingir o limite, a mensagem é encaminhada à DLQ.
- **DLQ**: o serviço declara a exchange durável `status.dlx`, a fila durável `status.dead` e o vínculo de roteamento `status.dead`, permitindo separar mensagens que precisam de análise ou tratamento posterior.
- **Consumo controlado**: o consumidor usa confirmação manual (`noAck: false`) e `prefetchCount: 1`, processando uma mensagem não confirmada por vez.

Essa separação evita retry contínuo para erros de negócio e preserva uma oportunidade limitada de recuperação para falhas transitórias.

## Execução e configuração

### Dependências

- Node.js e npm.
- MongoDB acessível pela aplicação.
- RabbitMQ acessível pela aplicação.
- Serviço de ordens, serviço de pagamentos e servidor de autorização acessíveis nos fluxos correspondentes.

### Variáveis de ambiente

| Variável | Finalidade |
| --- | --- |
| `PORT` | Porta HTTP; padrão `3003`. |
| `MONGO_URI` | URI de conexão com MongoDB. |
| `RMQ_URL` | URL de conexão com RabbitMQ. |
| `STATUS_QUEUE_NAME` | Nome da fila principal de status. |
| `JWT_SECRET` | Segredo usado para validar JWT nas rotas HTTP. |
| `AUTHORIZATION_SERVER_URL` | URL base do servidor de autorização. |
| `SERVICE_ORDER_URL` | URL base do serviço de ordens. |
| `PAYMENT_SERVICE_URL` | URL base do serviço de pagamentos. |

As credenciais de serviço usadas na comunicação M2M devem ser tratadas como segredos e protegidas pela infraestrutura de execução.

### Comandos principais

```bash
npm ci
npm run dev       # desenvolvimento com reload
npm run build     # compilação
npm run start:prod
npm test          # testes Jest
npm run lint      # lint
```

## Implantação em infraestrutura própria

A infraestrutura do projeto usa Terraform para provisionar o `Deployment` e o `Service` Kubernetes. A configuração atual executa uma réplica na porta `3003`, define o health check em `/health`, recursos de CPU/memória e injeta as configurações de MongoDB e RabbitMQ por parâmetros/secrets da infraestrutura.

O pipeline de CI/CD:

1. Constrói a imagem Docker e a publica no GitHub Container Registry.
2. Executa a etapa de deploy em runner self-hosted.
3. Usa Terraform para aplicar os recursos Kubernetes no cluster configurado.

Esse fluxo permite manter os serviços e dependências no servidor próprio da equipe, com conectividade de rede e credenciais controladas pela infraestrutura.

## Estrutura do repositório

```text
src/
  app.module.ts
  main.ts
  common/                    # Recursos compartilhados
  config/                    # Configuração de ambiente e RabbitMQ
  modules/
    auth/                    # Autenticação JWT HTTP
    fallback/                # Rota não encontrada
    health/                  # Health check
    httpClient/              # Integrações M2M
    requestedServiceUpdate/  # Eventos, regras e histórico dos serviços
    serviceOrderUpdate/      # Histórico e regras do status da ordem
infra/                       # Terraform para Kubernetes
```
