import React from 'react';

/**
 * Content type detectors
 */
const isMathBlock = (paragraph) => {
  return paragraph.trim().startsWith('[') && paragraph.trim().endsWith(']');
};

const isHeading = (paragraph) => {
  return paragraph.startsWith('#');
};

const isList = (paragraph) => {
  return paragraph.includes('\n-') || paragraph.includes('\n*') || paragraph.includes('\n+');
};

const isBlockquote = (paragraph) => {
  return paragraph.startsWith('>');
};

const isCodeBlock = (paragraph) => {
  return paragraph.startsWith('```');
};

/**
 * Formats a heading with appropriate level
 */
export const formatHeading = (text, index, formatInlineTextFn) => {
  const headingMatch = text.match(/^(#{1,6})\s(.+)/);
  if (!headingMatch) return <p key={index}>{text}</p>;

  const level = headingMatch[1].length;
  const content = headingMatch[2];
  const HeadingTag = `h${Math.min(level + 1, 6)}`;

  return React.createElement(
    HeadingTag,
    { key: index, className: `content-heading content-heading-${level}` },
    formatInlineTextFn(content)
  );
};

/**
 * Extracts list items from text
 */
const extractListItems = (lines) => {
  const listItems = [];
  let currentParagraph = '';

  lines.forEach(line => {
    if (line.match(/^\s*[-*+]\s/)) {
      if (currentParagraph) {
        listItems.push(currentParagraph);
        currentParagraph = '';
      }
      listItems.push(line.replace(/^\s*[-*+]\s/, ''));
    } else if (line.match(/^\s*\d+\.\s/)) {
      if (currentParagraph) {
        listItems.push(currentParagraph);
        currentParagraph = '';
      }
      listItems.push(line.replace(/^\s*\d+\.\s/, ''));
    } else {
      currentParagraph += (currentParagraph ? '\n' : '') + line;
    }
  });

  return { listItems, currentParagraph };
};

/**
 * Formats a list (ordered or unordered)
 */
export const formatList = (text, index, formatInlineTextFn) => {
  const lines = text.split('\n');
  const { listItems, currentParagraph } = extractListItems(lines);

  if (currentParagraph) {
    return (
      <div key={index}>
        <p className="content-paragraph">{formatInlineTextFn(currentParagraph)}</p>
        <ul className="content-list">
          {listItems.map((item, i) => (
            <li key={i} className="content-list-item">
              {formatInlineTextFn(item)}
            </li>
          ))}
        </ul>
      </div>
    );
  }

  const isNumbered = text.match(/^\s*\d+\./m);
  const ListTag = isNumbered ? 'ol' : 'ul';

  return (
    <ListTag key={index} className="content-list">
      {listItems.map((item, i) => (
        <li key={i} className="content-list-item">
          {formatInlineTextFn(item)}
        </li>
      ))}
    </ListTag>
  );
};

/**
 * Formats a blockquote
 */
export const formatBlockquote = (text, index, formatInlineTextFn) => {
  const content = text.replace(/^>\s?/gm, '');
  return (
    <blockquote key={index} className="content-blockquote">
      {formatInlineTextFn(content)}
    </blockquote>
  );
};

/**
 * Formats a code block
 */
export const formatCodeBlock = (text, index) => {
  const codeMatch = text.match(/^```(\w+)?\n([\s\S]*?)\n```$/);
  if (!codeMatch) return <p key={index}>{text}</p>;

  const language = codeMatch[1] || '';
  const code = codeMatch[2];

  return (
    <div key={index} className="content-code-block">
      {language && <div className="code-language">{language}</div>}
      <pre>
        <code className={language ? `language-${language}` : ''}>
          {code}
        </code>
      </pre>
    </div>
  );
};

/**
 * Formats a math block
 */
export const formatMathBlock = (text, index, formatMathExpressionFn) => {
  const mathContent = text.trim().slice(1, -1).trim();
  const formattedMath = formatMathExpressionFn(mathContent);

  return (
    <div key={index} className="content-math-block">
      <div className="math-expression">
        {formattedMath}
      </div>
    </div>
  );
};

/**
 * Formats a regular paragraph
 */
export const formatParagraph = (paragraph, index, formatInlineTextFn) => {
  return (
    <p key={index} className="content-paragraph">
      {paragraph.split('\n').map((line, lineIndex) => (
        <React.Fragment key={lineIndex}>
          {formatInlineTextFn(line)}
          {lineIndex < paragraph.split('\n').length - 1 && <br />}
        </React.Fragment>
      ))}
    </p>
  );
};

/**
 * Main content formatter
 * Detects content type and delegates to appropriate formatter
 */
export const formatContent = (content, formatInlineTextFn, formatMathExpressionFn) => {
  return content.split('\n\n').map((paragraph, index) => {
    if (isMathBlock(paragraph)) {
      return formatMathBlock(paragraph, index, formatMathExpressionFn);
    }

    if (isHeading(paragraph)) {
      return formatHeading(paragraph, index, formatInlineTextFn);
    }

    if (isList(paragraph)) {
      return formatList(paragraph, index, formatInlineTextFn);
    }

    if (isBlockquote(paragraph)) {
      return formatBlockquote(paragraph, index, formatInlineTextFn);
    }

    if (isCodeBlock(paragraph)) {
      return formatCodeBlock(paragraph, index);
    }

    return formatParagraph(paragraph, index, formatInlineTextFn);
  });
};
