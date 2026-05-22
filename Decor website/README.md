# Rhandzu's Decor & Dine — Website

## File Structure
```
rhandzu-decor/
├── index.html          ← Public website
├── admin.html          ← Private admin (bookmark only, not linked)
├── css/
│   └── style.css       ← All shared styles
├── js/
│   ├── feed.js         ← Gallery logic
│   └── admin.js        ← Upload & GitHub logic  ← PASTE TOKEN HERE
├── data/
│   └── posts.json      ← Auto-updated by admin uploads
├── assets/
│   └── Logo.jpg
└── images/
    └── uploads/        ← Photos land here when uploaded
```

## Admin Access
Go to: `yoursite.com/admin.html` (bookmark it, never share the link)
Password: `Rhandzu2025!` (change in js/admin.js → `attemptLogin()`)

## GitHub Token
Open `js/admin.js` and replace `PASTE_YOUR_TOKEN_HERE` with your token.
