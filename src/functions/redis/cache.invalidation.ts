import { cacheService } from "./cache.service.fun";

export async function invalidateUserProjectsCache(userId: number | string | undefined): Promise<void> {
     if (userId === undefined || userId === null) return;
     try {
          const cache: cacheService = new cacheService();
          const userProjectsPattern = `*projects:${userId}:*`;
          await cache.deleteByPattern(userProjectsPattern);
     } catch (error) {
          console.error('❌ Failed to invalidate user projects cache:', error);
     }
}
