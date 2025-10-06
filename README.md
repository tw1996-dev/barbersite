# Elite Barber Studio - Booking System

**🔴 NOTICE FOR RECRUITERS:** The admin panel password is not publicly available for security reasons.To access the administrator account (e.g., for testing management features), please contact me directly - contact information is available in my CV.

**⚠️ "DIRTY CODE" DISCLAIMER:** This is my first major fullstack project. The code contains duplicates, non-optimal solutions, and areas requiring refactoring. I treat this as a learning experience and consciously show the real learning process - with mistakes, iterations, and gradual improvement. The project is fully functional, but the code is not production-ready in terms of best practices.

## 📍 Live Demo

**Homepage:** https://barbersite-eight.vercel.app/

**Admin Panel:** https://barbersite-eight.vercel.app/admin.html

## 📖 About The Project

Elite Barber Studio is a complete booking system for barbershops. The application offers an intuitive user interface for booking appointments and an advanced admin panel for managing the calendar, bookings, and business hours.

The project was built with small and medium-sized salons in mind, providing all necessary features without unnecessary complexity.

## 🏗️ Project Structure

```
barbersite/
│
├── api/                              # Backend API endpoints (Vercel Serverless Functions)
│   ├── auth/                         # Authentication system
│   │   ├── auth-middleware.js        # JWT verification & session validation
│   │   ├── login.js                  # Admin login with bcrypt & rate limiting
│   │   ├── logout.js                 # Session termination
│   │   └── verify.js                 # Token verification endpoint
│   │
│   ├── booking/                      # Booking management endpoints
│   │   └── [id].js                   # GET/PUT/DELETE single booking (protected)
│   │
│   ├── manage/                       # Customer booking management
│   │   └── [token].js                # Token-based booking access (cancel, view)
│   │
│   ├── availability.js               # Public calendar availability data
│   ├── bookings.js                   # GET all bookings (protected) / POST new booking (public)
│   ├── business-hours.js             # GET/PUT business hours configuration
│   └── generate-token.js             # Generate management tokens for bookings
│
├── scripts/                          # Frontend JavaScript modules
│   ├── admin/                        # Admin panel modules
│   │   ├── admin-state.js            # Global state management & API calls
│   │   ├── admin-panel.js            # Main admin panel entry point
│   │   ├── admin-navigation.js       # Section navigation & routing
│   │   ├── admin-dashboard.js        # Dashboard with revenue & stats
│   │   ├── admin-bookings.js         # Bookings list management
│   │   ├── admin-bookings-enhanced.js # Advanced search, sort & filter
│   │   ├── admin-calendar.js         # Calendar view with day details
│   │   ├── admin-schedule.js         # Business hours configuration
│   │   ├── admin-add-booking.js      # Manual booking creation
│   │   ├── admin-modal.js            # Modal dialogs management
│   │   ├── admin-actions.js          # Global action handlers (view, edit, delete)
│   │   ├── admin-edit-booking.js     # Booking edit functionality
│   │   └── admin-utils.js            # Shared utility functions
│   │
│   ├── admin-auth.js                 # Admin authentication frontend
│   ├── booking.js                    # Customer booking form logic
│   ├── booking-confirmation.js       # Booking success page
│   ├── booking-manager.js            # Customer booking management (cancel)
│   ├── calendar.js                   # Calendar utilities (Google Cal, .ics)
│   ├── form-validation.js            # Form input validation
│   └── hamburger-menu.js             # Mobile menu toggle
│
├── styles/                           # CSS stylesheets
│   ├── admin.css                     # Admin panel styles (mobile-first)
│   ├── styles.css                    # Main website styles
│   └── styles-booking.css            # Booking pages styles
│
├── images/                           # Image assets (responsive images)
│
├── index.html                        # Landing page
├── booking.html                      # Customer booking interface
├── booking-manager.html              # Booking management page (customer)
├── admin.html                        # Admin panel (protected)
│
├── package.json                      # Dependencies & project metadata
├── package-lock.json                 # Locked dependency versions
└── vercel.json                       # Vercel deployment configuration
```

