import { Redirect } from 'expo-router';
import useAuthStore from '@/store/authStore';

export default function Index() {
  const { isTechnician } = useAuthStore();
  return <Redirect href={isTechnician ? '/(technician)/dashboard' : '/login'} />;
}
