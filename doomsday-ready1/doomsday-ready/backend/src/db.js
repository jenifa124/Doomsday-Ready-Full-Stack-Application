const Database = require('better-sqlite3');
const path = require('path');
const db = new Database(process.env.DB_PATH || path.join(__dirname, '..', 'doomsday.sqlite'));
db.pragma('foreign_keys = ON');
db.exec(`
CREATE TABLE IF NOT EXISTS movies (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL UNIQUE COLLATE NOCASE, releaseYear INTEGER NOT NULL, runtime INTEGER NOT NULL, watched INTEGER NOT NULL DEFAULT 0);
CREATE TABLE IF NOT EXISTS prerequisites (movie_id INTEGER NOT NULL REFERENCES movies(id) ON DELETE CASCADE, prerequisite_id INTEGER NOT NULL REFERENCES movies(id) ON DELETE CASCADE, PRIMARY KEY(movie_id, prerequisite_id));
CREATE TABLE IF NOT EXISTS cinemas (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL UNIQUE COLLATE NOCASE);
CREATE TABLE IF NOT EXISTS bundles (cinema_id INTEGER NOT NULL REFERENCES cinemas(id) ON DELETE CASCADE, size INTEGER NOT NULL, PRIMARY KEY(cinema_id,size));
`);
function allMovies(){return db.prepare('SELECT * FROM movies ORDER BY id').all().map(m=>({...m,watched:!!m.watched,prerequisites:db.prepare('SELECT prerequisite_id FROM prerequisites WHERE movie_id=? ORDER BY prerequisite_id').all(m.id).map(x=>x.prerequisite_id)}));}
function allCinemas(){return db.prepare('SELECT * FROM cinemas ORDER BY id').all().map(c=>({...c,bundleSizes:db.prepare('SELECT size FROM bundles WHERE cinema_id=? ORDER BY size').all(c.id).map(x=>x.size)}));}
module.exports={db,allMovies,allCinemas};
