import { describe, it, expect, beforeEach, afterEach } from 'vitest';
const DatabaseManager = require('./db.cjs');
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('DatabaseManager - Nested Collections & Tags', () => {
  const testDbPath = path.join(__dirname, 'test.db');
  let dbManager;

  beforeEach(() => {
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
    dbManager = new DatabaseManager(testDbPath);
  });

  afterEach(() => {
    if (dbManager && dbManager.db) {
      dbManager.db.close();
    }
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
  });

  describe('Nested Collections', () => {
    it('should support parentId in collections', () => {
      const parent = dbManager.saveCollection({
        id: 'parent-1',
        name: 'Parent Collection',
        type: 'custom',
        createdAt: Date.now()
      });

      const child = dbManager.saveCollection({
        id: 'child-1',
        name: 'Child Collection',
        type: 'custom',
        parentId: 'parent-1',
        createdAt: Date.now()
      });

      const collections = dbManager.getCollections();
      const savedChild = collections.find(c => c.id === 'child-1');
      expect(savedChild.parentId).toBe('parent-1');
    });

    it('should return hierarchical collections (implied by parentId)', () => {
      dbManager.saveCollection({ id: 'p1', name: 'P1', type: 'custom' });
      dbManager.saveCollection({ id: 'c1', name: 'C1', type: 'custom', parentId: 'p1' });

      const collections = dbManager.getCollections();
      expect(collections).toHaveLength(2);
    });
  });

  describe('Tags', () => {
    it('should have a tags table and support CRUD', () => {
      // These methods might not exist yet, which is the point of the failing test
      const tag = dbManager.saveTag({ id: 'tag-1', name: 'Sci-Fi', color: '#00ff00' });
      expect(tag.name).toBe('Sci-Fi');

      const tags = dbManager.getAllTags();
      expect(tags).toHaveLength(1);
      expect(tags[0].name).toBe('Sci-Fi');

      dbManager.deleteTag('tag-1');
      expect(dbManager.getAllTags()).toHaveLength(0);
    });

    it('should support book-tag relationships', () => {
      dbManager.saveBook({ id: 'book-1', title: 'Test Book' });
      dbManager.saveTag({ id: 'tag-1', name: 'Sci-Fi' });
      dbManager.saveTag({ id: 'tag-2', name: 'Adventure' });

      dbManager.addTagToBook('book-1', 'tag-1');
      dbManager.addTagToBook('book-1', 'tag-2');

      const bookTags = dbManager.getBookTags('book-1');
      expect(bookTags).toHaveLength(2);
      expect(bookTags.map(t => t.name)).toContain('Sci-Fi');
      expect(bookTags.map(t => t.name)).toContain('Adventure');

      dbManager.removeTagFromBook('book-1', 'tag-1');
      expect(dbManager.getBookTags('book-1')).toHaveLength(1);
    });
  });

  describe('Advanced Filtering', () => {
     it('should filter books by multiple criteria', () => {
        dbManager.saveBook({ id: 'b1', title: 'A', genre: 'Sci-Fi', rating: 5, lastOpened: 1000 });
        dbManager.saveBook({ id: 'b2', title: 'B', genre: 'Fantasy', rating: 4, lastOpened: 2000 });
        dbManager.saveBook({ id: 'b3', title: 'C', genre: 'Sci-Fi', rating: 3, lastOpened: 3000 });

        // searchBooks(filters)
        const results = dbManager.searchBooks({ genre: 'Sci-Fi', minRating: 4 });
        expect(results).toHaveLength(1);
        expect(results[0].id).toBe('b1');
     });
  });
});
