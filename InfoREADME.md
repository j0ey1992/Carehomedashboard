# Care Home Dashboard - System Documentation

## System Overview

The Care Home Dashboard is a comprehensive management system designed to handle various aspects of care home operations. The system is built using React, Material UI, and Firebase, featuring role-based access control with Admin, Manager, and Staff roles.

## Routes and Pages

### Authentication Routes
- `/login`: Multi-method authentication page
  - Email/Password login with validation
  - Phone verification with SMS codes
  - Magic link authentication via email
  - Social logins (Google, Microsoft, GitHub)
  - ADHD-friendly design with visual feedback
  - Role-based redirection after login
  - Password reset functionality
  - Remember me option
  - Login attempt tracking
- `/auth/magic-link-callback`: Magic link authentication handler
  - Validates magic link tokens
  - Handles automatic login
  - Error handling for expired links
  - Security validation
  - Session management

### Staff and Manager Routes
- `/`: Main dashboard with role-specific views
  - Personalized metrics and statistics
  - Quick action buttons
  - Recent activity feed
  - Upcoming tasks and deadlines
  - Gamification elements:
    - Points display
    - Achievement badges
    - Progress tracking
    - Level system
    - Rewards tracking
  - Notification center
  - Site-specific information
- `/training`: Training management and records
  - Training completion tracking
  - Certificate management
  - Progress visualization
  - Achievement system
  - Course enrollment
  - Training history
  - Expiry notifications
  - Training requirements
  - Compliance status
  - File attachments
- `/f2f`: Face-to-face training scheduling
  - Session booking system
  - Calendar view
  - Reminder system
  - Location management
  - Trainer assignment
  - Attendance tracking
  - Session notes
  - Resource booking
  - Feedback collection
  - Certificate generation
- `/tasks`: Task management system
  - Task creation and assignment
  - Priority management
  - Due date tracking
  - Progress monitoring
  - Task dependencies
  - Category organization
  - File attachments
  - Comment system
  - Status updates
  - Task templates
- `/profile`: User profile management
  - Personal information
  - Preferences settings
  - Password management
  - Notification settings
  - Activity history
  - Achievement display
  - Skills tracking
  - Document storage
  - Contact information
  - Role information
- `/compliance`: Compliance tracking and management
  - DBS status tracking
  - Document uploads
  - Expiry monitoring
  - Compliance scores
  - Achievement tracking
  - Requirement checklist
  - Verification system
  - Audit trail
  - Reminder system
  - Report generation
- `/sickness`: Sickness record management
  - Sickness reporting
  - Return to work process
  - Meeting scheduling
  - Pattern analysis
  - Trigger point monitoring
  - Documentation
  - Manager reviews
  - Statistics tracking
  - Integration with leave
  - Medical notes
- `/leave`: Leave request and management
  - Annual leave requests
  - Balance tracking
  - Calendar view
  - Approval workflow
  - Conflict detection
  - Holiday planning
  - Team calendar
  - Leave types
  - Carry forward
  - Pro-rata calculation
- `/communication-book`: Internal communication system
  - Shift handover notes
  - Important announcements
  - Document sharing
  - Search functionality
  - Read receipts
  - Category organization
  - Priority marking
  - File attachments
  - Comment system
  - Archive access
- `/chat`: Help and support chat system
  - Real-time messaging
  - Topic-based help
  - Message rating
  - File sharing
  - Chat history
  - Bot assistance
  - Quick responses
  - Status indicators
  - Typing indicators
  - Message formatting
- `/rota`: Rota management and scheduling
  - Weekly schedule view
  - Staff assignment
  - Shift management
  - AI-powered scheduling
  - Conflict detection
  - Leave integration
  - Skills matching
  - Workload balancing
  - Pattern recognition
  - Template system

### Manager and Admin Routes
- `/rota/import`: Import functionality for rotas
  - Excel file import
  - Data validation
  - Error handling
  - Conflict resolution
  - Batch processing
  - Template matching
  - Data mapping
  - History tracking
  - Rollback capability
  - Export options