## 🚀 Key Features

### 👥 Customer Side

- **Booking Appointments:**

  - Select multiple services simultaneously
  - Dynamic calendar with availability
  - Automatic conflict detection
  - Service package suggestions
  - Real-time form validation

- **Booking Management:**
  - Unique management links per booking (token-based)
  - Cancel appointment until it starts
  - Automatic confirmation emails
  - Google Calendar integration and .ics files

### 🔐 Admin Panel

- **Authentication System:**

  - Secure login with bcrypt
  - JWT tokens with 8-hour sessions
  - Rate limiting (5 attempts / 15 minutes)
  - Database session management

- **Dashboard:**

  - Daily/weekly/monthly revenue
  - Booking statistics
  - Upcoming appointments list
  - Daily schedule

- **Booking Management:**

  - Complete list of all bookings
  - Advanced search (ID, customer, phone)
  - Sorting and filtering
  - Edit and delete bookings
  - Manual booking creation

- **Calendar View:**

  - Monthly booking overview
  - Day status indicators (available, busy, full, closed)
  - Detailed day view with schedule gaps
  - Daily timeline of appointments

- **Business Hours:**

  - Configure hours for each weekday
  - Overtime buffer (extra minutes after closing)
  - Quick presets (Standard, Extended, Weekend Only)
  - Automatic calendar synchronization

- **Responsiveness:**
  - Dedicated mobile views for all sections
  - Adaptive layouts (mobile cards, desktop tables)
  - Auto-refresh every 30 seconds

## 🛠️ Technology Stack

### Frontend

- **Vanilla JavaScript (ES6+)** - Modular architecture without frameworks
- **HTML5 & CSS3** - Semantic markup, CSS Grid, Flexbox
- **Mobile-First Design** - Responsive on all devices

### Backend

- **Node.js** - Runtime environment for API
- **Vercel Serverless Functions** - Serverless API endpoints
- **PostgreSQL** (Neon Database) - Relational database

### Libraries & Tools

```json
{
  "bcryptjs": "^3.0.2", // Password hashing (secure admin auth)
  "jsonwebtoken": "^9.0.2", // JWT token generation & verification
  "pg": "^8.11.0", // PostgreSQL client for Node.js
  "resend": "^3.2.0" // Email service (booking confirmations)
}
```

**Why these libraries:**

- `bcryptjs` - Secure admin password hashing (bcrypt with salt rounds)
- `jsonwebtoken` - JWT standard for authentication tokens with expiration
- `pg` - Official PostgreSQL client with connection pooling
- `resend` - Modern email API (alternative to SendGrid/Mailgun)

### Deployment & Hosting

- **Vercel** - Static hosting + serverless functions
- **Neon** - Serverless PostgreSQL database
- **GitHub Actions** - Automated API calls (follow-up emails)

## ⚡ Real-Time Updates

**Current Implementation: Polling (periodic refresh)**

The application uses periodic API polling to keep data synchronized:

- **Customer booking page:** Refreshes availability every 5 seconds
- **Admin panel:**
  - Dashboard: every 30 seconds
  - Calendar view: every 1 second
  - Bookings list: on-demand refresh

**Why not WebSockets?**

In a production environment, WebSockets would be the ideal solution for real-time synchronization, providing instant updates when multiple users interact with the system simultaneously.

However, this project uses **Vercel's free serverless functions**, which are stateless and don't support persistent WebSocket connections. Implementing WebSockets would require:

- **Paid third-party services** (Pusher, Ably, Socket.io Cloud: ~$29-99/month)
- **Separate WebSocket server** (VPS or cloud hosting + maintenance costs)
- **Increased infrastructure complexity**

For a small barbershop booking system, the current polling approach provides adequate responsiveness while remaining **completely free to host** and simple to maintain. The trade-off between cost/complexity and real-time performance is appropriate for this use case.

## 🗄️ Database Schema

### Table: `bookings`

Main table storing all bookings.

