import { useEffect, useMemo, useState } from "react";
import { BrowserRouter, Routes, Route, Link, useNavigate } from "react-router-dom";
import Home from "./pages/Home";
import CreateBook from "./pages/CreateBook";
import UpdateBook from "./pages/UpdateBook";
import DeleteBook from "./pages/DeleteBook";

function App() {
  const [books, setBooks] = useState(() => {
    const saved = localStorage.getItem("books");
    return saved
      ? JSON.parse(saved)
      : [
          { id: 1, title: "The Lord of the Rings Trilogy", author: "J.R.R. Tolkien" },
          { id: 2, title: "Don Quixote", author: "Miguel de Cervantes" },
        ];
  });
  const [selectedId, setSelectedId] = useState(null);

  useEffect(() => {
    localStorage.setItem("books", JSON.stringify(books));
  }, [books]);

  const selectedBook = useMemo(
    () => books.find((b) => b.id === selectedId) ?? null,
    [books, selectedId]
  );

  const addBook = ({ title, author }) => {
    setBooks((prev) => {
      const nextId = prev.length ? Math.max(...prev.map((b) => b.id)) + 1 : 1;
      return [...prev, { id: nextId, title: title.trim(), author: author.trim() }];
    });
  };

  const updateBook = ({ title, author }) => {
    if (selectedId == null) return;
    setBooks((prev) =>
      prev.map((b) =>
        b.id === selectedId ? { ...b, title: title.trim(), author: author.trim() } : b
      )
    );
  };

  const deleteBook = () => {
    if (selectedId == null) return;
    setBooks((prev) => prev.filter((b) => b.id !== selectedId));
    setSelectedId(null);
  };

  return (
  <BrowserRouter>
  <div className="container py-3">
    <header className="app-header">
      <h1>Book Management App</h1>
    </header>
    <Routes>
      <Route path="/" element={<Home books={books} setSelectedId={setSelectedId} />} />
      <Route path="/create" element={<CreateWithProps onAdd={addBook} />} />
      <Route path="/update" element={<UpdateWithProps book={selectedBook} onUpdate={updateBook} />} />
      <Route path="/delete" element={<DeleteWithProps book={selectedBook} onDelete={deleteBook} />} />
    </Routes>
  </div>
  </BrowserRouter>
);
}

function CreateWithProps({ onAdd }) {
  const navigate = useNavigate();
  return (
    <CreateBook
      onAdd={(payload) => {
        onAdd(payload);
        navigate("/"); 
      }}
    />
  );
}

function UpdateWithProps({ book, onUpdate }) {
  const navigate = useNavigate();
  return (
    <UpdateBook
      book={book}
      onUpdate={(payload) => {
        onUpdate(payload);
        navigate("/"); 
      }}
    />
  );
}

function DeleteWithProps({ book, onDelete }) {
  const navigate = useNavigate();
  return (
    <DeleteBook
      book={book}
      onDelete={() => {
        onDelete();
        navigate("/"); 
      }}
    />
  );
}

export default App;


