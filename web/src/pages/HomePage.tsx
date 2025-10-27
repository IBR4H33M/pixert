import { useNavigate } from "react-router-dom";
import { Button } from "@shared/components/Button";
import "./HomePage.css";

export default function HomePage() {
  const navigate = useNavigate();

  return (
    <div className="page-container">
      <h1 className="title">Welcome to Pixert!</h1>
      <p className="subtitle">Web App (React + Vite)</p>

      <Button title="Go to Details" onPress={() => navigate("/details/123")} />

      <div className="info-box">
        <p className="info-text">This is a React web app built with Vite.</p>
        <p className="info-text">
          Shared components are imported from the shared package.
        </p>
      </div>
    </div>
  );
}
