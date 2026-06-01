import { Link, Route, Routes } from "react-router-dom";
import GroupsList from "./pages/GroupsList";
import GroupHome from "./pages/GroupHome";

export default function App() {
  return (
    <div className="mx-auto flex min-h-full max-w-4xl flex-col">
      <header className="flex items-center justify-between px-4 py-4">
        <Link to="/" className="flex items-center gap-2 text-xl font-bold text-sky-400">
          <span aria-hidden>🫙</span> splitjar
        </Link>
      </header>
      <main className="flex-1 px-4 pb-12">
        <Routes>
          <Route path="/" element={<GroupsList />} />
          <Route path="/groups/:id/*" element={<GroupHome />} />
        </Routes>
      </main>
      <footer className="px-4 py-4 text-center text-xs text-slate-400">
        splitjar · no accounts · your data stays local
      </footer>
    </div>
  );
}
