# Lead Capture Popup System - Setup Guide

This guide explains how to set up and use the new lead capture popup system for collecting email addresses in exchange for PDF downloads.

## Overview

The lead capture popup system allows you to:
- Display customizable popups to visitors with a configurable delay
- Collect email addresses in exchange for PDF downloads
- Manage multiple popup campaigns
- Export collected leads as CSV
- Automatically add leads to your subscriber list

## Database Setup

### 1. Run the Schema Migration

Execute the SQL migration to create the necessary tables in your Supabase database:

```bash
# In Supabase SQL Editor, run:
migration-scripts/5-add-popup-schema.sql
```

This creates two tables:
- `popup_configs` - Stores popup configuration (title, description, image, PDF link, etc.)
- `popup_leads` - Stores collected email addresses with metadata

### 2. Verify Tables

Check that the tables were created successfully:

```sql
SELECT * FROM popup_configs;
SELECT * FROM popup_leads;
```

## Creating Your First Popup

### 1. Access Admin Panel

Navigate to `/admin/popups` in your admin dashboard.

### 2. Click "Create New Popup"

Fill in the popup configuration:

**Required Fields:**
- **Internal Name**: Descriptive name for your records (e.g., "UX Guide Spring 2026")
- **Popup Title**: Main heading shown to visitors (e.g., "Free UX Design Resources")
- **PDF Download URL**: Direct link to your PDF file
- **PDF Title**: Name of the PDF (e.g., "The Complete UX Design Guide")

**Optional Fields:**
- **Description**: Additional text explaining the offer
- **Image URL**: Visual content for the popup (recommended: 600x400px)
- **Image Caption**: Alt text and caption for the image
- **Button Text**: CTA button text (default: "Get Download Link")
- **Delay (seconds)**: How long to wait before showing popup (default: 15)
- **Active**: Toggle to enable/disable (only one popup can be active)

### 3. Save and Activate

Click "Save Popup". To make it live, edit the popup and check the "Active" checkbox.

**Important**: Only one popup can be active at a time. Activating a new popup will automatically deactivate others.

## How the Popup Works

### User Experience

1. **Visitor arrives** on your site
2. **Wait period** - Popup appears after configured delay (default: 15 seconds)
3. **User enters email** and submits
4. **Instant access** - Download link is provided immediately
5. **Email tracking** - Email is added to subscribers and popup leads

### Smart Behavior

- **Session memory**: Won't show again if user already submitted
- **Daily dismissal**: If dismissed, won't show again for 24 hours
- **Duplicate prevention**: Same email can't be submitted for same popup within 24 hours
- **Accessibility**: Full keyboard navigation and screen reader support
- **Responsive**: Mobile-optimized design

## Managing Leads

### View All Leads

Navigate to `/admin/popup-leads` to see all collected emails.

**Features:**
- Filter by specific popup campaign
- Search by email address
- View submission date, IP address, and user agent
- Paginated results (20 per page)

### Export Leads

Click "Export to CSV" to download all leads (or filtered subset) as a spreadsheet.

**CSV Format:**
```
Email,Popup Name,Popup Title,Status,IP Address,Submitted At
user@example.com,UX Guide Spring 2026,Free UX Design Resources,active,192.168.1.1,2026-02-17T18:15:00Z
```

### Integration with Subscribers

All popup leads are automatically:
- Added to the `subscribers` table with source: `popup-lead-capture`
- Marked as active subscribers
- Re-subscribed if they previously unsubscribed

## Best Practices

### Popup Design

1. **Clear Value Proposition**: Make the benefit obvious
2. **Professional Image**: Use relevant, high-quality imagery
3. **Concise Copy**: Keep title and description brief
4. **Trust Signals**: Include privacy assurance text

### Timing

- **Standard delay**: 10-15 seconds gives users time to engage with content
- **Longer delay**: 20-30 seconds for in-depth content
- **Shorter delay**: 5-10 seconds for time-sensitive offers

### PDF Hosting

