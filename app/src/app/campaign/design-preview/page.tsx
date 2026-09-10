import { notFound } from 'next/navigation';
import Preview from './preview';

export default function DesignPreviewPage() {
    if (process.env.NODE_ENV !== 'development') notFound();
    return <Preview />;
}
