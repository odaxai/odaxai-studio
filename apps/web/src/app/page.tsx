import { redirect } from 'next/navigation';

export default function Home(): JSX.Element {
  // Redirect to models by default
  redirect('/models');
}
