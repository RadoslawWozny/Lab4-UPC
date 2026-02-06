
const express = require('express');
const cors = require('cors');
const path = require('path');
const multer = require('multer');

const app = express();
const port = 5000;

app.use(cors());
app.use(express.json());


const COVERS_DIR = path.join(__dirname, 'public', 'covers');

app.use('/covers', express.static(COVERS_DIR));

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, COVERS_DIR),
  filename: (req, file, cb) => {
    const safeName = file.originalname.replace(/\s+/g, '_');
    const timestamp = Date.now();
    cb(null, `${timestamp}_${safeName}`);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 } 
});

app.post('/upload-cover', upload.single('cover'), (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'Brak pliku' });
  const filename = req.file.filename;
  const coverUrl = `${req.protocol}://${req.get('host')}/covers/${encodeURIComponent(filename)}`;
  res.json({ filename, coverUrl });
});

const albums = [
  { id: 1, band: "Metallica", title: "Master of Puppets", year: 1986, genre: "Thrash Metal", cover: null },
  { id: 2, band: "Metallica", title: "Ride the Lightning", year: 1984, genre: "Thrash Metal", cover: null },
  { id: 3, band: "AC/DC", title: "Back in Black", year: 1980, genre: "Hard Rock", cover: null }
];

function withCoverUrl(req, album) {
  if (!album.cover) return { ...album, coverUrl: null };
  return { ...album, coverUrl: `${req.protocol}://${req.get('host')}/covers/${encodeURIComponent(album.cover)}` };
}

app.get('/albums', (req, res) => {
  const { band, genre } = req.query;
  let result = albums.slice();
  if (band) result = result.filter(a => a.band.toLowerCase().includes(band.toLowerCase()));
  if (genre) result = result.filter(a => a.genre && a.genre.toLowerCase().includes(genre.toLowerCase()));
  res.json(result.map(a => withCoverUrl(req, a)));
});

app.get('/albums/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const album = albums.find(a => a.id === id);
  if (!album) return res.status(404).json({ message: 'Album nie znaleziony.' });
  res.json(withCoverUrl(req, album));
});

app.post('/albums', (req, res) => {
  const { band, title, year, genre, cover } = req.body;
  if (!band || !title || !year || !genre) {
    return res.status(400).json({ message: 'Brak wymaganych danych (band, title, year, genre).' });
  }
  const newAlbum = { id: albums.length + 1, band, title, year, genre, cover: cover || null };
  albums.push(newAlbum);
  res.status(201).json(withCoverUrl(req, newAlbum));
});

app.put('/albums/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const { band, title, year, genre, cover } = req.body;
  const album = albums.find(a => a.id === id);
  if (!album) return res.status(404).json({ message: 'Album nie znaleziony.' });
  if (band) album.band = band;
  if (title) album.title = title;
  if (year) album.year = year;
  if (genre) album.genre = genre;
  if (cover !== undefined) album.cover = cover;
  res.json(withCoverUrl(req, album));
});

app.delete('/albums/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const idx = albums.findIndex(a => a.id === id);
  if (idx === -1) return res.status(404).json({ message: 'Album nie znaleziony.' });
  albums.splice(idx, 1);
  res.json({ message: 'Album usunięty.' });
});


app.listen(port, () => console.log(`Serwer działa na http://localhost:${port}`));
