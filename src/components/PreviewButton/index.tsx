import Link from 'next/link';

import commonStyles from '../../styles/common.module.scss';

export function PreviewButton(): JSX.Element {
  return (
    <Link href="/api/exit-preview">
      <a className={commonStyles.previewButton}>Sair do modo Preview</a>
    </Link>
  );
}
