# Fluid Sync

Fluid Sync is a file sharing platform that supports both peer-to-peer transfers and cloud-based sharing. Users can transfer files directly between browsers using WebRTC or upload files to the cloud and generate shareable download links.

Live Demo: https://fluid-sync-qmmr.onrender.com/

## About the Project

The goal of Fluid Sync was to build a fast and secure file-sharing solution that minimizes server dependency. Direct transfers use WebRTC data channels, allowing files to move between users without being stored on the server. When direct sharing is not practical, files can be uploaded to the cloud and shared through generated links.

## Features

* Browser-to-browser file transfer using WebRTC
* Real-time connection management with Socket.io
* Cloud upload and sharing through Cloudinary
* Google authentication using Firebase
* Transfer progress tracking
* Responsive user interface built with React and Tailwind CSS
* Secure and efficient file sharing workflow

## Tech Stack

### Frontend

* React.js
* Tailwind CSS
* Framer Motion
* Firebase Authentication
* WebRTC

### Backend

* Node.js
* Express.js
* Socket.io

### Cloud Services

* Cloudinary
* Firebase

### Deployment

* Render

## How It Works

1. A user creates or joins a room.
2. Socket.io is used to exchange signaling information.
3. A WebRTC connection is established between peers.
4. Files are transferred directly through the data channel.
5. Alternatively, users can upload files to Cloudinary and share generated download links.

## Installation

Clone the repository:

```bash
git clone https://github.com/Sahil242a/fluid-sync.git
cd fluid-sync
```

Install dependencies:

```bash
# Frontend
cd client
npm install

# Backend
cd ../server
npm install
```

## Environment Variables

Frontend (.env)

```env
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_SERVER_URL=
```

Backend (.env)

```env
PORT=5000

CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

CLIENT_URL=
```

## Running the Application

Start the backend:

```bash
cd server
npm run dev
```

Start the frontend:

```bash
cd client
npm run dev
```

## Project Structure

```text
fluid-sync
├── client
│   ├── src
│   ├── components
│   ├── pages
│   └── services
│
├── server
│   ├── routes
│   ├── controllers
│   ├── middleware
│   └── socket
│
└── README.md
```

## Key Learnings

* Building peer-to-peer communication using WebRTC
* Managing signaling with Socket.io
* Handling large file transfers efficiently
* Integrating Firebase Authentication
* Deploying full-stack applications on Render
* Working with cloud storage services like Cloudinary

## Author

Sahil Gupta

GitHub: https://github.com/Sahil242a

Portfolio: https://sahilguptaport.netlify.app/
