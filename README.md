# MiniList CMS Backend

A simple, fun headless CMS backend built with NestJS, PostgreSQL, and Prisma. Perfect for managing blogs, content editors, and authors with a clean REST API.

## 🚀 Features

This headless CMS provides everything you need to manage your content:

- **🔐 Authentication**: Google OAuth login with JWT-based sessions
- **📝 Blog Management**: Create, update, publish, schedule, and manage blogs with statuses (Draft, Private, Public, Scheduled)
- **✍️ Content Editors**: Rich text content management with multiple editor instances
- **👤 Author Management**: Create and manage blog authors with profiles
- **🔑 API Keys**: Generate and manage API keys for programmatic access
- **📊 Analytics Dashboard**: Track login history, blog statistics, and content metrics
- **🔍 SEO Support**: Built-in SEO fields (title, description, keywords) for each blog
- **🗑️ Soft Delete**: Safe content deletion with recovery capability
- **📚 Login History**: Track user authentication history

## 🐳 Self-Hosting with Docker

The easiest way to get started is using Docker Compose. It handles everything for you!

### Prerequisites

- [Docker](https://www.docker.com/get-started) and [Docker Compose](https://docs.docker.com/compose/install/) installed
- A PostgreSQL database connection string
- Google OAuth credentials (for authentication)

### Quick Start

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd minilist-cms-backend
   ```

2. **Create environment file**
   ```bash
   cp .env.example .env
   ```

3. **Configure environment variables**
   
   Edit `.env` and set the following variables:
   
   ```env
   # Required: PostgreSQL database connection URL
   DATABASE_URL=postgresql://user:password@host:5432/database?schema=public
   
   # Required: Generate a strong secret key
   JWT_SECRET=your-super-secret-jwt-key-change-this
   
   # Required: Google OAuth credentials
   # Get these from: https://console.cloud.google.com/apis/credentials
   GOOGLE_CLIENT_ID=your-google-client-id
   GOOGLE_CLIENT_SECRET=your-google-client-secret
   
   # Required: Your frontend URL
   CLIENT_URL=http://localhost:3000
   
   # Required: Your backend URL (for OAuth callbacks)
   BACKEND_BASE_URL=http://localhost:3001
   ```

4. **Build and start**
   ```bash
   docker-compose up -d
   ```

   This will:
   - Build the NestJS application
   - Run database migrations
   - Start the API server on port 3001

5. **Verify it's running**
   ```bash
   curl http://localhost:3001/api
   ```
   
   You should see: `{"status":"Backend is working!"}`

### Managing the Services

```bash
# View logs
docker-compose logs -f app

# Stop services
docker-compose down

# Restart services
docker-compose restart
```

## 🛠️ Development Setup

If you prefer to run it locally without Docker:

### Prerequisites

- Node.js 20+ and Yarn
- A PostgreSQL database connection string

### Setup

1. **Install dependencies**
   ```bash
   yarn install
   ```

2. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

   Make sure to set `DATABASE_URL` in your `.env`:
   ```env
   DATABASE_URL=postgresql://user:password@host:5432/database?schema=public
   ```

3. **Run migrations**
   ```bash
   yarn prisma migrate deploy
   ```

4. **Generate Prisma Client**
   ```bash
   yarn prisma generate
   ```

5. **Start the server**
   ```bash
   # Development mode
   yarn start:dev
   
   # Production mode
   yarn build
   yarn start:prod
   ```

## 📖 API Endpoints

All endpoints are prefixed with `/api`. Authentication is required for most endpoints (JWT token in cookies).

### Authentication
- `GET /api/auth/google` - Initiate Google OAuth login
- `GET /api/auth/callback/google` - OAuth callback
- `GET /api/auth/me` - Get current user profile
- `GET /api/auth/logout` - Logout

### Blogs
- `GET /api/blogs` - List all blogs
- `POST /api/blogs` - Create a blog
- `GET /api/blogs/:id` - Get blog by ID
- `PUT /api/blogs/:id` - Update blog
- `DELETE /api/blogs/:id` - Soft delete blog
- `POST /api/blogs/:id/publish` - Publish blog
- `POST /api/blogs/:id/schedule` - Schedule blog for later

### Editors
- `GET /api/editor` - List all editors
- `POST /api/editor` - Create editor
- `GET /api/editor/:id` - Get editor by ID
- `PUT /api/editor/:id` - Update editor
- `DELETE /api/editor/:id` - Soft delete editor

### Authors
- `GET /api/authors` - List all authors
- `POST /api/authors` - Create author
- `GET /api/authors/:id` - Get author by ID
- `PUT /api/authors/:id` - Update author
- `DELETE /api/authors/:id` - Soft delete author

### API Keys
- `POST /api/api-key` - Generate API key
- `GET /api/api-key` - Get API key status
- `DELETE /api/api-key` - Deactivate API key

### Analytics
- `GET /api/dashboard/metrics` - Get user metrics and statistics

## 🏗️ Tech Stack

- **Framework**: NestJS (Node.js)
- **Database**: PostgreSQL
- **ORM**: Prisma
- **Authentication**: Passport.js (Google OAuth + JWT)
- **Validation**: class-validator, class-transformer

## 📝 Database Schema

The CMS uses the following main models:
- **User**: User accounts with OAuth integration
- **Blog**: Blog posts with SEO and scheduling
- **Editor**: Rich text content editors
- **BlogAuthor**: Author profiles
- **ApiKey**: API keys for programmatic access
- **LoginHistory**: Authentication tracking
