import { useNavigate } from 'react-router-dom';

// Upload functionality has been moved to the Layout sidebar modal
// This page just redirects to the main chat
export default function UploadPage() {
  const navigate = useNavigate();
  navigate('/');
  return null;
}
