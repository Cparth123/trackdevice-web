import Link from 'next/link';

export default function HomePage() {
  return (
    <main style={{ padding: 32, maxWidth: 900, margin: '0 auto' }}>
      <h1>ScreenStream Viewer</h1>
      <p>Open a device stream with the route format <code>/view/DEVICE_ID/PASSWORD</code>.</p>
      <p>
        Example:
        {' '}
        <Link href="/view/SS-ABCDEFGH/123456">/view/SS-ABCDEFGH/123456</Link>
      </p>
    </main>
  );
}
