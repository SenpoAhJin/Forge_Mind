# PHOTOS Progress

## Status
**BACKEND PARTIAL - context limit at step 2d (78k remaining)**

## Completed
- Step 0: State check ✓
- Step 1a: Migration 018_listing_photos ✓ (committed 3ca4ef9)
- Step 1b: photoLimits.ts, photosRouter.ts (POST /photos, DELETE /photos/:id), multer installed ✓ (committed 5a72eec with fixes)
- Step 2a: POST /marketplace/listings accepts photo_ids, validates ownership, attaches in transaction ✓
- Step 2b PARTIAL: GET /marketplace/listings/:id and GET /listings/mine return photos ✓; GET /listings (browse) NOT YET DONE
- Step 2c PARTIAL: DELETE /photos/:id deletes file ✓; DELETE /listings/:id file cleanup NOT YET DONE

## Next Steps (remaining backend work)
- Step 2b: Update GET /marketplace/listings (browse) to load and return photos
- Step 2c: Update DELETE /marketplace/listings/:id to delete photo files and rows
- Step 2d: 24h cleanup timer (photoCleanup module)
- Step 2e: Typecheck, commit
- Step 3: scripts/verify_photos.ps1

## Files Changed
Backend:
- migrations/018_listing_photos.js (committed 3ca4ef9)
- src/marketplace/photoLimits.ts (committed 5a72eec)
- src/marketplace/photosRouter.ts (committed 5a72eec)
- src/marketplace/listings.ts (committed latest)
- src/marketplace/listingsRouter.ts (committed latest)
- INDEX_TS_CHANGES.md (manual instructions for protected file)

## Manual Actions Required
Apply changes from INDEX_TS_CHANGES.md to src/index.ts:
1. Add imports for photosRouter and path
2. Mount photosRouter before marketplaceRouter (line ~121)
3. Serve /uploads with static handler (line ~123)

OR test through temporary test server (if index.ts not mounted yet)

## Commits
- 3ca4ef9 feat(marketplace): add listing_photos table migration
- 5a72eec feat(marketplace): add photo upload endpoint and limits
- (latest) feat(marketplace): accept photo_ids in POST listings, return photos in GET

## Notes
- photo_ids validated: max 5, no duplicates, pending and owned
- Photos attached in order (position 0 = cover)
- toPublicListing/toOwnerListing updated to accept photos array parameter
- Non-active listings return photos: [] to other users, full array to owner
- sendListing made async to load photos
- GET /mine returns photos ✓
- GET /:id returns photos ✓
- GET / (browse) photos loading TODO
- DELETE cleanup TODO
