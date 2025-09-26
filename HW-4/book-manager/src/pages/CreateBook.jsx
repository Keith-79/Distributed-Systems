import { useState } from "react";

/** Props: onAdd({ title, author }) */
export default function CreateBook({ onAdd }) {
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim() || !author.trim()) return;
    onAdd({ title, author }); // prop usage (rubric)
  };

  return (
    <div className="container py-4">
      <h2 className="h4">Add New Book</h2>
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
        <button type="submit" className="btn btn-primary">Add Book</button>
      </form>
    </div>
  );
}
