import { NextRequest } from 'next/server';
import { db, docToObject } from '@/backend/config/firebase';
import { verifyVendorAuth } from '@/backend/utils/vendorAuth';
import {
  sendSuccess,
  sendError,
  sendUnauthorized,
  sendForbidden,
  sendServerError,
} from '@/backend/utils/responseAppRouter';

// ─── GET /api/vendor/archives ───────────────────────────────────────────────
// Returns archived stories, posts, and products for the authenticated vendor
export async function GET(req: NextRequest) {
  const auth = await verifyVendorAuth(req);
  if (auth.error) {
    return auth.error.includes('Access denied')
      ? sendForbidden(auth.error)
      : sendUnauthorized(auth.error);
  }

  const userId = auth.userId!;

  try {
    // 1. Fetch archived stories
    const storiesSnap = await db.collection('stories')
      .where('author.id', '==', userId)
      .where('status', '==', 'archived')
      .get();
    const stories = storiesSnap.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        itemType: 'story' as const,
        title: data.caption || 'Archived Story',
        mediaUrls: data.mediaUrls || [],
        mediaTypes: data.mediaTypes || [],
        thumbnail: data.mediaUrls?.[0] || null,
        status: data.status,
        viewsCount: data.viewedBy?.length || 0,
        createdAt: data.createdAt ? new Date(data.createdAt).toISOString() : null,
        updatedAt: data.updatedAt ? new Date(data.updatedAt).toISOString() : null,
      };
    });

    // 2. Fetch archived posts
    const postsSnap = await db.collection('posts')
      .where('authorId', '==', userId)
      .where('status', '==', 'archived')
      .get();
    const posts = postsSnap.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        itemType: 'post' as const,
        title: data.caption || data.title || 'Archived Post',
        mediaUrls: data.images || data.mediaUrls || [],
        thumbnail: data.images?.[0] || data.mediaUrls?.[0] || null,
        status: data.status,
        likesCount: data.likesCount || data.likes?.length || 0,
        commentsCount: data.commentsCount || 0,
        createdAt: data.createdAt ? new Date(data.createdAt).toISOString() : null,
        updatedAt: data.updatedAt ? new Date(data.updatedAt).toISOString() : null,
      };
    });

    // 3. Fetch archived/inactive products
    const productsSnap = await db.collection('products')
      .where('vendorId', '==', userId)
      .where('status', 'in', ['archived', 'inactive'])
      .get();
    const products = productsSnap.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        itemType: 'product' as const,
        title: data.name || 'Archived Product',
        category: data.category || 'General',
        price: data.price || 0,
        thumbnail: data.images?.[0] || null,
        status: data.status,
        stock: data.stock || 0,
        createdAt: data.createdAt ? new Date(data.createdAt).toISOString() : null,
        updatedAt: data.updatedAt ? new Date(data.updatedAt).toISOString() : null,
      };
    });

    return sendSuccess({
      stories,
      posts,
      products,
      counts: {
        stories: stories.length,
        posts: posts.length,
        products: products.length,
        total: stories.length + posts.length + products.length,
      },
    }, 'Archives fetched successfully');
  } catch (err) {
    console.error('[Vendor Archives GET Error]', err);
    return sendServerError('Failed to fetch archives');
  }
}

// ─── PATCH /api/vendor/archives ──────────────────────────────────────────────
// Restore or permanently delete an archived item
export async function PATCH(req: NextRequest) {
  const auth = await verifyVendorAuth(req);
  if (auth.error) {
    return auth.error.includes('Access denied')
      ? sendForbidden(auth.error)
      : sendUnauthorized(auth.error);
  }

  const userId = auth.userId!;

  try {
    const body = await req.json().catch(() => ({}));
    const { itemType, itemId, action } = body as {
      itemType?: 'story' | 'post' | 'product';
      itemId?: string;
      action?: 'restore' | 'delete';
    };

    if (!itemType || !itemId || !action) {
      return sendError('itemType, itemId, and action are required', 400);
    }

    const collectionMap = {
      story: 'stories',
      post: 'posts',
      product: 'products',
    };

    const collectionName = collectionMap[itemType];
    if (!collectionName) {
      return sendError('Invalid itemType. Must be story, post, or product', 400);
    }

    const docRef = db.collection(collectionName).doc(itemId);
    const snap = await docRef.get();
    if (!snap.exists) {
      return sendError('Item not found', 404);
    }

    const data = snap.data()!;
    // Ownership check
    const ownerId = data.vendorId || data.authorId || data.author?.id;
    if (ownerId !== userId && auth.user?.role !== 'admin') {
      return sendForbidden('You do not have permission to modify this item');
    }

    if (action === 'delete') {
      await docRef.delete();
      return sendSuccess({ id: itemId, itemType, deleted: true }, 'Item deleted permanently');
    }

    if (action === 'restore') {
      const activeStatus = itemType === 'product' ? 'active' : 'published';
      await docRef.update({
        status: activeStatus,
        updatedAt: new Date().toISOString(),
      });
      return sendSuccess(
        { id: itemId, itemType, status: activeStatus },
        `Item restored to active ${itemType}s`
      );
    }

    return sendError('Invalid action. Must be restore or delete', 400);
  } catch (err) {
    console.error('[Vendor Archives PATCH Error]', err);
    return sendServerError('Failed to update archived item');
  }
}

