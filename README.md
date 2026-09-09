# StudentLens

**See students more clearly. Build better academic tools.**

StudentLens is a **React-based web application** designed to explore how modern frontend architectures can be used to build clean, scalable student-focused platforms. The project focuses on structure, usability, and real-world deployment practices rather than being a simple demo app.

---

## 📌 Overview

StudentLens is a single-page application (SPA) built with **React and Vite**, paired with a Node.js backend. The goal of the project was to design and implement a realistic full-stack setup that mirrors how production web apps are structured, built, and deployed.

This repository demonstrates experience with:
- Modern React development
- Component-based architecture
- Frontend build tooling
- Full-stack project organization
- Local-first database and file storage
- Homelab deployment workflows

---

## 🚀 Features

- ⚛️ **React SPA** with component-based UI
- ⚡ **Vite** for fast development and optimized builds
- 🌐 Backend API integration
- 🗄️ Local PostgreSQL persistence with Prisma
- ⚡ Redis-backed sessions/cache support
- 📦 Local persistent uploads storage
- 📁 Clean project structure separating frontend and backend concerns
- 🐳 Docker support for deployment
- 🚀 Kubernetes-ready deployment for homelab hosting

---

## 🧱 Project Structure

```
├── backend/ # Backend server logic (Node.js)
├── public/ # Static assets
├── src/ # React application source
│ ├── components/ # Reusable UI components
│ ├── pages/ # Page-level components
│ └── main.jsx # App entry point
├── Dockerfile # Docker build configuration
├── docker-compose.yml # Container orchestration
├── build.sh # Build script
├── deploy.sh # Deployment script
├── index.html # HTML entry file
├── package.json # Dependencies and scripts
└── vite.config.js # Vite configuration
```

---

## 🛠 Tech Stack

**Frontend**
- React
- JavaScript / JSX
- Vite

**Backend**
- Node.js
- Typescript
- Express
- Prisma
- PostgreSQL
- Redis
- Google OAuth login support

**Legacy migration**
- Appwrite export tooling is retained only to move old hosted data into the local database.
- `npm run appwrite:export` exports users, application collections, and every
  Appwrite Storage file into `backend/exports/appwrite`.
- `npm run local:import` upserts the exported records into PostgreSQL, rewrites
  Appwrite Storage URLs to `/uploads/...`, and registers the local files.
- Copy `backend/exports/appwrite/storage/*` into the persistent uploads volume
  at `/app/uploads/appwrite/` before retiring Appwrite.
- Appwrite Argon2/bcrypt password hashes are retained. A successful login with
  an imported Argon2 hash transparently upgrades it to the native bcrypt format.

**DevOps / Tooling**
- Docker
- Shell scripts
- Kubernetes / K3s
- Cloudflare Tunnel public access

---

## 📦 Deployment

This project includes Docker and Kubernetes-compatible production deployment support:

- Dockerfile – builds the application container
- docker-compose.yml – local service orchestration
- build.sh – build automation
- deploy.sh – deployment automation

The current production target is a self-hosted homelab stack with local PostgreSQL, Redis, persistent uploads, Kubernetes ingress, and Cloudflare Tunnel routing.

---

## 🧠 What This Project Demonstrates

- Building and structuring a real React application
- Using modern frontend tooling (Vite)
- Separating frontend and backend logic
- Migrating from hosted BaaS storage to local infrastructure
- Automating builds and deployments
- Working with production-like environments

---

## 🔮 Potential Improvements

- Complete the one-time production import from the legacy Appwrite export
- Expand admin tooling for local account recovery and data management
- Improved accessibility and UI polish
- Testing (unit / integration)
- Expanded feature set for students or educators

---

## 📜 License

© 2025 SirNotEthan. All rights reserved.

This repository is provided for **viewing and evaluation purposes only**.  
No permission is granted to use, copy, modify, merge, publish, distribute, sublicense, or sell any part of this project without explicit written permission from the author.
