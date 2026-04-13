/**
 * @module lib/storage/cache
 * @description IndexedDB LRU 缓存管理器。
 *              基于浏览器 IndexedDB 实现最近最少使用（LRU）缓存策略。
 *              支持可选的 TTL（生存时间）、自动淘汰和缓存用量统计。
 *              适用于客户端缓存场景，如图片缩略图、频繁访问的剪贴板内容等。
 * @author ClipSync Team
 * @created 2026-04-12
 */

/**
 * 缓存条目接口。
 *
 * @interface CacheEntry
 * @property value - 缓存的值，支持任意类型
 * @property expiresAt - 过期时间戳（毫秒），null 表示永不过期
 * @property lastAccessed - 最后访问时间戳（毫秒），用于 LRU 淘汰策略
 * @property size - 缓存条目的大小估算（字节）
 */
interface CacheEntry {
  value: unknown;
  expiresAt: number | null;
  lastAccessed: number;
  size: number;
}

/**
 * IndexedDB LRU 缓存管理器。
 *
 * 使用 IndexedDB 作为底层存储，实现基于最近最少使用（LRU）策略的缓存管理。
 * 支持以下功能：
 * - 键值对存储与检索
 * - 可选的 TTL（生存时间）过期机制
 * - 基于访问时间的 LRU 淘汰策略
 * - 缓存用量统计
 * - 按需淘汰以释放空间
 *
 * @example
 * ```ts
 * const cache = new LRUCache();
 * await cache.set("user-avatar", blob, 3600000); // 缓存 1 小时
 * const avatar = await cache.get<Blob>("user-avatar");
 * ```
 */
export class LRUCache {
  /** IndexedDB 数据库名称 */
  private readonly dbName: string = "clipsync-cache";

  /** IndexedDB 对象存储名称 */
  private readonly storeName: string = "cache";

  /** 缓存最大容量（字节），默认 100MB */
  private readonly maxSize: number;

  /** 数据库版本号 */
  private readonly dbVersion: number = 1;

  /** 数据库实例缓存 */
  private dbPromise: Promise<IDBDatabase> | null = null;

  /**
   * 创建 LRUCache 实例。
   *
   * @param maxSize - 缓存最大容量（字节），默认为 104857600（100MB）
   */
  constructor(maxSize: number = 104857600) {
    this.maxSize = maxSize;
  }

