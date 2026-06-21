import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Layout from "@/components/Layout";
import RiskListPage from "@/pages/RiskListPage";
import FolderDetailPage from "@/pages/FolderDetailPage";
import TodoCenterPage from "@/pages/TodoCenterPage";
import AuditReportPage from "@/pages/AuditReportPage";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<RiskListPage />} />
          <Route path="/folder/:id" element={<FolderDetailPage />} />
          <Route path="/todos" element={<TodoCenterPage />} />
          <Route path="/reports" element={<AuditReportPage />} />
        </Route>
      </Routes>
    </Router>
  );
}
