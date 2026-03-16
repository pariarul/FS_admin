# FS Trade - Admin CMS Dashboard

A comprehensive Content Management System designed to manage the FS Trade client portal. This dashboard provides full control over the website content, catalog, and internationalization.

## 🌟 Key Features

- **Dynamic Content Management**: Edit Hero sections, About pages, Leadership teams, and Suppliers.
- **AI-Powered Translations**: Integrated with **Google Gemini AI** for automatic translation of website content into Mandarin and Sinhala.
- **Product Catalog Management**: 
  - Hierarchical category management.
  - Image uploads and cropping.
  - **Excel (XLSX) Import/Export**: Batch update products via spreadsheets.
- **Secure Authentication**: JWT-based secure login with session management.
- **Rich Text Editing**: Integrated with TipTap editor for localized descriptions.

## 🛠️ Tech Stack

- **Framework**: [Next.js 15 (App Router)](https://nextjs.org/)
- **Styling**: Tailwind CSS 4
- **Editor**: [TipTap](https://tiptap.dev/)
- **AI**: [Google Gemini API](https://ai.google.dev/)
- **Utility Libraries**: Axios, Lucide React, XLSX, React-Toastify.

## 📦 Getting Started

### Installation

1. Navigate to the admin directory:
   ```bash
   cd admin
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Configure environment variables in `.env`:
   ```env
   NEXT_PUBLIC_API_BASE_URL=http://localhost:8000/api
   NEXT_PUBLIC_GEMINI_API_KEY=YOUR_GEMINI_API_KEY
   ```

### Running Locally

```bash
npm run dev
```

The admin dashboard will be available at [http://localhost:3001](http://localhost:3001).

## 🚀 Key Modules

### Home Management
- **Hero**: Manage background images and branding logos.
- **About**: Update sections with live previews and status counters.
- **CTA**: Manage call-to-action sections with redirection links.

### Catalog Management
- **Products**: Full CRUD for products including image galleries.
- **Categories**: Map products to sectors for easier client navigation.

### Translation Flow
1. Enter content in English.
2. Click "Translate to Mandarin & Sinhala".
3. Verify AI-generated content in the side-by-side columns.
4. Save to update both DB and client-side instantly.

---
Built with ❤️ for FS Trade.