```sql
CREATE TABLE bookings (
    id SERIAL PRIMARY KEY,
    date DATE NOT NULL,                    -- Booking date (YYYY-MM-DD)
    time TIME NOT NULL,                    -- Start time (HH:MM:SS)
    customer VARCHAR(255) NOT NULL,        -- Customer full name
    phone VARCHAR(20) NOT NULL,            -- Phone number
    email VARCHAR(255) NOT NULL,           -- Email address
    services JSONB NOT NULL,               -- Array of service names ["Haircut", "Beard Trim"]
    duration INTEGER NOT NULL,             -- Total duration in minutes
    price DECIMAL(10,2) NOT NULL,         -- Total price in dollars
    status VARCHAR(50) DEFAULT 'confirmed',-- Booking status (confirmed/cancelled)
    notes TEXT,                            -- Optional customer notes
    created_at TIMESTAMP DEFAULT NOW()    -- Timestamp of booking creation
);
```

### Table: `booking_tokens`

Tokens enabling customers to manage bookings without login.

```sql
CREATE TABLE booking_tokens (
    id SERIAL PRIMARY KEY,
    booking_id INTEGER NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    token UUID UNIQUE NOT NULL,            -- Unique management token (UUID v4)
    expires_at TIMESTAMP NOT NULL,         -- Token expiration (= appointment start time)
    is_active BOOLEAN DEFAULT true,        -- Active status (deactivated after cancel)
    created_at TIMESTAMP DEFAULT NOW()
);
```

### Table: `admin_sessions`

Admin sessions with JWT tokens stored in database.

```sql
CREATE TABLE admin_sessions (
    id SERIAL PRIMARY KEY,
    session_token TEXT UNIQUE NOT NULL,    -- JWT token string
    expires_at TIMESTAMP NOT NULL,         -- Session expiration (8 hours)
    is_active BOOLEAN DEFAULT true,        -- Active status
    ip_address VARCHAR(45),                -- Client IP for security audit
    user_agent TEXT,                       -- Browser/device info
    created_at TIMESTAMP DEFAULT NOW()
);
```

### Table: `business_hours`

Business hours configuration for each weekday.

```sql
CREATE TABLE business_hours (
    id SERIAL PRIMARY KEY,
    day_name VARCHAR(20) UNIQUE NOT NULL,  -- Day name (monday, tuesday, ...)
    enabled BOOLEAN DEFAULT true,           -- Is the business open this day
    open_time TIME NOT NULL,               -- Opening time (HH:MM:SS)
    close_time TIME NOT NULL,              -- Closing time (HH:MM:SS)
    overtime_buffer_minutes INTEGER DEFAULT 0  -- Minutes after close for overtime
);
```

### View: `public_availability`

Publicly safe view - contains only availability data without personal information.

```sql
CREATE VIEW public_availability AS
SELECT
    date,
    time,
    duration,
    status
FROM bookings;
```

**Relations:**

- `booking_tokens.booking_id` → `bookings.id` (CASCADE DELETE)
- `business_hours` - no relations, standalone config table

**Indexes:**

```sql
CREATE INDEX idx_bookings_date_time ON bookings(date, time);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_booking_tokens_token ON booking_tokens(token);
CREATE INDEX idx_admin_sessions_token ON admin_sessions(session_token);
```

## 📡 API Documentation

### Public Endpoints (no authentication required)

#### `POST /api/bookings`

Create a new booking.

**Request Body:**

```json
{
  "date": "2025-10-15",
  "time": "14:00",
  "customer": "John Doe",
  "phone": "+1234567890",
  "email": "john@example.com",
  "services": ["Haircut", "Beard Trim"],
  "duration": 60,
  "price": 45.0,
  "notes": "Please use scissors only"
}
```

**Response (201):**

```json
{
  "id": 123,
  "date": "2025-10-15",
  "time": "14:00:00",
  "customer": "John Doe",
  "phone": "+1234567890",
  "email": "john@example.com",
  "services": ["Haircut", "Beard Trim"],
  "duration": 60,
  "price": "45.00",
  "status": "confirmed",
  "notes": "Please use scissors only",
  "created_at": "2025-10-04T10:30:00Z"
}
```

