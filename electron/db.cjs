const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

class DatabaseManager {
  constructor(dbPath) {
    this.db = new Database(dbPath);
    this.db.pragma('journal_mode = WAL');
    this.initSchema();
  }

  initSchema() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS books (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        author TEXT,
        cover TEXT,
        cfi TEXT,
        progress REAL DEFAULT 0,
        addedAt INTEGER,
        lastOpened INTEGER,
        isFavorite INTEGER DEFAULT 0,
        genre TEXT,
        rating INTEGER DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS collections (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        type TEXT DEFAULT 'custom',
        icon TEXT,
        color TEXT,
        createdAt INTEGER,
        orderIndex INTEGER DEFAULT 0,
        parentId TEXT,
        FOREIGN KEY (parentId) REFERENCES collections (id) ON DELETE SET NULL
      );

      CREATE TABLE IF NOT EXISTS tags (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        color TEXT,
        createdAt INTEGER
      );

      CREATE TABLE IF NOT EXISTS book_tags (
        bookId TEXT,
        tagId TEXT,
        PRIMARY KEY (bookId, tagId),
        FOREIGN KEY (bookId) REFERENCES books (id) ON DELETE CASCADE,
        FOREIGN KEY (tagId) REFERENCES tags (id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS book_collections (
        bookId TEXT,
        collectionId TEXT,
        PRIMARY KEY (bookId, collectionId),
        FOREIGN KEY (bookId) REFERENCES books (id) ON DELETE CASCADE,
        FOREIGN KEY (collectionId) REFERENCES collections (id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS highlights (
        id TEXT PRIMARY KEY,
        bookId TEXT,
        cfi TEXT NOT NULL,
        text TEXT,
        color TEXT,
        note TEXT,
        createdAt INTEGER,
        FOREIGN KEY (bookId) REFERENCES books (id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT
      );
    `);
    
    // Check if parentId column exists in collections (for migration)
    const columns = this.db.prepare("PRAGMA table_info(collections)").all();
    if (!columns.find(c => c.name === 'parentId')) {
      this.db.exec("ALTER TABLE collections ADD COLUMN parentId TEXT");
    }
  }

  // --- Books ---

  getAllBooks() {
    const books = this.db.prepare('SELECT * FROM books').all();
    // Convert isFavorite back to boolean
    return books.map(b => ({ ...b, isFavorite: !!b.isFavorite }));
  }

  saveBook(book) {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO books (id, title, author, cover, cfi, progress, addedAt, lastOpened, isFavorite, genre, rating)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      book.id,
      book.title,
      book.author,
      book.cover,
      book.cfi,
      book.progress,
      book.addedAt,
      book.lastOpened,
      book.isFavorite ? 1 : 0,
      book.genre,
      book.rating
    );
    return this.getBookById(book.id);
  }

  getBookById(id) {
    const book = this.db.prepare('SELECT * FROM books WHERE id = ?').get(id);
    if (book) book.isFavorite = !!book.isFavorite;
    return book;
  }

  deleteBook(id) {
    this.db.prepare('DELETE FROM books WHERE id = ?').run(id);
  }

  updateBookProgress(id, cfi, progress) {
    this.db.prepare('UPDATE books SET cfi = ?, progress = ? WHERE id = ?').run(cfi, progress, id);
  }

  // --- Collections ---

  getCollections() {
    return this.db.prepare('SELECT * FROM collections ORDER BY orderIndex ASC').all();
  }

  saveCollection(collection) {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO collections (id, name, type, icon, color, createdAt, orderIndex, parentId)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      collection.id,
      collection.name,
      collection.type,
      collection.icon,
      collection.color,
      collection.createdAt,
      collection.orderIndex || 0,
      collection.parentId || null
    );
    return collection;
  }

  deleteCollection(id) {
    this.db.prepare('DELETE FROM collections WHERE id = ?').run(id);
  }

  // --- Tags ---

  getAllTags() {
    return this.db.prepare('SELECT * FROM tags ORDER BY name ASC').all();
  }

  saveTag(tag) {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO tags (id, name, color, createdAt)
      VALUES (?, ?, ?, ?)
    `);
    stmt.run(
      tag.id,
      tag.name,
      tag.color,
      tag.createdAt || Date.now()
    );
    return tag;
  }

  deleteTag(id) {
    this.db.prepare('DELETE FROM tags WHERE id = ?').run(id);
  }

  addTagToBook(bookId, tagId) {
    this.db.prepare('INSERT OR IGNORE INTO book_tags (bookId, tagId) VALUES (?, ?)')
      .run(bookId, tagId);
  }

  removeTagFromBook(bookId, tagId) {
    this.db.prepare('DELETE FROM book_tags WHERE bookId = ? AND tagId = ?')
      .run(bookId, tagId);
  }

  getBookTags(bookId) {
    return this.db.prepare(`
      SELECT t.* FROM tags t
      JOIN book_tags bt ON t.id = bt.tagId
      WHERE bt.bookId = ?
    `).all(bookId);
  }

  // --- Advanced Filtering ---

  searchBooks(filters = {}) {
    let query = 'SELECT * FROM books WHERE 1=1';
    const params = [];

    if (filters.genre) {
      query += ' AND genre = ?';
      params.push(filters.genre);
    }

    if (filters.minRating) {
      query += ' AND rating >= ?';
      params.push(filters.minRating);
    }

    if (filters.isFavorite !== undefined) {
      query += ' AND isFavorite = ?';
      params.push(filters.isFavorite ? 1 : 0);
    }

    if (filters.author) {
      query += ' AND author LIKE ?';
      params.push(`%${filters.author}%`);
    }

    if (filters.title) {
      query += ' AND title LIKE ?';
      params.push(`%${filters.title}%`);
    }

    const books = this.db.prepare(query).all(...params);
    return books.map(b => ({ ...b, isFavorite: !!b.isFavorite }));
  }

  // --- Book-Collection Relationships ---

  getBookCollections(bookId) {
    return this.db.prepare('SELECT collectionId FROM book_collections WHERE bookId = ?')
      .all(bookId)
      .map(r => r.collectionId);
  }

  getCollectionBookCount(collectionId) {
    const row = this.db.prepare('SELECT COUNT(*) as count FROM book_collections WHERE collectionId = ?').get(collectionId);
    return row ? row.count : 0;
  }

  addBookToCollection(bookId, collectionId) {
    this.db.prepare('INSERT OR IGNORE INTO book_collections (bookId, collectionId) VALUES (?, ?)')
      .run(bookId, collectionId);
  }

  removeBookFromCollection(bookId, collectionId) {
    this.db.prepare('DELETE FROM book_collections WHERE bookId = ? AND collectionId = ?')
      .run(bookId, collectionId);
  }

  // --- Highlights ---

  getHighlights(bookId) {
    return this.db.prepare('SELECT * FROM highlights WHERE bookId = ? ORDER BY createdAt DESC').all(bookId);
  }

  saveHighlight(highlight) {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO highlights (id, bookId, cfi, text, color, note, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      highlight.id,
      highlight.bookId,
      highlight.cfi,
      highlight.text,
      highlight.color,
      highlight.note,
      highlight.createdAt
    );
    return highlight;
  }

  deleteHighlight(id) {
    this.db.prepare('DELETE FROM highlights WHERE id = ?').run(id);
  }

  // --- Settings ---

  getSetting(key) {
    const row = this.db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
    return row ? JSON.parse(row.value) : null;
  }

  setSetting(key, value) {
    this.db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)')
      .run(key, JSON.stringify(value));
  }

  // --- Batch ---

  batchInsertBooks(books) {
    const insert = this.db.prepare(`
      INSERT OR REPLACE INTO books (id, title, author, cover, cfi, progress, addedAt, lastOpened, isFavorite, genre, rating)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertMany = this.db.transaction((books) => {
      for (const book of books) {
        insert.run(
          book.id,
          book.title,
          book.author,
          book.cover,
          book.cfi,
          book.progress,
          book.addedAt,
          book.lastOpened,
          book.isFavorite ? 1 : 0,
          book.genre,
          book.rating
        );
      }
    });

    insertMany(books);
  }
}

module.exports = DatabaseManager;
