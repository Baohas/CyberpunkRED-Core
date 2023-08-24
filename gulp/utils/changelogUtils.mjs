/* eslint-disable foundry-cpr/logger-after-function-definition */

export default class ChangelogUtils {
  /**
   * Splits markdown by heading level with content from heading to next
   * heading as an array of objects.
   *
   * @param {string} markdown - The markdown text to be converted.
   * @param {number} level - The level of headings to target
   *                         (e.g., 1 for "#", 2 for "##", etc.).
   * @returns {Array<{Object>} An array of objects containing extracted
   *                           headings and content.
   *                           {heading: heading, content: content}
   */
  static markdownToJson(markdown, level) {
    const regex = new RegExp(
      `^(#{${level}}\\s.*)[\\s\\S]*?(?=(^#{1,${level + 1}}\\s)|$)`,
      "gm"
    );
    const data = [];
    let match = regex.exec(markdown);

    while (match != null) {
      const headingText = match[1].replace(`#{${level}}`, "").trim();
      const startIndex = match.index + match[0].length;
      const endIndex = markdown.indexOf(`\n${"#".repeat(level)} `, startIndex);
      const content = markdown
        .substring(startIndex, endIndex !== -1 ? endIndex : undefined)
        .trim();

      data.push({ heading: headingText, content });

      match = regex.exec(markdown);
    }

    return data;
  }
}
