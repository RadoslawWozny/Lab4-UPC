
import React, { useState, useEffect } from "react";


export default function App() {
  const API_BASE = "http://localhost:5000";

  const [albums, setAlbums] = useState([]);
  const [band, setBand] = useState("");
  const [genre, setGenre] = useState("");
  const [newAlbum, setNewAlbum] = useState({ band: "", title: "", year: "", genre: "", cover: "" });
  const [coverFile, setCoverFile] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("albums");
    if (stored) {
      setAlbums(JSON.parse(stored));
    } else {
      fetchAlbums();
    }
  }, []);

  const persist = (list) => {
    setAlbums(list);
    localStorage.setItem("albums", JSON.stringify(list));
  };

  const fetchAlbums = async (query = "") => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/albums${query}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setAlbums(data);
      localStorage.setItem("albums", JSON.stringify(data));
    } catch (err) {
      console.error("Błąd pobierania:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (band.trim()) params.append("band", band.trim());
    if (genre.trim()) params.append("genre", genre.trim());
    const q = params.toString() ? `?${params.toString()}` : "";
    fetchAlbums(q);
  };


  const uploadCoverIfNeeded = async () => {
    if (!coverFile) return null;
    const fd = new FormData();
    fd.append("cover", coverFile);
    const res = await fetch(`${API_BASE}/upload-cover`, {
      method: "POST",
      body: fd,
    });
    if (!res.ok) throw new Error(`Upload failed: ${res.status}`);
    const json = await res.json();
    return json.filename || json.fileName || null;
  };

  const handleAdd = async () => {
    if (!newAlbum.band || !newAlbum.title || !newAlbum.year || !newAlbum.genre) {
      alert("Uzupełnij pola: zespół, tytuł, rok, kategoria.");
      return;
    }
    try {
      setLoading(true);
      let coverFilename = newAlbum.cover || null;
      if (coverFile) {
        const uploaded = await uploadCoverIfNeeded();
        if (uploaded) coverFilename = uploaded;
      }
      const payload = { ...newAlbum, cover: coverFilename };
      const res = await fetch(`${API_BASE}/albums`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const created = await res.json();
      const withUrl = ensureCoverUrl(created);
      persist([...albums, withUrl]);
      setNewAlbum({ band: "", title: "", year: "", genre: "", cover: "" });
      setCoverFile(null);
    } catch (err) {
      console.error("Błąd dodawania:", err);
      alert("Błąd dodawania albumu.");
    } finally {
      setLoading(false);
    }
  };

  const ensureCoverUrl = (album) => {
    if (album.coverUrl) return album;
    if (album.cover) {
      return { ...album, coverUrl: `${API_BASE}/covers/${encodeURIComponent(album.cover)}` };
    }
    return { ...album, coverUrl: null };
  };

  const handleEdit = async (album) => {
    const newTitle = prompt("Nowy tytuł:", album.title);
    if (!newTitle || newTitle === album.title) return;
    try {
      const res = await fetch(`${API_BASE}/albums/${album.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newTitle }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const updated = await res.json();
      const updatedWithUrl = ensureCoverUrl(updated);
      const updatedList = albums.map((a) => (a.id === album.id ? updatedWithUrl : a));
      persist(updatedList);
    } catch (err) {
      console.error("Błąd aktualizacji:", err);
      alert("Błąd aktualizacji albumu.");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Na pewno usunąć album?")) return;
    try {
      const res = await fetch(`${API_BASE}/albums/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const updated = albums.filter((a) => a.id !== id);
      persist(updated);
    } catch (err) {
      console.error("Błąd usuwania:", err);
      alert("Błąd usuwania albumu.");
    }
  };

  useEffect(() => {
    if (!albums || albums.length === 0) return;
    const normalized = albums.map((a) => ensureCoverUrl(a));
    setAlbums(normalized);
    localStorage.setItem("albums", JSON.stringify(normalized));
  }, []);

  return (
    <div className="p-4 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Lista albumów z okładkami</h1>

      <section className="mb-6">
        <div className="flex gap-2 mb-2">
          <input
            type="text"
            placeholder="Wpisz nazwę zespołu"
            value={band}
            onChange={(e) => setBand(e.target.value)}
            className="border p-2 rounded flex-1"
          />
          <input
            type="text"
            placeholder="Kategoria"
            value={genre}
            onChange={(e) => setGenre(e.target.value)}
            className="border p-2 rounded w-48"
          />
          <button onClick={handleSearch} className="bg-blue-600 text-white px-4 py-2 rounded">
            Szukaj
          </button>
          <button
            onClick={() => {
              setBand("");
              setGenre("");
              fetchAlbums();
            }}
            className="bg-gray-300 px-3 rounded"
          >
            Wyczyść
          </button>
        </div>
        <div className="text-sm text-gray-600">{loading ? "Ładowanie..." : `${albums.length} wyników`}</div>
      </section>

      <section className="mb-6 border p-4 rounded">
        <h2 className="font-semibold mb-2">Dodaj nowy album</h2>
        <input
          type="text"
          placeholder="Zespół"
          value={newAlbum.band}
          onChange={(e) => setNewAlbum({ ...newAlbum, band: e.target.value })}
          className="border p-2 rounded w-full mb-2"
        />
        <input
          type="text"
          placeholder="Tytuł"
          value={newAlbum.title}
          onChange={(e) => setNewAlbum({ ...newAlbum, title: e.target.value })}
          className="border p-2 rounded w-full mb-2"
        />
        <input
          type="text"
          placeholder="Rok"
          value={newAlbum.year}
          onChange={(e) => setNewAlbum({ ...newAlbum, year: e.target.value })}
          className="border p-2 rounded w-full mb-2"
        />
        <input
          type="text"
          placeholder="Kategoria (genre)"
          value={newAlbum.genre}
          onChange={(e) => setNewAlbum({ ...newAlbum, genre: e.target.value })}
          className="border p-2 rounded w-full mb-2"
        />

        <div className="mb-2">
          <label className="block text-sm mb-1">Okładka (plik) — opcjonalnie</label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => {
              setCoverFile(e.target.files && e.target.files[0] ? e.target.files[0] : null);
              setNewAlbum({ ...newAlbum, cover: "" });
            }}
            className="mb-2"
          />
          <div className="text-xs text-gray-600 mb-2">Lub wpisz nazwę pliku już umieszczonego w public/covers:</div>
          <input
            type="text"
            placeholder="Nazwa pliku w public/covers (np. cover.jpg)"
            value={newAlbum.cover}
            onChange={(e) => setNewAlbum({ ...newAlbum, cover: e.target.value })}
            className="border p-2 rounded w-full mb-2"
          />
        </div>

        <button onClick={handleAdd} className="bg-green-600 text-white px-4 py-2 rounded">
          Dodaj album
        </button>
      </section>

      <section>
        <ul>
          {albums.map((album) => (
            <li key={album.id} className="flex items-center justify-between border-b py-3">
              <div className="flex items-center gap-4">
                {album.coverUrl ? (
                  <img
                    src={album.coverUrl}
                    alt={`${album.title} cover`}
                    style={{ width: 72, height: 72, objectFit: "cover", borderRadius: 6 }}
                  />
                ) : (
                  <div style={{ width: 72, height: 72, background: "#eee", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 6 }}>
                    Brak
                  </div>
                )}
                <div>
                  <div className="font-semibold">{album.band} — {album.title}</div>
                  <div className="text-sm text-gray-600">{album.year} • <em>{album.genre}</em></div>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => handleEdit(album)} className="bg-yellow-500 text-white px-3 py-1 rounded">Edytuj</button>
                <button onClick={() => handleDelete(album.id)} className="bg-red-600 text-white px-3 py-1 rounded">Usuń</button>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