Host your PDFs on:
- **Cloudinary**: Free tier, reliable CDN
- **AWS S3**: Scalable, pay-per-use
- **Your server**: `/backend/public/downloads/` folder

**Example URLs:**
```
https://res.cloudinary.com/yourcloud/raw/upload/v1/uxdj/guides/ux-design-guide.pdf
https://your-bucket.s3.amazonaws.com/downloads/guide.pdf
https://yourdomain.com/downloads/ux-guide.pdf
```

### A/B Testing

Create multiple popup variations:
1. Keep only one active at a time
2. Run for 1-2 weeks
3. Compare lead counts in `/admin/popup-leads`
4. Activate the winner

## API Endpoints

### Public Endpoints

**Get Active Popup**
```
GET /api/public/popup/active
Response: { popup: { id, title, description, imageUrl, ... } }
```

**Submit Lead**
```
POST /api/public/popup/submit
Body: { email: "user@example.com", popupId: "uuid" }
Response: { success: true, downloadUrl: "...", pdfTitle: "..." }
```

### Admin Endpoints (Requires Auth Token)

**List Popups**
```
GET /api/admin/popups
Authorization: Bearer {token}
```

**Create/Update Popup**
```
POST /api/admin/popups
PUT /api/admin/popups/:id
Authorization: Bearer {token}
```

**List Leads**
```
GET /api/admin/popup-leads?page=1&limit=20&popupId=uuid&search=email
Authorization: Bearer {token}
```

**Export Leads as CSV**
```
GET /api/admin/popup-leads/export?popupId=uuid
Authorization: Bearer {token}
```

## Troubleshooting

### Popup Not Showing

1. **Check if active**: Verify popup is marked as "Active" in `/admin/popups`
2. **Clear storage**: Clear browser localStorage and sessionStorage
3. **Check console**: Look for errors in browser DevTools
4. **Verify API**: Check `/api/public/popup/active` returns data

### Leads Not Saving

1. **Check database**: Verify tables exist in Supabase
2. **Check permissions**: Ensure service role key is configured
3. **View logs**: Check backend console for errors
4. **Test manually**: Use Postman/cURL to test `/api/public/popup/submit`

### Export Not Working

1. **Check auth**: Ensure you're logged in as admin
2. **Browser popups**: Enable popups for your domain
3. **Network tab**: Check for 401/403 errors

## Deployment Checklist

### Before Going Live

- [ ] Database schema migrated (`5-add-popup-schema.sql`)
- [ ] Backend deployed with popup endpoints
- [ ] Frontend deployed with popup components
- [ ] PDF file uploaded and accessible
- [ ] Test popup appears after delay
- [ ] Test email submission works
- [ ] Test CSV export works
- [ ] Verify emails added to subscribers
- [ ] Test on mobile devices
- [ ] Test accessibility (keyboard nav)

### Post-Deployment

- [ ] Monitor lead collection in admin panel
- [ ] Check email deliverability (if sending follow-up emails)
- [ ] Review conversion rates
- [ ] A/B test different variations
- [ ] Update PDFs regularly

## Analytics Tracking

You can enhance the system with analytics:

```typescript
// In useLeadCapturePopup.ts
const handleSuccess = (downloadUrl: string, pdfTitle: string) => {
  // Track conversion
  if (window.gtag) {
    window.gtag('event', 'popup_conversion', {
      popup_title: config?.title,
      pdf_title: pdfTitle
    })
  }
  
  // Track in Mixpanel, Segment, etc.
}
```

## Support

For issues or questions:
1. Check Supabase logs for backend errors
2. Check browser console for frontend errors
3. Review this guide for configuration issues
4. Test with curl/Postman to isolate frontend vs backend issues

## Future Enhancements

Potential improvements:
- Multi-step forms (name + email + company)
- Exit-intent popups
- Scroll-based triggers
- Geo-targeting
- Time-based campaigns
- Drip email sequences
- Integration with email marketing platforms (Mailchimp, ConvertKit)
- Analytics dashboard
- A/B testing framework

---

**Version**: 1.0  
**Last Updated**: February 17, 2026  
**Author**: UXDJ Development Team
