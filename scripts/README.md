# Care Home Dashboard Scripts

This directory contains utility scripts for managing the Care Home Dashboard's data.

## Setup

1. Make sure you have Node.js installed
2. Install dependencies:
   ```bash
   npm install
   ```
3. Place your Firebase Admin SDK service account key file (`managerdashboard-d8cec-firebase-adminsdk-gkms5-e01101d236.json`) in the parent directory

## Available Scripts

### Create Initial Staff Members

Creates a set of test staff members with proper roles and preferences:

```bash
npm run create-staff
```

This will create 5 staff members with various roles and preferences.

### Migrate Existing Users to Staff

Updates existing users in the database with required staff fields:

```bash
npm run migrate-users
```

This will:
- Add staff-specific fields to existing users
- Set appropriate roles based on user type
- Add default preferences and metrics

## Order of Operations

1. First run `create-staff` to create initial staff members
2. Then run `migrate-users` to update any existing users with staff fields

After running these scripts, the rota section should properly display staff members with their roles and preferences.
