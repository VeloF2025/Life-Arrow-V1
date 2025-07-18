import { useNavigate } from "react-router-dom";
import { ProfileCompletionForm } from "../../components/forms/ProfileCompletionForm";

export function ProfilePage() {
  const navigate = useNavigate();

  const handleSuccess = () => {
    navigate("/client/dashboard");
  };

  return (
    <div className="space-y-6">
      <div className="page-header">
        <h1 className="text-3xl font-bold text-gray-900">Complete Your Profile</h1>
        <p className="text-gray-600">Please provide additional information to enhance your experience</p>
      </div>
      
      <ProfileCompletionForm onSuccess={handleSuccess} />
    </div>
  );
}
