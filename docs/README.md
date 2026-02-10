# Family Site Platform Documentation

## Table of Contents

1. [Overview](#overview)
2. [Getting Started](#getting-started)
3. [Architecture](#architecture)
4. [API Reference](#api-reference)
5. [User Guides](#user-guides)
6. [Deployment](#deployment)

---

## Overview

FamilyHub is a full-stack Family Site Platform designed to help families connect, share memories, and preserve their heritage. Built with privacy, security, and ease of use at its core.

### Key Features

- **Family Tree Visualization** - Build and visualize multi-generational family trees with export capabilities
- **Content Management** - Activities, ceremonies, news, achievements, offers, and more
- **Photo Gallery** - Organize and share family photos in folders
- **Events Calendar** - Plan and coordinate family events
- **Role-Based Access Control** - Guest, Family Member, Family Admin, System Admin
- **Privacy Controls** - Private by default with granular visibility settings
- **Approval Workflows** - All content requires moderation before publication
- **Audit Logging** - Complete audit trail for all actions
- **Data Export** - GDPR-compliant data export functionality

### Tech Stack

- **Frontend**: Next.js 15 (App Router), TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: MongoDB with Mongoose
- **Authentication**: JWT + RBAC
- **Media Storage**: Vercel Blob
- **Deployment**: Vercel

---

## Getting Started

### Prerequisites

- Node.js 18+
- MongoDB (local or Atlas)
- npm or yarn

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd Family-unit

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local

# Edit .env.local with your configuration
```

### Environment Variables

Create a `.env.local` file with the following variables:

```env
# MongoDB
MONGODB_URI=mongodb://localhost:27017/family-platform

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRES_IN=7d
REFRESH_TOKEN_EXPIRES_IN=30d

# Vercel Blob (for media storage)
BLOB_READ_WRITE_TOKEN=your-vercel-blob-token

# Google Maps (optional)
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your-google-maps-api-key
```

### Running Locally

```bash
# Start development server
npm run dev

# Seed the database with demo data
npx ts-node scripts/seed.ts

# Build for production
npm run build

# Start production server
npm start
```

### Demo Accounts

After running the seed script:

| Role | Email | Password |
|------|-------|----------|
| System Admin | admin@familyhub.com | password123 |
| Family Admin | john.johnson@demo.com | password123 |
| Family Member | member@demo.com | password123 |

---

## Architecture

### Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── api/               # API routes
│   │   ├── auth/         # Authentication endpoints
│   │   ├── families/     # Family management
│   │   ├── entities/     # Content entities
│   │   ├── events/       # Events calendar
│   │   ├── approvals/    # Approval workflows
│   │   └── ...
│   ├── auth/              # Auth pages
│   ├── family/            # Family pages
│   └── dashboard/         # Admin dashboard
├── components/            # React components
│   ├── ui/               # Base UI components
│   ├── layout/           # Layout components
│   └── tree/             # Family tree components
├── context/               # React context providers
├── hooks/                 # Custom React hooks
├── lib/                   # Utility libraries
│   ├── auth.ts           # Authentication logic
│   ├── audit.ts          # Audit logging
│   ├── db.ts             # Database connection
│   └── utils.ts          # Utility functions
├── models/                # MongoDB models
└── types/                 # TypeScript types
```

### Database Schema

#### Users
- Basic profile information
- Role-based permissions
- Family association (one family per user)
- Soft delete support

#### Families
- Name, origin, description, motto
- Public/Private visibility
- Settings and preferences
- Statistics tracking

#### FamilyMembers
- Biographical information
- Relationship links (parent, spouse, children)
- Generation tracking
- Lineage array for ancestry

#### Entities
- Unified model for Activities, News, Achievements, etc.
- Versioning support
- Status and visibility controls
- Media attachments

#### AuditLogs
- Actor, action, target tracking
- IP address and user agent
- Full details object
- 2-year retention policy

---

## API Reference

### Authentication

#### POST /api/auth/register
Create a new user account.

```json
{
  "email": "user@example.com",
  "password": "securepassword",
  "firstName": "John",
  "lastName": "Doe",
  "role": "family_admin" // optional, defaults to "guest"
}
```

#### POST /api/auth/login
Authenticate a user.

```json
{
  "email": "user@example.com",
  "password": "securepassword"
}
```

#### POST /api/auth/logout
End the current session.

#### GET /api/auth/me
Get current user information.

### Families

#### GET /api/families
List families (public families for guests, all for admin).

Query parameters:
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 20)
- `search` - Search term
- `status` - Filter by status (admin only)

#### POST /api/families
Create a new family.

```json
{
  "name": "The Smith Family",
  "origin": "New York",
  "description": "Our family story...",
  "visibility": "private"
}
```

#### GET /api/families/:familyId
Get family details.

#### PATCH /api/families/:familyId
Update family details (admin only).

#### DELETE /api/families/:familyId
Soft delete a family (admin only).

### Family Members

#### GET /api/families/:familyId/members
List family members.

Query parameters:
- `showFemales` - Include female members (default: based on family settings)
- `generation` - Filter by generation
- `status` - Filter by status

#### POST /api/families/:familyId/members
Add a new family member.

```json
{
  "firstName": "Jane",
  "lastName": "Smith",
  "gender": "female",
  "dateOfBirth": "1990-01-15",
  "parentId": "parent_member_id"
}
```

### Family Tree

#### GET /api/families/:familyId/tree
Get the family tree structure.

Query parameters:
- `showFemales` - Include female members
- `version` - Get specific historical version

#### POST /api/families/:familyId/tree
Save a new tree version (creates snapshot).

```json
{
  "changeDescription": "Added new generation"
}
```

### Entities

#### GET /api/entities
List content entities.

Query parameters:
- `familyId` - Required
- `entityType` - Filter by type (activity, news, achievement, etc.)
- `status` - Filter by status
- `tag` - Filter by tag

#### POST /api/entities
Create a new entity.

```json
{
  "familyId": "family_id",
  "entityType": "activity",
  "title": "Family Reunion",
  "description": "Annual gathering...",
  "startDate": "2024-07-04",
  "visibility": "private"
}
```

### Approvals

#### GET /api/approvals
List pending approvals (admin only).

#### POST /api/approvals
Process an approval.

```json
{
  "approvalId": "approval_id",
  "action": "approve", // or "reject"
  "comments": "Looks good!"
}
```

### Search

#### GET /api/search
Full-text search across family content.

Query parameters:
- `familyId` - Required
- `q` - Search query (min 2 characters)
- `entityType` - Filter by type
- `dateFrom` / `dateTo` - Date range
- `contributor` - Filter by creator

### Dashboard

#### GET /api/dashboard
Get dashboard statistics.

Query parameters:
- `familyId` - Optional (uses user's family if not provided)

### Export

#### POST /api/export
Export family or user data.

```json
{
  "exportType": "family", // or "user", "tree"
  "familyId": "family_id",
  "format": "json", // or "csv"
  "includePrivate": false
}
```

---

## User Guides

### For Guests

1. **Explore Public Families** - Browse publicly visible families
2. **View Family Trees** - See public family tree structures
3. **Register** - Create an account to join or create a family

### For Family Members

1. **View Family Content** - Access all family activities, news, photos
2. **Submit Content** - Add new content (requires admin approval)
3. **Update Profile** - Manage your family member profile
4. **View Calendar** - See upcoming family events

### For Family Admins

1. **Manage Members** - Add, edit, and remove family members
2. **Approve Content** - Review and approve member submissions
3. **Configure Settings** - Set family privacy and preferences
4. **View Dashboard** - Monitor family activity and statistics
5. **Export Data** - Download family data in various formats

### For System Admins

1. **Manage All Families** - Oversee all families on the platform
2. **Approve Public Families** - Review families requesting public visibility
3. **Manage Users** - Handle user accounts and role assignments
4. **View System Dashboard** - Platform-wide statistics
5. **Access Audit Logs** - Review all system activity

---

## Deployment

### Vercel Deployment

1. **Connect Repository**
   - Link your GitHub repository to Vercel

2. **Configure Environment Variables**
   - Add all required environment variables in Vercel dashboard

3. **Configure Build Settings**
   - Framework: Next.js
   - Build Command: `npm run build`
   - Output Directory: `.next`

4. **Deploy**
   - Automatic deployments on push to main branch

### MongoDB Atlas Setup

1. Create a MongoDB Atlas cluster
2. Configure network access (allow Vercel IPs)
3. Create database user
4. Get connection string and add to environment variables

### Vercel Blob Setup

1. Enable Vercel Blob in your project
2. Copy the read/write token to environment variables

### Post-Deployment

1. Run seed script to create initial admin user
2. Configure custom domain (optional)
3. Set up monitoring and alerts

---

## Security Considerations

- All passwords are hashed with bcrypt (12 rounds)
- JWT tokens expire after 7 days
- All API routes validate authentication and authorization
- Soft delete prevents accidental data loss
- Audit logs track all sensitive actions
- Content requires approval before publication
- CORS and CSRF protection enabled
- Input validation on all endpoints

---

## License

MIT License - See LICENSE file for details.
