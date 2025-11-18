# 🔗 LinkVault

A modern, privacy-focused link management application built with Next.js 15. Save, organize, and rediscover your digital content with ease.

## ✨ Features

- 🎯 **Smart Link Management** - Automatically fetch titles, descriptions, and thumbnails from URLs
- 📁 **Folder Organization** - Create custom folders with colors and icons
- 🏷️ **Tag System** - Categorize links with custom tags
- 🔍 **Powerful Search** - Search across titles, descriptions, URLs, and tags
- ⭐ **Favorites** - Mark important links for quick access
- 🌓 **Dark Mode** - Beautiful dark and light themes
- 📱 **Responsive Design** - Works perfectly on all devices
- 💾 **Local Storage** - All data stored in your browser (no account needed)
- 🔒 **Privacy First** - No external data transmission
- 🚀 **Fast Performance** - Optimized for speed with large datasets
- ☑️ **Bulk Selection** - Select multiple links for batch operations (move, favorite, delete)

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ and npm

### Installation

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 🛠️ Tech Stack

- **Framework:** Next.js 15 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **UI Components:** shadcn/ui (Radix UI)
- **State Management:** Zustand
- **Form Handling:** React Hook Form + Zod
- **Icons:** Lucide React
- **Theme:** next-themes

## 📖 Usage

### Adding a Link

1. Click the "Add Link" button in the header
2. Paste a URL - title and thumbnail will auto-populate
3. Optionally add description, folder, and tags
4. Click "Add Link" to save

### Creating Folders

1. Click "New Folder" in the sidebar
2. Enter folder name and select a color
3. Click "Create Folder"

### Searching

- Use the search bar in the header to search across all links
- Results update in real-time as you type

### Managing Links

- Click any link card to open the URL
- Click the menu icon (⋮) for additional options:
  - Select link (for bulk operations)
  - Add/Remove from favorites
  - Edit link details
  - Delete link

### Bulk Operations

- Select multiple links using the "Select" option in dropdown menus
- Use the floating bulk action bar to:
  - Select/deselect all visible links
  - Move selected links to different folders
  - Add/remove selected links from favorites
  - Delete selected links (with confirmation)
- Clear selection using the X button in the bulk bar

## 📂 Project Structure

```
linkvault/
├── app/                    # Next.js app directory
│   ├── api/               # API routes
│   │   └── fetch-metadata/
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Main page
├── components/            # React components
│   ├── common/           # Shared components
│   ├── layout/           # Layout components
│   ├── links/            # Link-related components
│   ├── modals/           # Modal dialogs
│   ├── providers/        # Context providers
│   └── ui/               # shadcn/ui components
├── store/                # Zustand state management
├── services/             # Business logic
├── utils/                # Utility functions
├── types/                # TypeScript types
└── constants/            # App constants
```

## 🔧 Configuration

### Customization

You can customize the app by modifying:

- **Design tokens:** `app/globals.css`
- **Colors:** `constants/index.ts` (FOLDER_COLORS, TAG_COLORS)
- **Platform detection:** `utils/platform.ts`
- **Storage keys:** `constants/index.ts` (STORAGE_KEYS)

## 🚀 Deployment

### Vercel (Recommended)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel
```

### Other Platforms

Build the project and deploy the `.next` folder:

```bash
npm run build
npm start
```

## 📊 Data Management

### Export Data

Your data can be exported from the Settings panel as JSON.

### Import Data

Import previously exported JSON data through the Settings panel.

### Storage

All data is stored in browser localStorage:
- Links
- Folders
- Tags
- Settings

## 🎨 Themes

LinkVault supports three theme modes:
- **Light** - Clean, bright interface
- **Dark** - Easy on the eyes
- **System** - Follows your OS preference

Toggle theme using the button in the header.

## 🐛 Known Issues

- Large images may take time to load
- Some websites block metadata fetching (CORS)
- localStorage has a ~10MB limit

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📝 License

This project is open source and available under the MIT License.

## 🙏 Acknowledgments

- Built with [Next.js](https://nextjs.org/)
- UI components from [shadcn/ui](https://ui.shadcn.com/)
- Icons by [Lucide](https://lucide.dev/)

---

Made with ❤️ by the LinkVault team
