# Claude Chrome Agent - E2E Testing Instructions

## !! CRITICAL - READ THIS FIRST !!

**DO NOT USE LOCALHOST. THE SERVER IS NOT RUNNING LOCALLY.**

**TEST URL: https://www.complianceod.co.uk**

This is a PRODUCTION test. The application is deployed and running at the URL above.
There is NO local development server. Do not attempt to connect to localhost:3000.

---

## Test User Credentials

| Role | Username | Password |
|------|----------|----------|
| Customer | `testcustomer1` | `ComplianceTest2026!` |
| Engineer | `testuser1` | `ComplianceTest2026!` |
| Admin | `testadmin1` | `ComplianceTest2026!` |

---

## PART 1: CUSTOMER FLOW TESTS

### Test 1.1: Customer Login

1. Navigate to `https://www.complianceod.co.uk`
2. Click the "Sign In" button in the top right navigation
3. Enter username: `testcustomer1`
4. Enter password: `ComplianceTest2026!`
5. Click "Continue" or "Sign In"
6. **Expected**: Redirected to `/dashboard`
7. **Expected**: See "Welcome" message and customer dashboard

### Test 1.2: View Dashboard

1. After login, verify you are at `https://www.complianceod.co.uk/dashboard`
2. **Expected**: See the following elements:
   - "Welcome" greeting with user name
   - "Book New Service" card/button
   - "My Sites" card/button
   - "My Bookings" card/button
   - "Compliance Tracker" card/button

### Test 1.3: Create a New Booking

1. From dashboard, click "Book New Service" or navigate to `https://www.complianceod.co.uk/bookings/new`
2. Wait for page to load
3. **Step 1 - Select Site**:
   - Look for site cards or a dropdown
   - Click on the first available site (e.g., "Acme Corp HQ")
   - Click "Continue" button
4. **Step 2 - Select Service**:
   - Look for service cards (PAT Testing, Fire Extinguisher, Emergency Lighting, etc.)
   - Click on "PAT Testing" service card
   - Click "Continue" button
5. **Step 3 - Enter Quantity**:
   - Find the quantity/items input field
   - Enter: `50`
   - Click "Continue" button
6. **Step 4 - Select Date**:
   - A calendar should appear
   - Look for dates with green badges (discounted dates)
   - Click on any available date (not grayed out)
   - Select a time slot (Morning, Afternoon, or Full Day)
   - Click "Continue" button
7. **Step 5 - Review & Confirm**:
   - **Expected**: See booking summary with:
     - Site name
     - Service name
     - Date and time
     - Quantity
     - Total price
   - Click "Confirm Booking" button
8. **Expected**: Success message appears
9. **Expected**: Redirected to `/dashboard` or booking confirmation page

### Test 1.4: View Bookings List

1. Navigate to `https://www.complianceod.co.uk/bookings`
2. **Expected**: See "My Bookings" heading
3. **Expected**: See a list/table of bookings with:
   - Booking reference (CC-XXXXX format)
   - Service name
   - Site name
   - Date
   - Status (Pending, Confirmed, etc.)
4. Click on the first booking row/card
5. **Expected**: Navigate to booking detail page `/bookings/[id]`
6. **Expected**: See full booking details including:
   - Service information
   - Site address
   - Scheduled date and time
   - Status
   - Price

### Test 1.5: Book a Service Bundle

1. Navigate to `https://www.complianceod.co.uk/bookings/bundles`
2. **Expected**: See "Service Bundles" heading
3. **Expected**: See bundle cards with:
   - Bundle name (e.g., "Office Essentials", "Full Compliance Package")
   - "Save X%" badge
   - List of included services
4. Click on "Office Essentials" bundle card (or first bundle with "Save" badge)
5. **Expected**: Navigate to bundle configuration page
6. **Configure Quantities**:
   - Find quantity input fields for each service in bundle
   - For PAT Testing: enter `100`
   - For Fire Extinguisher: enter `10`
   - For Emergency Lighting: enter `20`
