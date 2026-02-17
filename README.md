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
- Deployment workflows

---

## 🚀 Features

- ⚛️ **React SPA** with component-based UI
- ⚡ **Vite** for fast development and optimized builds
- 🌐 Backend API integration
- 📁 Clean project structure separating frontend and backend concerns
- 🐳 Docker support for deployment
- 🚀 Scripts for building and deploying to a VPS

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
- Appwrite
- Google Cloud API for Login Functions

**DevOps / Tooling**
- Docker
- Shell scripts
- VPS deployment (DigitalOcean)

---

## 📦 Deployment

This project includes Docker and shell scripts for production deployment:

- Dockerfile – builds the application container
- docker-compose.yml – service orchestration
- build.sh – build automation
- deploy.sh – deployment automation

These were used to deploy the app to a VPS environment.

---

## 🧠 What This Project Demonstrates

- Building and structuring a real React application
- Using modern frontend tooling (Vite)
- Separating frontend and backend logic
- Automating builds and deployments
- Working with production-like environments

---

## 🔮 Potential Improvements

- Authentication and user accounts
- Persistent database integration
- Improved accessibility and UI polish
- Testing (unit / integration)
- Expanded feature set for students or educators

---

## 📜 License

© 2025 SirNotEthan. All rights reserved.

This repository is provided for **viewing and evaluation purposes only**.  
No permission is granted to use, copy, modify, merge, publish, distribute, sublicense, or sell any part of this project without explicit written permission from the author.
