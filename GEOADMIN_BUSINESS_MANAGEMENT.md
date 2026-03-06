# GeoAdmin Business Management Guide

## Overview

The GeoAdmin Dashboard now includes a **Business Management** interface (`Manage` tab) designed for non-technical staff to add, view, and manage businesses in the directory **without requiring code changes**.

This fulfills the requirement: *"Enable non-coder employees with permission to access/enter business data from the dashboard"*

## Features

### ✅ Business Creation Form
- **Accessible UI**: Simple, user-friendly form in the "Manage" tab
- **Required Fields**:
  - Business Name (text)
  - Category (dropdown - fetched from API)
  - Country (dropdown - all 35 supported countries)
- **Optional Fields**:
  - City
  - Address
  - Phone
  - Email
  - Description

### ✅ Data Validation
- Required field validation with clear error messages
- Form prevents submission without mandatory data
- Real-time field validation feedback

### ✅ Success/Error Handling
- Success toast notification upon business creation
- Error messages displayed clearly
- Form resets automatically after successful submission
- Loading state during API submission

### ✅ Automatic Data Refresh
- Query cache invalidation after adding business
- Dashboard automatically updates when new data is added

## How to Use (Non-Coder Staff)

### Step 1: Navigate to GeoAdmin Dashboard
- Go to `/geo-admin/dashboard` or access via main navigation
- Log in if prompted

### Step 2: Click the "Manage" Tab
- Located in the top navigation bar next to "Dashboard"
- Shows: "Business Management" section

### Step 3: Click "Add Business" Button
- Blue button labeled "+ Add Business"
- Opens a modal dialog

### Step 4: Fill in Business Details
1. **Business Name** (required): Enter the business name
   - Example: "Acme Corporation", "The Coffee House"
   
2. **Category** (required): Select from dropdown
   - Options: Commerce, Hotellerie, Automobile, Finance, etc.
   
3. **Country** (required): Select from dropdown
   - All 35 supported countries available
   - Searchable list
   
4. **City** (optional): Enter the city name
   - Example: "New York", "Paris"
   
5. **Address** (optional): Enter street address
   - Example: "123 Main St, Suite 100"
   
6. **Phone** (optional): Enter phone number
   - Example: "+1-555-0123"
   
7. **Email** (optional): Enter email address
   - Example: "contact@business.com"
   
8. **Description** (optional): Brief business description

### Step 5: Review Summary
- Before submission, review the summary: "Creating [Name] in [Category] for [Country]"
- Ensure all information is correct

### Step 6: Submit
- Click "Create Business" button
- Wait for success confirmation
- Business is now added to the directory and synced to database

## Technical Details

### Components

#### BusinessForm.tsx
**Location**: `client/src/components/BusinessForm.tsx`

New React component with:
- Dialog-based modal form
- Form state management with `useState`
- React Query for data fetching (countries, categories)
- API integration via `POST /api/businesses`
- Validation logic
- Toast notifications

**Props**:
- `onSuccess?: () => void` - Callback function when business is created

**Usage**:
```tsx
import { BusinessForm } from "@/components/BusinessForm";

<BusinessForm onSuccess={() => {
  // Refresh data or navigate
}} />
```

#### Updated countries-dashboard.tsx
**Location**: `client/src/components/countries-dashboard.tsx`

Changes:
1. Added import for `BusinessForm` component
2. Added `useQueryClient` hook for cache management
3. Added new "Manage" tab (8-column grid now instead of 7)
4. Manage tab displays:
   - Business Management section
   - Info banner explaining the feature
   - Add Business button
   - BusinessForm component integrated

### API Integration

**Endpoint**: `POST /api/businesses`

**Request Body**:
```json
{
  "name": "Business Name",
  "categoryId": 1,
  "countryCode": "US",
  "cityName": "New York",
  "address": "123 Main St",
  "phone": "+1-555-0123",
  "email": "contact@business.com",
  "description": "Optional description"
}
```

**Response**:
```json
{
  "id": 123,
  "name": "Business Name",
  "categoryId": 1,
  "countryCode": "US",
  "created_at": "2024-01-15T10:30:00Z",
  ...
}
```

**Error Handling**:
- 400: Validation error (missing required fields)
- 500: Server error (database connection issue)
- Errors are caught and displayed as toast notifications

## Database Schema

Businesses are stored in the `businesses` table with relationships to:
- `business_categories` (via `categoryId`)
- `countries` (via `country_code` and `country_id`)

**Fields Used**:
- `name` (string, required)
- `category_id` (integer FK, required)
- `country_code` (string, required) - ISO 3166-1 alpha-2 code
- `country_id` (integer FK, required)
- `city_name` (string, optional)
- `address` (string, optional)
- `phone` (string, optional)
- `email` (string, optional)
- `description` (text, optional)
- `created_at` (timestamp)
- `updated_at` (timestamp)

## Supported Countries (35 Total)

The form includes all 35 countries:
US, CA, FR, CI, BR, DE, GB, JP, MX, SN, ES, IT, AU, NZ, CH, SE, NO, DK, NL, BE, AT, CZ, PL, GR, PT, RO, HU, RU, CN, IN, KR, SG, MY, TH, VN

## Migration System Integration

The business management UI works alongside the automated migration system (`scripts/migrations/`):
- Manual additions via UI go to database immediately
- Automated migrations sync baseline data on deployment
- Both systems use the same database schema

## Permissions & Security

Currently, the GeoAdmin Dashboard is accessible to authorized users. Consider implementing:
- Role-based access control for "Business Manager" role
- Audit logging for business creation events
- Soft-delete for businesses (don't permanently remove)
- Edit/update forms (future enhancement)

## Troubleshooting

### "Failed to create business" Error
**Cause**: API connection issue or database error
**Solution**: 
- Check database connection status
- Verify all required fields are filled
- Check browser console for detailed error

### Form not submitting
**Cause**: Missing required fields
**Solution**: 
- Business Name must not be empty
- Category must be selected
- Country must be selected
- Check validation messages above the form

### Country dropdown shows no options
**Cause**: API failure to fetch countries
**Solution**: 
- Check `/api/countries` endpoint is working
- Verify database has countries table populated
- Run migrations: `npm run db:push`

### New business doesn't appear in directory
**Cause**: Cache not refreshed
**Solution**: 
- Wait a few seconds for React Query to update
- Manually refresh the page (F5)
- Check "Businesses" tab to see if data is there

## Future Enhancements

- [ ] Edit existing businesses
- [ ] Delete businesses (with confirmation)
- [ ] Bulk import (CSV/Excel)
- [ ] Business status flags (active/inactive)
- [ ] Image upload for business logo
- [ ] Geocoding for address verification
- [ ] Business hours management
- [ ] Specialization tags/categories
- [ ] Rating/review management

## Related Files

- **Frontend Component**: [client/src/components/BusinessForm.tsx](client/src/components/BusinessForm.tsx)
- **Dashboard Integration**: [client/src/components/countries-dashboard.tsx](client/src/components/countries-dashboard.tsx#L1852)
- **API Endpoint**: [server/routes/businesses.ts](server/routes/businesses.ts#L250-L340)
- **Database Schema**: [shared/schema.ts](shared/schema.ts)
- **Migrations**: [scripts/migrations/](scripts/migrations/)

## Support

For issues or questions:
1. Check this guide first
2. Review browser console for error messages
3. Check API health endpoint: `GET /api/health`
4. Verify database connection in GeoAdmin Dashboard
