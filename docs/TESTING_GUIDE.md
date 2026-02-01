# Compliance Connect - Full Manual Testing Guide

**URL:** https://www.complianceod.co.uk
**Last Updated:** February 2026

This guide provides step-by-step instructions for manually testing all areas of the Compliance Connect application.

---

## Prerequisites

### Test Accounts Needed
1. **Admin Account** - User with ADMIN role
2. **Engineer Account** - User with ENGINEER role and approved profile
3. **Customer Account** - User with CUSTOMER role

### Browser Setup
- Use Chrome (latest version)
- Open DevTools (F12) → Keep Console tab visible for errors
- Enable mobile device simulation for engineer tests (DevTools → Toggle Device Toolbar)

---

## Part 1: Customer Dashboard Testing

### 1.1 Authentication Flow
- [ ] Navigate to https://www.complianceod.co.uk
- [ ] Click "Sign In"
- [ ] Verify Clerk sign-in form appears
- [ ] Sign in with customer credentials
- [ ] Verify redirect to `/dashboard`
- [ ] Check user name displays correctly in header

### 1.2 Site Management
- [ ] Navigate to `/sites`
- [ ] Click "Add Site" button
- [ ] Fill in site details:
  - Name: "Test Office HQ"
  - Address: "123 Test Street"
  - Postcode: "SW1A 1AA"
  - Access Notes: "Ring bell at reception"
- [ ] Submit and verify site appears in list
- [ ] Click on site to view details
- [ ] Test "Edit" functionality
- [ ] Navigate to site questionnaire (`/sites/[id]/questionnaire`)
- [ ] Complete questionnaire and verify it saves

### 1.3 Booking Flow
- [ ] Navigate to `/bookings/new`
- [ ] Select a site from dropdown
- [ ] Select a service (e.g., "PAT Testing")
- [ ] Enter estimated quantity
- [ ] Select a date and time slot (AM/PM)
- [ ] Review quoted price
- [ ] Submit booking
- [ ] Verify booking appears in `/bookings` list
- [ ] Click booking to view details
- [ ] Verify all information is correct

### 1.4 Service Bundles
- [ ] Navigate to `/bookings/bundles`
- [ ] View available bundles
- [ ] Select a bundle
- [ ] Complete bundle booking flow
- [ ] Verify multiple bookings created

### 1.5 Compliance Dashboard
- [ ] Navigate to `/compliance`
- [ ] Check compliance calendar displays
- [ ] Verify upcoming due dates shown
- [ ] Check any overdue items highlighted

---

## Part 2: Engineer Mobile App Testing

### 2.1 Setup
- [ ] Switch Chrome DevTools to mobile view (iPhone 12 Pro or similar)
- [ ] Sign out and sign in with engineer credentials
- [ ] Verify redirect to `/engineer`

### 2.2 Today View
- [ ] Verify bottom navigation shows: Today, Calendar, Earnings, Profile
- [ ] Check header shows current date
- [ ] Verify earnings quick-view in header
- [ ] If jobs exist for today:
  - [ ] Current/next job card displays
  - [ ] Job timeline shows all jobs
  - [ ] Quick stats show (Completed, Est. Finish, Distance)
- [ ] If no jobs:
  - [ ] Empty state message displays

### 2.3 Job Workflow
- [ ] Click on a job to view details (`/engineer/jobs/[id]`)
- [ ] Verify job details show:
  - Service name and description
  - Customer name and contact
  - Site address with "Get Directions" button
  - Scheduled date and time slot
  - Quoted price
- [ ] Test "Get Directions" opens Google Maps
- [ ] Test "Call Customer" initiates phone call

### 2.4 Job Status Progression
Test the full job workflow:

**Step 1: Accept Job**
- [ ] From PENDING job, click "Accept"
- [ ] Verify status changes to CONFIRMED

**Step 2: Start Travel**
- [ ] Click "Start Traveling"
- [ ] Verify status changes to EN_ROUTE
- [ ] Verify timestamp recorded

**Step 3: Arrive**
- [ ] Click "I've Arrived"
- [ ] Verify status changes to ON_SITE

**Step 4: Start Work**
- [ ] Click "Start Work"
- [ ] Verify status changes to IN_PROGRESS

**Step 5: Add Test Results**
- [ ] Click "Add Asset" / test result
- [ ] Enter asset details (name, location, status)
- [ ] Submit and verify appears in list

