import { useEffect } from 'react';

const SITE_NAME = 'StudentLens';

/**
 * Sets the document title and meta description for the current page.
 * Restores the previous values on unmount so navigating between pages
 * doesn't leave stale metadata behind.
 */
export function useDocumentMeta(title, description) {
  useEffect(() => {
    const previousTitle = document.title;
    document.title = title ? `${title} | ${SITE_NAME}` : SITE_NAME;

    let descriptionTag = document.querySelector('meta[name="description"]');
    const previousDescription = descriptionTag?.getAttribute('content');

    if (description) {
      if (!descriptionTag) {
        descriptionTag = document.createElement('meta');
        descriptionTag.setAttribute('name', 'description');
        document.head.appendChild(descriptionTag);
      }
      descriptionTag.setAttribute('content', description);
    }

    return () => {
      document.title = previousTitle;
      if (descriptionTag && previousDescription !== undefined) {
        descriptionTag.setAttribute('content', previousDescription);
      }
    };
  }, [title, description]);
}