**Features:**

- Automatic time conflict detection
- Management token generation
- Email confirmation sending
- Business hours validation

#### `GET /api/availability`

Get availability data (for booking calendar).

**Response (200):**

```json
[
  {
    "date": "2025-10-15",
    "time": "14:00:00",
    "duration": 60,
    "status": "confirmed"
  }
]
```

#### `GET /api/business-hours`

Get business hours.

**Response (200):**

```json
[
  {
    "day_name": "monday",
    "enabled": true,
    "open_time": "09:00:00",
    "close_time": "18:00:00",
    "overtime_buffer_minutes": 30
  }
]
```

#### `GET /api/manage/[token]`

Get booking details using token.

**Response (200):**

```json
{
  "success": true,
  "booking": {
    "id": 123,
    "date": "2025-10-15",
    "time": "14:00",
    "services": ["Haircut", "Beard Trim"],
    "duration": 60,
    "price": "45.00",
    "customer": "John Doe"
  }
}
```

#### `DELETE /api/manage/[token]`

Cancel booking using token.

**Response (200):**

```json
{
  "success": true,
  "message": "Booking cancelled successfully",
  "bookingId": 123,
  "emailSent": true
}
```

---

### Protected Endpoints (JWT required)

**Authorization:** JWT token in `admin_token` cookie or `Authorization: Bearer {token}` header

#### `POST /api/auth/login`

Admin login.

**Request Body:**

```json
{
  "password": "admin_password_here"
}
```

**Response (200):**

```json
{
  "success": true,
  "message": "Login successful",
  "expiresAt": "2025-10-04T18:30:00Z"
}
```

**Features:**

- Rate limiting: 5 attempts / 15 minutes per IP
- Bcrypt password verification
- JWT token in HTTP-only cookie
- Session stored in database

#### `POST /api/auth/verify`

Verify active session.

**Response (200):**

```json
{
  "valid": true,
  "isAdmin": true,
  "loginTime": "2025-10-04T10:30:00Z",
  "expiresAt": "2025-10-04T18:30:00Z"
}
```

#### `POST /api/auth/logout`

Logout (session deactivation).

**Response (200):**

```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

#### `GET /api/bookings`

Get all bookings (admin only).

**Response (200):**

```json
[
  {
    "id": 123,
    "date": "2025-10-15T00:00:00.000Z",
    "time": "14:00:00",
    "customer": "John Doe",
    "phone": "+1234567890",
    "email": "john@example.com",
    "services": ["Haircut", "Beard Trim"],
    "duration": 60,
    "price": "45.00",
    "status": "confirmed",
    "notes": "Please use scissors only",
    "created_at": "2025-10-04T10:30:00Z"
  }
]
```

#### `GET /api/booking/[id]`

Get single booking.

**Response (200):**

```json
{
  "id": 123,
  "date": "2025-10-15T00:00:00.000Z",
  "time": "14:00:00",
  "customer": "John Doe",
  ...
}
```

#### `PUT /api/booking/[id]`

Update booking.

**Request Body:**

```json
{
  "date": "2025-10-16",
  "time": "15:00",
  "customer": "John Doe",
  "phone": "+1234567890",
  "email": "john@example.com",
  "services": ["Haircut"],
  "duration": 30,
  "price": 25.0,
  "status": "confirmed",
  "notes": "Updated booking"
}
```

#### `DELETE /api/booking/[id]`

Delete booking (admin cancel).

**Response (200):**

```json
{
  "success": true,
  "message": "Booking deleted successfully"
}
```

#### `PUT /api/business-hours`

Update business hours.

**Request Body:**

```json
{
  "monday": {
    "enabled": true,
    "open": "09:00",
    "close": "18:00",
    "overtime_buffer_minutes": 30
  },
  "tuesday": {
    "enabled": true,
    "open": "09:00",
    "close": "18:00",
    "overtime_buffer_minutes": 30
  }
}
```

---

### Error Codes

- `400` - Bad Request (missing fields, invalid data)
- `401` - Unauthorized (no token, invalid token, expired session)
- `404` - Not Found (booking doesn't exist)
- `405` - Method Not Allowed (wrong HTTP method)
- `429` - Too Many Requests (rate limiting)
- `500` - Internal Server Error (database error, server error)

## 🔐 Security

### Authentication & Authorization

- **Bcrypt password hashing** - Admin password with salt rounds (cost factor 10)
- **JWT tokens** - 8-hour session with automatic expiration
- **HTTP-only cookies** - Token inaccessible to JavaScript (XSS protection)
- **Session database storage** - Immediate session invalidation capability
- **Rate limiting** - 5 login attempts / 15 minutes per IP

### Token Management

- **UUID v4 tokens** - Cryptographically secure tokens for customers
- **Token expiration** - Automatic expiration at appointment start time
- **Single active token** - One active token per booking
- **Token deactivation** - Deactivation after booking cancellation

### Database Security

- **Prepared statements** - SQL injection protection (pg library)
- **Connection pooling** - Limited number of connections
- **SSL connections** - Encrypted connection to Neon PostgreSQL
- **Environment variables** - Sensitive data in `.env` (not in repo)

### API Security

- **CORS configuration** - Restricted API access
- **Input validation** - Validation of all input data
- **Error handling** - No information leaks in error messages
- **Audit logging** - IP address and user agent in admin sessions

### Required Environment Variables

```bash
# Database
DATABASE_URL=postgresql://user:password@host:5432/database

