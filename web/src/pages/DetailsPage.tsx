import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@shared/components/Button";
import "./DetailsPage.css";

export default function DetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  return (
    <div className="page-container">
      <h1 className="title">Details Page</h1>
      <p className="text">Item ID: {id}</p>

      <Button title="Go Back" onPress={() => navigate("/")} />
    </div>
  );
}
