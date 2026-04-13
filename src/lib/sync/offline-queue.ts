/**
 * @module lib/sync/offline-queue
 * @description 基于 IndexedDB 的离线操作队列。
 *              当设备处于离线状态时，所有对剪贴板的 create / update / delete 操作
 *              会被暂存到 IndexedDB 中。网络恢复后，通过 {@link dequeueAll} 取出
 *              并批量重放到服务端，确保数据最终一致性。
 * @author ClipSync Team
 * @created 2026-04-12
 */

// ── Types ────────────────────────────────────────────────────────────────────

/**
 * 离线队列中每条待同步操作的描述。
 *
 * @property type - 操作类型：创建、更新或删除
 * @property data - 操作关联的数据负载，具体结构取决于操作类型
 */
export interface PendingAction {
  /** 操作类型 */
  type: "create" | "update" | "delete";
  /** 操作数据负载 */
  data: unknown;
}

// ── Constants ────────────────────────────────────────────────────────────────

/** IndexedDB 数据库名称 */
const DB_NAME = "clipsync-offline";

/** IndexedDB 对象存储名称 */
const STORE_NAME = "pending-actions";

/** 数据库版本号 */
const DB_VERSION = 1;

// ── Class ────────────────────────────────────────────────────────────────────

/**
 * 离线操作队列。
 *
 * 使用浏览器原生 IndexedDB API 实现持久化存储。队列采用 FIFO（先进先出）策略，
 * 通过自增主键保证操作顺序。主要功能包括：
 *
 * - {@link enqueue} — 将操作追加到队列末尾
 * - {@link dequeueAll} — 取出并清空所有待同步操作
 * - {@link getCount} — 查询当前队列长度
 * - {@link clear} — 清空整个队列
 *
 * @example
 * ```ts
 * const queue = new OfflineQueue();
 *
 * // 离线时暂存操作
 * await queue.enqueue({ type: "create", data: { title: "Hello" } });
 *
 * // 网络恢复后批量取出
 * const actions = await queue.dequeueAll();
 * for (const action of actions) {
 *   await replayToServer(action);
 * }
 * ```
 */
export class OfflineQueue {
  // ── Private helpers ──────────────────────────────────────────────────────

  /**
   * 打开或创建 IndexedDB 数据库。
   *
   * 如果数据库不存在则自动创建，并建立 `pending-actions` 对象存储。
   * 使用自增的 `id` 键作为主键，保证入队顺序。
   *
   * @returns 已打开的 {@link IDBDatabase} 实例
   * @throws {Error} 当数据库打开失败时抛出异常
   */
  private openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: "id", autoIncrement: true });
        }
      };

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        reject(new Error(`Failed to open IndexedDB "${DB_NAME}": ${request.error?.message}`));
      };
    });
  }

  // ── Public API ───────────────────────────────────────────────────────────

  /**
   * 将一条操作追加到离线队列末尾。
   *
   * 操作会以自增主键存储到 IndexedDB 中，保证 FIFO 顺序。
   * 适用于设备离线时暂存用户对剪贴板的增删改操作。
   *
   * @param action - 待入队的操作，包含操作类型和数据负载
   * @returns Promise<void>，无返回值
   *
   * @example
   * ```ts
   * await queue.enqueue({ type: "create", data: { content: "copied text" } });
   * await queue.enqueue({ type: "delete", data: { id: "clip-123" } });
   * ```
   */
  async enqueue(action: PendingAction): Promise<void> {
    const db = await this.openDB();

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const request = store.add(action);

      request.onsuccess = () => resolve();
      request.onerror = () => {
        reject(new Error(`Failed to enqueue action: ${request.error?.message}`));
      };

      tx.oncomplete = () => db.close();
    });
  }

  /**
   * 取出并清空所有待同步操作。
   *
   * 以只读事务读取全部操作，然后以读写事务清空对象存储。
   * 返回的操作数组按入队顺序排列（FIFO）。
   * 通常在网络恢复后调用，将操作批量重放到服务端。
   *
   * @returns 所有待同步操作的数组，队列为空时返回空数组
   *
   * @example
   * ```ts
   * const pendingActions = await queue.dequeueAll();
   * console.log(`需要重放 ${pendingActions.length} 条操作`);
   * ```
   */
  async dequeueAll(): Promise<PendingAction[]> {
    const db = await this.openDB();

    // 读取所有操作
    const actions = await new Promise<PendingAction[]>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result as PendingAction[]);
      request.onerror = () => {
        reject(new Error(`Failed to read queue: ${request.error?.message}`));
      };

      tx.oncomplete = () => db.close();
    });

    // 清空队列
    await this.clear();

    return actions;
  }

  /**
   * 获取当前队列中待同步操作的数量。
   *
   * 可用于 UI 展示离线待同步条数，或在网络恢复时判断是否需要触发重放。
   *
   * @returns 队列中的操作数量
   *
   * @example
   * ```ts
   * const count = await queue.getCount();
   * if (count > 0) {
   *   console.log(`有 ${count} 条离线操作待同步`);
   * }
   * ```
   */
  async getCount(): Promise<number> {
    const db = await this.openDB();

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const request = store.count();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => {
        reject(new Error(`Failed to count queue: ${request.error?.message}`));
      };

      tx.oncomplete = () => db.close();
    });
  }

  /**
   * 清空离线队列中的所有操作。
   *
   * 删除 `pending-actions` 对象存储中的全部记录。
   * 通常在操作已被成功重放到服务端后调用。
   *
   * @returns Promise<void>，无返回值
   *
   * @example
   * ```ts
   * await queue.clear();
   * console.log("离线队列已清空");
   * ```
   */
  async clear(): Promise<void> {
    const db = await this.openDB();

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => {
        reject(new Error(`Failed to clear queue: ${request.error?.message}`));
      };

      tx.oncomplete = () => db.close();
    });
  }
}
