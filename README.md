# FamilyHub - Family Site Platform

A comprehensive, full-stack platform for families to connect, share memories, and preserve their heritage for generations.

## Features

- **Family Tree** - Interactive, zoomable family tree with versioning and export (PNG, PDF, GEDCOM)
- **Member Profiles** - Detailed profiles with photos, bios, and family connections
- **Events Calendar** - Family events, ceremonies, and important dates
- **Photo Gallery** - Shared photo albums with privacy controls
- **News Feed** - Family announcements and updates
- **Activities** - Track and share family activities
- **Achievements** - Celebrate family milestones
- **Locations** - Map of family-significant places
- **Procedures** - Document family procedures and traditions

## Tech Stack

- **Frontend**: Next.js 15 (App Router), React 19, TypeScript
- **Styling**: Tailwind CSS 4, Mobile-first responsive design
- **Backend**: Next.js API Routes, MongoDB with Mongoose
- **Authentication**: JWT with HTTP-only cookies, RBAC
- **Storage**: Vercel Blob for media files
- **Maps**: Google Maps API for locations

## Getting Started

### Prerequisites

- Node.js 18+
- MongoDB (local or Atlas)
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone https://github.com/your-org/family-unit.git
cd family-unit
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env.local
```

4. Configure your `.env.local` with your values:
```env
MONGODB_URI=mongodb://localhost:27017/familyhub
JWT_SECRET=your-secure-jwt-secret
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

5. Seed the database (optional):
```bash
npx ts-node scripts/seed.ts
```

6. Run the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the app.

## User Roles

| Role | Permissions |
|------|-------------|
| **System Admin** | Full platform access, approve public families |
| **Family Admin** | Manage family settings, approve content, manage members |
| **Family Member** | View family content, submit content for approval |
| **Guest** | View public families and content only |

## Project Structure

```
src/
├── app/                  # Next.js App Router pages
│   ├── api/              # API routes
│   ├── auth/             # Authentication pages
│   ├── family/           # Family-related pages
│   ├── dashboard/        # Admin dashboard
│   └── admin/            # System admin pages
├── components/           # React components
│   ├── ui/               # Reusable UI components
│   ├── layout/           # Layout components
│   └── tree/             # Family tree components
├── context/              # React contexts
├── lib/                  # Utility functions
├── models/               # Mongoose models
└── types/                # TypeScript types
```

## API Documentation

See [docs/README.md](./docs/README.md) for complete API documentation.

### Key Endpoints

- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `GET /api/families` - List families
- `GET /api/families/:id/members` - Get family members
- `GET /api/families/:id/tree` - Get family tree
- `POST /api/approvals/:id/approve` - Approve content

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `MONGODB_URI` | MongoDB connection string | Yes |
| `JWT_SECRET` | Secret for JWT signing | Yes |
| `NEXT_PUBLIC_APP_URL` | Public app URL | Yes |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob token | For uploads |
| `GOOGLE_MAPS_API_KEY` | Google Maps API key | For locations |

## Development

```bash
# Run development server
npm run dev

# Run linting
npm run lint

# Build for production
npm run build

# Start production server
npm start
```

## Deployment

### Vercel (Recommended)

1. Push to GitHub
2. Import project in Vercel
3. Configure environment variables
4. Deploy

### Docker

```bash
docker build -t familyhub .
docker run -p 3000:3000 familyhub
```

## Security Features

- JWT tokens in HTTP-only cookies
- Role-based access control (RBAC)
- Content moderation workflow
- Audit logging for all actions
- Private by default (families must be approved to be public)
- GDPR-compliant data export

## License

MIT License - See [LICENSE](./LICENSE) for details.
