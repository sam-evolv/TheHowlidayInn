import { useState } from 'react';
import LoginForm from '@/components/auth/LoginForm';

export default function LoginPage() {
  const [isLogin, setIsLogin] = useState(true);

  return (
    <LoginForm 
      isLogin={isLogin} 
      onToggleMode={() => setIsLogin(!isLogin)} 
    />
  );
}