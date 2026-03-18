import * as fs from 'fs';
import * as path from 'path';
import * as Handlebars from 'handlebars';

export class TemplateService {
  private static cache = new Map<string, Handlebars.TemplateDelegate>();

  static compile(templateName: string, data: unknown): string {
    const filePath = path.join(
      process.cwd(),
      'dist',
      'mail',
      'templates',
      `${templateName}.hbs`,
    );

    try {
      let compiled = this.cache.get(templateName);

      if (!compiled) {
        if (!fs.existsSync(filePath)) {
          throw new Error(`Template not found at ${filePath}`);
        }

        const templateFile = fs.readFileSync(filePath, 'utf-8');
        compiled = Handlebars.compile(templateFile);

        this.cache.set(templateName, compiled);
      }

      return compiled(data);
    } catch (error) {
      console.error(error);
      throw new Error(`Template ${templateName} not found`);
    }
  }
}