7. **Expected**: See price breakdown showing:
   - Original price (with strikethrough)
   - Discount amount
   - Final total
8. Click "Continue" or "Next" button
9. **Select Date**:
   - Choose an available date from calendar
   - Select time slot
10. Click "Confirm Bundle Booking" or "Complete"
11. **Expected**: Success message
12. **Expected**: Multiple bookings created (one per service in bundle)

### Test 1.6: Manage Sites

1. Navigate to `https://www.complianceod.co.uk/sites`
2. **Expected**: See "My Sites" heading
3. **Expected**: See list of sites with addresses
4. **Create New Site**:
   - Click "Add Site" or "New Site" button
   - **Expected**: Navigate to `/sites/new`
   - Fill in form:
     - Name: `Test Site Chrome Agent`
     - Address: `123 Test Street, London`
     - Postcode: `EC1A 1BB`
     - Access Notes: `Ring bell at reception`
   - Click "Save" or "Create" button
5. **Expected**: Success message
6. **Expected**: Redirected to sites list
7. **Expected**: New site appears in list

### Test 1.7: Complete Site Questionnaire

1. Navigate to `https://www.complianceod.co.uk/sites`
2. Click on any site card/row
3. **Expected**: Navigate to site detail page `/sites/[id]`
4. Look for "Complete Profile" or "Questionnaire" button/link
5. Click to navigate to `/sites/[id]/questionnaire`
6. **Step 1 - Building Information**:
   - Building Type: Select "Office" from dropdown
   - Industry: Select "Technology" from dropdown
   - Floor Area: Enter `500`
   - Click "Next" button
7. **Step 2 - Special Features**:
   - Check "Server Room" checkbox
   - Check "Kitchen" checkbox
   - Click "Next" button
8. **Step 3 - Occupancy**:
   - Maximum Occupancy: Enter `50`
   - Number of Workstations: Enter `40`
   - Click "Save" or "Complete" button
9. **Expected**: Success message "Profile saved successfully"
10. **Expected**: Redirected back to site detail page
11. **Expected**: See "Recommended Services" section based on profile

### Test 1.8: Compliance Tracker

1. Navigate to `https://www.complianceod.co.uk/compliance`
2. **Expected**: See "Compliance Tracker" heading
3. **Expected**: See status summary cards:
   - Overdue (red styling)
   - Due Soon (amber/yellow styling)
   - Up to Date (green styling)
4. **Expected**: See list of compliance items with:
   - Service name
   - Site name
   - Due date or days remaining
   - Auto-rebook toggle button
5. **Test Auto-Rebook Toggle**:
   - Find a compliance item with "Manual" button
   - Click "Manual" button
   - **Expected**: Button changes to "Auto"
   - **Expected**: Toast message "Auto-rebook enabled"
6. **Test Book Now**:
   - Find an overdue or due soon item
   - Click "Book Now" button/link
   - **Expected**: Navigate to `/bookings/new` with site pre-selected

---

## PART 2: ENGINEER FLOW TESTS

### Test 2.1: Engineer Login

1. Sign out of current account (click profile icon, then "Sign Out")
2. Navigate to `https://www.complianceod.co.uk`
3. Click "Sign In"
4. Enter username: `testuser1`
5. Enter password: `ComplianceTest2026!`
6. Click "Continue"
7. **Expected**: Redirected to `/engineer` dashboard

### Test 2.2: Engineer Dashboard

1. Verify you are at `https://www.complianceod.co.uk/engineer`
2. **Expected**: See "Hello" greeting with engineer name
3. **Expected**: See quick link cards:
   - "My Jobs"
   - "Schedule"
   - "My Profile"
4. **Expected**: See notification bell icon in header

### Test 2.3: View Jobs

1. Click "My Jobs" card or navigate to `https://www.complianceod.co.uk/engineer/jobs`
2. **Expected**: See "My Jobs" heading
3. **Expected**: See tabs:
   - "Active" (default selected)
   - "Available"
   - "Completed"
