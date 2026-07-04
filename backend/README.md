# Human Resource Management System (HRMS) - Backend API

Production-quality backend for a modern SaaS HR platform, built for the Odoo Hackathon.

## 🏗 Architecture & Tech Stack

- **Runtime**: Node.js
- **Language**: TypeScript
- **Framework**: Express.js
- **Database**: PostgreSQL (Raw SQL via `pg` driver for maximum performance and explicit control)
- **Validation**: Zod
- **Authentication**: JWT (Access & Refresh tokens) with bcrypt hashing
- **Security**: Helmet, CORS, Tiered Rate Limiting

## ✨ Features Implemented

* **Robust Database Foundation**: Custom transaction wrappers, singleton connection pooling, and a custom migration/seeding runner.
* **Advanced Authentication Strategy**:
  * **Timing-Safe Login**: Prevents user enumeration attacks.
  * **Token Rotation**: Secure refresh tokens that rotate on every use.
  * **Session Invalidation**: Changing passwords immediately revokes all active sessions across all devices.
  * **Atomic Registration**: Users and Employee profiles are created within a single database transaction.
* **Role-Based Access Control (RBAC)**: Flexible `authorize('ADMIN', 'HR')` middleware.
* **Centralized Error Handling**: Standardized `ApiResponse` envelope, custom operational errors, and global exception catching.
* **Clean Code Structure**: Strict separation of concerns (`controllers` -> `services` -> `repositories`).

## 🚀 Getting Started

### 1. Prerequisites
- Node.js (v18+)
- PostgreSQL (v14+)

### 2. Installation

Clone the repository and install dependencies:

```bash
npm install
```

### 3. Environment Variables

Create a `.env` file in the `backend` root directory. Use the structure below:

```env
# ─── Server ───────────────────────────────────────────────────────────────────
NODE_ENV=development
PORT=5000

# ─── Database ─────────────────────────────────────────────────────────────────
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=your_postgres_password
DB_NAME=hrms_db
DB_SSL=false

# ─── JWT (minimum 32 characters each) ────────────────────────────────────────
JWT_ACCESS_SECRET=change_this_to_a_random_32_char_string_access
JWT_REFRESH_SECRET=change_this_to_a_random_32_char_string_refresh
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# ─── Security & Limits ────────────────────────────────────────────────────────────
CORS_ORIGIN=http://localhost:5173
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=100
```

*Make sure to create the `hrms_db` database in your PostgreSQL server before proceeding.*

### 4. Database Initialization

Run the migrations to create tables and enums, then run the seed script to create the initial admin user and default configurations.

```bash
# Apply schema migrations
npm run db:migrate

# Seed initial data (Admin user, leave types)
npm run db:seed
```

**Seed Default Admin Credentials:**
- **Email:** admin@hrms.com
- **Password:** Admin@123

### 5. Running the Server

**Development Mode:**
Starts the server with hot-reloading using `ts-node-dev`.
```bash
npm run dev
```

**Production Build:**
```bash
npm run build
npm start
```

## 🧪 Testing Locally

You can test the API endpoints using tools like Postman, Insomnia, or cURL.

1. **Start the server:** `npm run dev`
2. **Login:** Send a POST request to `http://localhost:5000/api/v1/auth/login`
   ```json
   {
     "email": "admin@hrms.com",
     "password": "Admin@123"
   }
   ```
3. **Use the Token:** Copy the `accessToken` from the response and include it in the `Authorization` header as a Bearer token for protected routes.
   ```http
   Authorization: Bearer <your_access_token>
   ```

### Available Endpoints
- `GET /api/v1/health` (Public - System Health Check)
- `POST /api/v1/auth/register` (Public)
- `POST /api/v1/auth/login` (Public)
- `POST /api/v1/auth/refresh` (Public - requires `refreshToken` in body)
- `POST /api/v1/auth/logout` (Public - requires `refreshToken` in body)
- `POST /api/v1/auth/change-password` (Protected)
- `GET /api/v1/auth/me` (Protected)

## 🗂 Git Workflow

We are using a strict feature-branch workflow. Make sure your branch is clean and type-checked before creating a pull request.
```bash
npm run type-check
```