- `/training/:id`: Training record editing interface
  - Detailed record view
  - Certificate upload
  - Progress tracking
  - Notes management
  - History logging
  - Assessment records
  - Resource links
  - Feedback collection
  - Completion verification
  - Custom fields
- `/supervision`: Staff supervision management
  - Meeting scheduling
  - Performance tracking
  - Goal setting
  - Action planning
  - Document management
  - Review history
  - Development plans
  - Feedback system
  - Progress monitoring
  - Report generation
- `/users`: User management system
  - Account creation
  - Role assignment
  - Site access control
  - Permission management
  - Activity monitoring
  - Password reset
  - Account status
  - Bulk operations
  - Audit logging
  - Data export

### Admin Only Routes
- `/dols`: Deprivation of Liberty Safeguards management
  - Application tracking
  - Status monitoring
  - Document management
  - Review scheduling
  - Compliance tracking
  - Renewal management
  - Legal documentation
  - Assessment records
  - Timeline tracking
  - Report generation
- `/communication`: System-wide communication management
  - Announcement creation
  - Message broadcasting
  - Template management
  - Recipient targeting
  - Delivery tracking
  - Schedule sending
  - Priority levels
  - Category management
  - Archive system
  - Analytics
- `/renewals`: Certificate and documentation renewals

## Core Features

### 1. Rota Management System

#### Components
- `WeeklySchedule.tsx`: Displays and manages weekly rota view
- `RosterGrid.tsx`: Main grid component for rota display and management
  - Weekly view with day/shift matrix
  - Visual indicators for morning/afternoon/night shifts
  - Interactive cell highlighting
  - Quick-add shift functionality
- `ShiftCell.tsx`: Individual shift cell with drag-drop functionality
- `AutoScheduler.tsx`: AI-powered rota generation interface
  - Optimization priorities (balanced/staff-preference/coverage)
  - Shift requirements configuration
  - Advanced optimization parameters
  - Customizable weightings for different factors
- `StaffSelector.tsx`: Staff selection and assignment interface
- `SuggestionsList.tsx`: Displays AI-generated staff suggestions
- `ImportDialog.tsx`: Handles rota import functionality

#### Key Features
- Weekly rota creation and management
- Drag-and-drop staff assignment
- AI-powered shift generation with advanced settings:
  - Training status consideration
  - Performance metrics integration
  - Partial fill allowance
  - Maximum iterations control
- Staff availability tracking
- Role-based shift requirements:
  - Morning: 5 staff (1 leader, 1 driver)
  - Afternoon: 4 staff (1 leader)
  - Night: 2 staff (1 leader)
- Compliance integration
- Leave management integration
- Shift conflict detection

### 2. Leave Management System

#### Components
- `LeaveRequestForm.tsx`: Form for submitting leave requests
- `LeaveRequestList.tsx`: Displays and manages leave requests

#### Key Features
- Annual leave request system (32 days/year)
- April to April leave year tracking
- Automatic balance calculation
- Rota conflict detection
- Role-based approval workflow
- Integration with rota system
- Leave calendar visualization
- Team quota management
- Busy period warnings (Christmas, Summer, Easter)
- Balance forecasting
- Manager override options

### 3. Training & Compliance System

#### Components
- `ComplianceTable.tsx`: Displays compliance status
- `ComplianceCell.tsx`: Individual compliance record display
- `ComplianceDialogs.tsx`: Compliance management dialogs
- `FileUploadInput.tsx`: Handles training document uploads
- `TrainingUploadDialog.tsx`: Training record upload interface
- `UserInfoInput.tsx`: User training information input
- `ComplianceAchievements.tsx`: Displays compliance achievements
- `DynamicComplianceCell.tsx`: Handles dynamic compliance items

#### Key Features
- Training record management
- Compliance tracking with:
  - DBS check tracking
  - Health assessment monitoring
  - Required documentation management
  - Evidence upload system
  - Dynamic compliance items
- Document upload system
- Achievement tracking
- Integration with rota generation
- Automated reminders
- Progress visualization
- Gamification elements

