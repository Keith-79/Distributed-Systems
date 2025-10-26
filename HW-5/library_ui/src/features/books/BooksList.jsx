import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchBooks, deleteBook } from "./booksSlice";

/**
 * Table view for books with search + delete + edit hook.
 * Props:
 *   onEdit(book) -> void   // parent sets the "editing" book for the form
 */
export default function BooksList({ onEdit }) {
  const dispatch = useDispatch();
  const { items, status, error } = useSelector((s) => s.books);
  const [q, setQ] = useState("");

  useEffect(() => {
    dispatch(fetchBooks());
  }, [dispatch]);

  const search = () => dispatch(fetchBooks({ q }));

  const renderError = (err) =>
    typeof err === "object" ? (err?.detail ?? JSON.stringify(err)) : String(err);

  return (
    <div>
      <h2 style={{ marginTop: 0 }}>Books</h2>

      <div className="row" style={{ marginBottom: 12 }}>
        <input
          placeholder="Search title…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          style={{ width: 260 }}
        />
        <button onClick={search}>Search</button>
      </div>

      {status === "loading" && <p>Loading…</p>}
      {error && <p className="error">Error: {renderError(error)}</p>}

      <table className="table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Title</th>
            <th>ISBN</th>
            <th>Year</th>
            <th>Copies</th>
            <th>Author ID</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {items.map((b) => (
            <tr key={b.id}>
              <td>{b.id}</td>
              <td>{b.title}</td>
              <td className="mono">{b.isbn}</td>
              <td>{b.publication_year ?? "—"}</td>
              <td>{b.available_copies}</td>
              <td>{b.author_id}</td>
              <td className="row">
                <button className="secondary" onClick={() => onEdit?.(b)}>
                  Edit
                </button>
                <button
                  className="danger"
                  onClick={() => dispatch(deleteBook(b.id))}
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
          {items.length === 0 && status === "succeeded" && (
            <tr>
              <td colSpan="7">No books yet. Add one above.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
