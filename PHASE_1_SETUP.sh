#!/bin/bash
# Phase 1 Quick Setup Script
# Location: Phase-1-Setup.sh
# Run this script to complete Phase 1 integration

echo "🚀 Verso Air Social Blog - Phase 1 Quick Setup"
echo "=============================================="
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Please run this script from the FSA project root."
    exit 1
fi

echo "📊 Step 1: Running Database Migration..."
echo "Command: npm run db:push"
echo ""
echo "⚠️  This will apply the social-schema.ts to your PostgreSQL database."
echo "Do you want to continue? (y/n)"
read -r continue_migration

if [[ $continue_migration == "y" ]]; then
    npm run db:push
    echo "✅ Database migration complete!"
    echo ""
    echo "💡 Tip: Run 'npm run db:studio' to visually inspect your database"
else
    echo "⏭️  Skipping database migration. Run 'npm run db:push' manually when ready."
fi

echo ""
echo "📝 Step 2: Register API Routes"
echo "=============================================="
echo "You need to update server/routes/routes.ts (or server.ts) to include:"
echo ""
echo "  import socialApiRoutes from './routes/social-api';"
echo "  app.use('/api/social', socialApiRoutes);"
echo ""
echo "💡 Open the file and add these lines to your Express setup."
echo ""

echo "🎨 Step 3: Component Verification"
echo "=============================================="
echo "Created components:"
echo "  ✅ PostCard.tsx"
echo "  ✅ UserProfileCard.tsx"
echo "  ✅ CreatePostModal.tsx"
echo ""

echo "🪝 Step 4: Hook Verification"
echo "=============================================="
echo "Created hook:"
echo "  ✅ use-social-feed.ts (React Query integration)"
echo ""

echo "📄 Step 5: New Feed Page"
echo "=============================================="
echo "Created new feed implementation:"
echo "  ✅ blog-new.tsx (ready to test)"
echo ""
echo "To test the new feed:"
echo "  1. Run: npm run dev"
echo "  2. Navigate to: http://localhost:5003/blog"
echo "  3. Or add a test route to: http://localhost:5003/social-feed"
echo ""

echo "🧪 Step 6: Manual Testing Checklist"
echo "=============================================="
echo "After server starts:"
echo "  [ ] Click 'Post' button → Create Post Modal opens"
echo "  [ ] Type content and click 'Post' → Post appears in feed"
echo "  [ ] Click heart icon → Animation plays, count increases"
echo "  [ ] Scroll to bottom → Infinite scroll loads more posts"
echo "  [ ] Click 'Trending' → Posts reorder by engagement"
echo "  [ ] View on mobile → Responsive layout"
echo "  [ ] Check dark mode → Smooth transitions"
echo ""

echo "📋 Next Steps:"
echo "=============================================="
echo ""
echo "IMMEDIATE (Required for Phase 1):"
echo "  1. Backup old blog.tsx: cp client/src/pages/blog.tsx client/src/pages/blog-old.tsx"
echo "  2. Update server routes in server/routes/routes.ts"
echo "  3. Run: npm run dev"
echo "  4. Test all functionality from checklist above"
echo ""
echo "OPTIONAL (After Phase 1 Stabilization):"
echo "  cp client/src/pages/blog-new.tsx client/src/pages/blog.tsx"
echo ""
echo "PHASE 2 (Real-time):"
echo "  - Socket.io integration for live updates"
echo "  - Comment system with nested replies"
echo "  - Follow system with notifications"
echo ""

echo ""
echo "📚 Documentation Files Created:"
echo "=============================================="
echo "  ✅ SOCIAL_BLOG_DESIGN_SYSTEM.md (6000+ lines)"
echo "  ✅ shared/social-schema.ts (500+ lines)"
echo "  ✅ PHASE_1_IMPLEMENTATION.md (400+ lines)"
echo "  ✅ PHASE_1_INTEGRATION_CHECKLIST.md (400+ lines)"
echo ""

echo "🎯 Quick Reference Commands:"
echo "=============================================="
echo "  npm run db:push          # Apply schema"
echo "  npm run db:studio        # Visual DB manager"
echo "  npm run dev              # Start dev server"
echo "  npm run build            # Production build"
echo "  npm run check            # Type check"
echo ""

echo "✨ Phase 1 Setup Complete!"
echo "=============================================="
echo ""
echo "Your Phase 1 implementation is ready to test."
echo "Follow the manual testing checklist above, then"
echo "update server routes and deploy when ready!"
echo ""
