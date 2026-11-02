import ScreenHeader from '../components/ScreenHeader';

// Temporary stand-in for screens built in later phases.
export default function PlaceholderScreen({ title }: { title: string }) {
  return (
    <div className="screen">
      <ScreenHeader title={title} />
    </div>
  );
}
