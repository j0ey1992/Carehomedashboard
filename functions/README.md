# Care Home Dashboard Firebase Functions

This directory contains the Firebase Cloud Functions for the Care Home Dashboard application. These functions handle notifications, data processing, and integrations with external services.

## Features

- Email notifications using SendGrid
- SMS notifications using Twilio
- Training data processing and reminders
- Automated notification system for expiring certifications
- Background tasks for data maintenance

## Setup

1. Install dependencies:
```bash
npm install
```

2. Configure Firebase environment variables:
```bash
firebase functions:config:set sendgrid.key="YOUR_SENDGRID_API_KEY" \
                          sendgrid.from_email="your-email@domain.com" \
                          sendgrid.training_template_id="template_id" \
                          twilio.account_sid="YOUR_TWILIO_ACCOUNT_SID" \
                          twilio.auth_token="YOUR_TWILIO_AUTH_TOKEN" \
                          twilio.phone_number="+1234567890"
```

3. Deploy functions:
```bash
npm run deploy
```

## Local Development

1. Get the current environment config:
```bash
firebase functions:config:get > .runtimeconfig.json
```

2. Start the emulator:
```bash
npm run serve
```

## Functions Overview

### Notifications
- `sendEmail`: Sends email notifications using SendGrid
- `sendSMS`: Sends SMS notifications using Twilio
- `markNotificationAsRead`: Marks a notification as read in Firestore

### Training Management
- `processTrainingUpload`: Processes uploaded training data
- `checkExpiringTraining`: Daily check for expiring training certifications

## Environment Variables

Required environment variables:

- `SENDGRID_API_KEY`: SendGrid API key for email notifications
- `TWILIO_ACCOUNT_SID`: Twilio account SID for SMS
- `TWILIO_AUTH_TOKEN`: Twilio auth token
- `TWILIO_PHONE_NUMBER`: Twilio phone number for sending SMS

## Testing

Run tests:
```bash
npm test
```

## Deployment

The functions are automatically deployed when pushing to the main branch through GitHub Actions. To deploy manually:

```bash
npm run build
npm run deploy
```

## Monitoring

Monitor function execution and errors:
```bash
firebase functions:log
```

## Security

- All functions require authentication
- Email notifications are only sent to verified domains
- Rate limiting is applied to prevent abuse
- Environment variables are securely stored in Firebase Config

## Troubleshooting

Common issues:

1. **Function timeout**: Increase timeout in function configuration
2. **Memory issues**: Adjust memory allocation in function configuration
3. **Cold start**: Implement lazy loading and optimize initialization

## Contributing

1. Create a feature branch
2. Make changes and test locally
3. Submit a pull request
4. Ensure CI/CD passes

## License

This project is private and confidential. All rights reserved.
