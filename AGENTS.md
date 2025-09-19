# WhatsApp SaaS Platform - Development Guide

## Project Overview

This is a comprehensive WhatsApp SaaS platform built with Next.js, featuring bulk messaging, template management, campaign automation, and webhook handling. The application is designed to replicate and extend the functionality of the provided Google Apps Script for WhatsApp bulk messaging.

## Technology Stack

- **Frontend**: Next.js 14 with App Router, React, Tailwind CSS
- **Backend**: Next.js API Routes, MongoDB with Mongoose
- **Authentication**: JWT-based authentication
- **External APIs**: WhatsApp Business API (Meta Graph API)
- **UI Components**: Heroicons, Custom Tailwind components

## Project Structure

```
src/
├── app/
│   ├── api/                    # API routes
│   │   ├── auth/              # Authentication endpoints
│   │   ├── campaigns/         # Campaign management
│   │   ├── config/            # Configuration endpoints
│   │   ├── contacts/          # Contact management
│   │   ├── messages/          # Message handling
│   │   ├── templates/         # Template management
│   │   └── webhook/           # WhatsApp webhook handler
│   ├── dashboard/             # Dashboard pages and layouts
│   ├── globals.css            # Global styles
│   ├── layout.js              # Root layout
│   └── page.js                # Home/login page
├── components/
│   ├── auth/                  # Authentication components
│   └── layout/                # Layout components (sidebar, header)
├── lib/
│   ├── mongodb.js             # Database connection
│   └── whatsapp.js            # WhatsApp API service
└── models/                    # Mongoose schemas
    ├── Campaign.js
    ├── Contact.js
    ├── Message.js
    ├── Template.js
    └── User.js
```

## Key Features Implemented

### 1. User Authentication & Management
- JWT-based authentication system
- User registration and login
- Profile management
- Subscription and usage tracking

### 2. WhatsApp API Integration
- Template fetching and management
- Message sending (text and template)
- Media URL processing (Google Drive support)
- Error handling and rate limiting

### 3. Template Management
- Sync templates from WhatsApp Business API
- Template parameter analysis
- Support for header, body, and button parameters
- Template status tracking (PENDING, APPROVED, etc.)

### 4. Campaign Management
- Bulk message campaigns
- Contact filtering and targeting
- Scheduled sending
- Campaign statistics and tracking
- Batch processing with rate limiting

### 5. Contact Management
- Contact import and management
- Unsubscribe handling
- Contact tagging and custom fields
- Phone number normalization

### 6. Message Handling
- Individual message sending
- Message status tracking
- Webhook integration for delivery status
- Message history and analytics

### 7. Webhook System
- WhatsApp webhook verification
- Status update processing
- Unsubscribe detection
- Real-time message tracking

## Environment Variables

Create a `.env.local` file with the following variables:

```env
# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017/whatsapp-saas

# WhatsApp API Configuration  
WHATSAPP_BUSINESS_ACCOUNT_ID=your_business_account_id
WHATSAPP_ACCESS_TOKEN=your_access_token
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id
WHATSAPP_API_VERSION=v19.0

# JWT Secret
JWT_SECRET=your_super_secret_jwt_key

# Webhook Configuration
WEBHOOK_VERIFY_TOKEN=your_webhook_verify_token

# Next.js Configuration
NEXTAUTH_SECRET=your_nextauth_secret
NEXTAUTH_URL=http://localhost:3000

# AWS S3 Configuration
AWS_ACCESS_KEY_ID=your_aws_access_key_id
AWS_SECRET_ACCESS_KEY=your_aws_secret_access_key
AWS_S3_REGION=us-east-1
AWS_S3_BUCKET_NAME=your_whatsapp_media_bucket
```

## Common Development Commands

```bash
# Install dependencies
pnpm install

# Run development server
pnpm run dev

# Build for production
pnpm run build

# Start production server
pnpm start

# Run linting
pnpm run lint

# Format code (if prettier is configured)
pnpm run format
```

## Database Setup

1. Install MongoDB locally or use MongoDB Atlas
2. Update the `MONGODB_URI` in your `.env.local` file
3. The application will automatically create collections and indexes on first run