4. **Test Active Tab**:
   - Should show jobs assigned to this engineer
   - Each job card shows: service name, site, date, status
5. **Test Available Tab**:
   - Click "Available" tab
   - Should show unassigned jobs in engineer's area
6. **Test Completed Tab**:
   - Click "Completed" tab
   - Should show finished jobs

### Test 2.4: View Job Details

1. Go to "Active" tab
2. Click on first job card/link
3. **Expected**: Navigate to `/engineer/jobs/[id]`
4. **Expected**: See job details:
   - Service name and description
   - Site name and address
   - Customer contact info
   - Scheduled date and time
   - Current status
5. **Expected**: See action buttons:
   - "Get Directions" (links to Google Maps)
   - "Call Customer" (tel: link)
   - "Start Job" (if status is Confirmed)

### Test 2.5: Start and Complete a Job

1. From job detail page with "Confirmed" status
2. Click "Start" or "Begin Job" button
3. **Expected**: Status changes to "In Progress"
4. **Expected**: Asset entry form appears
5. **Add Asset Test Result**:
   - Asset Name: Enter `Office Kettle`
   - Location: Enter `Kitchen`
   - Click "Pass" button (or select Pass status)
   - Click "Add" or "Save" button
6. **Expected**: Asset appears in list below form
7. **Add Another Asset**:
   - Asset Name: Enter `Desk Lamp`
   - Location: Enter `Workstation 1`
   - Click "Pass" button
   - Click "Add" button
8. Click "Complete Job" button
9. **Expected**: Confirmation dialog appears
10. Click "Confirm" or "Yes"
11. **Expected**: Status changes to "Completed"
12. **Expected**: Success message

### Test 2.6: Claim Available Job

1. Navigate to `https://www.complianceod.co.uk/engineer/jobs`
2. Click "Available" tab
3. If jobs are available:
   - Click on first available job
   - Click "Claim" or "Accept" button
   - **Expected**: Job assigned to you
   - **Expected**: Redirected to Active tab or job detail

### Test 2.7: Test Notifications

1. Navigate to `https://www.complianceod.co.uk/engineer`
2. Find notification bell icon in header (usually top right)
3. Click the notification bell
4. **Expected**: Dropdown opens showing:
   - "Notifications" heading
   - List of notifications OR "No notifications" message
5. If notifications exist:
   - Click on an unread notification
   - **Expected**: Notification marked as read (styling changes)

### Test 2.8: Get Directions to Site

1. Navigate to any job detail page
2. Find "Get Directions" or "Directions" link
3. **Expected**: Link has `href` containing `google.com/maps`
4. Click the link (opens in new tab)
5. **Expected**: Google Maps opens with destination address

### Test 2.9: Mobile View Test

1. Open browser DevTools (F12 or right-click > Inspect)
2. Toggle device toolbar (Ctrl+Shift+M or click device icon)
3. Select "iPhone SE" or set width to 375px
4. Navigate to `https://www.complianceod.co.uk/engineer`
5. **Expected**: See mobile bottom navigation bar with:
   - Dashboard icon
   - My Jobs icon
   - Profile icon
6. Tap "My Jobs" in bottom nav
7. **Expected**: Navigate to `/engineer/jobs`
8. **Expected**: Job cards are full width

---

## PART 3: ADMIN FLOW TESTS

### Test 3.1: Admin Login

1. Sign out of engineer account
2. Navigate to `https://www.complianceod.co.uk`
3. Click "Sign In"
4. Enter username: `testadmin1`
5. Enter password: `ComplianceTest2026!`
6. Click "Continue"
7. **Expected**: Redirected to `/admin` dashboard

### Test 3.2: Admin Dashboard

