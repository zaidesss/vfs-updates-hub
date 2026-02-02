import { useParams, Navigate } from "react-router-dom";
import QAEvaluationForm from "./QAEvaluationForm";

const QAEvaluationEdit = () => {
  const { id } = useParams<{ id: string }>();

  if (!id) {
    return <Navigate to="/team-performance/qa-evaluations" replace />;
  }

  return <QAEvaluationForm editId={id} />;
};

export default QAEvaluationEdit;