**Step 6: Capture Photo**
- [ ] Click "Add Photo"
- [ ] Test camera capture (or file upload)
- [ ] Add description
- [ ] Upload and verify photo appears in gallery

**Step 7: Capture Signature**
- [ ] Click "Capture Customer Signature"
- [ ] Enter signer name
- [ ] Draw signature on canvas
- [ ] Submit and verify signature displays

**Step 8: Complete Job**
- [ ] Click "Complete Job"
- [ ] Verify status changes to COMPLETED
- [ ] Verify certificate download available

### 2.5 Calendar View
- [ ] Navigate to Calendar (bottom nav)
- [ ] Verify week view displays
- [ ] Test week navigation (prev/next arrows)
- [ ] Check job indicators on days with jobs
- [ ] Tap a day to see job details
- [ ] Click "Sync" to access calendar settings

### 2.6 Calendar Sync
- [ ] Navigate to `/engineer/profile/calendar`
- [ ] Verify Google Calendar connect button
- [ ] Verify Outlook connect button
- [ ] Test iCal feed:
  - [ ] Copy iCal URL
  - [ ] Verify URL format: `/api/engineer/calendar/ical/[userId]`
  - [ ] Test "Open in Calendar App" link

### 2.7 Earnings View
- [ ] Navigate to Earnings (bottom nav)
- [ ] Verify period selector (Week/Month)
- [ ] Toggle between week and month
- [ ] Check earnings card shows total
- [ ] Verify stats grid (Jobs, Hours, Avg per Job, Avg per Hour)
- [ ] Check recent jobs list
- [ ] Click a job to view details

### 2.8 Profile
- [ ] Navigate to Profile (bottom nav)
- [ ] Verify profile card with name, email, status badge
- [ ] Check stats row (Years Exp, Services, Areas)
- [ ] Verify qualifications list
- [ ] Verify services/competencies
- [ ] Verify coverage areas
- [ ] Test "Edit" button navigates to onboarding
- [ ] Test quick links:
  - [ ] Calendar Sync
  - [ ] All Jobs
  - [ ] Earnings History
  - [ ] Settings
  - [ ] Help & Support

### 2.9 PWA Features
**Install Test:**
- [ ] Look for install prompt or address bar install icon
- [ ] Install PWA
- [ ] Open from home screen
- [ ] Verify standalone display (no browser UI)
- [ ] Verify theme color in status bar

**Offline Test:**
- [ ] With PWA open, go to DevTools → Network → Offline
- [ ] Verify offline banner appears
- [ ] Navigate to Today view - should show cached jobs
- [ ] Try to update job status
- [ ] Verify "Saved offline" message
- [ ] Go back online (uncheck Offline)
- [ ] Verify sync happens

**Service Worker:**
- [ ] DevTools → Application → Service Workers
- [ ] Verify `sw.js` is registered and activated
- [ ] Check scope is `/engineer`

---

## Part 3: Admin Command Center Testing

### 3.1 Admin Access
- [ ] Sign out and sign in with admin credentials
- [ ] Verify redirect to `/admin`
- [ ] Check sidebar navigation displays all sections

### 3.2 Dashboard Overview
- [ ] Verify stats cards show:
  - Total Revenue
  - Active Bookings
  - Total Engineers
  - Pending Approvals
- [ ] Check recent bookings table
- [ ] Check alerts/notifications section
- [ ] Test quick action buttons

### 3.3 Booking Management
**Bookings List (`/admin/bookings`):**
- [ ] Verify bookings table displays
- [ ] Test status filter
- [ ] Test date range filter
- [ ] Test search by reference
- [ ] Click booking to view details

**Create Booking (`/admin/bookings/new`):**
- [ ] Test 4-step booking wizard:
  1. Select/create customer
  2. Select/create site
  3. Choose service and details
  4. Select date, slot, engineer
- [ ] Submit and verify booking created

**Pending Approvals (`/admin/bookings/pending`):**
- [ ] View pending bookings
- [ ] Test approve action
- [ ] Test reject action with reason

**Issues (`/admin/bookings/issues`):**
- [ ] View bookings with issues
- [ ] Check issue categories

### 3.4 Engineer Management
**Engineers List (`/admin/engineers`):**
- [ ] Verify engineers table
- [ ] Check status indicators
- [ ] Filter by status

**Engineer Detail (`/admin/engineers/[id]`):**
- [ ] View engineer profile
- [ ] Check qualifications
- [ ] View coverage areas
- [ ] Check job history
- [ ] View earnings summary
- [ ] Test approve/reject/suspend actions

