# Timche Farsh System 🏺

A comprehensive carpet management system built with React, TypeScript, and Convex. Features role-based access control, customer management, product catalog, and installment calculations.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Convex account

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd timch
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up Convex**
   ```bash
   npx convex dev
   ```
   This will create a `.env.local` file with your Convex deployment details.

4. **Start development servers**
   ```bash
   npm run dev
   ```
   This runs both frontend (Vite) and backend (Convex) in parallel.

5. **Access the application**
   - Frontend: http://localhost:5173
   - Convex Dashboard: https://dashboard.convex.dev

## 🏗️ Architecture

### Tech Stack
- **Frontend**: React 18, TypeScript, Vite
- **Backend**: Convex (real-time database & functions)
- **Authentication**: Convex Auth
- **Styling**: Tailwind CSS
- **UI Components**: Custom components with glass morphism design

### Project Structure
```
timch/
├── convex/                 # Backend functions & schema
│   ├── auth.ts            # Authentication functions
│   ├── roles.ts           # Role & permission management
│   ├── users.ts           # User management
│   ├── customers.ts       # Customer operations
│   ├── products.ts        # Product catalog
│   ├── companies.ts       # Company management
│   ├── collections.ts     # Collection management
│   └── schema.ts          # Database schema
├── src/
│   ├── components/        # React components
│   ├── hooks/            # Custom React hooks
│   ├── utils/            # Utility functions
│   └── lib/              # Shared libraries
└── public/               # Static assets
```

## 🔐 Role-Based Access Control (RBAC)

### Permission System

The system uses a granular permission-based approach where each action requires specific permissions:

#### Available Permissions
```typescript
// Core Modules
"installment-calculator:view"    // View installment calculator
"installment-calculator:edit"    // Edit installment calculator

// Catalog Management
"catalog:view"                   // View product catalog
"catalog:edit"                   // Edit catalog items
"catalog:delete"                 // Delete catalog items

// Customer Management
"customers:view"                 // View customer list
"customers:edit"                 // Edit customer information
"customers:delete"               // Delete customers

// User Management
"users:view"                     // View user list
"users:edit"                     // Edit user accounts
"users:delete"                   // Delete user accounts

// Role Management
"roles:view"                     // View roles and permissions
"roles:edit"                     // Create/edit roles
"roles:delete"                   // Delete roles

// Settings
"settings:view"                  // View system settings
"settings:edit"                  // Modify system settings

// Company Management
"companies:view"                 // View companies
"companies:edit"                 // Edit company information
"companies:delete"               // Delete companies

// Collection Management
"collections:view"               // View product collections
"collections:edit"               // Edit collections
"collections:delete"             // Delete collections

// Product Management
"products:view"                  // View products
"products:edit"                  // Edit product information
"products:delete"                // Delete products
```

### Default Roles

#### Super Admin
- **Description**: Full system access
- **Permissions**: All available permissions
- **System Role**: Cannot be deleted
- **Auto-assigned**: All existing users during initial setup

#### Custom Roles
- Create custom roles with specific permission combinations
- Assign multiple roles to users
- Role inheritance and permission aggregation

### Using Permissions in Components

```typescript
import { usePermissions } from './hooks/usePermissions';

function MyComponent() {
  const { hasPermission, hasAnyPermission } = usePermissions();
  
  // Check single permission
  if (hasPermission('users:edit')) {
    return <EditUserButton />;
  }
  
  // Check multiple permissions (any)
  if (hasAnyPermission(['users:view', 'users:edit'])) {
    return <UserManagementSection />;
  }
  
  return <AccessDenied />;
}
```

### Permission Hooks

#### `usePermissions()`
```typescript
const {
  hasPermission,        // Check single permission
  hasAnyPermission,     // Check if user has any of the permissions
  hasAllPermissions,    // Check if user has all permissions
  permissions,          // Array of user's permissions
  isLoading            // Loading state
} = usePermissions();
```

#### `useUserRoles()`
```typescript
const {
  userRoles,           // Array of user's roles
  displayRole,         // Formatted role display (handles multiple roles)
  primaryRole,         // First role name
  isLoading,           // Loading state
  isAuthenticated      // Authentication status
} = useUserRoles();
```

