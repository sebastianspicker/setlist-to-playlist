import { SetlistImportWorkflow } from '@/features/setlist-import/SetlistImportWorkflow';
import { PRODUCT_NAME } from '@/content/brand';

export default function HomePage() {
  return (
    <main id="main" className="main-content" tabIndex={-1}>
      <h1 className="sr-only">{PRODUCT_NAME}</h1>
      <SetlistImportWorkflow />
    </main>
  );
}
