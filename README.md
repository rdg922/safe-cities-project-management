# Safe Cities Project Management Platform

A modern collaborative workspace platform designed specifically for Safe Cities South Africa Non-Profit organization. This Notion-inspired project management system streamlines programme coordination, enhances team collaboration, and simplifies content management for non-profit operations.

## 🌍 About Safe Cities South Africa

Safe Cities South Africa is a non-profit organization dedicated to creating safer communities across South Africa. This platform was developed to address the unique organizational challenges faced by non-profit teams, providing an intuitive workspace that combines project management, content creation, and team communication.

## Screenshots

![image](https://github.com/user-attachments/assets/4e059539-ee92-46eb-bcb6-071b627dbefa)
![image](https://github.com/user-attachments/assets/5150956d-3a0b-4f73-8315-8dd48f5e7b2a)
![image](https://github.com/user-attachments/assets/3350c3fd-0c6b-4811-a9db-85c9784ba5d5)

## 🎯 Project Overview

This platform serves as a comprehensive workspace solution that combines the best aspects of Notion's content editing capabilities with project management features tailored for non-profit organizations. The system enables teams to organize programmes hierarchically, collaborate in real-time, and maintain clear communication channels across all projects.

### Key Objectives

- **Streamline Programme Management**: Replace fragmented tools with a unified workspace
- **Enhance Collaboration**: Enable seamless communication between team members
- **Simplify Content Creation**: Provide intuitive editing tools accessible to all skill levels
- **Improve Organization**: Implement structured programme and page hierarchies
- **Ensure Security**: Role-based permissions for viewing, commenting, and editing

## 🚀 Features

### Core Functionality
- **Hierarchical Programme Structure**: Organize programmes and pages in nested structures
- **Notion-Style Editor**: WYSIWYG markdown editor with keyboard shortcuts and drag-and-drop functionality
- **Real-time Collaboration**: Live editing with conflict resolution
- **File Management**: Upload and embed images, documents, and media files
- **Per-Page Permissions**: Granular access control (View/Comment/Edit) based on user roles

### Communication & Collaboration
- **Page-Level Chat**: Dedicated chat rooms for each page with @mention functionality
- **Global Chat Hub**: Centralized access to all chat conversations
- **Notification System**: Real-time alerts for mentions, comments, and permission changes
- **Activity Feed**: Track recent edits, new pages, and programme updates

### Advanced Features (Planned)
- **Form Builder**: Create forms that automatically update connected spreadsheets
- **Task Management**: Assign and track tasks at the page level
- **Calendar Integration**: Schedule and view events across programmes
- **Offline Support**: PWA capabilities for offline content editing
- **Data Export**: Backup content to .docx, .png, and .csv formats

## 🛠️ Technology Stack

### Frontend & Backend
- **Next.js 14**: Full-stack React framework with App Router
- **TypeScript**: Type-safe development environment
- **Tailwind CSS**: Utility-first CSS framework for responsive design
- **tRPC**: End-to-end typesafe APIs

### Database & Authentication
- **Drizzle ORM**: Type-safe database interactions
- **Supabase**: PostgreSQL database with real-time capabilities
- **Clerk**: User authentication and session management

## 🏗️ Architecture

The platform follows a modern full-stack architecture with:

- **Server-Side Rendering**: Next.js App Router for optimal performance
- **Type Safety**: End-to-end TypeScript implementation
- **Component-Based Design**: Reusable UI components with shadcn/ui
- **API Layer**: tRPC for type-safe client-server communication

## 👥 User Personas

### Programme Coordinators
- Need to organize and oversee multiple programmes
- Require permission management capabilities
- Focus on high-level programme structure and team coordination

### Content Contributors
- Create and edit programme content
- Participate in discussions and provide updates
- Need intuitive editing tools with minimal learning curve

### Community Members
- View programme information and progress
- Participate in relevant discussions
- Access shared resources and documents

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn
- PostgreSQL database (Supabase recommended)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/rdg922/safe-cities-project-management.git
cd safe-cities-project-management
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env.local
# Configure your database, authentication, and other services
```

4. Run database migrations:
```bash
npm run db:push
```

5. Start the development server:
```bash
npm run dev
```

The application will be available at `http://localhost:3000`.

## 🤝 Contributing

This project is developed for Safe Cities South Africa. For contribution guidelines and development standards, please refer to our internal documentation.

## 📄 License

MIT License

Copyright (c) 2025 Safe Cities South Africa

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

---

*Built with ❤️ for South African communities*
