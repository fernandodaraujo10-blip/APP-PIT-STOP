
# Pit Stop - Lava Car & Estética 🚗✨

Sistema completo para gestão de fluxo, agendamentos e CRM de Lava Jato. Focado em UX mobile-first, performance e retenção de clientes.

## 🚀 Funcionalidades Principal

### Área do Cliente
- **Agendamento Inteligente**: Seleção de data/hora com trava de antecedência.
- **Personalização VIP**: Escolha de nível de sujeira e serviços adicionais (Upsell).
- **Gamificação (Cashback)**: Acúmulo de saldo real por visita.
- **Cupons**: Sistema de descontos para novos e antigos clientes.

### Dashboard Administrativo (Pit Stop PRO)
- **Fila em Tempo Real**: Gestão visual do status dos veículos na pista.
- **Financeiro Detalhado**: Ticket médio, receita diária e faturamento total.
- **CRM Ativo**: Base de dados de clientes com histórico e botão de ação rápida via WhatsApp.
- **Automação de Mensagens**: Templates editáveis para avisos de "Carro Pronto" ou "Promoção".
- **Inteligência Artificial (Gemini)**: Briefing diário com sugestões estratégicas para o fluxo.

## 🛠️ Tech Stack

- **Frontend**: React 19 (Hooks, Context API, Suspense).
- **Estilização**: Tailwind CSS (Design System customizado).
- **Ícones**: Lucide React.
- **IA**: Google Gemini API (gemini-3-flash).
- **Backend/DB**: Firebase (Firestore/Auth/Storage) - Atualmente em modo de simulação via `services/firebase.ts`.

## 📂 Estrutura de Pastas

```
/
├── components/          # Componentes reutilizáveis (UI)
├── hooks/               # Custom hooks de lógica de negócio
├── services/            # Integração com APIs externas (Firebase/IA)
├── utils/               # Helpers de validação e sanitização
├── App.tsx              # Orquestrador principal de views
├── AppContext.tsx       # Gerenciamento de estado global
├── constants.ts         # Configurações e dados iniciais
└── types.ts             # Definições de interfaces TypeScript
```

## 📊 Schema do Banco de Dados (Firestore)

### Collection: `appointments`
```json
{
  "customerName": "String",
  "customerPhone": "String (E.164)",
  "vehicleModel": "String",
  "serviceName": "String",
  "price": "Number",
  "status": "waiting | in_progress | completed | paid | cancelled",
  "date": "YYYY-MM-DD",
  "time": "HH:mm",
  "createdAt": "Timestamp"
}
```

### Collection: `settings`
```json
{
  "openingHour": "Number",
  "closingHour": "Number",
  "lockDurationHours": "Number",
  "couponsEnabled": "Boolean"
}
```

## 🤝 Guia de Contribuição

1. Clone o repositório.
2. Certifique-se de ter as variáveis de ambiente configuradas (`process.env.API_KEY`).
3. Para novos componentes, utilize o padrão de componentes funcionais com `React.memo` se forem puros.
4. Mantenha as validações em `utils/validation.ts`.

## 🛡️ Segurança e Performance

- **Sanitização**: Todos os inputs de clientes são sanitizados contra XSS.
- **Lazy Loading**: Divisão de código por rota administrativa para carregamento instantâneo.
- **Retry Logic**: Operações críticas de rede possuem lógica de re-tentativa automática com backoff.
- **Error Boundary**: Captura de falhas críticas para evitar tela em branco.
