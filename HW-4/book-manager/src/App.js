import { useEffect, useMemo, useState } from "react";
import { BrowserRouter, Routes, Route, Link, useNavigate } from "react-router-dom";
import Home from "./pages/Home";
import CreateBook from "./pages/CreateBook";
import UpdateBook from "./pages/UpdateBook";
import DeleteBook from "./pages/DeleteBook";

function App() {
  // books state (seed + persist)
  const [books, setBooks] = useState(() => {
    const saved = localStorage.getItem("books");
    return saved
      ? JSON.parse(saved)
      : [
          { id: 1, title: "Clean Code", author: "Robert C. Martin" },
          { id: 2, title: "The Pragmatic Programmer", author: "Andrew Hunt" },
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

  // add (auto-increment id)
  const addBook = ({ title, author }) => {
    setBooks((prev) => {
      const nextId = prev.length ? Math.max(...prev.map((b) => b.id)) + 1 : 1;
      return [...prev, { id: nextId, title: title.trim(), author: author.trim() }];
    });
  };

  // update currently selected book
  const updateBook = ({ title, author }) => {
    if (selectedId == null) return;
    setBooks((prev) =>
      prev.map((b) =>
        b.id === selectedId ? { ...b, title: title.trim(), author: author.trim() } : b
      )
    );
  };

  // delete currently selected book
  const deleteBook = () => {
    if (selectedId == null) return;
    setBooks((prev) => prev.filter((b) => b.id !== selectedId));
    setSelectedId(null);
  };

  return (
    <BrowserRouter>
      <div className="container py-3">
        <nav className="mb-3 d-flex gap-3">
          <Link to="/">Home</Link>
          <Link to="/create">Create</Link>
          <Link to="/update">Update</Link>
          <Link to="/delete">Delete</Link>
        </nav>

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

// wrappers to handle redirects after actions
function CreateWithProps({ onAdd }) {
  const navigate = useNavigate();
  return (
    <CreateBook
      onAdd={(payload) => {
        onAdd(payload);
        navigate("/"); // redirect home
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
        navigate("/"); // redirect home
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
        navigate("/"); // redirect home
      }}
    />
  );
}

export default App;