1. Verify you are at `https://www.complianceod.co.uk/admin`
2. **Expected**: See "Admin Dashboard" heading
3. **Expected**: See "Welcome" message
4. **Expected**: See quick link cards:
   - "All Bookings"
   - "Engineers"
   - "Services"

### Test 3.3: Manage Bookings

1. Click "All Bookings" or navigate to `https://www.complianceod.co.uk/admin/bookings`
2. **Expected**: See "Bookings" heading
3. **Expected**: See table or list of ALL bookings (all customers)
4. **Test Search**:
   - Find search input field
   - Type: `CC-`
   - **Expected**: Results filtered to show bookings with CC- reference
5. **Test Status Filter**:
   - Find status dropdown/filter
   - Click to open
   - Select "Pending"
   - **Expected**: Only pending bookings shown
6. **View Booking Detail**:
   - Click on any booking row
   - **Expected**: Navigate to `/admin/bookings/[id]`
   - **Expected**: See full booking details including:
     - Customer information
     - Site details
     - Service and quantity
     - Assigned engineer (if any)

### Test 3.4: Assign Engineer to Booking

1. From `/admin/bookings`, find a booking with "Pending" status
2. Click on the booking to open detail page
3. Look for "Assign" or "Assign Engineer" button
4. Click the button
5. **Expected**: Dropdown or modal opens with list of available engineers
6. Select first engineer from list
7. **Expected**: Success message "Assigned" or "Engineer assigned"
8. **Expected**: Booking status updates to "Confirmed"
9. **Expected**: Engineer name shown on booking

### Test 3.5: Auto-Allocate Booking

1. From `/admin/bookings`, find an unassigned pending booking
2. Click to open detail page
3. Look for "Auto-Allocate" or "Auto-Assign" button
4. Click the button
5. **Expected**: System automatically selects best engineer based on:
   - Qualifications
   - Availability
   - Location/postcode
6. **Expected**: Success message showing assigned engineer
7. **Expected**: Booking status updates

### Test 3.6: Cancel Booking

1. From `/admin/bookings`, click on any booking
2. Look for "Cancel" or "Cancel Booking" button
3. Click the button
4. **Expected**: Confirmation dialog appears
5. Click "Confirm" or "Yes, Cancel"
6. **Expected**: Booking status changes to "Cancelled"
7. **Expected**: Success message

### Test 3.7: Manage Engineers

1. Navigate to `https://www.complianceod.co.uk/admin/engineers`
2. **Expected**: See "Engineers" or "Users" heading
3. **Expected**: See table/list of users with columns:
   - Name
   - Email
   - Role
   - Status
4. **Test Role Filter**:
   - Find role filter dropdown
   - Select "Engineer"
   - **Expected**: Only engineers shown
5. **View Engineer Detail**:
   - Click on an engineer row
   - **Expected**: See engineer profile with:
     - Qualifications
     - Assigned jobs
     - Performance stats

### Test 3.8: Change User Role

1. From engineers/users page
2. Find a user row with role dropdown
3. Click the role dropdown
4. Select a different role (e.g., change Customer to Engineer)
5. **Expected**: Success message "Updated" or "Role updated"
6. **Expected**: User's role changes in the list

### Test 3.9: Manage Services

1. Navigate to `https://www.complianceod.co.uk/admin/services`
2. **Expected**: See "Services" heading
3. **Expected**: See list of services:
   - PAT Testing
   - Fire Extinguisher Service
   - Emergency Lighting Test
   - etc.
4. **View Service Detail**:
   - Click on "PAT Testing" row
   - **Expected**: See service details:
     - Name
     - Description
     - Base price
     - Active status
5. **Edit Service**:
   - Click "Edit" button
   - Change base price to `10.00`
   - Click "Save" or "Update"
   - **Expected**: Success message "Updated" or "Service saved"

### Test 3.10: Toggle Service Status

1. From `/admin/services`
2. Find a toggle switch or checkbox for service active status
3. Click to toggle OFF
4. **Expected**: Message "Service deactivated"
5. Click to toggle ON
6. **Expected**: Message "Service activated"

