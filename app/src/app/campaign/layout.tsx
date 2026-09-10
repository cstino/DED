import type { ReactNode } from 'react';
import styles from './theme.module.css';

export default function CampaignLayout({ children }: { children: ReactNode }) {
    return <div className={styles.campaignWorld}>{children}</div>;
}