## 🎨 Design System

### Visual Identity
- **Theme**: Modern glass morphism with Persian/Farsi support
- **Colors**: Dark mode with accent colors
- **Typography**: Persian-friendly fonts with proper RTL support
- **Layout**: Responsive sidebar navigation with content area

### Component Guidelines

#### Modal Design
All modals follow a consistent design pattern:

```css
/* Standard modal classes */
.modal-backdrop {
  @apply fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50;
}

.modal-container {
  @apply glass-card p-6 rounded-2xl shadow-xl mx-4;
}

/* Size variants */
.modal-container-sm { @apply max-w-md w-full; }
.modal-container-md { @apply max-w-2xl w-full; }
.modal-container-lg { @apply max-w-4xl w-full; }
.modal-container-xl { @apply max-w-6xl w-full; }

/* Scrollable content */
.modal-scrollable { @apply max-h-[90vh] overflow-y-auto; }
```

#### Glass Card Effect
```css
.glass-card {
  @apply bg-white/10 backdrop-blur-md border border-white/20;
}
```

#### Button Styles
- **Primary**: Blue gradient with hover effects
- **Secondary**: Transparent with border
- **Danger**: Red gradient for delete actions
- **Success**: Green gradient for confirm actions

### RTL Support
- All components support right-to-left text direction
- Persian date picker with Jalali calendar
- Proper text alignment and icon positioning

## 📊 Database Schema

### Core Tables

#### Users
```typescript
users: defineTable({
  name: v.string(),
  email: v.string(),
  image: v.optional(v.string()),
  createdAt: v.number(),
})
```

#### Roles
```typescript
roles: defineTable({
  name: v.string(),
  description: v.optional(v.string()),
  permissions: v.array(v.string()),
  isSystemRole: v.optional(v.boolean()),
  createdAt: v.number(),
  createdBy: v.id("users"),
})
```

#### User Roles (Junction Table)
```typescript
userRoles: defineTable({
  userId: v.id("users"),
  roleId: v.id("roles"),
  assignedAt: v.number(),
  assignedBy: v.id("users"),
})
```

#### Customers
```typescript
customers: defineTable({
  name: v.string(),
  phone: v.optional(v.string()),
  address: v.optional(v.string()),
  notes: v.optional(v.string()),
  createdAt: v.number(),
  createdBy: v.id("users"),
})
```

#### Products
```typescript
products: defineTable({
  name: v.string(),
  description: v.optional(v.string()),
  price: v.number(),
  collectionId: v.optional(v.id("collections")),
  companyId: v.optional(v.id("companies")),
  createdAt: v.number(),
  createdBy: v.id("users"),
})
```

## 🔧 Development

### Available Scripts
```bash
npm run dev          # Start development servers
npm run build        # Build for production
npm run preview      # Preview production build
npm run lint         # Run ESLint
npm run type-check   # Run TypeScript checks
```

### Convex Functions
```bash
npx convex dev       # Start Convex development server
npx convex deploy    # Deploy to production
npx convex dashboard # Open Convex dashboard
```

### Environment Variables
```env
# .env.local (auto-generated by Convex)
CONVEX_DEPLOYMENT=your-deployment-name
```

## 🚀 Deployment

### Frontend (Vercel/Netlify)
1. Build the project: `npm run build`
2. Deploy the `dist` folder
3. Set environment variables in your hosting platform

### Backend (Convex)
1. Deploy to production: `npx convex deploy --prod`
2. Update environment variables in your hosting platform

## 🤝 Contributing

### Code Style
- Use TypeScript for type safety
- Follow React best practices
- Use Tailwind CSS for styling
- Implement proper error handling
- Add loading states for async operations

### Git Workflow
1. Create feature branch from `main`
2. Make changes with descriptive commits
3. Test thoroughly
4. Create pull request
5. Code review and merge

## 📝 License

This project is proprietary software. All rights reserved.

## 🆘 Support

For technical support or questions:
- Check the Convex documentation: https://docs.convex.dev
- Review the React documentation: https://react.dev
- Contact the development team

---

**Built with ❤️ for Timche Farsh Management**