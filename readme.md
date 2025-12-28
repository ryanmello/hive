Hive
Your finances, working in harmony.
Inspired by the collective intelligence of the colony — where every transaction finds its place.

## 🐝 What is Hive?

**Hive** is a personal finance application that brings order to your financial life. Like bees organizing their colony with remarkable precision, Hive uses AI to automatically categorize your spending, surface insights, and help you understand where your money goes.

Connect your bank accounts, and let Hive's intelligence do the rest.

## ✨ Features

- **🏦 Bank Sync** — Securely connect your accounts via Plaid
- **🤖 Smart Categorization** — AI-powered transaction sorting that learns your patterns
- **📊 Spending Insights** — Visual breakdowns of where your money flows
- **💬 Financial Chat** — Talk to an AI advisor about your spending habits
- **🔒 Secure by Design** — Your data stays yours, encrypted and protected

## 🏗️ Architecture

Hive is built as a microservices application:

| Service | Technology | Purpose |
|---------|------------|---------|
| **Web** | Next.js, TypeScript | Frontend dashboard & chat UI |
| **API** | Go, Gin | Core gateway, auth, Plaid integration |
| **AI** | Python, FastAPI, gRPC | Transaction categorization & chat agent |

For detailed architecture documentation, see [`architecture.md`](./architecture.md).

## 🚀 Getting Started

```bash
# Clone the repository
git clone https://github.com/your-username/hive.git
cd hive

# Start all services
docker-compose up

# Frontend: http://localhost:3000
# API: http://localhost:8080
```

## 📚 Documentation

- [Architecture Overview](./architecture.md)
- [Authentication System](./authentication.md)

## 🐝 The Colony Philosophy

> *"Individually, we are one drop. Together, we are an ocean."*  
> *— Ryunosuke Satoro*

In a beehive, thousands of individual bees work in perfect coordination — each with a role, each contributing to the whole. Hive applies this philosophy to your finances:

- **Every transaction** is a worker bee, categorized and purposeful
- **Your accounts** are the honeycomb cells, organized and structured  
- **AI insights** are the waggle dance, communicating what matters
- **You** are the keeper, empowered with clarity

---

Built with 🍯 by the Hive team
