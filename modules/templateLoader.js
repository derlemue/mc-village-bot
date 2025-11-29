const fs = require('fs');
const path = require('path');

class TemplateLoader {
  constructor(schematicsDir = './schematics') {
    this.schematicsDir = path.resolve(process.cwd(), schematicsDir);
    this.templates = {};
    this._loadTemplates();
  }

  _loadTemplates() {
    console.log('[TemplateLoader] 📁 Lade Templates aus', this.schematicsDir);
    if (!fs.existsSync(this.schematicsDir)) {
      console.log('[TemplateLoader] ❌ Schematics Ordner fehlt:', this.schematicsDir);
      return;
    }

    const files = fs.readdirSync(this.schematicsDir);
    console.log('[TemplateLoader] 📋 Dateien:', files);

    for (const file of files) {
      if (path.extname(file) === '.js') {
        const name = path.basename(file, '.js');
        const filePath = path.join(this.schematicsDir, file);
        try {
          delete require.cache[filePath];
          const template = require(filePath);
          if (template.name && template.width) {
            this.templates[name.toLowerCase()] = template;
            console.log('[TemplateLoader] ✅', name, '(' + template.name + ')');
          }
        } catch (e) {
          console.log('[TemplateLoader] ❌', file, ':', e.message);
        }
      }
    }
    console.log('[TemplateLoader] 📊', Object.keys(this.templates).length, 'Templates geladen');
    console.log('[TemplateLoader] 📋 Verfügbar:', Object.keys(this.templates));
  }

  getTemplate(name) {
    const normalizedName = name.toLowerCase();
    console.log('[TemplateLoader] 🔍 getTemplate(' + normalizedName + ')', 
                this.templates[normalizedName] ? 'FOUND' : 'NOT FOUND');
    return this.templates[normalizedName] || null;
  }

  getTemplateNames() {
    return Object.keys(this.templates);
  }
}

module.exports = TemplateLoader;
