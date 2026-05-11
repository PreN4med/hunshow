# 🎬 HunShow

HunShow is a student film-sharing web application made for Hunter College students. It gives students a space to upload, watch, like, and manage creative videos and student-made films.

The main goal of HunShow is to support student creators by giving them a clean and modern platform where their work can be discovered by other students.

---

## 🌐 Live Demo

https://hunshow.vercel.app

---

## 📌 About the Project

HunShow was created as a student-centered video platform for Hunter College. Instead of student films being scattered across group chats, folders, or social media, HunShow gives them one organized place to live.

Users can browse videos, search for films, save liked videos, upload their own work, and manage their profile. The design focuses on being simple, modern, and easy to use.

---

## ✨ Main Features

- 🎞️ Browse student films and creative projects
- 🔍 Search for films, creators, or tags
- 🧭 Filter videos by All, Latest, and Popular
- ⭐ View featured videos
- ❤️ Like and save videos
- ⬆️ Upload new videos
- 👤 Manage account/profile details
- 🛠️ Edit or delete uploaded videos
- 📺 Watch videos on a dedicated watch page
- 💬 Comments, ratings, and playback-related backend support
- 🔴 Streaming-related backend support
- 📱 Responsive layout for different screen sizes

---

## 🛠️ Tech Stack

### Frontend

- ⚛️ Next.js
- ⚛️ React
- 🎨 CSS / custom styling
- 🚀 Vercel deployment

### Backend

- 🟢 Node.js
- 🧱 NestJS
- 🍃 MongoDB
- 🔐 Authentication system
- 📦 File/video handling
- ☁️ R2 storage support
- ⚡ Redis support
- 🚀 Render or backend hosting service

---

## 📁 Project Structure

```text
hun-show/
│
├── backend/
│   ├── src/
│   │   ├── auth/
│   │   ├── comments/
│   │   ├── playback/
│   │   ├── r2/
│   │   ├── ratings/
│   │   ├── redis/
│   │   ├── stream/
│   │   ├── users/
│   │   ├── videos/
│   │   ├── watchparty/
│   │   ├── app.module.ts
│   │   └── main.ts
│   │
│   ├── package.json
│   ├── nest-cli.json
│   ├── tsconfig.json
│   └── .env
│
├── frontend/
│   ├── app/
│   │   ├── auth/
│   │   ├── liked/
│   │   ├── login/
│   │   ├── register/
│   │   ├── stream/
│   │   ├── upload/
│   │   ├── watch/[id]/
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   └── page.tsx
│   │
│   ├── components/
│   │   ├── CustomVideoPlayer.tsx
│   │   ├── FilePlayerWrapper.tsx
│   │   └── Header.tsx
│   │
│   ├── lib/
│   ├── public/
│   ├── package.json
│   ├── next.config.ts
│   └── .env.local
│
└── README.md
