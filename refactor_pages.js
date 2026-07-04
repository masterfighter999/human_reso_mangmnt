const fs = require('fs');
const path = require('path');

const pagesDir = path.join(__dirname, 'frontend/src/pages');
const files = fs.readdirSync(pagesDir).filter(f => f.endsWith('.jsx'));

for (const file of files) {
  const filePath = path.join(pagesDir, file);
  let content = fs.readFileSync(filePath, 'utf-8');

  // Fix imports
  if (content.includes("import { AuthContext, graphqlRequest } from '../App';")) {
    content = content.replace(
      "import { AuthContext, graphqlRequest } from '../App';",
      "import { AuthContext } from '../App';\nimport { restRequest } from '../api';"
    );
  } else if (content.includes("import { graphqlRequest } from '../App';")) {
    content = content.replace(
      "import { graphqlRequest } from '../App';",
      "import { restRequest } from '../api';"
    );
  }

  // Stub out graphqlRequest calls to prevent crashes, simply returning empty data
  // We can just define a dummy graphqlRequest at the top of the file if it's used
  // Or better, replace await graphqlRequest with a dummy promise.
  
  if (content.includes('graphqlRequest')) {
    // Just inject a dummy graphqlRequest function right after imports
    content = content.replace(
      /(import .* from '..\/api';)/,
      "$1\n\n// Temporary mock for removed GraphQL\nconst graphqlRequest = async () => ({});"
    );
  }

  fs.writeFileSync(filePath, content);
}

console.log("Refactoring complete.");
