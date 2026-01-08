# PWA Icons Creation Guide

The attendance system requires two icon sizes for PWA functionality:

## Required Icons:
- `icon-192.png` (192x192 pixels)
- `icon-512.png` (512x512 pixels)

## How to Create Icons:

### Option 1: Online Tool
1. Go to https://realfavicongenerator.net/ or https://www.favicon-generator.org/
2. Upload your logo/icon image
3. Generate PWA icons
4. Download and place in `/public` folder

### Option 2: Design Software
1. Use Figma, Photoshop, or Canva
2. Create a square design (512x512px recommended)
3. Use your brand colors (#3b82f6 for theme)
4. Export as:
   - 192x192px → icon-192.png
   - 512x512px → icon-512.png
5. Place files in `/public` folder

### Option 3: Simple Placeholder (Temporary)
Use a solid color square with text:
- Background: #3b82f6 (blue)
- Text: "A" or your company initial
- Font: Bold, white color

## Quick Command (if you have ImageMagick):
```bash
# Create simple blue icon with "A" text
convert -size 512x512 xc:#3b82f6 -gravity center -pointsize 300 -fill white -annotate +0+0 "A" public/icon-512.png
convert -size 192x192 xc:#3b82f6 -gravity center -pointsize 120 -fill white -annotate +0+0 "A" public/icon-192.png
```

## Current Status:
Icons are referenced in:
- `/public/manifest.json`
- `/app/layout.tsx` (apple-touch-icon)

Place your icon files in the `/public` folder with the exact names above.
