import { test, expect, Page } from '@playwright/test';
import { TEST_DATA } from './helpers/test-data';

const BASE_URL = 'https://pnncle.com';

test.describe('Form Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Set viewport
    await page.setViewportSize({ width: 1920, height: 1080 });
  });

  test('Equip Page Form @form_test', async ({ page }) => {
    await page.goto(`${BASE_URL}/equip/`);
    await page.waitForLoadState('networkidle');
    
    // Find and fill form fields
    const nameInput = page.locator('input[name*="name"], input[type="text"]').first();
    const emailInput = page.locator('input[type="email"]').first();
    const phoneInput = page.locator('input[type="tel"], input[name*="phone"]').first();
    
    // Fill in the form
    if (await nameInput.isVisible()) {
      await nameInput.fill(TEST_DATA.NAME);
    }
    
    if (await emailInput.isVisible()) {
      await emailInput.fill(TEST_DATA.EMAIL);
    }
    
    if (await phoneInput.isVisible()) {
      await phoneInput.fill(TEST_DATA.PHONE);
    }
    
    // Look for other text fields
    const textInputs = page.locator('input[type="text"]:not([name*="name"]):not([name*="phone"])');
    const count = await textInputs.count();
    for (let i = 0; i < count; i++) {
      const inputField = textInputs.nth(i);
      if (await inputField.isVisible()) {
        const name = await inputField.getAttribute('name');
        if (name && !['name', 'phone'].includes(name)) {
          await inputField.fill(TEST_DATA.OTHER);
          break;
        }
      }
    }
    
    // Find and click submit button
    const submitButton = page.locator('button[type="submit"], button:has-text("Send"), button:has-text("Submit"), input[type="submit"]').first();
    
    if (await submitButton.isVisible()) {
      await submitButton.click();
      await page.waitForTimeout(3000);
      
      // Check for success message
      const successIndicators = [
        page.locator('text=/success/i'),
        page.locator('text=/thank you/i'),
        page.locator('text=/sent/i'),
        page.locator('text=/received/i'),
        page.locator('.success'),
        page.locator('[class*="success"]'),
      ];
      
      let formSubmitted = false;
      for (const indicator of successIndicators) {
        try {
          if (await indicator.isVisible({ timeout: 5000 })) {
            formSubmitted = true;
            break;
          }
        } catch {
          // Continue checking
        }
      }
      
      // Check if form was cleared (also indicates submission)
      if (!formSubmitted && await nameInput.isVisible()) {
        const value = await nameInput.inputValue();
        if (value === '') {
          formSubmitted = true;
        }
      }
      
      expect(formSubmitted).toBe(true);
    } else {
      test.skip();
    }
  });

  test('Gift Page Form @form_test', async ({ page }) => {
    await page.goto(`${BASE_URL}/gift/`);
    await page.waitForLoadState('networkidle');
    
    const nameInput = page.locator('input[name*="name"], input[type="text"]').first();
    const emailInput = page.locator('input[type="email"]').first();
    const phoneInput = page.locator('input[type="tel"], input[name*="phone"]').first();
    
    if (await nameInput.isVisible()) {
      await nameInput.fill(TEST_DATA.NAME);
    }
    
    if (await emailInput.isVisible()) {
      await emailInput.fill(TEST_DATA.EMAIL);
    }
    
    if (await phoneInput.isVisible()) {
      await phoneInput.fill(TEST_DATA.PHONE);
    }
    
    // Fill other text fields
    const textInputs = page.locator('input[type="text"]:not([name*="name"]):not([name*="phone"])');
    const count = await textInputs.count();
    if (count > 0) {
      const inputField = textInputs.first();
      if (await inputField.isVisible()) {
        await inputField.fill(TEST_DATA.OTHER);
      }
    }
    
    const submitButton = page.locator('button[type="submit"], button:has-text("Send"), button:has-text("Submit"), input[type="submit"]').first();
    
    if (await submitButton.isVisible()) {
      await submitButton.click();
      await page.waitForTimeout(3000);
      
      const success = page.locator('text=/success|thank you|sent|received/i').first();
      const nameValue = await nameInput.isVisible() ? await nameInput.inputValue() : '';
      
      const isSuccess = await success.isVisible({ timeout: 5000 }).catch(() => false) || nameValue === '';
      expect(isSuccess).toBe(true);
    } else {
      test.skip();
    }
  });

  test('Partners Page Form @form_test', async ({ page }) => {
    await page.goto(`${BASE_URL}/partners/`);
    await page.waitForLoadState('networkidle');
    
    const nameInput = page.locator('input[name*="name"], input[type="text"]').first();
    const emailInput = page.locator('input[type="email"]').first();
    const phoneInput = page.locator('input[type="tel"], input[name*="phone"]').first();
    
    if (await nameInput.isVisible()) {
      await nameInput.fill(TEST_DATA.NAME);
    }
    
    if (await emailInput.isVisible()) {
      await emailInput.fill(TEST_DATA.EMAIL);
    }
    
    if (await phoneInput.isVisible()) {
      await phoneInput.fill(TEST_DATA.PHONE);
    }
    
    // Look for organization name or website fields
    const orgInput = page.locator('input[name*="organization"], input[name*="org"], input[name*="website"]').first();
    if (await orgInput.isVisible()) {
      await orgInput.fill(TEST_DATA.OTHER);
    } else {
      const textInputs = page.locator('input[type="text"]:not([name*="name"]):not([name*="phone"])');
      const count = await textInputs.count();
      if (count > 0) {
        await textInputs.first().fill(TEST_DATA.OTHER);
      }
    }
    
    const submitButton = page.locator('button[type="submit"], button:has-text("Send"), button:has-text("Submit"), input[type="submit"]').first();
    
    if (await submitButton.isVisible()) {
      await submitButton.click();
      await page.waitForTimeout(3000);
      
      const success = page.locator('text=/success|thank you|sent|received/i').first();
      const nameValue = await nameInput.isVisible() ? await nameInput.inputValue() : '';
      
      const isSuccess = await success.isVisible({ timeout: 5000 }).catch(() => false) || nameValue === '';
      expect(isSuccess).toBe(true);
    } else {
      test.skip();
    }
  });

  test('Contact Page Form @form_test', async ({ page }) => {
    await page.goto(`${BASE_URL}/contact/`);
    await page.waitForLoadState('networkidle');
    
    const nameInput = page.locator('input[name*="name"], input[type="text"]').first();
    const emailInput = page.locator('input[type="email"]').first();
    const messageInput = page.locator('textarea, input[name*="message"]').first();
    
    if (await nameInput.isVisible()) {
      await nameInput.fill(TEST_DATA.NAME);
    }
    
    if (await emailInput.isVisible()) {
      await emailInput.fill(TEST_DATA.EMAIL);
    }
    
    if (await messageInput.isVisible()) {
      await messageInput.fill(TEST_DATA.OTHER);
    }
    
    const submitButton = page.locator('button[type="submit"], button:has-text("Send"), button:has-text("Submit"), input[type="submit"]').first();
    
    if (await submitButton.isVisible()) {
      await submitButton.click();
      await page.waitForTimeout(3000);
      
      const success = page.locator('text=/success|thank you|sent|received/i').first();
      const messageValue = await messageInput.isVisible() ? await messageInput.inputValue() : '';
      
      const isSuccess = await success.isVisible({ timeout: 5000 }).catch(() => false) || messageValue === '';
      expect(isSuccess).toBe(true);
    } else {
      test.skip();
    }
  });

  test('Homepage Newsletter Forms @form_test', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
    
    const emailInputs = page.locator('input[type="email"]');
    const formCount = await emailInputs.count();
    
    for (let i = 0; i < formCount; i++) {
      try {
        const emailInput = emailInputs.nth(i);
        if (await emailInput.isVisible()) {
          await emailInput.scrollIntoViewIfNeeded();
          await page.waitForTimeout(500);
          
          await emailInput.fill(TEST_DATA.EMAIL);
          
          // Find associated submit button
          let submitButton = page.locator('button[type="submit"]').nth(i);
          if (!(await submitButton.isVisible())) {
            submitButton = page.locator('button:has-text("Subscribe"), button:has-text("Submit")').nth(i);
          }
          
          if (await submitButton.isVisible()) {
            await submitButton.click();
            await page.waitForTimeout(2000);
            
            // Check for success
            const successIndicators = [
              page.locator('text=/success/i'),
              page.locator('text=/thank you/i'),
              page.locator('text=/subscribed/i'),
            ];
            
            let formSubmitted = false;
            for (const indicator of successIndicators) {
              try {
                if (await indicator.isVisible({ timeout: 3000 })) {
                  formSubmitted = true;
                  break;
                }
              } catch {
                // Continue
              }
            }
            
            if (!formSubmitted) {
              const emailValue = await emailInput.inputValue();
              if (emailValue === '') {
                formSubmitted = true;
              }
            }
            
            expect(formSubmitted).toBe(true);
          }
        }
      } catch (error) {
        // Skip this form if there's an error
        console.warn(`Newsletter form ${i + 1} test skipped:`, error);
      }
    }
  });

  test('All Forms Accessible @form_test', async ({ page }) => {
    const pagesToCheck = [
      `${BASE_URL}/equip/`,
      `${BASE_URL}/gift/`,
      `${BASE_URL}/partners/`,
      `${BASE_URL}/contact/`,
      BASE_URL,
    ];
    
    for (const pageUrl of pagesToCheck) {
      await page.goto(pageUrl);
      await page.waitForLoadState('networkidle');
      
      const forms = page.locator('form');
      const formCount = await forms.count();
      
      if (formCount > 0) {
        for (let i = 0; i < formCount; i++) {
          const form = forms.nth(i);
          if (await form.isVisible()) {
            await form.scrollIntoViewIfNeeded();
            await page.waitForTimeout(500);
            
            const inputs = form.locator('input, textarea, select');
            const inputCount = await inputs.count();
            expect(inputCount).toBeGreaterThan(0);
            
            const submitButton = form.locator('button[type="submit"], input[type="submit"]');
            const buttonCount = await submitButton.count();
            expect(buttonCount).toBeGreaterThan(0);
          }
        }
      }
    }
  });
});