# Authentication
JWT_SECRET=your-secret-key-min-32-characters
ADMIN_PASSWORD_HASH=$2a$10$... (bcrypt hash)

# Email Service
RESEND_API_KEY=re_your_api_key
```

**Generate password hash:**

```bash
npm install -g bcryptjs
node -e "console.log(require('bcryptjs').hashSync('your-password', 10))"
```

## 📧 Email System

### Provider: Resend

Modern alternative to SendGrid/Mailgun with simple API.

### Email Types

#### 1. Booking Confirmation

Sent automatically after booking creation.

**Contains:**

- Booking confirmation with ID
- Date and time of appointment
- Service list and price
- Salon contact information
- Booking management link (token)
- Google Calendar link
- .ics file attachment

**Example:**

```
Subject: Booking Confirmation #123 - Elite Barber Studio

Your appointment has been confirmed!

Date: October 15, 2025
Time: 2:00 PM - 3:00 PM
Services: Haircut, Beard Trim
Total: $45.00

Manage Your Booking: [Unique Link]
Add to Calendar: [Google Calendar] [Download .ics]
```

#### 2. Cancellation Email (by Customer)

Sent after customer cancellation.

**Contains:**

- Cancellation confirmation
- Cancelled appointment details
- Link to new booking
- Salon contact information

#### 3. Cancellation Email (by Admin)

Sent after admin cancellation.

**Contains:**

- Information about salon cancellation
- Reason for cancellation (if provided)
- Apology
- Encouragement to contact for rescheduling
- Salon contact information

### Email Templates

HTML template with inline CSS for compatibility with various email clients.

**Responsive design:**

- Mobile-friendly layout
- Clear call-to-action buttons
- Branded colors (gold & black)
- Professional typography

## 🎯 Testing the Application

### Customer Flow

1. Visit the [booking page](https://barbersite-eight.vercel.app/booking.html)
2. Select services from the list
3. Choose date and available time
4. Fill in your contact information
5. Submit booking and receive confirmation email
6. Use the management link to view or cancel your booking

### Admin Panel Access

1. Visit the [admin panel](https://barbersite-eight.vercel.app/admin.html)
2. **Contact me directly for the admin password** (see CV for contact details)
3. After login, you can:
   - View dashboard with statistics
   - Manage all bookings (view, edit, delete)
   - Browse calendar view
   - Configure business hours
   - Create manual bookings

---

**Built with ❤️ as a learning project - feedback welcome!**
