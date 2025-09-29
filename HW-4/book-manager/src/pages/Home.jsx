import { Link, useNavigate } from "react-router-dom";

export default function Home({ books, setSelectedId }) {
  const navigate = useNavigate();
  const goUpdate = (id) => { setSelectedId(id); navigate("/update"); };
  const goDelete = (id) => { setSelectedId(id); navigate("/delete"); };

  return (
    <div className="container py-4 main-narrow">
      <div className="home-toolbar">
        <h2 className="h4 m-0">Books</h2>
        <Link to="/create" className="btn btn-primary">+ New Book</Link>
      </div>

      {books.length === 0 ? (
        <p className="text-muted">No books yet. Click “New Book” to add one.</p>
      ) : (
        <ul className="list-group">
          {books.map((b) => (
            <li key={b.id} className="list-group-item d-flex justify-content-between align-items-center">
              <div>
                <strong>Book ID: {b.id} • {b.title}</strong>
                <div className="text-muted">by {b.author}</div>
              </div>
              <div className="d-flex gap-2">
                <button className="btn btn-outline-secondary btn-sm" onClick={() => goUpdate(b.id)}>Update</button>
                <button className="btn btn-danger btn-sm" onClick={() => goDelete(b.id)}>Delete</button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
