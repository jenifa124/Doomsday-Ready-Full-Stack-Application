require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { db, allMovies, allCinemas } = require('./src/db');
const { rewatchOrder, minimumBundles } = require('./src/logic');
const app = express();
app.use(cors());
app.use(express.json());
const fail = (res,status,code,message) => res.status(status).json({error:code,message});
const validId = x => /^\d+$/.test(String(x)) && Number(x)>0;
const validYear = x => Number.isInteger(x) && x>=1 && x<=9999;
const validRuntime = x => Number.isInteger(x) && x>=1 && x<=300;
function validPrerequisites(ids){return Array.isArray(ids)&&ids.every(validId)&&new Set(ids.map(Number)).size===ids.length;}
function ensurePrerequisites(ids, movies){return ids.every(id=>movies.some(m=>m.id===Number(id)));}
app.get('/',(req,res)=>res.send('Welcome to Doomsday Ready!'));
app.get('/api',(req,res)=>res.json({message:'Doomsday Ready API is running!'}));
app.get('/api/movies',(req,res)=>res.json(allMovies()));
app.post('/api/movies',(req,res)=>{
  const {title,releaseYear,runtime,watched=false,prerequisites=[]}=req.body||{};
  if(typeof title!=='string'||!title.trim()||!validYear(releaseYear)||!validRuntime(runtime)||typeof watched!=='boolean'||!validPrerequisites(prerequisites)) return fail(res,400,'VALIDATION_ERROR','Invalid movie fields');
  if(!ensurePrerequisites(prerequisites,allMovies()))return fail(res,400,'INVALID_PREREQUISITE','Prerequisite movie does not exist');
  try{
    const result=db.transaction(()=>{
      const info=db.prepare('INSERT INTO movies(title,releaseYear,runtime,watched) VALUES(?,?,?,?)').run(title.trim(),releaseYear,runtime,Number(watched));
      const id=Number(info.lastInsertRowid);
      for(const prerequisite of prerequisites)db.prepare('INSERT INTO prerequisites(movie_id,prerequisite_id) VALUES(?,?)').run(id,Number(prerequisite));
      rewatchOrder(id,allMovies());
      return id;
    })();
    res.status(201).json(allMovies().find(m=>m.id===result));
  }catch(err){if(err.message==='CIRCULAR_DEPENDENCY')return fail(res,409,'CIRCULAR_DEPENDENCY','Movie dependency cycle');if(err.code?.startsWith('SQLITE_CONSTRAINT_UNIQUE'))return fail(res,409,'DUPLICATE_TITLE','Movie title already exists');throw err;}
});
app.patch('/api/movies/:id',(req,res)=>{
  const id=Number(req.params.id),current=allMovies().find(m=>m.id===id);
  if(!validId(req.params.id)||!current)return fail(res,404,'NOT_FOUND','Movie not found');
  const body=req.body||{};
  if(!Object.keys(body).length||Object.keys(body).some(k=>!['title','releaseYear','runtime','watched','prerequisites'].includes(k)))return fail(res,400,'VALIDATION_ERROR','Unknown or missing update fields');
  const next={...current,...body};
  if(typeof next.title!=='string'||!next.title.trim()||!validYear(next.releaseYear)||!validRuntime(next.runtime)||typeof next.watched!=='boolean'||!validPrerequisites(next.prerequisites))return fail(res,400,'VALIDATION_ERROR','Invalid movie fields');
  if(!ensurePrerequisites(next.prerequisites,allMovies()))return fail(res,400,'INVALID_PREREQUISITE','Prerequisite movie does not exist');
  try{
    db.transaction(()=>{
      db.prepare('UPDATE movies SET title=?,releaseYear=?,runtime=?,watched=? WHERE id=?').run(next.title.trim(),next.releaseYear,next.runtime,Number(next.watched),id);
      db.prepare('DELETE FROM prerequisites WHERE movie_id=?').run(id);
      for(const prerequisite of next.prerequisites)db.prepare('INSERT INTO prerequisites(movie_id,prerequisite_id) VALUES(?,?)').run(id,Number(prerequisite));
      rewatchOrder(id,allMovies());
    })();
    res.json(allMovies().find(m=>m.id===id));
  }catch(err){if(err.message==='CIRCULAR_DEPENDENCY')return fail(res,409,'CIRCULAR_DEPENDENCY','Movie cannot depend on itself directly or indirectly');if(err.code?.startsWith('SQLITE_CONSTRAINT_UNIQUE'))return fail(res,409,'DUPLICATE_TITLE','Movie title already exists');throw err;}
});
app.get('/api/movies/:id/rewatch-order',(req,res)=>{
  const id=Number(req.params.id);
  if(!validId(req.params.id)||!allMovies().some(m=>m.id===id))return fail(res,404,'NOT_FOUND','Movie not found');
  res.json(rewatchOrder(id,allMovies()));
});
app.get('/api/cinemas',(req,res)=>res.json(allCinemas()));
app.post('/api/cinemas',(req,res)=>{
  const {name,bundleSizes}=req.body||{};
  if(typeof name!=='string'||!name.trim()||!Array.isArray(bundleSizes)||bundleSizes.length<1||bundleSizes.length>10||bundleSizes.some(s=>!Number.isInteger(s)||s<1||s>500)||new Set(bundleSizes).size!==bundleSizes.length)return fail(res,400,'VALIDATION_ERROR','Cinema needs a unique name and 1–10 distinct bundle sizes (1–500)');
  try{
    const id=db.transaction(()=>{
      const info=db.prepare('INSERT INTO cinemas(name) VALUES(?)').run(name.trim());
      for(const size of bundleSizes)db.prepare('INSERT INTO bundles(cinema_id,size) VALUES(?,?)').run(info.lastInsertRowid,size);
      return Number(info.lastInsertRowid);
    })();
    res.status(201).json(allCinemas().find(c=>c.id===id));
  }catch(err){if(err.code?.startsWith('SQLITE_CONSTRAINT_UNIQUE'))return fail(res,409,'DUPLICATE_NAME','Cinema name already exists');throw err;}
});
app.get('/api/cinemas/:id/booking',(req,res)=>{
  const cinema=allCinemas().find(c=>c.id===Number(req.params.id));
  if(!validId(req.params.id)||!cinema)return fail(res,404,'NOT_FOUND','Cinema not found');
  const raw=req.query.groupSize;
  if(typeof raw!=='string'||!/^\d+$/.test(raw)||Number(raw)<1||Number(raw)>10000)return fail(res,400,'VALIDATION_ERROR','groupSize must be an integer from 1 to 10000');
  res.json({cinemaId:cinema.id,groupSize:Number(raw),...minimumBundles(cinema.bundleSizes,Number(raw))});
});
app.use((err,req,res,next)=>{console.error(err);fail(res,500,'INTERNAL_ERROR','Unexpected server error');});
if (require.main === module) {
  const port = Number(process.env.PORT) || 5000;
  app.listen(port, () => console.log(`API running at http://localhost:${port}/api`));
}
module.exports = app;

