import { useState } from "react";
import BooksList from "./features/books/BooksList";
import BookForm from "./features/books/BookForm";
import Chat from "./features/chat/Chat";

export default function App() {
  const [editing, setEditing] = useState(null);

  return (
    <div className="container">
      <header className="row" style={{ justifyContent: "space-between" }}>
        <h1 style={{ margin: 0, fontSize: 40 }}>📚 Library Dashboard</h1>
      </header>

      <section className="card">
        <BookForm editing={editing} onDone={() => setEditing(null)} />
      </section>

      <section className="card">
        <BooksList onEdit={(b) => setEditing(b)} />
      </section>

      <section className="card">
        <Chat />
      </section>
    </div>
  );
}
