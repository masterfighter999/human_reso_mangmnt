# Align HRMS (Human Resource Management System)

Every workday, perfectly aligned. A modern, high-performance HR platform built with a React + Vite frontend, Express + GraphQL backend, and PostgreSQL.

---

## 🏗 Architecture & Tech Stack

- **Frontend**: React (v19), Vite, Vanilla CSS, React Router (v6)
- **Backend**: Node.js, Express.js, GraphQL (`graphql-http`, `ruru` playground)
- **Database**: PostgreSQL (Singleton connection pooling via `pg` driver)
- **Authentication**: JWT-based timing-safe authentication (Access & Refresh tokens) with bcrypt hashing
- **Styling & Design**: Sage-teal & Ink custom dark/light theme, Fraunces (serif display), Inter (sans body), and IBM Plex Mono (data-mono) Pairings.

---

## ✨ Features

- **The Alignment Grid**: A visual representation of attendance and leaves mapped across the month.
- **Role-Based Views**:
  - **HR Admin**: Headcount statistics, present-today summaries, leave approval queues, salary structure configuration, and automated payslip generation.
  - **Employee**: Daily check-in/clock-out shift controls, monthly alignment grid, personal leave application, and downloadable payslips.
- **Time Off & Leave Manager**: Automatic validation of remaining leave balances per year (Paid, Sick, Unpaid) and approval workflow.
- **Salary & Payroll Engine**: Complete component breakdown (Basic, HRA, allowance components) and batch payslip generation.

---

## 🚀 Getting Started

### 1. Prerequisites
- [Node.js](https://nodejs.org/) (v18+)
- [Docker](https://www.docker.com/) (for PostgreSQL database)

### 2. Setup Database
Start the PostgreSQL container:
```bash
docker-compose up -d
```

### 3. Install Dependencies
Run the installation script at the root directory:
```bash
npm run install:all
```

### 4. Database Migrations
Create the tables and seed the default leave types (e.g. Paid Time Off, Sick Leave, Unpaid Leaves):
```bash
npm run db:migrate
```

### 5. Running the Application
Start both the backend and frontend dev servers concurrently:
```bash
npm run dev
```

- **Frontend Application**: [http://localhost:5173/](http://localhost:5173/)
- **GraphQL Playground**: [http://localhost:5000/](http://localhost:5000/) (Endpoint: `/graphql`)

---

## 🔑 Default Setup
When running the app for the first time, navigate to the register page ([http://localhost:5173/signup](http://localhost:5173/signup)) to set up your primary Admin/HR account and initialize the organization.