import * as cheerio from 'cheerio';

export function parseCommentContent(html: string): {
  text: string;
  mentions: string[];
} {
  const $ = cheerio.load(html);

  const mentions: string[] = [];

  // Handle mentions
  $('[data-type="mention"]').each((_, el) => {
    const label = $(el).attr('data-label');
    if (label) {
      mentions.push(label);
      $(el).replaceWith(`@${label}`);
    }
  });

  // Handle task references
  $('[data-task-id]').each((_, el) => {
    const text = $(el).text();
    $(el).replaceWith(text);
  });

  return {
    text: $.text().trim(),
    mentions,
  };
}