### Test 3.11: Access Control Test

1. Sign out of admin account
2. Sign in as customer: `testcustomer1`
3. Manually navigate to `https://www.complianceod.co.uk/admin`
4. **Expected**: Redirected to `/dashboard` (customer dashboard)
5. **Expected**: NOT able to access admin pages
6. Manually navigate to `https://www.complianceod.co.uk/admin/bookings`
7. **Expected**: Redirected away from admin area

---

## PART 4: ALLOCATION & PRICING TESTS

### Test 4.1: View Discount Calendar

1. Sign in as customer
2. Navigate to `https://www.complianceod.co.uk/bookings/new`
3. Complete steps until you reach the calendar (date selection step)
4. **Expected**: Calendar displays with:
   - Some dates with green badges showing "X% off"
   - Discount legend showing different discount levels
5. Hover over a discounted date
6. **Expected**: Tooltip or popup shows discount details

### Test 4.2: Bundle Discount Display

1. Navigate to `https://www.complianceod.co.uk/bookings/bundles`
2. Select any bundle with "Save X%" badge
3. On quantity configuration page:
4. **Expected**: See pricing breakdown:
   - Individual service prices listed
   - Subtotal (what it would cost separately)
   - Discount amount
   - Bundle total (discounted price)
5. Change quantities
6. **Expected**: Prices recalculate automatically

### Test 4.3: Engineer Route View

1. Sign in as engineer: `testuser1`
2. Navigate to `https://www.complianceod.co.uk/engineer/jobs`
3. Look for "Today's Route" or "Daily Route" section
4. **Expected**: See ordered list of jobs for today:
   - Job 1, Job 2, Job 3, etc.
   - Each with address
   - Optimized by postcode proximity
5. Look for "Open in Maps" button
6. **Expected**: Link contains Google Maps URL with multiple waypoints

---

## PART 5: ERROR HANDLING TESTS

### Test 5.1: Invalid Login

1. Navigate to `https://www.complianceod.co.uk`
2. Click "Sign In"
3. Enter username: `invaliduser`
4. Enter password: `wrongpassword`
5. Click "Continue"
6. **Expected**: Error message "Invalid credentials" or similar
7. **Expected**: Stay on login page

### Test 5.2: Required Field Validation

1. Sign in as customer
2. Navigate to `https://www.complianceod.co.uk/sites/new`
3. Leave all fields empty
4. Click "Save" or "Create"
5. **Expected**: Validation errors appear:
   - "Name is required"
   - "Address is required"
   - "Postcode is required"

### Test 5.3: Invalid Postcode Format

1. On new site form
2. Fill in Name: `Test`
3. Fill in Address: `123 Street`
4. Fill in Postcode: `INVALID`
5. Click "Save"
6. **Expected**: Error "Invalid postcode format" or similar

---

## VERIFICATION CHECKLIST

After completing all tests, verify:

- [ ] Customer can complete full booking flow
- [ ] Customer can book service bundles
- [ ] Customer can manage sites
- [ ] Customer can complete site questionnaire
- [ ] Customer can view compliance status
- [ ] Engineer can view and manage jobs
- [ ] Engineer can start and complete jobs
- [ ] Engineer can add asset test results
- [ ] Engineer receives notifications
- [ ] Admin can view all bookings
- [ ] Admin can assign engineers
- [ ] Admin can manage users
- [ ] Admin can manage services
- [ ] Role-based access control works
- [ ] Discounts display correctly
- [ ] Form validation works

---

## IMPORTANT REMINDERS

1. **BASE URL**: `https://www.complianceod.co.uk` (NOT localhost)
2. **This is PRODUCTION** - no local server needed
3. **Credentials use USERNAME not email**:
   - Customer: `testcustomer1`
   - Engineer: `testuser1`
   - Admin: `testadmin1`
4. Password for all: `ComplianceTest2026!`