## WhatsApp API Setup

1. Create a Facebook Business Account
2. Set up WhatsApp Business API
3. Get your Business Account ID, Phone Number ID, and Access Token
4. Configure webhook URL for status updates
5. Add the credentials to your `.env.local` file

## API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user
- `PUT /api/auth/me` - Update user profile

### Templates
- `GET /api/templates` - List and sync templates
- `POST /api/templates` - Create new template
- `GET /api/templates/[name]` - Get specific template
- `DELETE /api/templates/[name]` - Delete template

### Campaigns
- `GET /api/campaigns` - List campaigns
- `POST /api/campaigns` - Create campaign
- `POST /api/campaigns/[id]/send` - Send campaign

### Messages
- `GET /api/messages` - List messages
- `POST /api/messages` - Send single message

### Contacts
- `GET /api/contacts` - List contacts
- `POST /api/contacts` - Create contact

### Configuration
- `GET /api/config/whatsapp` - Get WhatsApp config
- `POST /api/config/whatsapp` - Set WhatsApp config

### Webhook
- `GET /api/webhook` - Webhook verification
- `POST /api/webhook` - Handle incoming webhooks

### Media
- `GET /api/media` - List user's media files with pagination and filtering
- `POST /api/media` - Upload new media file
- `GET /api/media/[id]` - Get specific media file
- `PUT /api/media/[id]` - Update media file metadata
- `DELETE /api/media/[id]` - Delete media file
- `POST /api/media/presigned-url` - Generate presigned URL for direct S3 upload
- `POST /api/media/upload-complete` - Mark upload as complete

## Key Components

### WhatsApp API Service (`src/lib/whatsapp.js`)
- Handles all WhatsApp Business API interactions
- Template analysis and parameter extraction
- Message sending with different formats
- Media URL processing
- Error handling and rate limiting

### Database Models
- **User**: User accounts with subscription and WhatsApp config
- **Template**: WhatsApp message templates with parameter analysis
- **Campaign**: Bulk messaging campaigns with settings
- **Contact**: Contact management with unsubscribe tracking
- **Message**: Individual message tracking with status updates

## Development Guidelines

### Code Style
- Use ES6+ features and async/await
- Follow React hooks patterns for state management
- Use Tailwind CSS for styling
- Implement proper error handling and loading states

### Security
- All API routes require JWT authentication
- Validate user permissions for data access
- Sanitize input data
- Never log sensitive information

### Performance
- Implement pagination for large data sets
- Use database indexes for efficient queries
- Batch operations where possible
- Implement rate limiting for external API calls

## Testing

- Test WhatsApp API integration with sandbox numbers
- Verify webhook functionality with ngrok for local development
- Test campaign sending with small batches first
- Monitor message delivery rates and error handling

## Deployment

### Prerequisites
- MongoDB database (Atlas recommended for production)
- WhatsApp Business API access
- Domain for webhook URL
- SSL certificate for production

### Environment Setup
1. Set up production MongoDB database
2. Configure WhatsApp webhook URL with your domain
3. Set all environment variables for production
4. Deploy to your preferred platform (Vercel, Netlify, etc.)

## Troubleshooting

### Common Issues
1. **WhatsApp API Rate Limiting**: Implement delays between requests
2. **Webhook Not Receiving**: Check URL accessibility and verify token
3. **Template Not Approved**: Check template status via Facebook Business Manager
4. **Messages Not Sending**: Verify phone number format and contact opt-in status

### Monitoring
- Monitor message delivery rates
- Track API error responses
- Watch for webhook failures
- Monitor user subscription limits

## Future Enhancements

1. **Advanced Analytics**: Detailed reporting and dashboards
2. **Conversation Management**: Two-way messaging interface
3. **Automation**: Smart responders and chatbots
4. **Multi-user Support**: Team management and roles
5. **Payment Integration**: Subscription billing
6. **API Access**: Public API for integrations

## Support and Maintenance

- Regularly update dependencies
- Monitor WhatsApp API changes and updates
- Backup database regularly
- Keep access tokens and credentials secure
- Monitor performance and scale as needed
