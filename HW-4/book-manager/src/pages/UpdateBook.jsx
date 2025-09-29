import { useEffect, useState } from "react";

/** Props: book, onUpdate({ title, author }) */
export default function UpdateBook({ book, onUpdate }) {
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");

  // prefill when selected book changes
  useEffect(() => {
    setTitle(book?.title ?? "");
    setAuthor(book?.author ?? "");
  }, [book]);

  if (!book) {
  return (
    <div className="container py-4">
      <h2 className="h4">Update Book</h2>
      <p className="text-muted">No book selected. Go back to Home and click “Edit”.</p>
    </div>
  );
}

const handleSubmit = (e) => {
  e.preventDefault();
  if (!title.trim() || !author.trim()) return;
  if (!window.confirm("Update this book?")) return;
  onUpdate({ title, author });
};

  return (
  <div className="container py-4">
    <h2 className="h4">Update Book (ID: {book.id})</h2>
      <form onSubmit={handleSubmit} className="mt-3">
        <div className="mb-3">
          <input
            className="form-control"
            placeholder="Book Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </div>
        <div className="mb-3">
          <input
            className="form-control"
            placeholder="Author Name"
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
            required
          />
        </div>
        <button type="submit" className="btn btn-warning">Update Book</button>
      </form>
    </div>
  );
}
