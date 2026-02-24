# Database Management Center (DMC)

## Overview

The Database Management Center is a comprehensive admin interface for managing all data across the Verso Air Business Intelligence Platform. It provides a centralized location to view, create, update, and delete records from any table in the database.

## Features

### 🎯 Complete Database Access

- Access all 11 database tables from one interface
- Real-time database statistics
- Search functionality across tables
- Full CRUD operations (Create, Read, Update, Delete)

### 📊 Available Tables

1. **Users** 👥 - User accounts and authentication
2. **Businesses** 🏢 - Business listings and information
3. **Business Categories** 📂 - Categories for business classification
4. **Analytics** 📊 - Business analytics and metrics
5. **Reservations** 📅 - Booking and reservation records
6. **Music Artists** 🎤 - Artist profiles and information
7. **Music Tracks** 🎵 - Track listings and metadata
8. **Music Analytics** 📈 - Music streaming analytics
9. **Countries** 🌍 - Country reference data
10. **Regions** 🗺️ - Regional divisions within countries
11. **Cities** 🏙️ - City information and locations

## Accessing the DMC

### URL Routes

- **Primary Route**: `/countries`
- **Component**: `CountriesDashboard` located at `client/src/components/countries-dashboard.tsx`

### Quick Access Links

- Footer "Quick Links" section on home page
- Direct navigation to `/countries`

## API Endpoints

The DMC connects to these backend endpoints:

### Database Statistics

```
GET /api/admin/database-stats
```

Returns total records count and counts per table.

### Table Operations

```
GET    /api/admin/table/:tableName          # Get all records
POST   /api/admin/table/:tableName          # Create new record
PUT    /api/admin/table/:tableName/:id      # Update record
DELETE /api/admin/table/:tableName/:id      # Delete record
```

#### Supported Table Names

- `users`
- `businesses`
- `business_categories`
- `analytics`
- `reservations`
- `music_artists`
- `music_tracks`
- `music_analytics`
- `countries`
- `regions`
- `cities`

### Example Usage

#### Get all countries:

```bash
curl http://localhost:5003/api/admin/table/countries
```

#### Create a new country:

```bash
curl -X POST http://localhost:5003/api/admin/table/countries \
  -H "Content-Type: application/json" \
  -d '{"name": "Ivory Coast", "code": "CI"}'
```

#### Update a country:

```bash
curl -X PUT http://localhost:5003/api/admin/table/countries/1 \
  -H "Content-Type: application/json" \
  -d '{"name": "United States of America", "code": "US"}'
```

#### Delete a country:

```bash
curl -X DELETE http://localhost:5003/api/admin/table/countries/1
```

## User Interface

### Main Features

1. **Table Selector Grid**

   - Visual cards for each table
   - Shows table icon, name, and description
   - Click to switch between tables

2. **Search Bar**

   - Real-time search across table records
   - Filters results as you type

3. **Action Buttons**

   - Add New: Create new records
   - Refresh: Reload table data

4. **Data Table**

   - Displays all columns and records
   - Sortable columns
   - Hover effects for better visibility
   - Handles NULL values and JSON data

5. **Edit/Create Modal**
   - Full-screen modal for data entry
   - Smart field types:
     - Text inputs for strings
     - Textareas for descriptions
     - Boolean selectors for true/false
     - Disabled ID field for edits
   - Validation and error handling

### Design

- **Modern UI**: Gradient backgrounds, smooth animations
- **Responsive**: Works on desktop and mobile
- **Accessible**: Clear labels, good contrast
- **User-friendly**: Confirmation dialogs for destructive actions

## Database Schema

The DMC connects to the same PostgreSQL database used by the entire application:

- **Database**: `versoair_business_intelligence`
- **User**: `versoair`
- **Connection**: Defined in `server/db.ts`

### Schema Location

All table definitions are in `shared/schema.ts` using Drizzle ORM.

## Security Considerations

⚠️ **IMPORTANT**: The current implementation does NOT include authentication or authorization. In production, you should:

1. Add authentication middleware
2. Implement role-based access control (RBAC)
3. Add audit logging for all operations
4. Sanitize and validate all inputs
5. Rate limit API endpoints
6. Use HTTPS in production

## Technical Stack

### Frontend

- **React** with TypeScript
- **TanStack Query** (React Query) for data fetching
- **Tailwind CSS** for styling
- **Lucide React** for icons
- **Framer Motion** for animations

### Backend

- **Express.js** server
- **Drizzle ORM** for database operations
- **PostgreSQL** database
- **TypeScript** for type safety

## Development

### Running Locally

1. Start the development server:

```bash
npm run dev
```

2. Access the DMC at:

```
http://localhost:5003/countries
```

### Making Changes

**Component Location**: `client/src/components/countries-dashboard.tsx`
**API Routes**: `server/routes.ts` (Admin endpoints section)

### Testing

Test the API endpoints:

```bash
# Get database stats
curl http://localhost:5003/api/admin/database-stats

# Get businesses
curl http://localhost:5003/api/admin/table/businesses

# Create a business
curl -X POST http://localhost:5003/api/admin/table/businesses \
  -H "Content-Type: application/json" \
  -d '{
    "name": "New Business",
    "categoryId": 1,
    "description": "Test business",
    "location": "Abidjan",
    "isActive": true
  }'
```

## Current Database Stats

As of December 31, 2025:

- **Total Records**: 44
- **Active Tables**: 11
- Businesses: 6
- Business Categories: 5
- Analytics: 8
- Music Artists: 3
- Music Tracks: 4
- Countries: 5
- Regions: 5
- Cities: 7

## Future Enhancements

### Planned Features

- [ ] User authentication and authorization
- [ ] Role-based permissions
- [ ] Audit log for all changes
- [ ] Export data to CSV/JSON
- [ ] Import data from files
- [ ] Advanced filtering and sorting
- [ ] Batch operations
- [ ] Database backup/restore
- [ ] SQL query builder
- [ ] Data visualization charts
- [ ] Change history/versioning
- [ ] Search across all tables simultaneously

### Performance Optimizations

- [ ] Pagination for large tables
- [ ] Virtual scrolling for better performance
- [ ] Caching strategies
- [ ] Optimistic UI updates
- [ ] Debounced search

## Troubleshooting

### Common Issues

**Problem**: Can't access DMC

- **Solution**: Make sure server is running on port 5003
- Check: `curl http://localhost:5003/api/health`

**Problem**: Empty table data

- **Solution**: Check database connection
- Run: `curl http://localhost:5003/api/admin/database-stats`

**Problem**: Create/Update fails

- **Solution**: Check data types match schema
- Verify required fields are filled
- Check browser console for errors

**Problem**: TypeScript errors

- **Solution**: Run `npm run build` to check for compilation errors
- Make sure all dependencies are installed: `npm install`

## Support

For issues or questions:

1. Check the server logs: `/tmp/fsa-server.log`
2. Check browser console for frontend errors
3. Verify database connection in `/api/health`
4. Review the schema in `shared/schema.ts`

## Related Documentation

- [Database Schema](./Database_Schema.sql)
- [API Documentation](./README.md)
- [JavaScript Integration](./JavaScript_Integration.js)

---

**Last Updated**: December 31, 2025
**Version**: 1.0.0
**Status**: ✅ Fully Operational
