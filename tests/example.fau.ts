// Example FAU test
import { FauPage } from 'fau-framework';

export default async function exampleTest(page: FauPage) {
  // Navigate to a page
  await page.goto('https://example.com');
  
  // Take a screenshot for evidence
  await page.screenshot({ path: 'fau-results/screenshots/example.png' });
  
  console.log('✅ Example test completed successfully!');
}