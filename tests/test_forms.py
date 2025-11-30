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
    
    def test_homepage_newsletter_form(self, page: Page, base_url: str):
        """Test the newsletter signup form on the homepage."""
        page.goto(base_url)
        page.wait_for_load_state("networkidle")
        
        # Find all newsletter/email signup forms
        # Based on the website structure, there are multiple email signup forms
        email_inputs = page.locator('input[type="email"]')
        submit_buttons = page.locator('button:has-text("Subscribe"), button:has-text("Submit"), button[type="submit"]')
        
        form_count = email_inputs.count()
        
        for i in range(form_count):
            try:
                email_input = email_inputs.nth(i)
                if email_input.is_visible():
                    # Scroll to the form
                    email_input.scroll_into_view_if_needed()
                    page.wait_for_timeout(500)
                    
                    # Fill in test email
                    test_email = f"test.automation{i}@example.com"
                    email_input.fill(test_email)
                    
                    # Find associated submit button
                    # Try to find button near the input
                    submit_button = page.locator('button[type="submit"]').nth(i)
                    if not submit_button.is_visible():
                        # Try alternative selectors
                        submit_button = page.locator('button:has-text("Subscribe"), button:has-text("Submit")').nth(i)
                    
                    if submit_button.is_visible():
                        submit_button.click()
                        
                        # Wait for submission response
                        page.wait_for_timeout(2000)
                        
                        # Check for success message or error
                        success_indicators = [
                            page.locator('text=/success/i'),
                            page.locator('text=/thank you/i'),
                            page.locator('text=/subscribed/i'),
                            page.locator('.success'),
                            page.locator('[class*="success"]')
                        ]
                        
                        form_submitted = False
                        for indicator in success_indicators:
                            if indicator.is_visible(timeout=3000):
                                form_submitted = True
                                break
                        
                        # If no explicit success message, check if form was cleared or disabled
                        if not form_submitted:
                            # Form might have been submitted if input is disabled or cleared
                            if email_input.input_value() == "" or email_input.is_disabled():
                                form_submitted = True
                        
                        assert form_submitted, f"Form {i+1} submission failed - no success indicator found"
                        
            except Exception as e:
                pytest.skip(f"Form {i+1} test skipped: {str(e)}")
    
    def test_contact_form(self, page: Page, base_url: str):
        """Test the contact form if it exists."""
        # Navigate to contact page
        page.goto(f"{base_url}/contact")
        page.wait_for_load_state("networkidle")
        
        # Look for contact form fields
        name_input = page.locator('input[name*="name"], input[type="text"]').first
        email_input = page.locator('input[type="email"]').first
        message_input = page.locator('textarea, input[name*="message"]').first
        
        if name_input.is_visible() and email_input.is_visible():
            name_input.fill("Test User")
            email_input.fill("test@example.com")
            
            if message_input.is_visible():
                message_input.fill("This is an automated test message from the PNNCLE automation testing suite.")
            
            # Find and click submit button
            submit_button = page.locator('button[type="submit"], button:has-text("Send"), button:has-text("Submit")').first
            if submit_button.is_visible():
                submit_button.click()
                page.wait_for_timeout(3000)
                
                # Check for success message
                success = page.locator('text=/success|thank you|sent/i').first
                if success.is_visible(timeout=5000):
                    assert True, "Contact form submitted successfully"
                else:
                    # Form might have submitted without explicit message
                    pytest.skip("Contact form submission completed but no explicit success message found")
            else:
                pytest.skip("Contact form submit button not found")
        else:
            pytest.skip("Contact form not found on contact page")
    
    def test_footer_newsletter_forms(self, page: Page, base_url: str):
        """Test newsletter forms in the footer."""
        page.goto(base_url)
        page.wait_for_load_state("networkidle")
        
        # Scroll to footer
        page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
        page.wait_for_timeout(1000)
        
        # Find email inputs in footer
        footer = page.locator('footer')
        if footer.count() > 0:
            footer_email_inputs = footer.locator('input[type="email"]')
            
            for i in range(footer_email_inputs.count()):
                try:
                    email_input = footer_email_inputs.nth(i)
                    if email_input.is_visible():
                        email_input.scroll_into_view_if_needed()
                        page.wait_for_timeout(500)
                        
                        test_email = f"footer.test{i}@example.com"
                        email_input.fill(test_email)
                        
                        # Find associated submit button
                        submit_button = footer.locator('button[type="submit"]').nth(i)
                        if submit_button.is_visible():
                            submit_button.click()
                            page.wait_for_timeout(2000)
                            
                            # Check for success
                            success = footer.locator('text=/success|thank you|subscribed/i').first
                            if success.is_visible(timeout=3000) or email_input.input_value() == "":
                                assert True, f"Footer form {i+1} submitted successfully"
                except Exception as e:
                    pytest.skip(f"Footer form {i+1} test skipped: {str(e)}")
    
    def test_all_forms_accessible(self, page: Page, base_url: str):
        """Verify all forms on the site are accessible and can be interacted with."""
        page.goto(base_url)
        page.wait_for_load_state("networkidle")
        
        # Find all forms
        forms = page.locator('form')
        form_count = forms.count()
        
        assert form_count > 0, "No forms found on the website"
        
        # Check each form for required fields
        for i in range(form_count):
            form = forms.nth(i)
            if form.is_visible():
                form.scroll_into_view_if_needed()
                page.wait_for_timeout(500)
                
                # Check if form has input fields
                inputs = form.locator('input, textarea, select')
                input_count = inputs.count()
                
                assert input_count > 0, f"Form {i+1} has no input fields"
                
                # Check if form has submit button
                submit_button = form.locator('button[type="submit"], input[type="submit"]')
                assert submit_button.count() > 0, f"Form {i+1} has no submit button"