  /**
   * 获取或创建 IndexedDB 数据库连接。
   *
   * 使用单例模式确保只创建一个数据库连接。
   * 如果数据库或对象存储不存在，将自动创建。
   *
   * @returns IndexedDB 数据库实例的 Promise
   */
  private getDB(): Promise<IDBDatabase> {
    if (!this.dbPromise) {
      this.dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open(this.dbName, this.dbVersion);

        request.onupgradeneeded = () => {
          const db = request.result;
          if (!db.objectStoreNames.contains(this.storeName)) {
            const store = db.createObjectStore(this.storeName, {
              keyPath: "key",
            });
            store.createIndex("lastAccessed", "lastAccessed", {
              unique: false,
            });
          }
        };

        request.onsuccess = () => {
          resolve(request.result);
        };

        request.onerror = () => {
          reject(
            new Error(`Failed to open IndexedDB: ${request.error?.message}`)
          );
        };
      });
    }

    return this.dbPromise;
  }

  /**
   * 估算值的字节大小。
   *
   * 对于字符串类型使用 UTF-8 编码估算，其他类型使用 JSON 序列化后的大小。
   *
   * @param value - 需要估算大小的值
   * @returns 估算的字节大小
   */
  private estimateSize(value: unknown): number {
    if (typeof value === "string") {
      // UTF-8 编码：每个字符最多 4 字节，这里简单估算
      return new Blob([value]).size;
    }
    if (value instanceof Blob) {
      return value.size;
    }
    if (value instanceof ArrayBuffer) {
      return value.byteLength;
    }
    // 对于其他类型，使用 JSON 序列化后的大小
    const json = JSON.stringify(value);
    return new Blob([json]).size;
  }

  /**
   * 将键值对存入缓存。
   *
   * 如果设置了 TTL，缓存条目将在指定时间后自动过期。
   * 存入前会检查缓存容量，必要时淘汰旧条目以腾出空间。
   *
   * @param key - 缓存键名
   * @param value - 缓存值，支持任意可序列化的类型
   * @param ttl - 可选的生存时间（毫秒），不设置则永不过期
   * @returns Promise，在存储完成后 resolve
   *
   * @example
   * ```ts
   * await cache.set("clip-data", { id: 1, content: "hello" }, 60000);
   * // 60 秒后过期
   * ```
   */
  async set(key: string, value: unknown, ttl?: number): Promise<void> {
    const db = await this.getDB();
    const size = this.estimateSize(value);

    // 检查是否需要淘汰旧条目
    await this.evict(size);

    const entry: CacheEntry = {
      value,
      expiresAt: ttl ? Date.now() + ttl : null,
      lastAccessed: Date.now(),
      size,
    };

    return new Promise<void>((resolve, reject) => {
      const transaction = db.transaction([this.storeName], "readwrite");
      const store = transaction.objectStore(this.storeName);
      const request = store.put({ key, ...entry });

      request.onsuccess = () => resolve();
      request.onerror = () =>
        reject(new Error(`Failed to set cache entry: ${request.error?.message}`));
    });
  }

  /**
   * 从缓存中获取值。
   *
   * 如果条目已过期或不存在，返回 null。
   * 获取成功时会更新最后访问时间，以维持 LRU 顺序。
   *
   * @typeParam T - 返回值的类型
   * @param key - 缓存键名
   * @returns 缓存的值，如果过期或不存在则返回 null
   *
   * @example
   * ```ts
   * const data = await cache.get<{ id: number }>("clip-data");
   * if (data) {
   *   console.log(data.id);
   * }
   * ```
   */
  async get<T>(key: string): Promise<T | null> {
    const db = await this.getDB();

    return new Promise<T | null>((resolve, reject) => {
      const transaction = db.transaction([this.storeName], "readwrite");
      const store = transaction.objectStore(this.storeName);
      const request = store.get(key);

      request.onsuccess = () => {
        const result = request.result;

        if (!result) {
          resolve(null);
          return;
        }

        const entry = result as CacheEntry & { key: string };

        // 检查是否过期
        if (entry.expiresAt !== null && Date.now() > entry.expiresAt) {
          // 删除过期条目
          store.delete(key);
          resolve(null);
          return;
        }

        // 更新最后访问时间（LRU）
        entry.lastAccessed = Date.now();
        store.put({ ...entry, key });

        resolve(entry.value as T);
      };

      request.onerror = () =>
        reject(new Error(`Failed to get cache entry: ${request.error?.message}`));
    });
  }

  /**
   * 从缓存中删除指定键的条目。
   *
   * @param key - 要删除的缓存键名
   * @returns Promise，在删除完成后 resolve
   *
   * @example
   * ```ts
   * await cache.delete("clip-data");
   * ```
   */
  async delete(key: string): Promise<void> {
    const db = await this.getDB();

    return new Promise<void>((resolve, reject) => {
      const transaction = db.transaction([this.storeName], "readwrite");
      const store = transaction.objectStore(this.storeName);
      const request = store.delete(key);

      request.onsuccess = () => resolve();
      request.onerror = () =>
        reject(
          new Error(`Failed to delete cache entry: ${request.error?.message}`)
        );
    });
  }

  /**
   * 清空所有缓存条目。
   *
   * 删除缓存对象存储中的所有数据，释放全部缓存空间。
   *
   * @returns Promise，在清空完成后 resolve
   *
   * @example
   * ```ts
   * await cache.clear();
   * ```
   */
  async clear(): Promise<void> {
    const db = await this.getDB();

    return new Promise<void>((resolve, reject) => {
      const transaction = db.transaction([this.storeName], "readwrite");
      const store = transaction.objectStore(this.storeName);
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () =>
        reject(new Error(`Failed to clear cache: ${request.error?.message}`));
    });
  }

  /**
   * 获取当前缓存的使用量。
   *
   * 遍历所有缓存条目，累加其大小估算值，返回总字节数。
   *
   * @returns 当前缓存使用的总字节数
   *
   * @example
   * ```ts
   * const usage = await cache.getUsage();
   * console.log(`Cache usage: ${(usage / 1024 / 1024).toFixed(2)} MB`);
   * ```
   */
  async getUsage(): Promise<number> {
    const db = await this.getDB();

    return new Promise<number>((resolve, reject) => {
      const transaction = db.transaction([this.storeName], "readonly");
      const store = transaction.objectStore(this.storeName);
      const request = store.openCursor();

      let totalSize = 0;

      request.onsuccess = () => {
        const cursor = request.result;
        if (cursor) {
          const entry = cursor.value as CacheEntry;
          totalSize += entry.size || 0;
          cursor.continue();
        } else {
          resolve(totalSize);
        }
      };

      request.onerror = () =>
        reject(new Error(`Failed to get cache usage: ${request.error?.message}`));
    });
  }

  /**
   * 淘汰最旧的缓存条目以释放空间。
   *
   * 按照 LRU 策略，从最久未访问的条目开始淘汰，
   * 直到释放足够的字节空间或缓存为空。
   * 如果当前缓存使用量加上需要的空间不超过最大容量，则不执行淘汰。
   *
   * @param neededBytes - 需要释放的字节数（新条目的大小）
   * @returns Promise，在淘汰完成后 resolve
   *
   * @example
   * ```ts
   * await cache.evict(5242880); // 确保至少有 5MB 可用空间
   * ```
   */
  async evict(neededBytes: number): Promise<void> {
    const currentUsage = await this.getUsage();

    // 如果当前使用量加上需要的空间不超过最大容量，无需淘汰
    if (currentUsage + neededBytes <= this.maxSize) {
      return;
    }

    const db = await this.getDB();

    return new Promise<void>((resolve, reject) => {
      const transaction = db.transaction([this.storeName], "readwrite");
      const store = transaction.objectStore(this.storeName);
      const index = store.index("lastAccessed");
      const request = index.openCursor();

      let freedBytes = 0;
      const targetFreed = currentUsage + neededBytes - this.maxSize;

      request.onsuccess = () => {
        const cursor = request.result;

        // 已释放足够空间或没有更多条目
        if (!cursor || freedBytes >= targetFreed) {
          resolve();
          return;
        }

        const entry = cursor.value as CacheEntry;
        freedBytes += entry.size || 0;
        cursor.delete();
        cursor.continue();
      };

      request.onerror = () =>
        reject(new Error(`Failed to evict cache entries: ${request.error?.message}`));
    });
  }
}
