import { useNavigate } from 'react-router-dom';
import { ProfileCompletionForm } from '../components/forms/ProfileCompletionForm';

export default function ProfileCompletionPage() {
  const navigate = useNavigate();

  const handleCompletion = () => {
    // Navigate back to dashboard after successful profile completion
    navigate('/client/dashboard', { replace: true });
  };

  return <ProfileCompletionForm onSuccess={handleCompletion} />;
} 
