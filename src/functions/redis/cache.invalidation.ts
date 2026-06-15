import { cacheService } from "./cache.service.fun";

export async function invalidateSearchCache(): Promise<void> {
     try {
          const cache: cacheService = new cacheService();
          const searchCachePattern = `*${process.env.searchPropertyCache}*`;
          await cache.deleteByPattern(searchCachePattern);
     } catch (error) {
          console.error('❌ Failed to invalidate search cache:', error);
     }
}
