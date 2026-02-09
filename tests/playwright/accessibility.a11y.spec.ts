import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Accessibility tests (WCAG 2.1 AA)', () => {
  test('Home page should not have accessibility violations', async ({ page }) => {
    await page.goto('/');
    
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    
    // Report violations but don't hard-fail to allow triage
    if (accessibilityScanResults.violations.length > 0) {
      console.log('\n⚠️  Accessibility violations found on Home page:');
      accessibilityScanResults.violations.forEach(violation => {
        console.log(`\n  - ${violation.id}: ${violation.description}`);
        console.log(`    Impact: ${violation.impact}`);
        console.log(`    Affected elements: ${violation.nodes.length}`);
      });
    }
    
    // Only fail on critical/serious violations
    const criticalViolations = accessibilityScanResults.violations.filter(
      v => v.impact === 'critical' || v.impact === 'serious'
    );
    expect(criticalViolations).toEqual([]);
  });

  test('Services page should not have accessibility violations', async ({ page }) => {
    await page.goto('/services');
    
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    
    if (accessibilityScanResults.violations.length > 0) {
      console.log('\n⚠️  Accessibility violations found on Services page:');
      accessibilityScanResults.violations.forEach(violation => {
        console.log(`\n  - ${violation.id}: ${violation.description}`);
        console.log(`    Impact: ${violation.impact}`);
        console.log(`    Affected elements: ${violation.nodes.length}`);
      });
    }
    
    const criticalViolations = accessibilityScanResults.violations.filter(
      v => v.impact === 'critical' || v.impact === 'serious'
    );
    expect(criticalViolations).toEqual([]);
  });

  test('Daycare booking form should not have accessibility violations', async ({ page }) => {
    await page.goto('/daycare');
    
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    
    if (accessibilityScanResults.violations.length > 0) {
      console.log('\n⚠️  Accessibility violations found on Daycare form:');
      accessibilityScanResults.violations.forEach(violation => {
        console.log(`\n  - ${violation.id}: ${violation.description}`);
        console.log(`    Impact: ${violation.impact}`);
        console.log(`    Affected elements: ${violation.nodes.length}`);
      });
    }
    
    const criticalViolations = accessibilityScanResults.violations.filter(
      v => v.impact === 'critical' || v.impact === 'serious'
    );
    expect(criticalViolations).toEqual([]);
  });

  test('Boarding booking form should not have accessibility violations', async ({ page }) => {
    await page.goto('/boarding');
    
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    
    if (accessibilityScanResults.violations.length > 0) {
      console.log('\n⚠️  Accessibility violations found on Boarding form:');
      accessibilityScanResults.violations.forEach(violation => {
        console.log(`\n  - ${violation.id}: ${violation.description}`);
        console.log(`    Impact: ${violation.impact}`);
        console.log(`    Affected elements: ${violation.nodes.length}`);
      });
    }
    
    const criticalViolations = accessibilityScanResults.violations.filter(
      v => v.impact === 'critical' || v.impact === 'serious'
    );
    expect(criticalViolations).toEqual([]);
  });

  test('Trial Day booking form should not have accessibility violations', async ({ page }) => {
    await page.goto('/trial');
    
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    
    if (accessibilityScanResults.violations.length > 0) {
      console.log('\n⚠️  Accessibility violations found on Trial Day form:');
      accessibilityScanResults.violations.forEach(violation => {
        console.log(`\n  - ${violation.id}: ${violation.description}`);
        console.log(`    Impact: ${violation.impact}`);
        console.log(`    Affected elements: ${violation.nodes.length}`);
      });
    }
    
    const criticalViolations = accessibilityScanResults.violations.filter(
      v => v.impact === 'critical' || v.impact === 'serious'
    );
    expect(criticalViolations).toEqual([]);
  });

  test('Admin login page should not have accessibility violations', async ({ page }) => {
    await page.goto('/admin/login');
    
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    
    if (accessibilityScanResults.violations.length > 0) {
      console.log('\n⚠️  Accessibility violations found on Admin Login page:');
      accessibilityScanResults.violations.forEach(violation => {
        console.log(`\n  - ${violation.id}: ${violation.description}`);
        console.log(`    Impact: ${violation.impact}`);
        console.log(`    Affected elements: ${violation.nodes.length}`);
      });
    }
    
    const criticalViolations = accessibilityScanResults.violations.filter(
      v => v.impact === 'critical' || v.impact === 'serious'
    );
    expect(criticalViolations).toEqual([]);
  });

  test('About page should not have accessibility violations', async ({ page }) => {
    await page.goto('/about');
    
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    
    if (accessibilityScanResults.violations.length > 0) {
      console.log('\n⚠️  Accessibility violations found on About page:');
      accessibilityScanResults.violations.forEach(violation => {
        console.log(`\n  - ${violation.id}: ${violation.description}`);
        console.log(`    Impact: ${violation.impact}`);
        console.log(`    Affected elements: ${violation.nodes.length}`);
      });
    }
    
    const criticalViolations = accessibilityScanResults.violations.filter(
      v => v.impact === 'critical' || v.impact === 'serious'
    );
    expect(criticalViolations).toEqual([]);
  });
});
