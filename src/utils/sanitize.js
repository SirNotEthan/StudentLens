import DOMPurify from 'dompurify';

export const sanitizeHTML = (html) => {
  if (typeof html !== 'string') return '';
  return DOMPurify.sanitize(html, {
    USE_PROFILES: { html: true },
    FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'form', 'input', 'style', 'link', 'base'],
    FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'onfocus', 'onblur'],
    FORCE_BODY: false,
    ADD_ATTR: ['target'],
  });
};