#### Face-to-Face (F2F) Training
- Features:
  - Training session scheduling
  - Expiry tracking
  - Achievement system
  - Automated reminders:
    - Calendar invites
    - 7-day email reminders
    - 1-day notifications
  - Progress tracking
  - Role-based views:
    - Admin: Full scheduling capabilities
    - Staff: Personal training view
  - Three main sections:
    - Expired sessions
    - Upcoming sessions (30 days)
    - Scheduled sessions
  - Location and trainer management
  - Notes and documentation

### 4. Sickness Management System

#### Components
- `SicknessCard.tsx`: Displays sickness records
- `SicknessStats.tsx`: Shows sickness statistics
- `SicknessMeetingDialog.tsx`: Manages sickness meetings
- `SicknessRecordDialog.tsx`: Records sickness incidents
- `SicknessTabs.tsx`: Navigation for sickness views

#### Features
- Sickness record tracking
- Return-to-work meetings
- Statistics and reporting
- Manager review system
- Trigger point monitoring
- Warning system for approaching trigger points
- Sickness pattern analysis
- Integration with leave management

### 5. Dashboard System

#### Components
- `AdminDashboard.tsx`: Admin-specific dashboard view
  - Need Attention Now section
  - Due in Next 30 Days section
  - Recently Completed section
  - Site filtering
  - Completion rate tracking
- `ManagerDashboard.tsx`: Manager-specific dashboard view
- `StaffDashboard.tsx`: Staff-specific dashboard view

#### Features
- Role-specific views
- Key metrics display
- Quick access to common tasks
- Notifications integration
- Interactive cards with hover effects
- Leaderboard integration
- Real-time updates

### 6. Communication System

#### Chat System
- Features:
  - Help topics sidebar
  - Real-time messaging
  - Message rating system
  - ADHD-friendly design:
    - Smooth scrolling
    - Visual feedback
    - Clear typography
  - Message formatting:
    - Bold text support
    - Bullet points
    - Numbered lists
  - Conversation management:
    - Clear chat option
    - Timestamp display
    - Message status indicators
  - Topic-based navigation
  - Suggested prompts
  - Feedback collection

#### Communication Book
- Internal communication management
- Record keeping
- Information sharing
- Shift handover notes
- Important announcements
- Document attachments
- Search functionality

### 7. Task Management System
- Task creation and assignment
- Priority levels
- Due date tracking
- Progress monitoring
- Task categories
- Completion verification
- Notification system
- Task dependencies

### 8. Renewals System
- Certificate renewal tracking
- Expiry notifications
- Documentation management
- Renewal workflow
- Status tracking
- Document verification
- Automated reminders

### 9. Supervision System
- Staff supervision scheduling
- Meeting records
- Performance tracking
- Goal setting
- Development plans
- Meeting minutes
- Action tracking

### 10. DoLS (Deprivation of Liberty Safeguards)
- DoLS application management
- Status tracking
- Documentation
- Review scheduling
- Assessment records
- Renewal tracking
- Legal compliance

### 11. User Management
- User profile management
- Role assignment
- Site access control
- Permission management
- Account status
- Activity logging
- Password management

## Context System

### Authentication & User Management
- `AuthContext.tsx`: Handles authentication state
- `UserContext.tsx`: Manages user data and preferences
- `PreferenceContext.tsx`: User preferences management

### Feature-Specific Contexts
- `RotaContext.tsx`: Rota state management
- `LeaveContext.tsx`: Leave system state
- `TrainingContext.tsx`: Training system state
- `ComplianceContext.tsx`: Compliance system state
- `SicknessContext.tsx`: Sickness management state
- `CommunicationContext.tsx`: Communication system state
- `GamificationContext.tsx`: Gamification features state
- `SupervisionContext.tsx`: Staff supervision state
- `TaskContext.tsx`: Task management state
- `NotificationContext.tsx`: Notification system state

## Utility Hooks