### 3.5 Customer Management
- [ ] Navigate to `/admin/customers`
- [ ] Verify customer list displays
- [ ] Search for customer
- [ ] View customer details
- [ ] Check booking history

### 3.6 Scheduling
**Control Panel (`/admin/scheduling/control`):**
- [ ] Verify weight sliders for optimization
- [ ] Adjust weights and save
- [ ] Test presets (Efficiency, Quality, etc.)

**Calendar (`/admin/scheduling/calendar`):**
- [ ] View scheduling calendar
- [ ] Check engineer availability overlay
- [ ] Test drag-and-drop rescheduling (if implemented)

**Optimization (`/admin/scheduling/optimization`):**
- [ ] View optimization dashboard
- [ ] Check route efficiency metrics

### 3.7 Services Management
- [ ] Navigate to `/admin/services`
- [ ] View services list
- [ ] Test add new service
- [ ] Test edit service
- [ ] Test activate/deactivate

### 3.8 Reports
- [ ] Navigate to `/admin/reports`
- [ ] Check available report types
- [ ] Generate a report
- [ ] Test export functionality

### 3.9 User Management
**Users (`/admin/users`):**
- [ ] View all users
- [ ] Filter by role
- [ ] Edit user details

**Roles (`/admin/users/roles`):**
- [ ] View role definitions
- [ ] Check permissions matrix

### 3.10 Settings
**Pricing (`/admin/settings/pricing`):**
- [ ] View pricing rules
- [ ] Test add/edit pricing rule
- [ ] Check dynamic pricing toggles

**Regions (`/admin/settings/regions`):**
- [ ] View coverage regions
- [ ] Test add/edit region

**Notifications (`/admin/settings/notifications`):**
- [ ] View notification templates
- [ ] Test edit template

**System (`/admin/settings/system`):**
- [ ] Check system settings
- [ ] View integrations status

---

## Part 4: API Testing

### 4.1 iCal Feed
```bash
curl https://www.complianceod.co.uk/api/engineer/calendar/ical/[USER_ID]
```
- [ ] Verify returns valid iCal format
- [ ] Check events contain job details

### 4.2 Job Status API
```bash
curl -X POST https://www.complianceod.co.uk/api/engineer/jobs/[JOB_ID]/status \
  -H "Content-Type: application/json" \
  -d '{"action": "START_TRAVEL"}'
```
- [ ] Test each action: ACCEPT, START_TRAVEL, ARRIVE, START_WORK, COMPLETE
- [ ] Verify proper error for invalid transitions

---

## Part 5: Error Handling & Edge Cases

### 5.1 Form Validation
- [ ] Submit empty forms - verify validation messages
- [ ] Enter invalid data - verify error handling
- [ ] Test maximum length inputs

### 5.2 Permission Checks
- [ ] Try accessing `/admin` as customer - verify redirect
- [ ] Try accessing `/engineer` as customer - verify redirect
- [ ] Try accessing another user's data - verify 403

### 5.3 404 Pages
- [ ] Navigate to non-existent route
- [ ] Verify 404 page displays
- [ ] Check navigation back works

### 5.4 Loading States
- [ ] Throttle network in DevTools
- [ ] Verify loading spinners display
- [ ] Check skeleton states

---

## Part 6: Cross-Browser Testing

Repeat critical flows in:
- [ ] Chrome (primary)
- [ ] Safari
- [ ] Firefox
- [ ] Edge
- [ ] Mobile Safari (iOS)
- [ ] Mobile Chrome (Android)

---

## Issue Reporting Template

When finding bugs, document:

```
**Issue Title:** [Brief description]

**Steps to Reproduce:**
1.
2.
3.

**Expected Result:**
[What should happen]

**Actual Result:**
[What actually happened]

**Screenshots:**
[Attach if applicable]

**Browser/Device:**
[Chrome 120 / iPhone 14 / etc.]

**Console Errors:**
[Copy any errors from DevTools]
```

---

## Testing Checklist Summary

### Critical Paths (Must Pass)
- [ ] Customer can create booking
- [ ] Engineer can complete job workflow
- [ ] Admin can manage bookings and engineers
- [ ] PWA installs and works offline

### Secondary Features
- [ ] Calendar sync setup
- [ ] Report generation
- [ ] Service bundles
- [ ] Compliance tracking

### Performance
- [ ] Pages load in <3 seconds
- [ ] No console errors in normal flow
- [ ] Smooth animations and transitions
