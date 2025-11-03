declare module 'mfe_profile/ProfilePage' {
  export interface ProfilePageProps {
    userId?: string;
    theme?: 'light' | 'dark';
    onUpdate?: (data: any) => void;
  }

  export function ProfilePage(props: ProfilePageProps): JSX.Element;
  export default ProfilePage;
}

declare module 'mfe_summary/SummaryPage' {
  export interface SummaryPageProps {
    userId?: string;
    theme?: 'light' | 'dark';
    timeRange?: 'week' | 'month' | 'year';
    onDataLoad?: (data: any) => void;
  }

  export function SummaryPage(props: SummaryPageProps): JSX.Element;
  export default SummaryPage;
}