- `useProtectedRoute.ts`: Route protection logic
- `useRota.ts`: Rota management utilities
- `useUserData.ts`: User data management
- `useKeyboardShortcuts.ts`: Keyboard navigation
- `useUndoRedo.ts`: Undo/redo functionality
- `useFileUpload.ts`: File upload handling

## Data Types

### Rota Types
- `ShiftTime`: Shift timing information
- `ShiftType`: Morning/Afternoon/Night
- `ShiftRole`: Staff role definitions
- `ShiftStatus`: Shift staffing status
- `RotaConfiguration`: Rota settings
- `AISchedulerOptions`: AI scheduling parameters

### Staff Types
- `Staff`: Staff member profile
- `StaffPreferences`: Working preferences
- `StaffPerformanceMetrics`: Performance data
- `ComplianceScore`: Compliance metrics

### Leave Types
- `LeaveRequest`: Leave request data
- `LeaveEntitlement`: Leave allowance
- `LeaveType`: Types of leave

### Compliance Types
- `ComplianceLevel`: Compliance status
- `TrainingModule`: Training requirements
- `ComplianceScore`: Compliance metrics

## Security

- Role-based access control
- Firebase security rules
- Protected routes
- Data validation
- Audit logging
- File upload validation
- Data access restrictions based on user role and site

## Integration Points

The system features tight integration between modules:
- Rota generation considers compliance scores
- Leave system affects rota availability
- Training status impacts shift assignments
- Sickness records integrate with leave management
- Compliance affects staff scheduling

## Future Enhancements

1. Advanced Analytics
   - Cross-module reporting
   - Predictive analytics
   - Performance metrics

2. UI/UX Improvements
   - Mobile responsiveness
   - Accessibility enhancements
   - ADHD-friendly design

3. Additional Features
   - Enhanced AI capabilities
   - Advanced notification system
   - Extended reporting options

## Technical Stack

### Frontend:
- React with TypeScript
- Material-UI for components
- Framer Motion for animations
- Context API for state management
- Custom hooks for reusable logic

### Backend:
- Firebase Authentication
- Firestore Database
- Firebase Storage
- Cloud Functions

### Key Features:
- Real-time updates
- Offline support
- File upload/download
- Role-based permissions
- Cross-platform compatibility

UPDATES REQUIRED 

Sequence 1: Authentication & User Experience Enhancements
Authentication Improvements: (COMPLETED)

Validate email/password logins and improve error handling.
Enhance phone verification with more robust SMS code validation.
Optimize magic link authentication to handle token expiration gracefully.
Integrate additional social logins (Google, Microsoft, GitHub) and ensure secure token handling.
Add clear ADHD-friendly visual feedback during login attempts.
Implement detailed login attempt tracking and lockout mechanisms for security.
Role-Based Redirection & UX:

After login, ensure users are redirected to a role-appropriate dashboard.
Add a “Remember Me” option to persist sessions securely.
Improve password reset user flow to make it simpler and more intuitive.
Performance & Accessibility:

Ensure the login page is fully responsive and accessible.
Add custom keyboard shortcuts for power users and assistive technologies.
Sequence 2: Dashboard & Personalization
Personalized Landing Page:

For each role (Admin, Manager, Staff), display relevant metrics, tasks, and compliance status.
Show a recent activity feed and upcoming tasks.
Gamification Elements:

Integrate points, badges, levels, and rewards tracking throughout the dashboard.
Implement a visible progress tracker so users can see achievement completion at a glance.
Notifications & Quick Actions:

Centralize notifications in a global notification panel.
Enable quick access buttons for common tasks (e.g., submitting leave, viewing rota, uploading training docs).
Sequence 3: Training & Compliance Integration
Training Management:

Enable course enrollment and track completion rates and expiries.
Set up a system for certificate management and file attachments.
F2F Training Sessions:

Implement calendar views for scheduling in-person sessions.
Add automated reminders (7-day and 1-day) and calendar invites.
Integrate attendance tracking and trainer assignments.
Compliance Tracking:

Monitor DBS checks and other required documents.
Implement dynamic compliance items that can be updated as regulations change.
Show compliance scores and integrate these scores into rota scheduling.
Achievements and Reminders:

Expand achievement tracking for training milestones.
Add automated alerts for documents nearing expiry and missing compliance items.
Sequence 4: Leave & Sickness Management
Leave Management:

Implement an annual leave request system with automatic entitlement calculations.
Provide a visual leave calendar and detect conflicts with scheduled shifts.
Add manager override options and approvals workflow.
Sickness Records:

Track sickness incidents, return-to-work meetings, and patterns.
Integrate sickness data with leave to maintain accurate coverage info.
Add trigger point monitoring and warning systems to alert managers when thresholds approach.
Sequence 5: Rota Management & AI Optimization
Rota Creation:

Improve the weekly schedule grid with drag-and-drop staff assignments.
Add visual indicators for morning/afternoon/night shifts and role requirements (leaders, drivers).
AI-Powered Scheduling:

Integrate compliance and training data into the AI’s shift assignments.
Add optimization parameters for balanced coverage, staff preferences, and performance metrics.
Allow partial fills, iteration limits, and advanced factor weighting.
Data Import & Conflict Detection:

Improve rota import functionality with data validation and conflict resolution.
Enhance shift conflict detection with real-time alerts during rota creation.
Sequence 6: Communication & Collaboration Tools
Communication Book:

Enable shift handover notes, announcements, and document attachments.
Add read receipts, search functionality, and category organization.
Chat System:

Support topic-based navigation and quick responses.
Include ADHD-friendly features: smooth scrolling, visual feedback, clear typography.
Integrate file sharing, message rating, and message formatting tools.
System-Wide Communication Management (Admin Only):

Allow admins to broadcast messages, schedule announcements, and manage templates.
Add delivery tracking and analytics for sent communications.
Sequence 7: Task Management & Supervision
Task Management System:

Create a task board with priorities, due dates, and categories.
Integrate a notification system for task assignments and deadlines.
Add comment threads, file attachments, and task dependencies.
Supervision Management:

Implement scheduling for staff supervision meetings.
Track performance metrics, development plans, and goal setting.
Store meeting notes, action items, and generate supervision reports.
Sequence 8: Renewals & DoLS Management
Renewals System:

Track certificate expiry dates and send automated renewal reminders.
Manage renewal workflows, status tracking, and verification steps.
Provide exportable renewal reports.
DoLS Management:

Handle DoLS applications, documentation, review scheduling, and renewals.
Integrate compliance checks and timelines.
Offer robust reporting and legal documentation storage.
Sequence 9: User Management & Security
User Management:

Streamline account creation and role assignments.
Manage site access and permission levels.
Add bulk user operations and detailed audit logs.
Security Enhancements:

Strengthen Firebase security rules.
Validate all file uploads.
Implement data access restrictions based on user role and site.
Add extensive activity logging and anomaly detection.
Sequence 10: Advanced Analytics & Reporting
Cross-Module Reporting:

Combine data from rota, compliance, training, leave, and tasks into unified reports.
Implement predictive analytics to forecast staffing needs, compliance lapses, or training requirements.
Performance Metrics:

Visualize staff performance against benchmarks.
Track completion rates, compliance scores, and leave patterns.
Generate exportable dashboards for managerial reviews.
Sequence 11: UI/UX Improvements
Mobile Responsiveness:

Ensure all pages render correctly on tablets and mobile devices.
Add responsive layouts for data-heavy screens (e.g., rota, compliance tables).
Accessibility & ADHD-Friendly Design:

Enhance keyboard navigation and screen reader compatibility.
Adopt consistent typography and color codes for alerts.
Improve visual cues, gentle animations, and simplified views for better focus.
Sequence 12: Additional Features & Maintenance
Enhanced AI Capabilities:

Integrate natural language processing for queries like “Show all staff with expiring DBS checks this month.”
Extend AI to suggest optimal training schedules or predict leave peak periods.
Notifications & Integrations:

Integrate with external calendar systems.
Provide push notifications and mobile alerts.
Connect with payroll or HR systems for end-to-end automation.
Continuous Improvement:

Regularly update documentation and code comments.
Add automated testing for critical workflows.
Implement a CI/CD pipeline for smooth updates.

Additional Suggestions for AI Utilization
Predictive Staffing & Forecasting

AI-Driven Demand Forecasting: Use historical occupancy data, seasonal patterns, and special event inputs (e.g., holidays) to predict staffing needs weeks or months in advance. This helps preempt understaffing or overstaffing.
Predictive Leave Planning: The AI can analyze historical leave requests and seasonal demand to recommend ideal times for staff to take leave, ensuring coverage remains stable.
Training Pathway Recommendations

Personalized Training Plans: Based on performance metrics, compliance data, and skill requirements, the AI can suggest tailored training modules for each staff member, ensuring continuous professional development.
Intelligent Expiry Reminders: Predict who might be at risk of non-compliance soon and proactively suggest training before certifications expire.
Compliance and Regulatory Monitoring

Automated Document Analysis: Use OCR and NLP on uploaded certificates and documents to extract expiry dates, staff names, and compliance metrics automatically, reducing manual data entry.
Policy Change Detection: Continuously scan regulatory news feeds and alert management to new compliance requirements, helping the care home adapt quickly.
AI-Assisted Communication & Support

Conversational AI for Helpdesk: Integrate a chatbot that staff can query for instant answers about policies, procedures, or system functions. The bot can learn from past queries, improving response quality over time.
Sentiment Analysis on Feedback: Analyze feedback from staff supervision or training sessions to identify morale issues or areas needing attention.
Advanced Analytics & Reporting

Anomaly Detection: AI can spot unusual patterns in staff absences or shifts that might indicate underlying issues—such as a sudden spike in sickness absences in one particular team.
Predictive Maintenance for Compliance: The system can predict when certain compliance items (e.g., medical equipment checks, facility maintenance) are due based on historical data, ensuring proactive measures.
Natural Language Queries

Voice or Text Queries: Allow managers to ask natural language questions like “Which shifts are understaffed next week?” or “Show me staff whose DBS checks expire this month,” and the AI can generate instantaneous, data-driven answers.
Continuous Learning and Recommendations

Adaptive Scheduling Algorithms: The AI’s scheduling models improve over time, learning from staff feedback, historical rotas, and shift preferences, resulting in more efficient and staff-friendly schedules.
Smart Notifications: AI-driven notifications that learn user behavior over time, sending alerts when the user is most likely to act on them, improving responsiveness and reducing alert fatigue.
Production-Grade Considerations
To make the solution production-grade and truly “all-in-one,” consider the following best practices:

Scalability & Performance

Ensure that the backend (Firestore, Cloud Functions) is optimized and can handle increasing loads, such as more staff, more compliance records, and more training sessions.
Implement server-side caching or edge caching for frequently accessed data to reduce latency and improve the user experience.
High Availability & Reliability

Set up load balancers and automatic failover for critical backend services.
Regularly backup Firestore data and handle disaster recovery scenarios.
Robust Security Measures

Continuously update Firebase security rules and run security audits.
Implement multi-factor authentication (MFA) for administrators.
Utilize encryption for data at rest and in transit.
Comprehensive Testing & QA

Write automated tests (unit, integration, and end-to-end) for all critical workflows: login, rota editing, leave approval, document uploads, and AI-driven suggestions.
Perform regular security penetration tests and code reviews.
User Onboarding & Training

Provide tutorials, guided tours, and tooltips within the UI.
Offer a knowledge base, FAQ, and helpdesk (possibly integrated with the chatbot).
Continuous Integration/Continuous Deployment (CI/CD)

Implement CI/CD pipelines for faster and more reliable updates.
Version control all configurations, schemas, and documents so that changes can be tracked and rolled back if needed.
Monitoring & Logging

Use logging and monitoring tools (e.g., Google Cloud Monitoring, Sentry) to track performance, errors, and usage patterns.
Set up alerting to notify administrators if critical services degrade or fail.
Integration with External Systems

