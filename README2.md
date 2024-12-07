# Leave Management System Documentation

## Overview
The leave management system is designed to handle annual leave requests and approvals within the care home management system. It supports role-based access control, automated validations, and integration with the rota system.

## Core Features

### 1. Leave Request Management
- Staff can request annual leave (32 days per year)
- April to April leave year
- Automatic balance tracking
- Rota conflict detection
- Busy period warnings (Christmas, Summer, Easter)

### 2. Role-Based Access

#### Staff Members
- Can request annual leave
- View own leave balance (32 days)
- View own leave requests
- Cancel approved leave
- Delete pending requests
- Cannot approve any leave

#### Managers
- View leave requests for their site(s)
- Approve/decline leave requests
- Cannot approve their own leave
- View site statistics
- Override rota conflicts
- Manage team leave calendar

#### Administrators
- Full access to all sites
- View all leave requests
- Approve/decline any request
- View cross-site statistics
- System-wide management

### 3. Data Models

```typescript
// Leave Request
interface LeaveRequest {
  id: string;
  userId: string;
  staffName: string;
  site: string;
  startDate: string;
  endDate: string;
  totalDays: number;
  leaveType: 'Annual Leave' | 'Unpaid Leave' | 'Emergency Leave';
  status: 'pending' | 'approved' | 'declined' | 'cancelled';
  notes?: string;
  approvedBy?: string;
  approvalNotes?: string;
  createdAt: string;
  updatedAt: string;
}

// Leave Entitlement
interface LeaveEntitlement {
  id: string;
  userId: string;
  site: string;
  leaveYear: string;  // "2023-2024"
  totalEntitlement: number;  // 32 days
  remainingDays: number;
  carryForwardDays: number;
  createdAt: string;
  updatedAt: string;
}
```

### 4. Component Structure

```
src/
├── components/
│   └── Leave/
│       ├── LeaveRequestForm.tsx    # Leave request creation
│       └── LeaveRequestList.tsx    # Leave request management
├── contexts/
│   └── LeaveContext.tsx           # Leave state management
├── types/
│   └── leave.ts                   # Leave-related types
└── pages/
    └── Leave/
        └── index.tsx              # Main leave page
```

### 5. Workflow

1. **Leave Request Process**
   - Staff selects leave dates
   - System validates:
     - Available balance
     - Rota conflicts
     - Team quotas
     - Leave year boundaries
   - Request submitted for approval
   - Manager/Admin reviews
   - Approval/Decline notification sent
   - Balance updated if approved
   - Rota blocked for approved dates

2. **Validation Rules**
   - Cannot exceed available balance
   - Cannot overlap with existing leave
   - Maximum 2 staff on leave per day
   - Must be within current leave year
   - Rota conflicts require manager override

3. **Notifications**
   - New request alerts
   - Approval/decline notifications
   - Balance warnings
   - Year-end reminders
   - Quota alerts

### 6. Dashboard Integration

1. **Admin Dashboard**
   - Pending requests count in "Need Attention Now" section
   - Cross-site leave calendar
   - Approval statistics
   - System-wide alerts
   - Immediate visibility of all pending leave requests
   - Quick access to leave approval workflow
   - Site-filtered view of leave requests

2. **Manager Dashboard**
   - Site-specific pending requests
   - Team availability calendar
   - Leave balance overview
   - Quota warnings
   - Dedicated "Leave Requests" card showing:
     - Number of pending requests for their site
     - Quick access to leave management
     - Site-specific leave request notifications

3. **Staff Dashboard**
   - Current leave balance with carry-forward days
   - Recent requests status
   - Upcoming leave
   - Year-end warnings
   - Comprehensive leave section showing:
     - Current annual leave entitlement
     - Upcoming approved holidays
     - Pending leave requests awaiting approval
     - Recent leave request decisions (approved/declined)
     - Visual status indicators for request states

### 7. UI Components

1. **LeaveRequestForm**
   - Multi-step form:
     1. Leave type selection
     2. Date selection
     3. Review and submit
   - Real-time validation
   - Conflict warnings
   - Balance display
   - Mobile responsive

2. **LeaveRequestList**
   - Filterable list:
     - Status
     - Date range
     - Leave type
     - Site (for admins)
   - Action buttons:
     - Approve/Decline (managers/admins)
     - Cancel (staff - approved leave)
     - Delete (staff - pending requests)
   - Status indicators
   - Rota conflict warnings

### 8. Security Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /leaveRequests/{request} {
      // Staff can read their own requests
      // Managers can read their site's requests
      // Admins can read all requests
      allow read: if request.data.userId == request.auth.uid ||
                  (isManager() && request.data.site in get(/databases/$(database)/documents/users/$(request.auth.uid)).data.sites) ||
                  isAdmin();
      
      // Staff can create requests
      allow create: if request.auth.uid != null;
      
      // Staff can update their pending requests
      // Managers can approve/decline their site's requests
      // Admins can update any request
      allow update: if (request.data.userId == request.auth.uid && request.data.status == 'pending') ||
                   (isManager() && request.data.site in get(/databases/$(database)/documents/users/$(request.auth.uid)).data.sites) ||
                   isAdmin();
      
      // Staff can delete their pending requests
      // Admins can delete any request
      allow delete: if (request.data.userId == request.auth.uid && request.data.status == 'pending') ||
                   isAdmin();
    }
  }
}
```

### 9. Testing

1. **Unit Tests**
   - Leave request validation
   - Balance calculations
   - Permission checks
   - Date handling

2. **Integration Tests**
   - Request workflow
   - Approval process
   - Rota integration
   - Notification system

3. **E2E Tests**
   - Complete leave request flow
   - Manager approval process
   - Balance updates
   - Rota blocking
