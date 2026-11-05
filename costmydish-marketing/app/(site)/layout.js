import { Footer } from '@/components/Footer';
import { Header } from '@/components/Header';

export default function SiteLayout({ children }) {
  return (
    <>
      <Header />
      <main>{children}</main>
      <Footer />
    </>
  );
}
