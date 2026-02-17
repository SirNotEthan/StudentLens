import React from 'react';

const INLINE_PATTERNS = [
  {
    regex: /\$([^$]+)\$/g,
    component: 'span',
    className: 'content-inline-math',
    isMath: true
  },
  {
    regex: /\*\*(.*?)\*\*/g,
    component: 'strong',
    className: 'content-bold'
  },
  {
    regex: /__(.*?)__/g,
    component: 'strong',
    className: 'content-bold'
  },
  {
    regex: /\*(.*?)\*/g,
    component: 'em',
    className: 'content-italic'
  },
  {
    regex: /_(.*?)_/g,
    component: 'em',
    className: 'content-italic'
  },
  {
    regex: /~~(.*?)~~/g,
    component: 'del',
    className: 'content-strikethrough'
  },
  {
    regex: /`(.*?)`/g,
    component: 'code',
    className: 'content-inline-code'
  },
  {
    regex: /\[([^\]]+)\]\(([^)]+)\)/g,
    component: 'a',
    className: 'content-link',
    href: true
  },
  {
    regex: /==(.*?)==/g,
    component: 'mark',
    className: 'content-highlight'
  },
  {
    regex: /\+\+(.*?)\+\+/g,
    component: 'u',
    className: 'content-underline'
  }
];

const extractMatches = (text, pattern) => {
  const matches = [];
  let match;

  while ((match = pattern.regex.exec(text)) !== null) {
    matches.push({
      beforeText: text.slice(matches.length > 0 ? matches[matches.length - 1].endIndex : 0, match.index),
      matchText: match[1],
      fullMatch: match[0],
      url: match[2], 
      index: match.index,
      endIndex: pattern.regex.lastIndex
    });
  }

  pattern.regex.lastIndex = 0;
  return matches;
};

const isSafeUrl = (url) => {
  if (!url) return false;
  const trimmed = url.trim().toLowerCase();
  if (trimmed.startsWith('javascript:') || trimmed.startsWith('data:') || trimmed.startsWith('vbscript:')) {
    return false;
  }
  return /^(https?:\/\/|mailto:|tel:|\/|#)/.test(trimmed) || !trimmed.includes(':');
};

const createElementProps = (pattern, match, keyCounter) => {
  const props = {
    key: `${pattern.component}-${keyCounter}`,
    className: pattern.className
  };

  if (pattern.href && match.url) {
    if (isSafeUrl(match.url)) {
      props.href = match.url;
      props.target = '_blank';
      props.rel = 'noopener noreferrer';
    } else {
      props.href = '#';
      props.title = 'Link removed for security';
    }
  }

  return props;
};

const processPartWithPattern = (part, pattern, keyCounter, formatMathFn) => {
  if (typeof part !== 'string') {
    return [part];
  }

  const matches = extractMatches(part, pattern);

  if (matches.length === 0) {
    return [part];
  }

  const result = [];
  let currentIndex = 0;

  matches.forEach((match) => {
    
    if (match.index > currentIndex) {
      const beforeText = part.slice(currentIndex, match.index);
      if (beforeText) {
        result.push(beforeText);
      }
    }

    const props = createElementProps(pattern, match, keyCounter.value++);
    let content = match.matchText;

    if (pattern.isMath && formatMathFn) {
      content = formatMathFn(match.matchText);
    }

    result.push(React.createElement(pattern.component, props, content));
    currentIndex = match.index + match.fullMatch.length;
  });

  const remainingText = part.slice(currentIndex);
  if (remainingText) {
    result.push(remainingText);
  }

  return result;
};

const processPattern = (parts, pattern, keyCounter, formatMathFn) => {
  const newParts = [];

  parts.forEach(part => {
    const processed = processPartWithPattern(part, pattern, keyCounter, formatMathFn);
    newParts.push(...processed);
  });

  return newParts;
};

export const formatInlineText = (text, formatMathFn = null) => {
  if (!text) return '';

  const keyCounter = { value: 0 };
  let parts = [text];

  INLINE_PATTERNS.forEach(pattern => {
    parts = processPattern(parts, pattern, keyCounter, formatMathFn);
  });

  return parts;
};

const MATH_PATTERNS = [
  {
    regex: /(\w+)\^(\d+)/g,
    replacement: (match, base, exp) =>
      React.createElement(
        'span',
        { key: Math.random(), className: 'math-expression-inline' },
        base,
        React.createElement('sup', { className: 'math-superscript' }, exp)
      )
  },
  {
    regex: /(\w+)_(\d+)/g,
    replacement: (match, base, sub) =>
      React.createElement(
        'span',
        { key: Math.random(), className: 'math-expression-inline' },
        base,
        React.createElement('sub', { className: 'math-subscript' }, sub)
      )
  },
  {
    regex: /(\w+|\([^)]+\))\/(\w+|\([^)]+\))/g,
    replacement: (match, num, den) =>
      React.createElement(
        'span',
        { key: Math.random(), className: 'math-fraction' },
        React.createElement('span', { className: 'math-numerator' }, num.replace(/[()]/g, '')),
        React.createElement('span', { className: 'math-denominator' }, den.replace(/[()]/g, ''))
      )
  },
  {
    regex: /sqrt\(([^)]+)\)/g,
    replacement: (match, content) =>
      React.createElement(
        'span',
        { key: Math.random(), className: 'math-sqrt' },
        React.createElement('span', { className: 'sqrt-symbol' }, '√'),
        React.createElement('span', { className: 'sqrt-content' }, content)
      )
  }
];

const MATH_SYMBOLS = {
  '+-': '±',
  'pi': 'π',
  'alpha': 'α',
  'beta': 'β',
  'gamma': 'γ',
  'delta': 'δ',
  'theta': 'θ',
  'lambda': 'λ',
  'mu': 'μ',
  'sigma': 'σ',
  'infinity': '∞',
  'integral': '∫',
  'sum': '∑',
  'product': '∏',
  'partial': '∂',
  'nabla': '∇',
  '<=': '≤',
  '>=': '≥',
  '!=': '≠',
  '~=': '≈',
  'degree': '°'
};

const replaceSymbols = (text) => {
  let formatted = text;

  Object.entries(MATH_SYMBOLS).forEach(([key, value]) => {
    const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    formatted = formatted.replace(new RegExp(escapedKey, 'g'), value);
  });

  return formatted;
};

const processMathPatterns = (text) => {
  let remaining = text;

  MATH_PATTERNS.forEach(pattern => {
    const newParts = [];

    if (typeof remaining === 'string') {
      let lastIndex = 0;
      let match;

      while ((match = pattern.regex.exec(remaining)) !== null) {
        if (match.index > lastIndex) {
          newParts.push(remaining.slice(lastIndex, match.index));
        }

        newParts.push(pattern.replacement(match[0], match[1], match[2]));
        lastIndex = pattern.regex.lastIndex;
      }

      if (lastIndex < remaining.length) {
        newParts.push(remaining.slice(lastIndex));
      }

      pattern.regex.lastIndex = 0;

      if (newParts.length > 0) {
        remaining = newParts;
      }
    }
  });

  return Array.isArray(remaining) ? remaining : [remaining];
};

export const formatMathExpression = (mathText) => {
  if (!mathText) return '';

  const symbolsReplaced = replaceSymbols(mathText);
  return processMathPatterns(symbolsReplaced);
};
