import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { createBook, updateBook } from "./booksSlice";

/**
 * Create / Edit form.
 * Props:
 *   editing: book | null
 *   onDone(): void  // called after successful submit or cancel
 */
const EMPTY = {
  title: "",
  isbn: "",
  publication_year: "",
  available_copies: 1,
  author_id: "",
};

export default function BookForm({ editing, onDone }) {
  const dispatch = useDispatch();
  const { error } = useSelector((s) => s.books);
  const [form, setForm] = useState(EMPTY);

  useEffect(() => {
    if (editing) {
      setForm({
        title: editing.title ?? "",
        isbn: editing.isbn ?? "",
        publication_year:
          editing.publication_year === null ? "" : editing.publication_year,
        available_copies:
          editing.available_copies === null ? 1 : editing.available_copies,
        author_id: editing.author_id ?? "",
      });
    } else {
      setForm(EMPTY);
    }
  }, [editing]);

  const onChange = (e) => {
    const { name, value } = e.target;
    // coerce numeric inputs but allow blank
    if (name === "publication_year" || name === "available_copies") {
      setForm((f) => ({ ...f, [name]: value === "" ? "" : Number(value) }));
    } else if (name === "author_id") {
      setForm((f) => ({ ...f, [name]: value === "" ? "" : Number(value) }));
    } else {
      setForm((f) => ({ ...f, [name]: value }));
    }
  };

  const submit = async (e) => {
    e.preventDefault();

    const payload = {
      title: form.title.trim(),
      isbn: form.isbn.trim(),
      publication_year:
        form.publication_year === "" ? null : Number(form.publication_year),
      available_copies:
        form.available_copies === "" ? 1 : Number(form.available_copies),
      author_id: Number(form.author_id),
    };

    if (editing) {
      await dispatch(updateBook({ id: editing.id, changes: payload }));
    } else {
      await dispatch(createBook(payload));
    }
    onDone?.();
    setForm(EMPTY);
  };

  const renderError = (err) =>
    typeof err === "object" ? (err?.detail ?? JSON.stringify(err)) : String(err);

  return (
    <div>
      <h2 style={{ marginTop: 0 }}>{editing ? "Edit Book" : "Add Book"}</h2>

      {error && <p className="error">Error: {renderError(error)}</p>}

      <form onSubmit={submit} style={{ display: "grid", gap: 10, maxWidth: 540 }}>
        <input
          name="title"
          placeholder="Title"
          value={form.title}
          onChange={onChange}
          required
        />
        <input
          name="isbn"
          placeholder="ISBN (unique)"
          value={form.isbn}
          onChange={onChange}
          required
        />
        <input
          name="publication_year"
          type="number"
          placeholder="Year"
          value={form.publication_year}
          onChange={onChange}
          min="0"
        />
        <input
          name="available_copies"
          type="number"
          placeholder="Copies"
          value={form.available_copies}
          onChange={onChange}
          min="0"
        />
        <input
          name="author_id"
          type="number"
          placeholder="Author ID (existing)"
          value={form.author_id}
          onChange={onChange}
          required
          min="1"
        />
        <div className="row">
          <button type="submit">{editing ? "Save" : "Create"}</button>
          {editing && (
            <button
              type="button"
              className="secondary"
              onClick={() => onDone?.()}
            >
              Cancel
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
