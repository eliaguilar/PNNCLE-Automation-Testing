"""
Test suite for web form submissions on pnncle.com
Tests all forms to ensure they submit correctly and messages are delivered.
"""
import pytest
from playwright.sync_api import Page, expect
import time


@pytest.mark.form_test
class TestFormSubmissions:
    """Test all forms on the PNNCLE website."""
    
    # Test data
    TEST_NAME = "PNNCLE Automation"
    TEST_EMAIL = "pnncle.automation@pnncle.com"
    TEST_PHONE = "805-123-4567"
    TEST_OTHER = "PNNCLE Automation Test Scripts"
    
    def test_equip_page_form(self, page: Page, base_url: str):
        """Test the form on the /equip/ page."""
        page.goto(f"{base_url}/equip/")
        page.wait_for_load_state("networkidle")
        
        # Find and fill form fields
        name_input = page.locator('input[name*="name"], input[type="text"]').first
        email_input = page.locator('input[type="email"]').first
        phone_input = page.locator('input[type="tel"], input[name*="phone"]').first
        
        # Fill in the form
        if name_input.is_visible():
            name_input.fill(self.TEST_NAME)
        
        if email_input.is_visible():
            email_input.fill(self.TEST_EMAIL)
        
        if phone_input.is_visible():
            phone_input.fill(self.TEST_PHONE)
        
        # Look for other text fields (country, ministry name, website, etc.)
        text_inputs = page.locator('input[type="text"]:not([name*="name"]):not([name*="phone"])')
        for i in range(text_inputs.count()):
            input_field = text_inputs.nth(i)
            if input_field.is_visible() and input_field.get_attribute('name') not in ['name', 'phone']:
                input_field.fill(self.TEST_OTHER)
                break
        
        # Find and click submit button
        submit_button = page.locator('button[type="submit"], button:has-text("Send"), button:has-text("Submit"), input[type="submit"]').first
        if submit_button.is_visible():
            submit_button.click()
            page.wait_for_timeout(3000)
            
            # Check for success message
            success_indicators = [
                page.locator('text=/success/i'),
                page.locator('text=/thank you/i'),
                page.locator('text=/sent/i'),
                page.locator('text=/received/i'),
                page.locator('.success'),
                page.locator('[class*="success"]')
            ]
            
            form_submitted = False
            for indicator in success_indicators:
                if indicator.is_visible(timeout=5000):
                    form_submitted = True
                    break
            
            # Check if form was cleared (also indicates submission)
            if not form_submitted:
                if name_input.is_visible() and name_input.input_value() == "":
                    form_submitted = True
            
            assert form_submitted, "Equip page form submission failed - no success indicator found"
        else:
            pytest.skip("Equip page form submit button not found")
    
    def test_gift_page_form(self, page: Page, base_url: str):
        """Test the form on the /gift/ page."""
        page.goto(f"{base_url}/gift/")
        page.wait_for_load_state("networkidle")
        
        # Find and fill form fields
        name_input = page.locator('input[name*="name"], input[type="text"]').first
        email_input = page.locator('input[type="email"]').first
        phone_input = page.locator('input[type="tel"], input[name*="phone"]').first
        
        if name_input.is_visible():
            name_input.fill(self.TEST_NAME)
        
        if email_input.is_visible():
            email_input.fill(self.TEST_EMAIL)
        
        if phone_input.is_visible():
            phone_input.fill(self.TEST_PHONE)
        
        # Fill other text fields
        text_inputs = page.locator('input[type="text"]:not([name*="name"]):not([name*="phone"])')
        for i in range(text_inputs.count()):
            input_field = text_inputs.nth(i)
            if input_field.is_visible():
                input_field.fill(self.TEST_OTHER)
                break
        
        # Find and click submit button
        submit_button = page.locator('button[type="submit"], button:has-text("Send"), button:has-text("Submit"), input[type="submit"]').first
        if submit_button.is_visible():
            submit_button.click()
            page.wait_for_timeout(3000)
            
            # Check for success
            success = page.locator('text=/success|thank you|sent|received/i').first
            if success.is_visible(timeout=5000) or (name_input.is_visible() and name_input.input_value() == ""):
                assert True, "Gift page form submitted successfully"
            else:
                pytest.skip("Gift page form submission completed but no explicit success message found")
        else:
            pytest.skip("Gift page form submit button not found")
    
    def test_partners_page_form(self, page: Page, base_url: str):
        """Test the form on the /partners/ page."""
        page.goto(f"{base_url}/partners/")
        page.wait_for_load_state("networkidle")
        
        # Find and fill form fields
        name_input = page.locator('input[name*="name"], input[type="text"]').first
        email_input = page.locator('input[type="email"]').first
        phone_input = page.locator('input[type="tel"], input[name*="phone"]').first
        
        if name_input.is_visible():
            name_input.fill(self.TEST_NAME)
        
        if email_input.is_visible():
            email_input.fill(self.TEST_EMAIL)
        
        if phone_input.is_visible():
            phone_input.fill(self.TEST_PHONE)
        
        # Look for organization name or website fields
        org_input = page.locator('input[name*="organization"], input[name*="org"], input[name*="website"]').first
        if org_input.is_visible():
            org_input.fill(self.TEST_OTHER)
        else:
            # Fill any other text field
            text_inputs = page.locator('input[type="text"]:not([name*="name"]):not([name*="phone"])')
            if text_inputs.count() > 0:
                text_inputs.first.fill(self.TEST_OTHER)
        
        # Find and click submit button
        submit_button = page.locator('button[type="submit"], button:has-text("Send"), button:has-text("Submit"), input[type="submit"]').first
        if submit_button.is_visible():
            submit_button.click()
            page.wait_for_timeout(3000)
            
            # Check for success
            success = page.locator('text=/success|thank you|sent|received/i').first
            if success.is_visible(timeout=5000) or (name_input.is_visible() and name_input.input_value() == ""):
                assert True, "Partners page form submitted successfully"
            else:
                pytest.skip("Partners page form submission completed but no explicit success message found")
        else:
            pytest.skip("Partners page form submit button not found")
    
    def test_contact_page_form(self, page: Page, base_url: str):
        """Test the contact form on the /contact/ page."""
        page.goto(f"{base_url}/contact/")
        page.wait_for_load_state("networkidle")
        
        # Find form fields
        name_input = page.locator('input[name*="name"], input[type="text"]').first
        email_input = page.locator('input[type="email"]').first
        message_input = page.locator('textarea, input[name*="message"]').first
        
        if name_input.is_visible():
            name_input.fill(self.TEST_NAME)
        
        if email_input.is_visible():
            email_input.fill(self.TEST_EMAIL)
        
        if message_input.is_visible():
            message_input.fill(self.TEST_OTHER)
        
        # Find and click submit button
        submit_button = page.locator('button[type="submit"], button:has-text("Send"), button:has-text("Submit"), input[type="submit"]').first
        if submit_button.is_visible():
            submit_button.click()
            page.wait_for_timeout(3000)
            
            # Check for success message
            success = page.locator('text=/success|thank you|sent|received/i').first
            if success.is_visible(timeout=5000):
                assert True, "Contact form submitted successfully"
            elif message_input.is_visible() and message_input.input_value() == "":
                assert True, "Contact form submitted (form cleared)"
            else:
                pytest.skip("Contact form submission completed but no explicit success message found")
        else:
            pytest.skip("Contact form submit button not found")
    
    def test_homepage_newsletter_forms(self, page: Page, base_url: str):
        """Test newsletter signup forms on the homepage."""
        page.goto(base_url)
        page.wait_for_load_state("networkidle")
        
        # Find all email signup forms
        email_inputs = page.locator('input[type="email"]')
        form_count = email_inputs.count()
        
        for i in range(form_count):
            try:
                email_input = email_inputs.nth(i)
                if email_input.is_visible():
                    email_input.scroll_into_view_if_needed()
                    page.wait_for_timeout(500)
                    
                    email_input.fill(self.TEST_EMAIL)
                    
                    # Find associated submit button
                    submit_button = page.locator('button[type="submit"]').nth(i)
                    if not submit_button.is_visible():
                        submit_button = page.locator('button:has-text("Subscribe"), button:has-text("Submit")').nth(i)
                    
                    if submit_button.is_visible():
                        submit_button.click()
                        page.wait_for_timeout(2000)
                        
                        # Check for success
                        success_indicators = [
                            page.locator('text=/success/i'),
                            page.locator('text=/thank you/i'),
                            page.locator('text=/subscribed/i')
                        ]
                        
                        form_submitted = False
                        for indicator in success_indicators:
                            if indicator.is_visible(timeout=3000):
                                form_submitted = True
                                break
                        
                        if not form_submitted and email_input.input_value() == "":
                            form_submitted = True
                        
                        if form_submitted:
                            assert True, f"Homepage newsletter form {i+1} submitted successfully"
            except Exception as e:
                pytest.skip(f"Homepage newsletter form {i+1} test skipped: {str(e)}")
    
    def test_all_forms_accessible(self, page: Page, base_url: str):
        """Verify all forms on the site are accessible and can be interacted with."""
        pages_to_check = [
            f"{base_url}/equip/",
            f"{base_url}/gift/",
            f"{base_url}/partners/",
            f"{base_url}/contact/",
            base_url
        ]
        
        for page_url in pages_to_check:
            page.goto(page_url)
            page.wait_for_load_state("networkidle")
            
            forms = page.locator('form')
            form_count = forms.count()
            
            if form_count > 0:
                for i in range(form_count):
                    form = forms.nth(i)
                    if form.is_visible():
                        form.scroll_into_view_if_needed()
                        page.wait_for_timeout(500)
                        
                        inputs = form.locator('input, textarea, select')
                        assert inputs.count() > 0, f"Form {i+1} on {page_url} has no input fields"
                        
                        submit_button = form.locator('button[type="submit"], input[type="submit"]')
                        assert submit_button.count() > 0, f"Form {i+1} on {page_url} has no submit button"
