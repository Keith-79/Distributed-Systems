/** Props: book, onDelete() */
export default function DeleteBook({ book, onDelete }) {
  if (!book) {
    return (
      <div className="container py-4">
        <h2 className="h4">Delete Book</h2>
        <p className="text-muted">No book selected. Go back to Home and click “Delete”.</p>
      </div>
    );
  }

  return (
    <div className="container py-4">
      <h2 className="h4">Delete Book</h2>
      <div className="card my-3">
        <div className="card-body">
          <strong>#{book.id} • {book.title}</strong>
          <div className="text-muted">by {book.author}</div>
        </div>
      </div>
      <button className="btn btn-danger" onClick={onDelete}>Delete Book</button>
    </div>
  );
}
