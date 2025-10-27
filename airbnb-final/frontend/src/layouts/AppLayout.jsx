import NavBar from "../components/NavBar";
import Footer from "../components/Footer";
import AgentWidget from "../components/Agent/AgentWidget";
export default function AppLayout({ children }) {
  return (
    <div>
      <NavBar />
      <main style={{ maxWidth: 1200, margin: "0 auto", padding: 16 }}>{children}</main>
      <Footer />
      <AgentWidget />
    </div>
  );
}
