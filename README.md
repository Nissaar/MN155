# MN155 Terminal & AI Council

A professional, high-performance chat interface powered by Puter.js, providing free access to Claude 3.5 Sonnet and Claude Opus 4.7. Features a multi-model "AI Council" for consensus-based reasoning and a persistent PostgreSQL backend.

## 🚀 Deployment Guide (Docker)

### 1. Prerequisites
- Docker and Docker Compose installed.
- A domain name (if using Traefik with SSL).

### 2. Environment Setup
Create a `.env` file based on `.env.example`:
```env
DATABASE_URL=postgresql://chatuser:chatpassword@db:5432/chatbot
JWT_SECRET=your-random-secure-string
APP_URL=https://your-domain.com
```

### 4. Direct Database Administration
To promote yourself to an administrator and approve your account without waiting, run the following SQL command:
```sql
-- Connect to Postgres and run:
UPDATE users SET is_admin = true, status = 'approved' WHERE email = 'YOUR_EMAIL@HERE.COM';
```

### 3. Launch
Run the following command in the root directory:
```bash
docker-compose up -d --build
```
The application will be available at your domain (or `http://localhost`).

## 🛠 Features

- **AI Council Mode**: Invokes multiple models to deliberate on a prompt and generate a refined consensus.
- **Persistent Memory**: All conversations are stored in a local PostgreSQL database.
- **Code Workspace**: Uses the Native File System API to open and read local directories (Note: Chrome/Edge only).
- **PWA Ready**: Can be installed as a standalone application on mobile and desktop.

## 📦 Architecture
- **Frontend**: React 19 + Vite + Tailwind CSS 4.
- **Backend**: Node.js (Express) + PostgreSQL.
- **Auth**: JWT-based session management with secure HTTP-only cookies.
- **Reverse Proxy**: Traefik with automatic Docker discovery.

## 📝 Planned Improvements
- [ ] Multi-factor authentication (MFA).
- [ ] Export chats to PDF/Markdown.
- [ ] Real-time collaborative sessions (WebSockets).
- [ ] Integrated code execution sandbox.
