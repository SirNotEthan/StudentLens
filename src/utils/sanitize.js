import DOMPurify from 'dompurify';

export const sanitizeHTML = (html) => {
  if (typeof html !== 'string') return '';
  return DOMPurify.sanitize(html, {
    FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'form', 'input', 'style', 'link', 'base'],
    ALLOWED_ATTR: ['href', 'title', 'target', 'rel', 'src', 'alt', 'width', 'height', 'class'],
    FORCE_BODY: false,
  });
};
